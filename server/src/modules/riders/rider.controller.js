import {
  approveRider,
  cancelRiderPayout,
  createAdminRiderPayout,
  createRiderProfile,
  getAdminRiderPayoutById,
  getAdminRiderPayouts,
  getAdminRiderRemittanceById,
  getAdminRiderRemittances,
  getMyRiderProfile,
  getPendingRiders,
  getRiderById,
  getRiderDashboard,
  getRiderEarnings,
  getRiderPayoutById,
  getRiderWallet,
  markRiderPayoutPaid,
  rejectRider,
  rejectRiderRemittance,
  submitRiderRemittance,
  updateRiderAvailability,
  updateRiderProfile,
  verifyRiderRemittance,
} from "./rider.service.js";

import {
  createRiderShift,
  getAdminRiderShiftById,
  getAdminRiderShifts,
  getRiderAvailableShifts,
  getRiderShiftHistory,
  requestRiderShift,
  reviewRiderShiftRequest,
  updateRiderShift,
} from "./rider-shift.service.js";

/*
 * =========================================================
 * RIDER
 * CREATE MY PROFILE
 * =========================================================
 */

export const createMyRiderProfile = async (
  req,
  res,
  next
) => {
  try {
    const rider = await createRiderProfile(
      req.user.userId,
      req.body
    );

    res.status(201).json({
      success: true,

      message:
        "Rider profile created successfully and is awaiting admin verification.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET MY PROFILE
 * =========================================================
 */

export const getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const rider = await getMyRiderProfile(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider profile retrieved successfully.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * UPDATE MY PROFILE
 * =========================================================
 */

export const updateMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const rider = await updateRiderProfile(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,

      message:
        "Rider profile updated successfully.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET DASHBOARD
 * =========================================================
 */

export const getDashboard = async (
  req,
  res,
  next
) => {
  try {
    const dashboard = await getRiderDashboard(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider dashboard retrieved successfully.",

      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * UPDATE AVAILABILITY
 * =========================================================
 */

export const updateAvailability = async (
  req,
  res,
  next
) => {
  try {
    const result = await updateRiderAvailability(
      req.user.userId,
      req.body.isAvailable
    );

    res.status(200).json({
      success: true,

      message: result.isAvailable
        ? "You are now available for delivery requests."
        : "You are now offline and will not receive delivery requests.",

      data: {
        isAvailable: result.isAvailable,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET WALLET
 * =========================================================
 */

export const getWallet = async (
  req,
  res,
  next
) => {
  try {
    const wallet = await getRiderWallet(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider wallet retrieved successfully.",

      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET DELIVERY-FEE EARNINGS
 * =========================================================
 *
 * Rider earnings are based on Order.deliveryFee from
 * successfully delivered deliveries.
 *
 * This is separate from COD remittance.
 * =========================================================
 */

export const getEarnings = async (
  req,
  res,
  next
) => {
  try {
    const earnings = await getRiderEarnings(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider delivery-fee earnings retrieved successfully.",

      data: earnings,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET ONE PAYOUT
 * =========================================================
 */

export const getMyPayout = async (
  req,
  res,
  next
) => {
  try {
    const payout = await getRiderPayoutById(
      req.user.userId,
      req.params.payoutId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider payout retrieved successfully.",

      data: {
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * SUBMIT REMITTANCE
 * =========================================================
 *
 * Content-Type:
 * multipart/form-data
 *
 * Required:
 *
 * proofImage
 * referenceNumber
 *
 * Optional:
 *
 * riderRemarks
 * =========================================================
 */

export const submitRemittance = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      const error = new Error(
        "Proof of remittance image is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const proofImageUrl =
      `/uploads/riders/remittances/${req.file.filename}`;

    const remittance =
      await submitRiderRemittance(
        req.user.userId,
        req.params.remittanceId,
        {
          referenceNumber:
            req.body.referenceNumber,

          proofImageUrl,

          riderRemarks:
            req.body.riderRemarks,
        }
      );

    res.status(200).json({
      success: true,

      message:
        "Remittance submitted successfully and is awaiting admin verification.",

      data: {
        remittance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET AVAILABLE WORK SHIFTS
 * =========================================================
 */

export const getAvailableShifts = async (
  req,
  res,
  next
) => {
  try {
    const shifts = await getRiderAvailableShifts(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Available Rider shifts retrieved successfully.",

      data: {
        shifts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET MY WORK SHIFT HISTORY
 * =========================================================
 */

export const getMyShiftHistory = async (
  req,
  res,
  next
) => {
  try {
    const shifts = await getRiderShiftHistory(
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider shift history retrieved successfully.",

      data: {
        shifts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * REQUEST WORK SHIFT
 * =========================================================
 */

export const requestShift = async (
  req,
  res,
  next
) => {
  try {
    const shift = await requestRiderShift(
      req.params.shiftId,
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider shift requested successfully and is awaiting admin approval.",

      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET PENDING RIDERS
 * =========================================================
 */

export const getPending = async (
  req,
  res,
  next
) => {
  try {
    const riders = await getPendingRiders();

    res.status(200).json({
      success: true,

      message:
        "Pending rider applications retrieved successfully.",

      data: {
        riders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET RIDER
 * =========================================================
 */

export const getRider = async (
  req,
  res,
  next
) => {
  try {
    const rider = await getRiderById(
      req.params.riderId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider profile retrieved successfully.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * APPROVE RIDER
 * =========================================================
 */

export const approve = async (
  req,
  res,
  next
) => {
  try {
    const rider = await approveRider(
      req.params.riderId,
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider approved successfully.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * REJECT RIDER
 * =========================================================
 */

export const reject = async (
  req,
  res,
  next
) => {
  try {
    const rider = await rejectRider(
      req.params.riderId,
      req.user.userId,
      req.body.remarks
    );

    res.status(200).json({
      success: true,

      message:
        "Rider application rejected.",

      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET RIDER REMITTANCES
 * =========================================================
 */

export const getRemittances = async (
  req,
  res,
  next
) => {
  try {
    const status = req.query.status
      ? String(req.query.status)
      : null;

    const remittances =
      await getAdminRiderRemittances(
        status
      );

    res.status(200).json({
      success: true,

      message:
        "Rider remittances retrieved successfully.",

      data: {
        remittances,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER REMITTANCE
 * =========================================================
 */

export const getRemittance = async (
  req,
  res,
  next
) => {
  try {
    const remittance =
      await getAdminRiderRemittanceById(
        req.params.remittanceId
      );

    res.status(200).json({
      success: true,

      message:
        "Rider remittance retrieved successfully.",

      data: {
        remittance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * VERIFY RIDER REMITTANCE
 * =========================================================
 */

export const verifyRemittance = async (
  req,
  res,
  next
) => {
  try {
    const remittance =
      await verifyRiderRemittance(
        req.params.remittanceId,
        req.user.userId,
        req.body.remarks
      );

    res.status(200).json({
      success: true,

      message:
        "COD remittance verified successfully.",

      data: {
        remittance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * REJECT RIDER REMITTANCE
 * =========================================================
 */

export const rejectRemittance = async (
  req,
  res,
  next
) => {
  try {
    const remittance =
      await rejectRiderRemittance(
        req.params.remittanceId,
        req.user.userId,
        req.body.remarks
      );

    res.status(200).json({
      success: true,

      message:
        "COD remittance rejected successfully.",

      data: {
        remittance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * CREATE RIDER WORK SHIFT
 * =========================================================
 */

export const createShift = async (
  req,
  res,
  next
) => {
  try {
    const shift = await createRiderShift(
      req.body,
      req.user.userId
    );

    res.status(201).json({
      success: true,

      message:
        "Rider shift created successfully.",

      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET ALL RIDER WORK SHIFTS
 * =========================================================
 */

export const getShifts = async (
  req,
  res,
  next
) => {
  try {
    const shifts = await getAdminRiderShifts();

    res.status(200).json({
      success: true,

      message:
        "Rider shifts retrieved successfully.",

      data: {
        shifts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER WORK SHIFT
 * =========================================================
 */

export const getShift = async (
  req,
  res,
  next
) => {
  try {
    const shift = await getAdminRiderShiftById(
      req.params.shiftId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider shift retrieved successfully.",

      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * UPDATE RIDER WORK SHIFT
 * =========================================================
 */

export const updateShift = async (
  req,
  res,
  next
) => {
  try {
    const shift = await updateRiderShift(
      req.params.shiftId,
      req.body,
      req.user.userId
    );

    res.status(200).json({
      success: true,

      message:
        "Rider shift updated successfully.",

      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * REVIEW RIDER WORK SHIFT REQUEST
 * =========================================================
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
 * =========================================================
 */

export const reviewShiftRequest = async (
  req,
  res,
  next
) => {
  try {
    const shift =
      await reviewRiderShiftRequest(
        req.params.shiftId,
        req.params.reservationId,
        req.body.decision,
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        req.body.decision ===
        "approved"
          ? "Rider shift request approved successfully."
          : "Rider shift request rejected successfully.",

      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * CREATE RIDER PAYOUT
 * =========================================================
 *
 * Creates a payout record from the Rider's unpaid
 * successfully completed delivery fees within the
 * supplied payout period.
 *
 * BODY:
 *
 * {
 *   "periodStart": "...",
 *   "periodEnd": "..."
 * }
 * =========================================================
 */

export const createPayout = async (
  req,
  res,
  next
) => {
  try {
    const payout =
      await createAdminRiderPayout(
        req.params.riderId,
        req.user.userId,
        req.body
      );

    res.status(201).json({
      success: true,

      message:
        "Rider payout created successfully.",

      data: {
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET RIDER PAYOUTS
 * =========================================================
 *
 * Optional query:
 *
 * ?status=pending
 * ?status=paid
 * ?status=cancelled
 * =========================================================
 */

export const getPayouts = async (
  req,
  res,
  next
) => {
  try {
    const status = req.query.status
      ? String(req.query.status)
      : null;

    const payouts =
      await getAdminRiderPayouts(
        status
      );

    res.status(200).json({
      success: true,

      message:
        "Rider payouts retrieved successfully.",

      data: {
        payouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER PAYOUT
 * =========================================================
 */

export const getPayout = async (
  req,
  res,
  next
) => {
  try {
    const payout =
      await getAdminRiderPayoutById(
        req.params.payoutId
      );

    res.status(200).json({
      success: true,

      message:
        "Rider payout retrieved successfully.",

      data: {
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * MARK RIDER PAYOUT AS PAID
 * =========================================================
 *
 * Payment is performed outside FLOGRAM.
 *
 * FLOGRAM records:
 *
 * - payment method
 * - reference number
 * - proof image
 * - remarks
 * - Admin
 * - payment date
 *
 * Content-Type:
 * multipart/form-data
 *
 * Required:
 *
 * proofImage
 * referenceNumber
 *
 * Optional:
 *
 * paymentMethod
 * adminRemarks
 * =========================================================
 */

export const markPayoutPaid = async (
  req,
  res,
  next
) => {
  try {
    if (!req.file) {
      const error = new Error(
        "Proof of Rider payment image is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const proofImageUrl =
      `/uploads/riders/payouts/${req.file.filename}`;

    const payout =
      await markRiderPayoutPaid(
        req.params.payoutId,
        req.user.userId,
        {
          paymentMethod:
            req.body.paymentMethod,

          referenceNumber:
            req.body.referenceNumber,

          proofImageUrl,

          adminRemarks:
            req.body.adminRemarks,
        }
      );

    res.status(200).json({
      success: true,

      message:
        "Rider payout marked as paid successfully.",

      data: {
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN
 * CANCEL RIDER PAYOUT
 * =========================================================
 *
 * Only a pending payout can be cancelled.
 *
 * BODY:
 *
 * {
 *   "reason": "..."
 * }
 * =========================================================
 */

export const cancelPayout = async (
  req,
  res,
  next
) => {
  try {
    const payout =
      await cancelRiderPayout(
        req.params.payoutId,
        req.user.userId,
        req.body.reason
      );

    res.status(200).json({
      success: true,

      message:
        "Rider payout cancelled successfully.",

      data: {
        payout,
      },
    });
  } catch (error) {
    next(error);
  }
};