import mongoose from "mongoose";

const flowerSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    florist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Florist",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    occasion: {
      type: [String],
      default: [],
    },

    flowerTypes: {
      type: [String],
      default: [],
    },

    colors: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    imageEmbedding: {
      type: [Number],
      default: [],
    },

    embeddingModel: {
      type: String,
      default: null,
    },

    isAvailable: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    /*
     * Set when the FLOGRAM Admin hides the listing
     * (isActive is false too). Lets the seller still see
     * it with the reason, and keeps "removed by seller"
     * listings from being restored by mistake.
     */
    hiddenByAdmin: {
      type: Boolean,
      default: false,
    },

    adminHiddenReason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Flower = mongoose.model(
  "Flower",
  flowerSchema
);

export default Flower;