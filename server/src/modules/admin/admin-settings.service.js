import AdminSettings from "./admin-settings.model.js";

/*
 * =========================================================
 * DEFAULT PLATFORM SETTINGS
 * =========================================================
 *
 * These values are used only when the platform settings
 * document does not exist yet.
 *
 * FLOGRAM's current business model uses a 15% commission
 * on successful orders.
 * =========================================================
 */

const DEFAULT_SETTINGS = {
  settingsKey: "platform",
  platformName: "FLOGRAM",
  commissionRate: 0.15,
  appVersion: "1.0.0",
};

/*
 * =========================================================
 * NUMBER HELPERS
 * =========================================================
 */

const roundPercentage = (value) =>
  Math.round(
    (Number(value || 0) +
      Number.EPSILON) *
      100
  ) / 100;

/*
 * =========================================================
 * FORMAT SETTINGS
 * =========================================================
 *
 * Keep the API response consistent whether the settings
 * came from a Mongoose document or a lean object.
 * =========================================================
 */

const formatSettings = (settings) => {
  if (!settings) {
    return null;
  }

  const source =
    typeof settings.toObject ===
    "function"
      ? settings.toObject()
      : settings;

  const commissionRate =
    Number(
      source.commissionRate || 0
    );

  return {
    _id: source._id,

    platformName:
      source.platformName,

    commissionRate,

    commissionPercentage:
      roundPercentage(
        commissionRate * 100
      ),

    appVersion:
      source.appVersion,

    updatedBy:
      source.updatedBy || null,

    createdAt:
      source.createdAt,

    updatedAt:
      source.updatedAt,
  };
};

/*
 * =========================================================
 * ENSURE PLATFORM SETTINGS EXIST
 * =========================================================
 *
 * The first request automatically creates the default
 * FLOGRAM platform settings.
 *
 * findOneAndUpdate + upsert avoids requiring a manual
 * database seed just to create the initial settings.
 * =========================================================
 */

const ensurePlatformSettings =
  async () => {
    const settings =
      await AdminSettings.findOneAndUpdate(
        {
          settingsKey:
            "platform",
        },
        {
          $setOnInsert:
            DEFAULT_SETTINGS,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return settings;
  };

/*
 * =========================================================
 * GET ADMIN SETTINGS
 * =========================================================
 */

export const getAdminSettings =
  async () => {
    const settings =
      await ensurePlatformSettings();

    return formatSettings(
      settings
    );
  };

/*
 * =========================================================
 * UPDATE ADMIN SETTINGS
 * =========================================================
 *
 * Supported editable platform settings:
 *
 * - platformName
 * - commissionPercentage
 * - appVersion
 *
 * commissionPercentage is accepted from the frontend
 * because it is easier for an Admin to understand:
 *
 *     15 = 15%
 *
 * It is converted before storage:
 *
 *     15 -> 0.15
 * =========================================================
 */

export const updateAdminSettings =
  async (
    settingsData,
    adminId
  ) => {
    const settings =
      await ensurePlatformSettings();

    /*
     * =====================================================
     * PLATFORM NAME
     * =====================================================
     */

    if (
      settingsData.platformName !==
      undefined
    ) {
      const platformName =
        String(
          settingsData.platformName
        ).trim();

      if (!platformName) {
        const error =
          new Error(
            "Platform name cannot be empty."
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        platformName.length >
        100
      ) {
        const error =
          new Error(
            "Platform name cannot exceed 100 characters."
          );

        error.statusCode = 400;

        throw error;
      }

      settings.platformName =
        platformName;
    }

    /*
     * =====================================================
     * COMMISSION RATE
     * =====================================================
     */

    if (
      settingsData
        .commissionPercentage !==
      undefined
    ) {
      const percentage =
        Number(
          settingsData
            .commissionPercentage
        );

      if (
        !Number.isFinite(
          percentage
        )
      ) {
        const error =
          new Error(
            "Commission percentage must be a valid number."
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        percentage < 0 ||
        percentage > 100
      ) {
        const error =
          new Error(
            "Commission percentage must be between 0 and 100."
          );

        error.statusCode = 400;

        throw error;
      }

      settings.commissionRate =
        percentage / 100;
    }

    /*
     * =====================================================
     * APPLICATION VERSION
     * =====================================================
     */

    if (
      settingsData.appVersion !==
      undefined
    ) {
      const appVersion =
        String(
          settingsData.appVersion
        ).trim();

      if (!appVersion) {
        const error =
          new Error(
            "Application version cannot be empty."
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        appVersion.length > 30
      ) {
        const error =
          new Error(
            "Application version cannot exceed 30 characters."
          );

        error.statusCode = 400;

        throw error;
      }

      settings.appVersion =
        appVersion;
    }

    /*
     * =====================================================
     * AUDIT
     * =====================================================
     */

    settings.updatedBy =
      adminId || null;

    await settings.save();

    return formatSettings(
      settings
    );
  };

/*
 * =========================================================
 * GET PLATFORM COMMISSION RATE
 * =========================================================
 *
 * Other backend modules can use this later instead of
 * hard-coding 0.15.
 *
 * Example:
 *
 * const commissionRate =
 *   await getPlatformCommissionRate();
 *
 * const commission =
 *   sales * commissionRate;
 *
 * We will connect the Admin Dashboard and Reports to this
 * after the Settings API itself is working.
 * =========================================================
 */

export const getPlatformCommissionRate =
  async () => {
    const settings =
      await ensurePlatformSettings();

    const rate =
      Number(
        settings.commissionRate
      );

    if (
      !Number.isFinite(rate)
    ) {
      return 0.15;
    }

    return rate;
  };