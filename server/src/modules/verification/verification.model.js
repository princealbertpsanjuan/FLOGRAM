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

    /*
     * Typed details checked against the uploaded documents.
     */
    sellerDetails: {
      dtiNumber: { type: String, trim: true, default: "" },
      tinNumber: { type: String, trim: true, default: "" },
      validIdType: { type: String, trim: true, default: "" },
      validIdExpiry: { type: Date, default: null },
    },

    riderDetails: {
      licenseExpiry: { type: Date, default: null },
      policeClearanceIssuedAt: { type: Date, default: null },
    },

    /*
     * SHA-256 + detected type/size of each file. Used to find
     * the same document submitted by another account.
     */
    fingerprints: [
      {
        _id: false,
        documentKey: String,
        sha256: { type: String, index: true },
        detectedType: String,
        width: Number,
        height: Number,
        bytes: Number,
      },
    ],

    /*
     * Automated checks (see requirement-checks.js).
     */
    automatedChecks: [
      {
        _id: false,
        documentKey: String,
        label: String,
        status: { type: String, enum: ["pass", "warning", "fail"] },
        message: String,
      },
    ],

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },

    /*
     * Admin's decision per document: every document must be
     * "accepted" before the account can be approved.
     */
    documentReviews: [
      {
        _id: false,
        documentKey: String,
        decision: { type: String, enum: ["accepted", "needs_resubmission"] },
        note: { type: String, trim: true, default: "" },
      },
    ],

    /*
     * Audit trail: who did what, when.
     */
    history: [
      {
        _id: false,
        action: {
          type: String,
          enum: ["submitted", "resubmitted", "approved", "rejected"],
        },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        at: { type: Date, default: Date.now },
        remarks: { type: String, default: "" },
        riskLevel: { type: String, default: "" },
      },
    ],

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