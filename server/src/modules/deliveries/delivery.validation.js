import {
  body,
  validationResult,
} from "express-validator";

/*
 * SELLER
 * Assign rider to order.
 */
export const assignRiderValidation = [
  body("riderId")
    .notEmpty()
    .withMessage(
      "Rider ID is required."
    )
    .isMongoId()
    .withMessage(
      "Rider ID is invalid."
    ),
];

/*
 * RIDER
 * Optional notes when updating delivery.
 */
export const riderDeliveryNotesValidation = [
  body("riderNotes")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Rider notes cannot exceed 2000 characters."
    ),
];

/*
 * Convert express-validator results
 * into a consistent API response.
 */
export const validateDeliveryRequest = (
  req,
  res,
  next
) => {
  const errors =
    validationResult(req);

  if (errors.isEmpty()) {
    next();
    return;
  }

  res.status(422).json({
    success: false,
    message:
      "Validation failed.",
    errors:
      errors.array().map(
        (error) => ({
          field:
            error.path,
          message:
            error.msg,
        })
      ),
  });
};