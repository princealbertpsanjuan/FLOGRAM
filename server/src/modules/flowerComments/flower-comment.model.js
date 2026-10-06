import mongoose from "mongoose";

/*
 * =========================================================
 * LISTING COMMENTS
 * =========================================================
 *
 * Public comments and questions on a bouquet listing.
 * Customers ask or comment; the shop that owns the listing
 * can reply (shown as "Shop").
 * =========================================================
 */
const flowerCommentSchema = new mongoose.Schema(
  {
    flower: { type: mongoose.Schema.Types.ObjectId, ref: "Flower", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["customer", "seller"], required: true },
    text: { type: String, trim: true, required: true, minlength: 1, maxlength: 500 },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

flowerCommentSchema.index({ flower: 1, createdAt: -1 });

const FlowerComment = mongoose.model("FlowerComment", flowerCommentSchema);

export default FlowerComment;
