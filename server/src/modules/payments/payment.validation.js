import {
  param,
  validationResult,
} from "express-validator";

/*
 * CUSTOMER
 * Order ID used when creating
 * or checking a payment.
 */
export const orderPaymentValidation = [
  param("orderId")
    .notEmpty()
    .withMessage(
      "Order ID is required."
    )
    .isMongoId()
    .withMessage(
      "Order ID is invalid."
    ),
];

/*
 * Shared payment request validation.
 */
export const validatePaymentRequest =
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
      errors.isEmpty()
    ) {
      next();
      return;
    }

    return res
      .status(422)
      .json({
        success:
          false,

        message:
          "Validation failed.",

        errors:
          errors
            .array()
            .map(
              (error) => ({
                field:
                  error.path,

                message:
                  error.msg,
              })
            ),
      });
  };