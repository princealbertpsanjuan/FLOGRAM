import Order from "../orders/order.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";
import { getPlatformCommissionRate } from "./admin-settings.service.js";

/*
 * =========================================================
 * RECOGNIZED REVENUE (one definition for Dashboard + Reports)
 * =========================================================
 *
 * An order counts as a sale when FLOGRAM (or the shop)
 * actually received the money:
 *
 *   Online (PayMongo)  -> when payment is confirmed (paidAt)
 *   Cash on Pickup     -> when the shop hands it over (paidAt)
 *   Cash on Delivery   -> when Admin verifies the Rider's
 *                         remittance (verifiedAt)
 *
 * Cancelled orders never count.
 *
 * Breakdown of every peso collected:
 *   gross        = order total paid by the customer
 *   deliveryFees = goes to Riders (not platform revenue)
 *   productSales = gross − delivery fees
 *   commission   = productSales × Admin commission rate
 *   sellerShare  = productSales − commission
 *
 * Days are Philippine calendar days (Asia/Manila, UTC+8).
 * =========================================================
 */

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

/*
 * Midnight (Manila) of the day that contains `date`.
 */
export const startOfManilaDay = (date = new Date()) => {
  const shifted = new Date(new Date(date).getTime() + MANILA_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - MANILA_OFFSET_MS);
};

export const endOfManilaDay = (date = new Date()) =>
  new Date(startOfManilaDay(date).getTime() + 24 * 60 * 60 * 1000 - 1);

/*
 * "YYYY-MM-DD" or "YYYY-MM" in Manila time.
 */
export const manilaKey = (date, granularity = "day") => {
  const shifted = new Date(new Date(date).getTime() + MANILA_OFFSET_MS).toISOString();
  return granularity === "day" ? shifted.slice(0, 10) : shifted.slice(0, 7);
};

const inRange = (date, startDate, endDate) => {
  if (!date) return false;
  const time = new Date(date).getTime();
  return (!startDate || time >= startDate.getTime()) && (!endDate || time <= endDate.getTime());
};

/*
 * Every recognized order in the range.
 */
export const getRecognizedOrders = async ({ startDate = null, endDate = null } = {}) => {
  const paidMatch = {
    paymentStatus: "paid",
    paymentMethod: { $in: ["paymongo", "cash_on_pickup"] },
    orderStatus: { $ne: "cancelled" },
  };

  if (startDate || endDate) {
    paidMatch.paidAt = {};
    if (startDate) paidMatch.paidAt.$gte = startDate;
    if (endDate) paidMatch.paidAt.$lte = endDate;
  }

  const remittanceMatch = { status: "verified" };

  if (startDate || endDate) {
    remittanceMatch.verifiedAt = {};
    if (startDate) remittanceMatch.verifiedAt.$gte = startDate;
    if (endDate) remittanceMatch.verifiedAt.$lte = endDate;
  }

  const [paidOrders, remittances] = await Promise.all([
    Order.find(paidMatch).select("_id florist totalAmount deliveryFee paymentMethod paidAt").lean(),
    RiderRemittance.find(remittanceMatch).select("items.order verifiedAt").lean(),
  ]);

  const verifiedAtByOrder = new Map();
  remittances.forEach((remittance) =>
    (remittance.items || []).forEach((item) => verifiedAtByOrder.set(String(item.order), remittance.verifiedAt))
  );

  const codOrders = verifiedAtByOrder.size
    ? await Order.find({
        _id: { $in: [...verifiedAtByOrder.keys()] },
        orderStatus: { $ne: "cancelled" },
      })
        .select("_id florist totalAmount deliveryFee paymentMethod")
        .lean()
    : [];

  const shape = (order, recognizedAt) => {
    const gross = round(order.totalAmount);
    const deliveryFee = round(order.deliveryFee);

    return {
      orderId: String(order._id),
      florist: order.florist ? String(order.florist) : null,
      method: order.paymentMethod,
      recognizedAt,
      gross,
      deliveryFee,
      productSales: round(Math.max(0, gross - deliveryFee)),
    };
  };

  return [
    ...paidOrders.map((order) => shape(order, order.paidAt)),
    ...codOrders.map((order) => shape(order, verifiedAtByOrder.get(String(order._id)))),
  ].filter((entry) => inRange(entry.recognizedAt, startDate, endDate));
};

const summarize = (entries, rate) => {
  const gross = round(entries.reduce((sum, entry) => sum + entry.gross, 0));
  const deliveryFees = round(entries.reduce((sum, entry) => sum + entry.deliveryFee, 0));
  const productSales = round(entries.reduce((sum, entry) => sum + entry.productSales, 0));
  const commission = round(productSales * rate);

  const byMethod = (method) => round(entries.filter((entry) => entry.method === method).reduce((sum, entry) => sum + entry.gross, 0));

  return {
    orders: entries.length,
    gross,
    deliveryFees,
    productSales,
    commission,
    sellerShare: round(productSales - commission),
    online: byMethod("paymongo"),
    cod: byMethod("cash_on_delivery"),
    pickup: byMethod("cash_on_pickup"),
  };
};

export const getRevenueSummary = async ({ startDate = null, endDate = null, granularity = null } = {}) => {
  const [entries, rate] = await Promise.all([getRecognizedOrders({ startDate, endDate }), getPlatformCommissionRate()]);

  const summary = summarize(entries, rate);

  let trend = [];

  if (granularity) {
    const groups = new Map();
    entries.forEach((entry) => {
      const key = manilaKey(entry.recognizedAt, granularity);
      groups.set(key, [...(groups.get(key) || []), entry]);
    });

    trend = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, items]) => {
        const part = summarize(items, rate);
        return {
          period,
          online: part.online,
          cod: part.cod,
          pickup: part.pickup,
          total: part.gross,
          productSales: part.productSales,
          commission: part.commission,
          sellerShare: part.sellerShare,
          orders: part.orders,
        };
      });
  }

  return { commissionRate: rate, ...summary, trend, entries };
};
