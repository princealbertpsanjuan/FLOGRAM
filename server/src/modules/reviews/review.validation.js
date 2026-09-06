import {
  body,
  param,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * ORDER ID
 * =========================================================
 */

export const reviewOrderIdValidation =
  [
    param(
      "orderId"
    )
      .trim()
      .notEmpty()
      .withMessage(
        "Order ID is required."
      )
      .isMongoId()
      .withMessage(
        "Invalid order ID."
      ),
  ];

/*
 * =========================================================
 * CREATE REVIEW
 * =========================================================
 *
 * Required:
 *
 * overallRating
 * orderRating
 * sellerRating
 * systemRating
 *
 * riderRating:
 *
 * Optional at request-validation level because pickup
 * orders do not have a Rider.
 *
 * The service determines whether riderRating is required
 * for the actual Order.
 * =========================================================
 */

export const createReviewValidation =
  [
    body(
      "overallRating"
    )
      .notEmpty()
      .withMessage(
        "Overall rating is required."
      )
      .isInt({
        min:
          1,

        max:
          5,
      })
      .withMessage(
        "Overall rating must be between 1 and 5."
      )
      .toInt(),

    body(
      "orderRating"
    )
      .notEmpty()
      .withMessage(
        "Order rating is required."
      )
      .isInt({
        min:
          1,

        max:
          5,
      })
      .withMessage(
        "Order rating must be between 1 and 5."
      )
      .toInt(),

    body(
      "sellerRating"
    )
      .notEmpty()
      .withMessage(
        "Seller rating is required."
      )
      .isInt({
        min:
          1,

        max:
          5,
      })
      .withMessage(
        "Seller rating must be between 1 and 5."
      )
      .toInt(),

    body(
      "riderRating"
    )
      .optional({
        nullable:
          true,
      })
      .isInt({
        min:
          1,

        max:
          5,
      })
      .withMessage(
        "Rider rating must be between 1 and 5."
      )
      .toInt(),

    body(
      "systemRating"
    )
      .notEmpty()
      .withMessage(
        "FLOGRAM system rating is required."
      )
      .isInt({
        min:
          1,

        max:
          5,
      })
      .withMessage(
        "FLOGRAM system rating must be between 1 and 5."
      )
      .toInt(),

    body(
      "comment"
    )
      .optional({
        nullable:
          true,
      })
      .trim()
      .isLength({
        max:
          2000,
      })
      .withMessage(
        "Review comment cannot exceed 2000 characters."
      ),
  ];

/*
 * =========================================================
 * VALIDATION RESULT
 * =========================================================
 */

export const validateReviewRequest =
  (
    req,
    res,
    next
  ) => {
    const errors =
      validationResult(
        req
      );

    if (
      !errors.isEmpty()
    ) {
      return res
        .status(400)
        .json({
          success:
            false,

          message:
            "Validation failed.",

          errors:
            errors.array(),
        });
    }

    next();
  };