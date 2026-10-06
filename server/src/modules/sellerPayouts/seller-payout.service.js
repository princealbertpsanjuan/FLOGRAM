import mongoose from "mongoose";

import Florist from "../florists/florist.model.js";
import Order from "../orders/order.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";
import { getPlatformCommissionRate } from "../admin/admin-settings.service.js";
import { createNotification } from "../notifications/notification.service.js";

import SellerPayout from "./seller-payout.model.js";

/*
 * =========================================================
 * SELLER EARNINGS + ADMIN SELLER PAYOUTS
 * =========================================================
 */

const SUCCESS_STATUSES = ["delivered", "completed"];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const assertId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
    throw createError(`A valid ${label} is required.`);
  }
};

const completedAtOf = (order) => order.completedAt || order.deliveredAt || order.updatedAt || order.createdAt;

const grossOf = (order) => roundMoney(Math.max(0, Number(order.totalAmount || 0) - Number(order.deliveryFee || 0)));

/*
 * Orders already counted in a pending or paid payout.
 */
const getReservedOrderIds = async (floristId) => {
  const payouts = await SellerPayout.find({ florist: floristId, status: { $in: ["pending", "paid"] } })
    .select("items.order")
    .lean();

  return new Set(payouts.flatMap((payout) => payout.items.map((item) => String(item.order))));
};

/*
 * Classify every successful order of a shop.
 *
 * eligible         -> can go into a payout now
 * awaitingCod      -> COD the Rider has not remitted yet
 */
const classifyShopOrders = async (floristId, { periodStart = null, periodEnd = null } = {}) => {
  const commissionRate = await getPlatformCommissionRate();

  const orders = await Order.find({
    florist: floristId,
    orderStatus: { $in: SUCCESS_STATUSES },
  })
    .select("_id productName paymentMethod paymentStatus totalAmount deliveryFee completedAt deliveredAt updatedAt createdAt")
    .lean();

  const codOrderIds = orders.filter((order) => order.paymentMethod === "cash_on_delivery").map((order) => order._id);

  const remitted = codOrderIds.length
    ? await RiderRemittance.find({ status: "verified", "items.order": { $in: codOrderIds } })
        .select("items.order")
        .lean()
    : [];

  const remittedIds = new Set(remitted.flatMap((entry) => entry.items.map((item) => String(item.order))));

  const reserved = await getReservedOrderIds(floristId);

  const eligible = [];
  const awaitingCod = [];

  orders.forEach((order) => {
    const completedAt = completedAtOf(order);

    if (periodStart && new Date(completedAt) < periodStart) return;
    if (periodEnd && new Date(completedAt) > periodEnd) return;
    if (reserved.has(String(order._id))) return;

    const grossAmount = grossOf(order);
    const commission = roundMoney(grossAmount * commissionRate);

    const item = {
      order: order._id,
      productName: order.productName || "Bouquet order",
      paymentMethod: order.paymentMethod || "",
      collectedBySeller: order.paymentMethod === "cash_on_pickup",
      grossAmount,
      commissionRate,
      commission,
      netAmount: roundMoney(grossAmount - commission),
      completedAt,
    };

    if (order.paymentMethod === "cash_on_pickup") {
      item.netAmount = -commission;
      eligible.push(item);
    } else if (order.paymentMethod === "cash_on_delivery") {
      if (remittedIds.has(String(order._id))) {
        eligible.push(item);
      } else {
        awaitingCod.push(item);
      }
    } else if (order.paymentStatus === "paid") {
      eligible.push(item);
    }
  });

  return { commissionRate, eligible, awaitingCod };
};

const sum = (items, key) => roundMoney(items.reduce((total, item) => total + Number(item[key] || 0), 0));

/*
 * =========================================================
 * SELLER: MY EARNINGS
 * =========================================================
 */
export const getSellerEarnings = async (sellerUserId) => {
  const florist = await Florist.findOne({ owner: sellerUserId }).select("_id shopName").lean();

  if (!florist) {
    throw createError("Florist profile was not found.", 404);
  }

  const [{ commissionRate, eligible, awaitingCod }, payouts] = await Promise.all([
    classifyShopOrders(florist._id),
    SellerPayout.find({ florist: florist._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const paid = payouts.filter((payout) => payout.status === "paid");
  const pending = payouts.filter((payout) => payout.status === "pending");

  const lifetimeItems = [...paid, ...pending].flatMap((payout) => payout.items).concat(eligible, awaitingCod);

  return {
    shopName: florist.shopName,
    commissionRate,
    lifetime: {
      grossSales: sum(lifetimeItems, "grossAmount"),
      commission: sum(lifetimeItems, "commission"),
      netEarnings: roundMoney(sum(lifetimeItems, "grossAmount") - sum(lifetimeItems, "commission")),
      orders: lifetimeItems.length,
    },
    unpaidBalance: Math.max(0, sum(eligible, "netAmount")),
    unpaidOrders: eligible.length,
    awaitingCodRemittance: {
      orders: awaitingCod.length,
      netAmount: sum(awaitingCod, "netAmount"),
    },
    pendingPayoutAmount: sum(pending, "totalAmount"),
    paidOutTotal: sum(paid, "totalAmount"),
    recentItems: [...eligible, ...awaitingCod]
      .map((item) => ({ ...item, awaitingCodRemittance: awaitingCod.includes(item) }))
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, 30),
    payouts: payouts.map((payout) => ({ ...payout, items: undefined, itemCount: payout.items.length })),
  };
};

export const getSellerPayoutForSeller = async (sellerUserId, payoutId) => {
  assertId(payoutId, "payout");

  const payout = await SellerPayout.findOne({ _id: payoutId, sellerUser: sellerUserId })
    .populate("florist", "shopName")
    .lean();

  if (!payout) throw createError("Payout was not found.", 404);

  return payout;
};

/*
 * =========================================================
 * ADMIN
 * =========================================================
 */
export const getAdminSellerBalances = async () => {
  const florists = await Florist.find({ verificationStatus: "approved" })
    .populate("owner", "firstName lastName email phoneNumber")
    .select("_id shopName owner isActive")
    .lean();

  const balances = await Promise.all(
    florists.map(async (florist) => {
      const { eligible, awaitingCod } = await classifyShopOrders(florist._id);

      const times = eligible.map((item) => new Date(item.completedAt).getTime()).filter(Number.isFinite);

      return {
        floristId: String(florist._id),
        shopName: florist.shopName,
        isActive: florist.isActive !== false,
        seller: florist.owner
          ? {
              id: String(florist.owner._id),
              firstName: florist.owner.firstName || "",
              lastName: florist.owner.lastName || "",
              email: florist.owner.email || "",
              phoneNumber: florist.owner.phoneNumber || "",
            }
          : null,
        unpaidOrderCount: eligible.length,
        grossSales: sum(eligible, "grossAmount"),
        /*
         * Sales whose money FLOGRAM holds (online + remitted
         * COD) vs Cash on Pickup the shop already received.
         */
        heldSales: sum(eligible.filter((item) => !item.collectedBySeller), "grossAmount"),
        pickupSales: sum(eligible.filter((item) => item.collectedBySeller), "grossAmount"),
        commissionRate: eligible[0]?.commissionRate ?? null,
        commission: sum(eligible, "commission"),
        amountOwed: roundMoney(sum(eligible, "netAmount")),
        awaitingCodOrders: awaitingCod.length,
        oldestUnpaidAt: times.length ? new Date(Math.min(...times)) : null,
        latestUnpaidAt: times.length ? new Date(Math.max(...times)) : null,
      };
    })
  );

  return balances.sort((a, b) => b.amountOwed - a.amountOwed);
};

const POPULATE_PAYOUT = [
  { path: "florist", select: "_id shopName" },
  { path: "sellerUser", select: "_id firstName lastName email phoneNumber" },
  { path: "paidBy", select: "_id firstName lastName" },
  { path: "createdBy", select: "_id firstName lastName" },
];

const populatePayout = (query) => POPULATE_PAYOUT.reduce((current, item) => current.populate(item), query);

export const getAdminSellerPayouts = async (status = null) => {
  const filter = {};

  if (status && ["pending", "paid", "cancelled"].includes(status)) filter.status = status;

  return populatePayout(SellerPayout.find(filter).sort({ createdAt: -1 }).limit(200)).lean();
};

export const getAdminSellerPayoutById = async (payoutId) => {
  assertId(payoutId, "payout");

  const payout = await populatePayout(SellerPayout.findById(payoutId)).lean();

  if (!payout) throw createError("Seller payout was not found.", 404);

  return payout;
};

export const createAdminSellerPayout = async (floristId, adminId, input = {}) => {
  assertId(floristId, "florist");

  const florist = await Florist.findById(floristId).select("_id owner shopName verificationStatus").lean();

  if (!florist) throw createError("Florist shop was not found.", 404);

  const periodEnd = input.periodEnd ? new Date(input.periodEnd) : new Date();
  const periodStart = input.periodStart ? new Date(input.periodStart) : new Date(0);

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    throw createError("A valid payout period is required.");
  }

  if (periodEnd < periodStart) {
    throw createError("Payout period end cannot be earlier than its start.");
  }

  const { eligible } = await classifyShopOrders(florist._id, { periodStart, periodEnd });

  if (!eligible.length) {
    throw createError("No unpaid seller earnings were found for this shop and period.");
  }

  const totalAmount = roundMoney(sum(eligible, "netAmount"));

  if (totalAmount <= 0) {
    throw createError(
      "Commission from Cash on Pickup orders is equal to or larger than the online/COD earnings. Nothing to pay out yet."
    );
  }

  const times = eligible.map((item) => new Date(item.completedAt).getTime()).filter(Number.isFinite);

  const payout = await SellerPayout.create({
    florist: florist._id,
    sellerUser: florist.owner,
    periodStart: input.periodStart ? periodStart : new Date(Math.min(...times)),
    periodEnd,
    items: eligible,
    grossSales: sum(eligible, "grossAmount"),
    totalCommission: sum(eligible, "commission"),
    totalAmount,
    status: "pending",
    createdBy: adminId,
  });

  try {
    await createNotification({
      recipient: florist.owner,
      role: "seller",
      type: "payout_update",
      title: "Payout being prepared",
      message: `FLOGRAM is preparing your payout of ₱${totalAmount.toFixed(2)} for ${eligible.length} order(s).`,
      metadata: { sellerPayoutId: String(payout._id) },
    });
  } catch (error) {
    console.error("Seller payout notification failed:", error.message);
  }

  return getAdminSellerPayoutById(payout._id);
};

export const markSellerPayoutPaid = async (payoutId, adminId, input = {}) => {
  assertId(payoutId, "payout");

  const referenceNumber = String(input.referenceNumber || "").trim();
  const proofImageUrl = String(input.proofImageUrl || "").trim();

  if (!referenceNumber) throw createError("Payment reference number is required.");
  if (!proofImageUrl) throw createError("Proof of payment is required.");

  const payout = await SellerPayout.findOneAndUpdate(
    { _id: payoutId, status: "pending" },
    {
      $set: {
        status: "paid",
        paymentMethod: String(input.paymentMethod || "Bank Transfer").trim().slice(0, 100),
        referenceNumber: referenceNumber.slice(0, 200),
        proofImageUrl,
        adminRemarks: String(input.adminRemarks || "").trim().slice(0, 2000),
        paidAt: new Date(),
        paidBy: adminId,
      },
    },
    { returnDocument: "after" }
  );

  if (!payout) {
    const existing = await SellerPayout.findById(payoutId).select("status").lean();
    throw existing
      ? createError(`This payout is already ${existing.status}.`, 409)
      : createError("Seller payout was not found.", 404);
  }

  try {
    await createNotification({
      recipient: payout.sellerUser,
      role: "seller",
      type: "payout_update",
      title: "Payout sent",
      message: `FLOGRAM sent ₱${payout.totalAmount.toFixed(2)} (ref ${referenceNumber}).`,
      metadata: { sellerPayoutId: String(payout._id) },
    });
  } catch (error) {
    console.error("Seller payout notification failed:", error.message);
  }

  return getAdminSellerPayoutById(payout._id);
};

export const cancelSellerPayout = async (payoutId, adminId, reason = "") => {
  assertId(payoutId, "payout");

  const payout = await SellerPayout.findOneAndUpdate(
    { _id: payoutId, status: "pending" },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: adminId,
        cancellationReason: String(reason || "").trim().slice(0, 1000),
      },
    },
    { returnDocument: "after" }
  );

  if (!payout) throw createError("Only pending seller payouts can be cancelled.", 409);

  return getAdminSellerPayoutById(payout._id);
};
