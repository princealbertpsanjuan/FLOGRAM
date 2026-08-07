import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    role: {
      type: String,
      enum: ["seller", "rider"],
      required: true,
    },

    sellerDocuments: {
      validId: {
        type: String,
        default: null,
      },
      dtiRegistration: {
        type: String,
        default: null,
      },
      birDocument: {
        type: String,
        default: null,
      },
      bankProof: {
        type: String,
        default: null,
      },
      shopLogo: {
        type: String,
        default: null,
      },
    },

    riderDocuments: {
      driverLicense: {
        type: String,
        default: null,
      },
      orcr: {
        type: String,
        default: null,
      },
      policeClearance: {
        type: String,
        default: null,
      },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Verification = mongoose.model(
  "Verification",
  verificationSchema
);

export default Verification;