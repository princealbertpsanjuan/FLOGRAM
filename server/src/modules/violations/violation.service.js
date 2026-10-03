import mongoose from "mongoose";

import User from "../auth/auth.model.js";
import Dispute from "../disputes/dispute.model.js";
import { createNotification } from "../notifications/notification.service.js";

import PolicyViolation, { PENALTIES, VIOLATION_TYPES } from "./violation.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const VIOLATION_LABELS = {
  fraudulent_order: "Fraudulent order",
  fake_or_misleading_listing: "Fake or misleading listing",
  poor_product_quality: "Poor product quality",
  repeated_cancellation: "Repeated cancellations",
  late_or_failed_delivery: "Late or failed delivery",
  cod_remittance_issue: "COD remittance issue",
  abusive_behavior: "Abusive behavior",
  inappropriate_content: "Inappropriate content",
  payment_abuse: "Payment abuse",
  other: "Other",
};

const POPULATE = [
  { path: "user", select: "_id firstName lastName email role accountStatus suspendedUntil" },
  { path: "issuedBy", select: "_id firstName lastName" },
  { path: "liftedBy", select: "_id firstName lastName" },
];

const populate = (query) => POPULATE.reduce((current, item) => current.populate(item), query);

/*
 * Re-apply the strongest active penalty to the account.
 */
const syncAccountStatus = async (userId) => {
  const user = await User.findById(userId);

  if (!user) return null;

  const active = await PolicyViolation.find({
    user: userId,
    status: "active",
    penalty: { $in: ["suspension", "ban"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const ban = active.find((item) => item.penalty === "ban");
  const suspensions = active.filter(
    (item) => item.penalty === "suspension" && item.suspendedUntil && new Date(item.suspendedUntil) > new Date()
  );

  if (ban) {
    user.accountStatus = "banned";
    user.suspendedUntil = null;
    user.suspensionReason = ban.description;
  } else if (suspensions.length) {
    const longest = suspensions.reduce((a, b) => (new Date(a.suspendedUntil) > new Date(b.suspendedUntil) ? a : b));
    user.accountStatus = "suspended";
    user.suspendedUntil = longest.suspendedUntil;
    user.suspensionReason = longest.description;
  } else if (["suspended", "banned"].includes(user.accountStatus)) {
    user.accountStatus = "active";
    user.suspendedUntil = null;
    user.suspensionReason = "";
  }

  await user.save();
  return user;
};

export const recordViolation = async (adminId, input = {}) => {
  if (!mongoose.Types.ObjectId.isValid(String(input.userId || ""))) {
    throw createError("A valid user is required.");
  }

  const violationType = String(input.violationType || "").trim();
  const penalty = String(input.penalty || "").trim();
  const description = String(input.description || "").trim();

  if (!VIOLATION_TYPES.includes(violationType)) throw createError("Choose a valid violation type.");
  if (!PENALTIES.includes(penalty)) throw createError("Penalty must be warning, suspension or ban.");
  if (description.length < 5) throw createError("Describe the violation (at least 5 characters).");

  const user = await User.findById(input.userId).select("_id role").lean();

  if (!user) throw createError("User was not found.", 404);
  if (user.role === "admin") throw createError("Penalties cannot be issued to Admin accounts.", 403);

  let suspensionDays = null;
  let suspendedUntil = null;

  if (penalty === "suspension") {
    suspensionDays = Math.round(Number(input.suspensionDays));

    if (!Number.isFinite(suspensionDays) || suspensionDays < 1 || suspensionDays > 365) {
      throw createError("Suspension must be between 1 and 365 days.");
    }

    suspendedUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
  }

  let disputeId = null;

  if (input.disputeId && mongoose.Types.ObjectId.isValid(String(input.disputeId))) {
    const dispute = await Dispute.findById(input.disputeId).select("_id order").lean();
    disputeId = dispute?._id || null;
    input.orderId = input.orderId || dispute?.order;
  }

  const violation = await PolicyViolation.create({
    user: user._id,
    userRole: user.role,
    violationType,
    description,
    penalty,
    suspensionDays,
    suspendedUntil,
    dispute: disputeId,
    order: mongoose.Types.ObjectId.isValid(String(input.orderId || "")) ? input.orderId : null,
    issuedBy: adminId,
  });

  await syncAccountStatus(user._id);

  const label = VIOLATION_LABELS[violationType];
  const messages = {
    warning: `You received a warning for: ${label}. ${description}`,
    suspension: `Your account is suspended for ${suspensionDays} day(s) for: ${label}. ${description}`,
    ban: `Your account has been banned for: ${label}. ${description}`,
  };

  try {
    await createNotification({
      recipient: user._id,
      role: user.role,
      type: "account_penalty",
      title: penalty === "warning" ? "Policy warning" : penalty === "suspension" ? "Account suspended" : "Account banned",
      message: messages[penalty].slice(0, 480),
      order: violation.order,
      metadata: { violationId: String(violation._id), penalty },
    });
  } catch (error) {
    console.error("Penalty notification failed:", error.message);
  }

  return populate(PolicyViolation.findById(violation._id)).lean();
};

export const liftViolation = async (adminId, violationId, reason = "") => {
  if (!mongoose.Types.ObjectId.isValid(String(violationId || ""))) {
    throw createError("A valid violation is required.");
  }

  const violation = await PolicyViolation.findById(violationId);

  if (!violation) throw createError("Violation record was not found.", 404);
  if (violation.status === "lifted") throw createError("This penalty was already lifted.", 409);

  violation.status = "lifted";
  violation.liftedBy = adminId;
  violation.liftedAt = new Date();
  violation.liftReason = String(reason || "").trim().slice(0, 500);
  await violation.save();

  const user = await syncAccountStatus(violation.user);

  if (user && violation.penalty !== "warning") {
    try {
      await createNotification({
        recipient: user._id,
        role: user.role,
        type: "account_penalty",
        title: "Penalty lifted",
        message: user.accountStatus === "active" ? "Your account is active again." : "One of your penalties was lifted.",
        metadata: { violationId: String(violation._id) },
      });
    } catch (error) {
      console.error("Penalty notification failed:", error.message);
    }
  }

  return populate(PolicyViolation.findById(violation._id)).lean();
};

export const getViolations = async ({ userId = null, status = null } = {}) => {
  const filter = {};

  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) filter.user = userId;
  if (status && ["active", "lifted"].includes(status)) filter.status = status;

  return populate(PolicyViolation.find(filter).sort({ createdAt: -1 }).limit(200)).lean();
};

/*
 * Signed-in user: own penalty history.
 */
export const getMyViolations = async (userId) =>
  PolicyViolation.find({ user: userId })
    .select("violationType description penalty suspensionDays suspendedUntil status createdAt liftedAt")
    .sort({ createdAt: -1 })
    .lean();
