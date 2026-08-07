import mongoose from "mongoose";

const floristSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    shopName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    address: {
      street: {
        type: String,
        trim: true,
        required: true,
      },

      barangay: {
        type: String,
        trim: true,
        required: true,
      },

      city: {
        type: String,
        trim: true,
        required: true,
      },

      province: {
        type: String,
        trim: true,
        required: true,
      },

      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    businessEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    shopLogo: {
      type: String,
      default: null,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    verificationRemarks: {
      type: String,
      default: "",
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

const Florist = mongoose.model("Florist", floristSchema);

export default Florist;