import {
  Router,
} from "express";

import {
  approve,
  createMyRiderProfile,
  getDashboard,
  getMyProfile,
  getPending,
  getRider,
  getWallet,
  reject,
  submitRemittance,
  updateAvailability,
  updateMyProfile,
} from "./rider.controller.js";

import {
  rejectRiderValidation,
  riderAvailabilityValidation,
  riderProfileValidation,
  updateRiderValidation,
  validateRiderRequest,
} from "./rider.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import {
  riderRemittanceProofUpload,
} from "../../middleware/upload.js";

const riderRouter =
  Router();

/*
 * =========================================================
 * RIDER ROUTES
 * =========================================================
 */

/*
 * =========================================================
 * CREATE RIDER PROFILE
 *
 * POST
 * /api/v1/riders/profile
 * =========================================================
 */

riderRouter.post(
  "/profile",
  authenticate,
  authorize("rider"),
  riderProfileValidation,
  validateRiderRequest,
  createMyRiderProfile
);

/*
 * =========================================================
 * GET RIDER PROFILE
 *
 * GET
 * /api/v1/riders/profile
 * =========================================================
 */

riderRouter.get(
  "/profile",
  authenticate,
  authorize("rider"),
  getMyProfile
);

/*
 * =========================================================
 * UPDATE RIDER PROFILE
 *
 * PATCH
 * /api/v1/riders/profile
 * =========================================================
 */

riderRouter.patch(
  "/profile",
  authenticate,
  authorize("rider"),
  updateRiderValidation,
  validateRiderRequest,
  updateMyProfile
);

/*
 * =========================================================
 * RIDER DASHBOARD
 *
 * GET
 * /api/v1/riders/me/dashboard
 *
 * Returns:
 *
 * - Rider information
 * - availability
 * - delivery statistics
 * - delivery value
 * - rating
 *
 * IMPORTANT:
 *
 * Delivery Value is NOT Rider salary.
 * =========================================================
 */

riderRouter.get(
  "/me/dashboard",
  authenticate,
  authorize("rider"),
  getDashboard
);

/*
 * =========================================================
 * RIDER WALLET
 *
 * GET
 * /api/v1/riders/me/wallet
 *
 * Returns:
 *
 * - cash collected today
 * - total COD collected
 * - pending remittance
 * - submitted remittance
 * - verified remittance
 * - rejected remittance
 * - Rider delivery/payment transactions
 *
 * IMPORTANT:
 *
 * Rider Wallet represents COD cash handled
 * during deliveries.
 *
 * It does NOT represent Rider salary or
 * Rider earnings.
 *
 * PayMongo transactions are displayed for
 * transaction history but do NOT create
 * Rider remittance obligations.
 * =========================================================
 */

riderRouter.get(
  "/me/wallet",
  authenticate,
  authorize("rider"),
  getWallet
);

/*
 * =========================================================
 * RIDER
 * SUBMIT COD REMITTANCE
 *
 * PATCH
 * /api/v1/riders/me/remittances/:remittanceId/submit
 *
 * BODY:
 *
 * {
 *   "referenceNumber": "REM-001",
 *   "proofImageUrl": "https://...",
 *   "riderRemarks": "Optional remarks"
 * }
 *
 * ALLOWED STATUS:
 *
 * pending
 *    ↓
 * submitted
 *
 * rejected
 *    ↓
 * submitted
 *
 * NOT ALLOWED:
 *
 * submitted → submitted
 * verified  → submitted
 *
 * Admin verification will be handled
 * separately.
 * =========================================================
 */

riderRouter.patch(
  "/me/remittances/:remittanceId/submit",
  authenticate,
  authorize("rider"),
  riderRemittanceProofUpload.single(
    "proofImage"
  ),
  submitRemittance
);

/*
 * =========================================================
 * RIDER AVAILABILITY
 *
 * PATCH
 * /api/v1/riders/me/availability
 *
 * BODY:
 *
 * {
 *   "isAvailable": true
 * }
 *
 * Rider can manually go online/offline.
 *
 * Rider cannot become available while
 * handling an active delivery.
 * =========================================================
 */

riderRouter.patch(
  "/me/availability",
  authenticate,
  authorize("rider"),
  riderAvailabilityValidation,
  validateRiderRequest,
  updateAvailability
);

/*
 * =========================================================
 * ADMIN ROUTES
 * =========================================================
 *
 * IMPORTANT:
 *
 * ALL STATIC RIDER ROUTES MUST REMAIN
 * ABOVE "/:riderId".
 *
 * Otherwise Express may interpret:
 *
 * /me/wallet
 * /me/dashboard
 * /me/availability
 * /me/remittances/...
 * /pending
 *
 * as:
 *
 * riderId = "me"
 *
 * or:
 *
 * riderId = "pending"
 * =========================================================
 */

/*
 * =========================================================
 * GET PENDING RIDERS
 *
 * GET
 * /api/v1/riders/pending
 * =========================================================
 */

riderRouter.get(
  "/pending",
  authenticate,
  authorize("admin"),
  getPending
);

/*
 * =========================================================
 * GET ONE RIDER
 *
 * GET
 * /api/v1/riders/:riderId
 * =========================================================
 */

riderRouter.get(
  "/:riderId",
  authenticate,
  authorize("admin"),
  getRider
);

/*
 * =========================================================
 * APPROVE RIDER
 *
 * PATCH
 * /api/v1/riders/:riderId/approve
 * =========================================================
 */

riderRouter.patch(
  "/:riderId/approve",
  authenticate,
  authorize("admin"),
  approve
);

/*
 * =========================================================
 * REJECT RIDER
 *
 * PATCH
 * /api/v1/riders/:riderId/reject
 * =========================================================
 */

riderRouter.patch(
  "/:riderId/reject",
  authenticate,
  authorize("admin"),
  rejectRiderValidation,
  validateRiderRequest,
  reject
);

export default riderRouter;