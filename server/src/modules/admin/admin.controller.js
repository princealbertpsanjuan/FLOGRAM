import {
  getAdminDashboard,
} from "./admin.service.js";

import {
  getAdminReports,
} from "./admin-report.service.js";

import {
  getAdminSettings,
  updateAdminSettings,
} from "./admin-settings.service.js";

/*
 * =========================================================
 * GET ADMIN DASHBOARD
 * =========================================================
 *
 * GET /api/v1/admin/dashboard
 *
 * ADMIN ONLY
 * =========================================================
 */

export const getDashboard =
  async (req, res, next) => {
    try {
      const dashboard =
        await getAdminDashboard();

      return res.status(200).json({
        success: true,

        message:
          "Admin dashboard retrieved successfully.",

        data:
          dashboard,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * GET ADMIN REPORTS & ANALYTICS
 * =========================================================
 *
 * GET /api/v1/admin/reports
 *
 * Optional query:
 *
 * ?period=7d
 * ?period=30d
 * ?period=6m
 * ?period=1y
 * ?period=all
 *
 * ADMIN ONLY
 * =========================================================
 */

export const getReports =
  async (req, res, next) => {
    try {
      const {
        period = "30d",
      } = req.query;

      const reports =
        await getAdminReports(
          period
        );

      return res.status(200).json({
        success: true,

        message:
          "Admin reports and analytics retrieved successfully.",

        data:
          reports,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * GET ADMIN SETTINGS
 * =========================================================
 *
 * GET /api/v1/admin/settings
 *
 * ADMIN ONLY
 * =========================================================
 */

export const getSettings =
  async (req, res, next) => {
    try {
      const settings =
        await getAdminSettings();

      return res.status(200).json({
        success: true,

        message:
          "Admin settings retrieved successfully.",

        data:
          settings,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * UPDATE ADMIN SETTINGS
 * =========================================================
 *
 * PATCH /api/v1/admin/settings
 *
 * Supported fields:
 *
 * {
 *   "platformName": "FLOGRAM",
 *   "commissionPercentage": 15,
 *   "appVersion": "1.0.0"
 * }
 *
 * ADMIN ONLY
 * =========================================================
 */

export const updateSettings =
  async (req, res, next) => {
    try {
      const settings =
        await updateAdminSettings(
          req.body,
          req.user.userId
        );

      return res.status(200).json({
        success: true,

        message:
          "Admin settings updated successfully.",

        data:
          settings,
      });
    } catch (error) {
      next(error);
    }
  };