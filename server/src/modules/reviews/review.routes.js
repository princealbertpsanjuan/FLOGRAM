import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import {
  createReview,
  getMine,
  getOrderReview,
} from "./review.controller.js";

import {
  createReviewValidation,
  reviewOrderIdValidation,
  validateReviewRequest,
} from "./review.validation.js";

const reviewRouter =
  Router();

/*
 * =========================================================
 * CUSTOMER REVIEW ROUTES
 * =========================================================
 *
 * Reviews are customer-owned transaction feedback.
 *
 * Customers may:
 *
 * - Submit one Review for a completed Order
 * - Check whether an Order has already been reviewed
 * - View their submitted Review history
 * =========================================================
 */

/*
 * =========================================================
 * GET MY REVIEWS
 * =========================================================
 *
 * GET
 * /api/v1/reviews/mine
 * =========================================================
 */

reviewRouter.get(
  "/mine",

  authenticate,

  authorize(
    "customer"
  ),

  getMine
);

/*
 * =========================================================
 * GET REVIEW FOR ONE ORDER
 * =========================================================
 *
 * GET
 * /api/v1/reviews/orders/:orderId
 *
 * Returns:
 *
 * reviewed
 * canReview
 * riderRatingRequired
 * review
 * =========================================================
 */

reviewRouter.get(
  "/orders/:orderId",

  authenticate,

  authorize(
    "customer"
  ),

  reviewOrderIdValidation,

  validateReviewRequest,

  getOrderReview
);

/*
 * =========================================================
 * CREATE REVIEW
 * =========================================================
 *
 * POST
 * /api/v1/reviews/orders/:orderId
 *
 * Example body:
 *
 * {
 *   "overallRating": 5,
 *   "orderRating": 5,
 *   "sellerRating": 4,
 *   "riderRating": 5,
 *   "systemRating": 4,
 *   "comment": "The bouquet arrived in excellent condition."
 * }
 *
 * For pickup Orders:
 *
 * riderRating may be omitted.
 * =========================================================
 */

reviewRouter.post(
  "/orders/:orderId",

  authenticate,

  authorize(
    "customer"
  ),

  reviewOrderIdValidation,

  createReviewValidation,

  validateReviewRequest,

  createReview
);

export default reviewRouter;