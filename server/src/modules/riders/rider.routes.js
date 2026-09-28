import {
  Router,
} from "express";

import {
  approve,
  createMyRiderProfile,
  getDashboard,
  getMyProfile,
  getPending,
  getRemittance,
  getRemittances,
  getRider,
  getWallet,
  reject,
  rejectRemittance,
  submitRemittance,
  updateAvailability,
  updateMyProfile,
  verifyRemittance,
} from "./rider.controller.js";

import {
  rejectRemittanceValidation,
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
 * FORM DATA:
 *
 * referenceNumber
 * riderRemarks
 * proofImage
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
 * Admin verification is handled separately.
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
 * Otherwise Express may interpret static
 * route names as rider IDs.
 * =========================================================
 */

/*
 * =========================================================
 * ADMIN
 * GET RIDER REMITTANCES
 *
 * GET
 * /api/v1/riders/remittances
 *
 * Optional:
 *
 * ?status=pending
 * ?status=submitted
 * ?status=verified
 * ?status=rejected
 * =========================================================
 */

riderRouter.get(
  "/remittances",
  authenticate,
  authorize("admin"),
  getRemittances
);

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER REMITTANCE
 *
 * GET
 * /api/v1/riders/remittances/:remittanceId
 * =========================================================
 */

riderRouter.get(
  "/remittances/:remittanceId",
  authenticate,
  authorize("admin"),
  getRemittance
);

/*
 * =========================================================
 * ADMIN
 * VERIFY RIDER REMITTANCE
 *
 * PATCH
 * /api/v1/riders/remittances/:remittanceId/verify
 *
 * Optional body:
 *
 * {
 *   "remarks": "Verified"
 * }
 * =========================================================
 */

riderRouter.patch(
  "/remittances/:remittanceId/verify",
  authenticate,
  authorize("admin"),
  verifyRemittance
);

/*
 * =========================================================
 * ADMIN
 * REJECT RIDER REMITTANCE
 *
 * PATCH
 * /api/v1/riders/remittances/:remittanceId/reject
 *
 * Required body:
 *
 * {
 *   "remarks": "Reason for rejection"
 * }
 * =========================================================
 */

riderRouter.patch(
  "/remittances/:remittanceId/reject",
  authenticate,
  authorize("admin"),
  rejectRemittanceValidation,
  validateRiderRequest,
  rejectRemittance
);

/*
 * =========================================================
 * ADMIN
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
 * ADMIN
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
 * ADMIN
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
 * ADMIN
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