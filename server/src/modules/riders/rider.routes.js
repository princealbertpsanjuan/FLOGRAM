import {
  Router,
} from "express";

import {
  approve,
  cancelPayout,
  createMyRiderProfile,
  createPayout,
  createShift,
  getAvailableShifts,
  getDashboard,
  getEarnings,
  getMyPayout,
  getMyProfile,
  getMyShiftHistory,
  getPending,
  getPayout,
  getPayouts,
  getRemittance,
  getRemittances,
  getRider,
  getShift,
  getShifts,
  getWallet,
  markPayoutPaid,
  reject,
  rejectRemittance,
  requestShift,
  reviewShiftRequest,
  submitRemittance,
  updateAvailability,
  updateMyProfile,
  updateShift,
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
  riderPayoutProofUpload,
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
 * IMPORTANT:
 *
 * Rider Wallet contains COD cash/remittance
 * information.
 *
 * COD remittance is separate from Rider
 * delivery-fee earnings and payouts.
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
 * GET DELIVERY-FEE EARNINGS
 *
 * GET
 * /api/v1/riders/me/earnings
 *
 * Rider earnings are based only on the
 * deliveryFee of successfully completed
 * deliveries.
 *
 * COD collected from customers is NOT
 * Rider income.
 * =========================================================
 */

riderRouter.get(
  "/me/earnings",
  authenticate,
  authorize("rider"),
  getEarnings
);

/*
 * =========================================================
 * RIDER
 * GET ONE PAYOUT
 *
 * GET
 * /api/v1/riders/me/payouts/:payoutId
 *
 * Allows the Rider to view:
 *
 * - payout period
 * - completed delivery fees
 * - payout status
 * - payment reference
 * - Admin payment proof
 * =========================================================
 */

riderRouter.get(
  "/me/payouts/:payoutId",
  authenticate,
  authorize("rider"),
  getMyPayout
);

/*
 * =========================================================
 * RIDER
 * GET AVAILABLE WORK SHIFTS
 *
 * GET
 * /api/v1/riders/me/shifts/available
 *
 * Returns current/future work shifts that
 * the Rider may request, together with shifts
 * the Rider has already requested.
 * =========================================================
 */

riderRouter.get(
  "/me/shifts/available",
  authenticate,
  authorize("rider"),
  getAvailableShifts
);

/*
 * =========================================================
 * RIDER
 * GET MY WORK SHIFT HISTORY
 *
 * GET
 * /api/v1/riders/me/shifts
 *
 * Includes:
 *
 * - pending requests
 * - approved requests
 * - rejected requests
 * - upcoming shifts
 * - active shifts
 * - ended shifts
 * =========================================================
 */

riderRouter.get(
  "/me/shifts",
  authenticate,
  authorize("rider"),
  getMyShiftHistory
);

/*
 * =========================================================
 * RIDER
 * REQUEST WORK SHIFT
 *
 * POST
 * /api/v1/riders/me/shifts/:shiftId/request
 *
 * The request starts as pending.
 *
 * Admin must approve it before the Rider
 * is authorized to work during that shift.
 * =========================================================
 */

riderRouter.post(
  "/me/shifts/:shiftId/request",
  authenticate,
  authorize("rider"),
  requestShift
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
 * isAvailable = true
 *
 * Rider is Online and accepting new
 * delivery requests.
 *
 * Requirements:
 *
 * - Rider must be approved
 * - Rider must be active
 * - Rider must have an approved active
 *   work shift
 * - Rider must not already have an
 *   active delivery
 *
 * isAvailable = false
 *
 * Rider is Offline and will not accept
 * new delivery requests.
 *
 * IMPORTANT:
 *
 * Going Offline does NOT cancel or release
 * the Rider's approved work-shift slot.
 *
 * If the shift expires while a delivery is
 * active, the Rider may finish the active
 * delivery but cannot accept a new one.
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
 * route names as Rider IDs.
 * =========================================================
 */

/*
 * =========================================================
 * ADMIN
 * POST / PUBLISH RIDER WORK SHIFT
 *
 * POST
 * /api/v1/riders/shifts
 *
 * Admin creates/posts an available Rider
 * work schedule in advance.
 *
 * BODY:
 *
 * {
 *   "startAt": "2026-10-05T08:00:00",
 *   "endAt": "2026-10-05T13:00:00",
 *   "slotLimit": 3
 * }
 *
 * Riders may then request a slot.
 * Admin approves or rejects each request.
 * =========================================================
 */

riderRouter.post(
  "/shifts",
  authenticate,
  authorize("admin"),
  createShift
);

/*
 * =========================================================
 * ADMIN
 * GET ALL POSTED RIDER WORK SHIFTS
 *
 * GET
 * /api/v1/riders/shifts
 * =========================================================
 */

riderRouter.get(
  "/shifts",
  authenticate,
  authorize("admin"),
  getShifts
);

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER WORK SHIFT
 *
 * GET
 * /api/v1/riders/shifts/:shiftId
 * =========================================================
 */

riderRouter.get(
  "/shifts/:shiftId",
  authenticate,
  authorize("admin"),
  getShift
);

/*
 * =========================================================
 * ADMIN
 * UPDATE POSTED RIDER WORK SHIFT
 *
 * PATCH
 * /api/v1/riders/shifts/:shiftId
 *
 * Supported fields are controlled by
 * rider-shift.service.js.
 *
 * Existing fields include:
 *
 * startAt
 * endAt
 * slotLimit
 * status
 *
 * status:
 *
 * open
 * closed
 * cancelled
 * =========================================================
 */

riderRouter.patch(
  "/shifts/:shiftId",
  authenticate,
  authorize("admin"),
  updateShift
);

/*
 * =========================================================
 * ADMIN
 * REVIEW RIDER WORK SHIFT REQUEST
 *
 * PATCH
 * /api/v1/riders/shifts/:shiftId/reservations/:reservationId/review
 *
 * BODY:
 *
 * {
 *   "decision": "approved"
 * }
 *
 * OR:
 *
 * {
 *   "decision": "rejected"
 * }
 *
 * Only approved reservations occupy Rider
 * slots.
 *
 * Once approved, going Offline does NOT
 * release the slot.
 * =========================================================
 */

riderRouter.patch(
  "/shifts/:shiftId/reservations/:reservationId/review",
  authenticate,
  authorize("admin"),
  reviewShiftRequest
);

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
 * GET RIDER PAYOUTS
 *
 * GET
 * /api/v1/riders/payouts
 *
 * Optional:
 *
 * ?status=pending
 * ?status=paid
 * ?status=cancelled
 *
 * COD remittance is NOT included here.
 * =========================================================
 */

riderRouter.get(
  "/payouts",
  authenticate,
  authorize("admin"),
  getPayouts
);

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER PAYOUT
 *
 * GET
 * /api/v1/riders/payouts/:payoutId
 * =========================================================
 */

riderRouter.get(
  "/payouts/:payoutId",
  authenticate,
  authorize("admin"),
  getPayout
);

/*
 * =========================================================
 * ADMIN
 * CREATE RIDER PAYOUT
 *
 * POST
 * /api/v1/riders/payouts/rider/:riderId
 *
 * BODY:
 *
 * {
 *   "periodStart": "...",
 *   "periodEnd": "..."
 * }
 *
 * Backend builds the payout using the
 * Rider's authoritative completed
 * Order.deliveryFee records.
 *
 * Already-reserved/paid deliveries cannot
 * be included again.
 * =========================================================
 */

riderRouter.post(
  "/payouts/rider/:riderId",
  authenticate,
  authorize("admin"),
  createPayout
);

/*
 * =========================================================
 * ADMIN
 * MARK RIDER PAYOUT AS PAID
 *
 * PATCH
 * /api/v1/riders/payouts/:payoutId/pay
 *
 * Payment itself is completed externally.
 *
 * FLOGRAM only records the payment.
 *
 * FORM DATA:
 *
 * referenceNumber
 * paymentMethod
 * adminRemarks
 * proofImage
 *
 * Required:
 *
 * referenceNumber
 * proofImage
 * =========================================================
 */

riderRouter.patch(
  "/payouts/:payoutId/pay",
  authenticate,
  authorize("admin"),
  riderPayoutProofUpload.single(
    "proofImage"
  ),
  markPayoutPaid
);

/*
 * =========================================================
 * ADMIN
 * CANCEL PENDING RIDER PAYOUT
 *
 * PATCH
 * /api/v1/riders/payouts/:payoutId/cancel
 *
 * BODY:
 *
 * {
 *   "reason": "..."
 * }
 *
 * A paid payout cannot be cancelled.
 * =========================================================
 */

riderRouter.patch(
  "/payouts/:payoutId/cancel",
  authenticate,
  authorize("admin"),
  cancelPayout
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
 *
 * IMPORTANT:
 *
 * Keep this AFTER all static routes above.
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