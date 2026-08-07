import mongoose from "mongoose";

const riderSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    address: {
      street: {
        type: String,
        required: true,
        trim: true,
      },

      barangay: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      province: {
        type: String,
        required: true,
        trim: true,
      },

      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    vehicleType: {
      type: String,
      required: true,
      trim: true,
      enum: [
        "motorcycle",
        "bicycle",
        "car",
        "van",
        "other",
      ],
    },

    vehiclePlateNumber: {
      type: String,
      trim: true,
      default: "",
    },

    driverLicenseNumber: {
      type: String,
      required: true,
      trim: true,
    },

    emergencyContactName: {
      type: String,
      required: true,
      trim: true,
    },

    emergencyContactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    verificationRemarks: {
      type: String,
      trim: true,
      default: "",
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

    isAvailable: {
      type: Boolean,
      default: false,
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

const Rider = mongoose.model("Rider", riderSchema);

export default Rider;