import {
  body,
  validationResult,
} from "express-validator";

/*
 * Shop contact number: Philippine mobile number,
 * 11 digits starting with 09. Spaces / dashes /
 * parentheses are removed and +63 / 63 becomes 0
 * before checking (and the clean number is saved).
 */
const PH_MOBILE =
  /^09\d{9}$/;

const PHONE_MESSAGE =
  "Enter a valid mobile number: 11 digits starting with 09 (e.g. 09171234567).";

const normalizeContactNumber = (
  value
) => {
  let number =
    String(value ?? "")
      .replace(/[\s\-()]/g, "");

  if (/^\+?639\d{9}$/.test(number)) {
    number =
      `0${number.replace(/^\+?63/, "")}`;
  }

  return number;
};

/*
 * =========================================================
 * CREATE FLORIST PROFILE
 * =========================================================
 */

export const floristProfileValidation = [
  body("shopName")
    .trim()
    .notEmpty()
    .withMessage(
      "Shop name is required."
    )
    .isLength({
      max: 100,
    })
    .withMessage(
      "Shop name cannot exceed 100 characters."
    ),

  body("description")
    .optional()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      "Description cannot exceed 1000 characters."
    ),

  body("contactNumber")
    .trim()
    .notEmpty()
    .withMessage(
      "Contact number is required."
    )
    .customSanitizer(
      normalizeContactNumber
    )
    .matches(
      PH_MOBILE
    )
    .withMessage(
      PHONE_MESSAGE
    ),

  body("businessEmail")
    .trim()
    .notEmpty()
    .withMessage(
      "Business email is required."
    )
    .isEmail()
    .withMessage(
      "Enter a valid business email address."
    )
    .normalizeEmail(),

  /*
   * =======================================================
   * ADDRESS
   * =======================================================
   */
  body("address.street")
    .trim()
    .notEmpty()
    .withMessage(
      "Street address is required."
    ),

  body("address.barangay")
    .trim()
    .notEmpty()
    .withMessage(
      "Barangay is required."
    ),

  body("address.city")
    .trim()
    .notEmpty()
    .withMessage(
      "City is required."
    ),

  body("address.province")
    .trim()
    .notEmpty()
    .withMessage(
      "Province is required."
    ),

  body("address.postalCode")
    .optional()
    .trim(),

  /*
   * =======================================================
   * SHOP MAP LOCATION
   * =======================================================
   *
   * Optional for now so existing florist
   * accounts remain compatible.
   *
   * If supplied:
   * latitude  = -90 to 90
   * longitude = -180 to 180
   */
  body("location.latitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -90,
      max: 90,
    })
    .withMessage(
      "Latitude must be between -90 and 90."
    )
    .toFloat(),

  body("location.longitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -180,
      max: 180,
    })
    .withMessage(
      "Longitude must be between -180 and 180."
    )
    .toFloat(),
];

/*
 * =========================================================
 * UPDATE FLORIST PROFILE
 * =========================================================
 */
export const updateFloristValidation = [
  body("shopName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Shop name cannot be empty."
    )
    .isLength({
      max: 100,
    })
    .withMessage(
      "Shop name cannot exceed 100 characters."
    ),

  body("description")
    .optional()
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      "Description cannot exceed 1000 characters."
    ),

  body("contactNumber")
    .optional()
    .trim()
    .customSanitizer(
      normalizeContactNumber
    )
    .matches(
      PH_MOBILE
    )
    .withMessage(
      PHONE_MESSAGE
    ),

  body("businessEmail")
    .optional()
    .trim()
    .isEmail()
    .withMessage(
      "Enter a valid business email address."
    )
    .normalizeEmail(),

  /*
   * =======================================================
   * ADDRESS
   * =======================================================
   */
  body("address.street")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Street address cannot be empty."
    ),

  body("address.barangay")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Barangay cannot be empty."
    ),

  body("address.city")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "City cannot be empty."
    ),

  body("address.province")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Province cannot be empty."
    ),

  body("address.postalCode")
    .optional()
    .trim(),

  /*
   * =======================================================
   * SHOP MAP LOCATION
   * =======================================================
   */
  body("location.latitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -90,
      max: 90,
    })
    .withMessage(
      "Latitude must be between -90 and 90."
    )
    .toFloat(),

  body("location.longitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -180,
      max: 180,
    })
    .withMessage(
      "Longitude must be between -180 and 180."
    )
    .toFloat(),
];

/*
 * =========================================================
 * ADMIN
 * REJECT FLORIST
 * =========================================================
 */
export const rejectFloristValidation = [
  body("remarks")
    .trim()
    .notEmpty()
    .withMessage(
      "A rejection reason is required."
    )
    .isLength({
      max: 500,
    })
    .withMessage(
      "Remarks cannot exceed 500 characters."
    ),
];

/*
 * =========================================================
 * VALIDATION RESPONSE
 * =========================================================
 */
export const validateFloristRequest = (
  req,
  res,
  next
) => {
  const errors =
    validationResult(req);

  if (errors.isEmpty()) {
    return next();
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