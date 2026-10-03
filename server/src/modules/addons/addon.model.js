import mongoose from "mongoose";

/*
 * =========================================================
 * GIFT ADD-ON
 * =========================================================
 *
 * Optional extras a florist sells with a bouquet:
 * chocolates, teddy bears, balloons, greeting cards, …
 * Priced per piece; the customer picks them per cart line.
 * =========================================================
 */

export const ADD_ON_CATEGORIES = [
  "chocolate",
  "teddy_bear",
  "balloon",
  "greeting_card",
  "other",
];

const giftAddOnSchema = new mongoose.Schema(
  {
    florist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Florist",
      required: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Add-on name is required."],
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300,
    },
    category: {
      type: String,
      enum: ADD_ON_CATEGORIES,
      default: "other",
    },
    price: {
      type: Number,
      required: [true, "Add-on price is required."],
      min: [0, "Add-on price cannot be negative."],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const GiftAddOn = mongoose.model("GiftAddOn", giftAddOnSchema);

export default GiftAddOn;
