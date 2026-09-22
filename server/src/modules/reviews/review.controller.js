import {
  createCustomerReview,
  getCustomerOrderReview,
  getCustomerReviews,
  getSellerReviews,
} from "./review.service.js";

/*
 * =========================================================
 * CUSTOMER
 * CREATE REVIEW
 * =========================================================
 *
 * POST
 * /api/v1/reviews/orders/:orderId
 * =========================================================
 */

export const createReview =
  async (
    req,
    res,
    next
  ) => {
    try {
      const review =
        await createCustomerReview(
          req.user.userId,
          req.params.orderId,
          {
            overallRating:
              req.body
                .overallRating,

            orderRating:
              req.body
                .orderRating,

            sellerRating:
              req.body
                .sellerRating,

            riderRating:
              req.body
                .riderRating,

            systemRating:
              req.body
                .systemRating,

            comment:
              req.body
                .comment,
          }
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Review submitted successfully.",

          data: {
            review,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * GET REVIEW STATUS / REVIEW FOR ONE ORDER
 * =========================================================
 *
 * GET
 * /api/v1/reviews/orders/:orderId
 *
 * This endpoint intentionally returns 200 even when the
 * customer has not reviewed the Order yet.
 *
 * Example:
 *
 * {
 *   reviewed: false,
 *   canReview: true,
 *   riderRatingRequired: true,
 *   review: null
 * }
 * =========================================================
 */

export const getOrderReview =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getCustomerOrderReview(
          req.user.userId,
          req.params.orderId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            result.reviewed
              ? "Order review retrieved successfully."
              : "Order review status retrieved successfully.",

          data:
            result,
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * GET MY SUBMITTED REVIEWS
 * =========================================================
 *
 * GET
 * /api/v1/reviews/mine
 * =========================================================
 */

export const getMine =
  async (
    req,
    res,
    next
  ) => {
    try {
      const reviews =
        await getCustomerReviews(
          req.user.userId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Customer reviews retrieved successfully.",

          data: {
            count:
              reviews.length,

            reviews,
          },
        });
    } catch (error) {
      next(error);
    }
  };

  /*
 * =========================================================
 * SELLER
 * GET REVIEWS RECEIVED
 * =========================================================
 *
 * GET
 * /api/v1/reviews/seller/mine
 * =========================================================
 */

export const getSellerMine =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getSellerReviews(
          req.user.userId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Seller reviews retrieved successfully.",

          data:
            result,
        });
    } catch (error) {
      next(error);
    }
  };