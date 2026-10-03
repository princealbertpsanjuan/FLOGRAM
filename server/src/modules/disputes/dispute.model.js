import mongoose from "mongoose";

/*
 * =========================================================
 * DISPUTE
 * =========================================================
 *
 * A complaint about one order, filed by a party to that
 * order (Customer, Seller or Rider) and resolved by Admin.
 *
 * open         -> filed, waiting for Admin
 * under_review -> Admin is investigating
 * resolved     -> Admin decided (see resolutionAction)
 * rejected     -> Admin found no basis
 * =========================================================
 */

export const DISPUTE_REASONS = [
  "item_not_received",
  "wrong_item",
  "damaged_or_wilted",
  "not_as_described",
  "late_delivery",
  "payment_issue",
  "rude_behavior",
  "customer_unavailable",
  "other",
];

export const DISPUTE_STATUSES = ["open", "under_review", "resolved", "rejected"];

export const DISPUTE_ACTIONS = [
  "none",
  "refund",
  "partial_refund",
  "replacement",
  "penalty_issued",
  "other",
];

const disputeMessageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["customer", "seller", "rider", "admin"], required: true },
    message: { type: String, trim: true, required: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },

    florist: { type: mongoose.Schema.Types.ObjectId, ref: "Florist", default: null, index: true },

    filedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    filedByRole: { type: String, enum: ["customer", "seller", "rider"], required: true },

    /*
     * Who the complaint is about.
     */
    against: { type: String, enum: ["customer", "seller", "rider", "platform"], required: true },

    againstUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    reason: { type: String, enum: DISPUTE_REASONS, required: true },

    details: { type: String, trim: true, required: true, minlength: 10, maxlength: 2000 },

    images: { type: [String], default: [] },

    status: { type: String, enum: DISPUTE_STATUSES, default: "open", index: true },

    resolutionAction: { type: String, enum: DISPUTE_ACTIONS, default: "none" },

    resolution: { type: String, trim: true, default: "", maxlength: 2000 },

    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    resolvedAt: { type: Date, default: null },

    messages: { type: [disputeMessageSchema], default: [] },
  },
  { timestamps: true, versionKey: false }
);

/*
 * One open complaint per person per order.
 */
disputeSchema.index(
  { order: 1, filedBy: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["open", "under_review"] } } }
);

const Dispute = mongoose.model("Dispute", disputeSchema);

export default Dispute;
