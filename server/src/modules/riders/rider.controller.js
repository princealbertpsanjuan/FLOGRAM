import {
  approveRider,
  createRiderProfile,
  getMyRiderProfile,
  getPendingRiders,
  getRiderById,
  getRiderWallet,
  getRiderDashboard,
  rejectRider,
  submitRiderRemittance,
  updateRiderAvailability,
  updateRiderProfile,
} from "./rider.service.js";

/*
 * =========================================================
 * RIDER
 * CREATE MY PROFILE
 * =========================================================
 */

export const createMyRiderProfile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await createRiderProfile(
          req.user.userId,
          req.body
        );

      res.status(201).json({
        success:
          true,

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

export const getMyProfile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await getMyRiderProfile(
          req.user.userId
        );

      res.status(200).json({
        success:
          true,

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

export const updateMyProfile =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await updateRiderProfile(
          req.user.userId,
          req.body
        );

      res.status(200).json({
        success:
          true,

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

export const getDashboard =
  async (
    req,
    res,
    next
  ) => {
    try {
      const dashboard =
        await getRiderDashboard(
          req.user.userId
        );

      res.status(200).json({
        success:
          true,

        message:
          "Rider dashboard retrieved successfully.",

        data:
          dashboard,
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

export const updateAvailability =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await updateRiderAvailability(
          req.user.userId,
          req.body.isAvailable
        );

      res.status(200).json({
        success:
          true,

        message:
          result.isAvailable
            ? "You are now available for delivery requests."
            : "You are now offline and will not receive delivery requests.",

        data: {
          isAvailable:
            result.isAvailable,
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

export const getPending =
  async (
    req,
    res,
    next
  ) => {
    try {
      const riders =
        await getPendingRiders();

      res.status(200).json({
        success:
          true,

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

export const getRider =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await getRiderById(
          req.params.riderId
        );

      res.status(200).json({
        success:
          true,

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

export const approve =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await approveRider(
          req.params.riderId,
          req.user.userId
        );

      res.status(200).json({
        success:
          true,

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

export const reject =
  async (
    req,
    res,
    next
  ) => {
    try {
      const rider =
        await rejectRider(
          req.params.riderId,
          req.user.userId,
          req.body.remarks
        );

      res.status(200).json({
        success:
          true,

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

  export const getWallet =
  async (
    req,
    res,
    next
  ) => {
    try {
      const wallet =
        await getRiderWallet(
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

export const submitRemittance =
  async (
    req,
    res,
    next
  ) => {
    try {
      /*
       * =====================================================
       * PROOF IMAGE
       * =====================================================
       */

      if (!req.file) {
        const error =
          new Error(
            "Proof of remittance image is required."
          );

        error.statusCode =
          400;

        throw error;
      }

      /*
       * Store a public-relative URL rather
       * than an operating-system file path.
       *
       * Example:
       *
       * /uploads/riders/remittances/123.jpg
       */

      const proofImageUrl =
        `/uploads/riders/remittances/${req.file.filename}`;

      /*
       * =====================================================
       * SUBMIT REMITTANCE
       * =====================================================
       */

      const remittance =
        await submitRiderRemittance(
          req.user.userId,

          req.params
            .remittanceId,

          {
            referenceNumber:
              req.body
                .referenceNumber,

            proofImageUrl,

            riderRemarks:
              req.body
                .riderRemarks,
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