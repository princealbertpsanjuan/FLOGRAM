import { autoCompleteDeliveredOrders } from "../orders/order-auto-complete.js";
import Order from "../orders/order.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";
import { getPlatformCommissionRate } from "./admin-settings.service.js";

/*
 * =========================================================
 * RECOGNIZED REVENUE (one definition for Dashboard + Reports)
 * =========================================================
 *
 * A sale is recognized when the ORDER IS COMPLETED: the
 * customer marked a delivery "Order Received", or the shop
 * handed a pickup order over. The same rule applies to every
 * payment method (Online/PayMongo, Cash on Delivery, Cash on
 * Pickup). A paid online order that is still being prepared
 * or delivered is NOT a sale yet.
 *
 *   recognizedAt = completedAt
 *                  (older orders without it: deliveredAt,
 *                   then updatedAt)
 *
 * Cancelled and refunded orders never count.
 *
 * Breakdown of every completed order:
 *   gross        = order.totalAmount (what the customer paid)
 *                = subtotal + deliveryFee + preOrderFee
 *   deliveryFees = order.deliveryFee  -> Rider income
 *   productSales = gross − deliveryFee
 *                = bouquet price × qty + add-ons + pre-order fee
 *   commission   = productSales × Admin commission rate
 *                  (rounded per order, like Seller Earnings)
 *   sellerShare  = productSales − commission
 *
 * PRE-ORDER FEE belongs to the shop (product side): the shop
 * does the extra work of a scheduled bouquet, and Seller
 * Earnings / payouts (sellerPayouts) already pay it to the
 * shop as part of "total − delivery fee". Commission is taken
 * from it like the rest of product sales.
 *
 * COD cash awaiting remittance (informational only): completed
 * COD orders whose Rider remittance is not verified yet. The
 * sale is already recognized; the cash is still with the Rider.
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
 * When the sale happened (see header).
 */
export const recognizedAtOf = (order) => order.completedAt || order.deliveredAt || order.updatedAt || order.createdAt;

const COMPLETED_MATCH = {
  orderStatus: "completed",
  paymentStatus: { $ne: "refunded" },
};

const rangeOf = (startDate, endDate) => {
  const range = {};
  if (startDate) range.$gte = startDate;
  if (endDate) range.$lte = endDate;
  return range;
};

/*
 * Every recognized (completed) order in the range.
 */
export const getRecognizedOrders = async ({ startDate = null, endDate = null, florist = null } = {}) => {
  await autoCompleteDeliveredOrders();

  const match = { ...COMPLETED_MATCH };

  if (florist) match.florist = florist;

  if (startDate || endDate) {
    const range = rangeOf(startDate, endDate);

    /*
     * Same fallback order as recognizedAtOf().
     */
    match.$or = [
      { completedAt: range },
      { completedAt: null, deliveredAt: range },
      { completedAt: null, deliveredAt: null, updatedAt: range },
    ];
  }

  const orders = await Order.find(match)
    .select("_id florist totalAmount deliveryFee preOrderFee paymentMethod completedAt deliveredAt updatedAt createdAt")
    .lean();

  return orders
    .map((order) => {
      const gross = round(order.totalAmount);
      const deliveryFee = round(order.deliveryFee);

      return {
        orderId: String(order._id),
        florist: order.florist ? String(order.florist) : null,
        method: order.paymentMethod,
        recognizedAt: recognizedAtOf(order),
        gross,
        deliveryFee,
        preOrderFee: round(order.preOrderFee),
        productSales: round(Math.max(0, gross - deliveryFee)),
      };
    })
    .filter((entry) => inRange(entry.recognizedAt, startDate, endDate));
};

/*
 * Completed COD orders whose cash the Rider has not remitted
 * (Admin has not verified the remittance yet).
 */
const getCodAwaitingRemittance = async (entries) => {
  const codEntries = entries.filter((entry) => entry.method === "cash_on_delivery");

  if (!codEntries.length) return { orders: 0, amount: 0 };

  const remittances = await RiderRemittance.find({
    status: "verified",
    "items.order": { $in: codEntries.map((entry) => entry.orderId) },
  })
    .select("items.order")
    .lean();

  const verified = new Set(remittances.flatMap((remittance) => (remittance.items || []).map((item) => String(item.order))));

  const waiting = codEntries.filter((entry) => !verified.has(entry.orderId));

  return {
    orders: waiting.length,
    amount: round(waiting.reduce((sum, entry) => sum + entry.gross, 0)),
  };
};

const summarize = (entries, rate) => {
  const gross = round(entries.reduce((sum, entry) => sum + entry.gross, 0));
  const deliveryFees = round(entries.reduce((sum, entry) => sum + entry.deliveryFee, 0));
  const productSales = round(entries.reduce((sum, entry) => sum + entry.productSales, 0));
  const preOrderFees = round(entries.reduce((sum, entry) => sum + (entry.preOrderFee || 0), 0));
  /*
   * Commission is rounded per order, exactly like Seller
   * Earnings / payouts, so the totals reconcile to the centavo.
   */
  const commission = round(entries.reduce((sum, entry) => sum + round(entry.productSales * rate), 0));

  const byMethod = (method) => round(entries.filter((entry) => entry.method === method).reduce((sum, entry) => sum + entry.gross, 0));

  return {
    orders: entries.length,
    gross,
    deliveryFees,
    productSales,
    preOrderFees,
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
  const codAwaitingRemittance = await getCodAwaitingRemittance(entries);

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
          deliveryFees: part.deliveryFees,
          productSales: part.productSales,
          commission: part.commission,
          sellerShare: part.sellerShare,
          orders: part.orders,
        };
      });
  }

  return { commissionRate: rate, ...summary, codAwaitingRemittance, trend, entries };
};
