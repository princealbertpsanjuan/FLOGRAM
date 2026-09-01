import {
  param,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * NOTIFICATION ID VALIDATION
 * =========================================================
 */

export const notificationIdValidation =
  [
    param(
      "notificationId"
    )
      .trim()
      .notEmpty()
      .withMessage(
        "Notification ID is required."
      )
      .isMongoId()
      .withMessage(
        "Invalid notification ID."
      ),
  ];

/*
 * =========================================================
 * VALIDATION RESULT
 * =========================================================
 */

export const validateNotificationRequest =
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