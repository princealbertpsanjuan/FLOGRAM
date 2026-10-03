import mongoose from "mongoose";

/*
 * =========================================================
 * POLICY VIOLATION + PENALTY
 * =========================================================
 *
 * Admin records a violation against a Customer, Seller or
 * Rider and chooses the penalty:
 *
 * warning     -> notice only, account stays active
 * suspension  -> account blocked until suspendedUntil
 * ban         -> account permanently blocked
 * =========================================================
 */

export const VIOLATION_TYPES = [
  "fraudulent_order",
  "fake_or_misleading_listing",
  "poor_product_quality",
  "repeated_cancellation",
  "late_or_failed_delivery",
  "cod_remittance_issue",
  "abusive_behavior",
  "inappropriate_content",
  "payment_abuse",
  "other",
];

export const PENALTIES = ["warning", "suspension", "ban"];

const violationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    userRole: { type: String, enum: ["customer", "seller", "rider"], required: true },

    violationType: { type: String, enum: VIOLATION_TYPES, required: true },

    description: { type: String, trim: true, required: true, minlength: 5, maxlength: 1000 },

    penalty: { type: String, enum: PENALTIES, required: true },

    suspensionDays: { type: Number, default: null, min: 1, max: 365 },

    suspendedUntil: { type: Date, default: null },

    dispute: { type: mongoose.Schema.Types.ObjectId, ref: "Dispute", default: null },

    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },

    status: { type: String, enum: ["active", "lifted"], default: "active", index: true },

    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    liftedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    liftedAt: { type: Date, default: null },

    liftReason: { type: String, trim: true, default: "", maxlength: 500 },
  },
  { timestamps: true, versionKey: false }
);

const PolicyViolation = mongoose.model("PolicyViolation", violationSchema);

export default PolicyViolation;
