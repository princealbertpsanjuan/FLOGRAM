import mongoose from "mongoose";

/*
 * =========================================================
 * SELLER PAYOUT
 * =========================================================
 *
 * Seller earnings = product sales − platform commission.
 *
 * Product sales of an order = totalAmount − deliveryFee
 * (the delivery fee belongs to the Rider).
 *
 * Money held by FLOGRAM (online payments, COD remitted by
 * a Rider) is paid out to the Seller. Cash on Pickup is
 * collected by the Seller directly, so only its commission
 * is deducted from the payout.
 * =========================================================
 */

const sellerPayoutItemSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    productName: { type: String, default: "" },
    paymentMethod: { type: String, default: "" },
    collectedBySeller: { type: Boolean, default: false },
    grossAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0 },
    commission: { type: Number, required: true, min: 0 },
    /*
     * Amount this order adds to the payout.
     * Negative for Cash on Pickup (commission owed).
     */
    netAmount: { type: Number, required: true },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const sellerPayoutSchema = new mongoose.Schema(
  {
    florist: { type: mongoose.Schema.Types.ObjectId, ref: "Florist", required: true, index: true },
    sellerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    items: { type: [sellerPayoutItemSchema], default: [] },
    grossSales: { type: Number, required: true, min: 0, default: 0 },
    totalCommission: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending", index: true },
    paymentMethod: { type: String, trim: true, default: "", maxlength: 100 },
    referenceNumber: { type: String, trim: true, default: "", maxlength: 200 },
    proofImageUrl: { type: String, trim: true, default: null },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    adminRemarks: { type: String, trim: true, default: "", maxlength: 2000 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    cancellationReason: { type: String, trim: true, default: "", maxlength: 1000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, versionKey: false }
);

sellerPayoutSchema.index({ florist: 1, createdAt: -1 });
sellerPayoutSchema.index({ "items.order": 1, status: 1 });

const SellerPayout = mongoose.model("SellerPayout", sellerPayoutSchema);

export default SellerPayout;
