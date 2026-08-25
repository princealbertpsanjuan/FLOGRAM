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
 * RIDER
 * UPDATE LIVE LOCATION
 * =========================================================
 *
 * Example body:
 *
 * {
 *   "latitude": 13.625,
 *   "longitude": 123.195,
 *   "accuracy": 8.5
 * }
 */
export const riderLocationValidation = [
  body("latitude")
    .notEmpty()
    .withMessage(
      "Rider latitude is required."
    )
    .isFloat({
      min: -90,
      max: 90,
    })
    .withMessage(
      "Rider latitude must be between -90 and 90."
    )
    .toFloat(),

  body("longitude")
    .notEmpty()
    .withMessage(
      "Rider longitude is required."
    )
    .isFloat({
      min: -180,
      max: 180,
    })
    .withMessage(
      "Rider longitude must be between -180 and 180."
    )
    .toFloat(),

  /*
   * GPS accuracy in meters.
   *
   * Optional because some devices may
   * not provide it.
   */
  body("accuracy")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: 0,
    })
    .withMessage(
      "Rider location accuracy must be zero or greater."
    )
    .toFloat(),
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