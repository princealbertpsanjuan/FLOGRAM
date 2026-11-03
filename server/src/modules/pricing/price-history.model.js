import mongoose from "mongoose";

/*
 * =========================================================
 * PRICE HISTORY (append-only)
 * =========================================================
 *
 * One record every time a bouquet listing or gift add-on is
 * created or its price changes. Records are never edited or
 * deleted, so the history can be audited:
 *
 *  - customers see how a bouquet's price moved (e.g. before
 *    and during Valentine's season)
 *  - sellers see what they sold at each price
 *  - Admin is alerted about sudden large increases
 *
 * Orders keep their own unitPrice snapshot, so a later price
 * change never alters a past transaction.
 * =========================================================
 */

const priceHistorySchema = new mongoose.Schema(
  {
    itemType: {
      type: String,
      enum: ["flower", "addon"],
      required: true,
    },

    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "itemModel",
      index: true,
    },

    itemModel: {
      type: String,
      enum: ["Flower", "GiftAddOn"],
      required: true,
    },

    itemName: {
      type: String,
      trim: true,
      default: "",
    },

    florist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Florist",
      required: true,
      index: true,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    event: {
      type: String,
      enum: ["created", "updated"],
      required: true,
    },

    // null when the item was just created
    oldPrice: {
      type: Number,
      default: null,
    },

    newPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    change: {
      type: Number,
      default: 0,
    },

    changePercent: {
      type: Number,
      default: 0,
    },

    // e.g. "large_increase" when the price jumps 50% or more
    flags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

priceHistorySchema.index({ item: 1, createdAt: -1 });

/*
 * Append-only: block updates and deletes through Mongoose.
 */
const blockChange = function () {
  throw new Error("Price history records cannot be changed.");
};

priceHistorySchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete", "replaceOne"],
  blockChange
);

const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema);

export default PriceHistory;
