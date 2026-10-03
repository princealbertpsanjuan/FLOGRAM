import mongoose from "mongoose";

/*
 * A customer following a florist shop.
 * One document per (customer, florist).
 */
const shopFollowSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    florist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Florist",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

shopFollowSchema.index({ customer: 1, florist: 1 }, { unique: true });

const ShopFollow = mongoose.model("ShopFollow", shopFollowSchema);

export default ShopFollow;
