import { Router } from "express";

import {
  getDashboard,
  getReports,
  getSettings,
  updateSettings,
} from "./admin.controller.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const adminRouter = Router();

/*
 * =========================================================
 * ADMIN DASHBOARD
 * =========================================================
 *
 * GET /api/v1/admin/dashboard
 * ADMIN ONLY
 *
 * =========================================================
 */

adminRouter.get(
  "/dashboard",
  authenticate,
  authorize("admin"),
  getDashboard
);

/*
 * =========================================================
 * ADMIN REPORTS & ANALYTICS
 * =========================================================
 *
 * GET /api/v1/admin/reports
 *
 * Optional periods:
 *
 * ?period=7d
 * ?period=30d
 * ?period=6m
 * ?period=1y
 * ?period=all
 *
 * ADMIN ONLY
 *
 * =========================================================
 */

adminRouter.get(
  "/reports",
  authenticate,
  authorize("admin"),
  getReports
);

/*
 * =========================================================
 * ADMIN SETTINGS
 * =========================================================
 *
 * GET /api/v1/admin/settings
 *
 * Retrieves the current FLOGRAM platform settings.
 *
 * ADMIN ONLY
 *
 * =========================================================
 */

adminRouter.get(
  "/settings",
  authenticate,
  authorize("admin"),
  getSettings
);

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
 *
 * =========================================================
 */

adminRouter.patch(
  "/settings",
  authenticate,
  authorize("admin"),
  updateSettings
);

export default adminRouter; 