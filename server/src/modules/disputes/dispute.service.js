import mongoose from "mongoose";

import User from "../auth/auth.model.js";
import Delivery from "../deliveries/delivery.model.js";
import Order from "../orders/order.model.js";
import { createNotification } from "../notifications/notification.service.js";

import Dispute, { DISPUTE_ACTIONS, DISPUTE_REASONS } from "./dispute.model.js";

/*
 * =========================================================
 * DISPUTES
 * =========================================================
 */

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(String(id || ""))) {
    throw createError(`A valid ${label} is required.`);
  }
};

export const REASON_LABELS = {
  item_not_received: "Item not received",
  wrong_item: "Wrong item",
  damaged_or_wilted: "Damaged or wilted flowers",
  not_as_described: "Not as described",
  late_delivery: "Late delivery",
  payment_issue: "Payment issue",
  rude_behavior: "Rude or unsafe behavior",
  customer_unavailable: "Customer unavailable",
  other: "Other",
};

const safeNotify = async (payload) => {
  try {
    await createNotification(payload);
  } catch (error) {
    console.error("Dispute notification failed:", error.message);
  }
};

const notifyAdmins = async ({ title, message, order, metadata }) => {
  const admins = await User.find({ role: "admin", accountStatus: "active" }).select("_id").lean();

  await Promise.all(
    admins.map((admin) =>
      safeNotify({ recipient: admin._id, role: "admin", type: "dispute_update", title, message, order, metadata })
    )
  );
};

/*
 * Who took part in an order: customer, seller, rider.
 */
const getOrderParties = async (order) => {
  const delivery = await Delivery.findOne({ order: order._id, status: { $ne: "cancelled" } })
    .sort({ createdAt: -1 })
    .select("riderUser")
    .lean();

  return {
    customer: order.customer ? String(order.customer) : null,
    seller: order.seller ? String(order.seller) : null,
    rider: delivery?.riderUser ? String(delivery.riderUser) : null,
  };
};

const DISPUTE_POPULATE = [
  { path: "order", select: "_id productName orderStatus totalAmount paymentMethod fulfillmentType createdAt" },
  { path: "florist", select: "_id shopName" },
  { path: "filedBy", select: "_id firstName lastName email role" },
  { path: "againstUser", select: "_id firstName lastName email role accountStatus" },
  { path: "resolvedBy", select: "_id firstName lastName" },
  { path: "messages.author", select: "_id firstName lastName role" },
];

const findPopulated = (filter) => {
  let query = Dispute.find(filter).sort({ createdAt: -1 });
  DISPUTE_POPULATE.forEach((populate) => {
    query = query.populate(populate);
  });
  return query.lean();
};

const findOnePopulated = async (disputeId) => {
  let query = Dispute.findById(disputeId);
  DISPUTE_POPULATE.forEach((populate) => {
    query = query.populate(populate);
  });
  return query.lean();
};

/*
 * =========================================================
 * FILE A DISPUTE (customer / seller / rider)
 * =========================================================
 */
export const fileDispute = async (user, input = {}, imagePaths = []) => {
  assertId(input.orderId, "order");

  const reason = String(input.reason || "").trim();
  const details = String(input.details || "").trim();

  if (!DISPUTE_REASONS.includes(reason)) {
    throw createError("Choose a valid reason for this report.");
  }

  if (details.length < 10) {
    throw createError("Please describe the problem in at least 10 characters.");
  }

  const order = await Order.findById(input.orderId).select("_id customer seller florist productName orderStatus").lean();

  if (!order) {
    throw createError("Order was not found.", 404);
  }

  const parties = await getOrderParties(order);

  if (parties[user.role] !== String(user.userId)) {
    throw createError("You can only report an order you took part in.", 403);
  }

  const allowedAgainst = ["customer", "seller", "rider", "platform"].filter(
    (party) => party !== user.role && (party === "platform" || parties[party])
  );

  const against = String(input.against || "").trim() || (user.role === "customer" ? "seller" : "customer");

  if (!allowedAgainst.includes(against)) {
    throw createError(`You can report the ${allowedAgainst.join(", ")} for this order.`);
  }

  const existing = await Dispute.findOne({
    order: order._id,
    filedBy: user.userId,
    status: { $in: ["open", "under_review"] },
  }).lean();

  if (existing) {
    throw createError("You already have an open report for this order.", 409);
  }

  const dispute = await Dispute.create({
    order: order._id,
    florist: order.florist || null,
    filedBy: user.userId,
    filedByRole: user.role,
    against,
    againstUser: against === "platform" ? null : parties[against],
    reason,
    details,
    images: imagePaths.slice(0, 3),
  });

  await notifyAdmins({
    title: "New dispute filed",
    message: `A ${user.role} reported "${REASON_LABELS[reason]}" on order ${order.productName || ""}.`.trim(),
    order: order._id,
    metadata: { disputeId: String(dispute._id) },
  });

  return findOnePopulated(dispute._id);
};

export const getMyDisputes = async (userId) => findPopulated({ filedBy: userId });

export const getDisputeForUser = async (user, disputeId) => {
  assertId(disputeId, "dispute");

  const dispute = await findOnePopulated(disputeId);

  if (!dispute) {
    throw createError("Dispute was not found.", 404);
  }

  const involved = [dispute.filedBy?._id, dispute.againstUser?._id].map((id) => String(id || ""));

  if (user.role !== "admin" && !involved.includes(String(user.userId))) {
    throw createError("You are not allowed to view this dispute.", 403);
  }

  return dispute;
};

/*
 * Party or Admin adds a message to the thread.
 */
export const addDisputeMessage = async (user, disputeId, text) => {
  const dispute = await getDisputeForUser(user, disputeId);
  const message = String(text || "").trim();

  if (!message) {
    throw createError("Message cannot be empty.");
  }

  if (["resolved", "rejected"].includes(dispute.status)) {
    throw createError("This dispute is already closed.", 409);
  }

  await Dispute.updateOne(
    { _id: dispute._id },
    { $push: { messages: { author: user.userId, authorRole: user.role, message: message.slice(0, 2000) } } }
  );

  if (user.role === "admin" && dispute.filedBy?._id) {
    await safeNotify({
      recipient: dispute.filedBy._id,
      role: dispute.filedByRole,
      type: "dispute_update",
      title: "Admin replied to your report",
      message: message.slice(0, 160),
      order: dispute.order?._id || null,
      metadata: { disputeId: String(dispute._id) },
    });
  } else if (user.role !== "admin") {
    await notifyAdmins({
      title: "New message on a dispute",
      message: message.slice(0, 160),
      order: dispute.order?._id || null,
      metadata: { disputeId: String(dispute._id) },
    });
  }

  return findOnePopulated(dispute._id);
};

/*
 * =========================================================
 * ADMIN
 * =========================================================
 */
export const getAdminDisputes = async ({ status = null } = {}) => {
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  const [disputes, counts] = await Promise.all([
    findPopulated(filter),
    Dispute.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  return {
    disputes,
    counts: Object.fromEntries(counts.map((entry) => [entry._id, entry.count])),
  };
};

export const updateDisputeStatus = async (adminId, disputeId, input = {}) => {
  assertId(disputeId, "dispute");

  const status = String(input.status || "").trim();

  if (!["under_review", "resolved", "rejected"].includes(status)) {
    throw createError("Status must be under_review, resolved or rejected.");
  }

  const dispute = await Dispute.findById(disputeId);

  if (!dispute) {
    throw createError("Dispute was not found.", 404);
  }

  if (["resolved", "rejected"].includes(dispute.status)) {
    throw createError("This dispute is already closed.", 409);
  }

  const resolution = String(input.resolution || "").trim();

  if (status !== "under_review" && resolution.length < 5) {
    throw createError("Write the decision so both sides understand the outcome.");
  }

  const resolutionAction = String(input.resolutionAction || "none").trim();

  if (!DISPUTE_ACTIONS.includes(resolutionAction)) {
    throw createError("Invalid resolution action.");
  }

  dispute.status = status;

  if (status !== "under_review") {
    dispute.resolution = resolution;
    dispute.resolutionAction = status === "resolved" ? resolutionAction : "none";
    dispute.resolvedBy = adminId;
    dispute.resolvedAt = new Date();
  }

  await dispute.save();

  const titles = {
    under_review: "Your report is under review",
    resolved: "Your report was resolved",
    rejected: "Your report was closed",
  };

  await safeNotify({
    recipient: dispute.filedBy,
    role: dispute.filedByRole,
    type: "dispute_update",
    title: titles[status],
    message: status === "under_review" ? "Admin is now looking into your report." : resolution.slice(0, 200),
    order: dispute.order,
    metadata: { disputeId: String(dispute._id) },
  });

  if (status !== "under_review" && dispute.againstUser) {
    const against = await User.findById(dispute.againstUser).select("_id role").lean();

    if (against) {
      await safeNotify({
        recipient: against._id,
        role: against.role,
        type: "dispute_update",
        title: "A report about your order was decided",
        message: resolution.slice(0, 200),
        order: dispute.order,
        metadata: { disputeId: String(dispute._id) },
      });
    }
  }

  return findOnePopulated(dispute._id);
};
