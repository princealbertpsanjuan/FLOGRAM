import mongoose from "mongoose";

/*
 * =========================================================
 * ADMIN / PLATFORM SETTINGS MODEL
 * =========================================================
 *
 * FLOGRAM uses one platform-wide settings document.
 *
 * IMPORTANT:
 * - commissionRate is stored as a decimal.
 * - Example:
 *     0.15 = 15%
 *     0.10 = 10%
 *
 * This collection is intended for settings that genuinely
 * affect platform behavior.
 * =========================================================
 */

const adminSettingsSchema = new mongoose.Schema(
  {
    /*
     * =====================================================
     * PLATFORM IDENTITY
     * =====================================================
     */

    platformName: {
      type: String,
      trim: true,
      default: "FLOGRAM",
      maxlength: [
        100,
        "Platform name cannot exceed 100 characters.",
      ],
    },

    /*
     * =====================================================
     * FINANCIAL SETTINGS
     * =====================================================
     */

    commissionRate: {
      type: Number,
      default: 0.15,
      min: [
        0,
        "Commission rate cannot be less than 0%.",
      ],
      max: [
        1,
        "Commission rate cannot exceed 100%.",
      ],
    },

    /*
     * =====================================================
     * SYSTEM INFORMATION
     * =====================================================
     */

    appVersion: {
      type: String,
      trim: true,
      default: "1.0.0",
      maxlength: [
        30,
        "Application version cannot exceed 30 characters.",
      ],
    },

    /*
     * =====================================================
     * AUDIT INFORMATION
     * =====================================================
     */

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/*
 * =========================================================
 * SINGLETON KEY
 * =========================================================
 *
 * There should only be one active platform settings
 * document.
 *
 * A constant key makes it possible to safely retrieve or
 * create that single document without depending on a
 * hard-coded MongoDB ObjectId.
 * =========================================================
 */

adminSettingsSchema.add({
  settingsKey: {
    type: String,
    default: "platform",
    unique: true,
    immutable: true,
  },
});

/*
 * =========================================================
 * JSON OUTPUT
 * =========================================================
 *
 * Add commissionPercentage for the frontend while keeping
 * commissionRate as the actual stored decimal value.
 * =========================================================
 */

adminSettingsSchema.methods.toJSON =
  function toJSON() {
    const settings =
      this.toObject();

    settings.commissionPercentage =
      Math.round(
        Number(
          settings.commissionRate || 0
        ) * 10000
      ) / 100;

    return settings;
  };

const AdminSettings =
  mongoose.model(
    "AdminSettings",
    adminSettingsSchema
  );

export default AdminSettings;