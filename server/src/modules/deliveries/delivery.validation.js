import {
  body,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * RIDER
 * OPTIONAL NOTES WHEN UPDATING DELIVERY
 * =========================================================
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
 * =========================================================
 * VALIDATION RESPONSE
 * =========================================================
 *
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

  return res.status(422).json({
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