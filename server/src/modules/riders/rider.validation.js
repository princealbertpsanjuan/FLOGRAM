import {
  body,
  validationResult,
} from "express-validator";

import {
  LICENSE_ERROR,
  PHONE_ERROR,
  PLATE_ERROR,
  isValidLicense,
  isValidPhone,
  isValidPlate,
  normalizeLicense,
  normalizePhone,
  normalizePlate,
} from "../../utils/contactFormats.js";

export const riderProfileValidation = [
  body("vehicleType")
    .notEmpty()
    .withMessage("Vehicle type is required.")
    .isIn([
      "motorcycle",
      "bicycle",
      "car",
      "van",
      "other",
    ])
    .withMessage("Invalid vehicle type."),

  body("vehiclePlateNumber")
    .optional({ values: "falsy" })
    .trim()
    .custom((value) =>
      isValidPlate(value)
    )
    .withMessage(PLATE_ERROR)
    .customSanitizer(
      normalizePlate
    ),

  body("driverLicenseNumber")
    .trim()
    .notEmpty()
    .withMessage(
      "Driver license number is required."
    )
    .custom((value) =>
      isValidLicense(value)
    )
    .withMessage(LICENSE_ERROR)
    .customSanitizer(
      normalizeLicense
    ),

  body("emergencyContactName")
    .trim()
    .notEmpty()
    .withMessage(
      "Emergency contact name is required."
    ),

  body("emergencyContactNumber")
    .trim()
    .notEmpty()
    .withMessage(
      "Emergency contact number is required."
    )
    .custom((value) =>
      isValidPhone(value)
    )
    .withMessage(PHONE_ERROR)
    .customSanitizer(
      normalizePhone
    ),

  body("address.street")
    .trim()
    .notEmpty()
    .withMessage("Street address is required."),

  body("address.barangay")
    .trim()
    .notEmpty()
    .withMessage("Barangay is required."),

  body("address.city")
    .trim()
    .notEmpty()
    .withMessage("City is required."),

  body("address.province")
    .trim()
    .notEmpty()
    .withMessage("Province is required."),

  body("address.postalCode")
    .optional()
    .trim(),
];

export const updateRiderValidation = [
  body("vehicleType")
    .optional()
    .isIn([
      "motorcycle",
      "bicycle",
      "car",
      "van",
      "other",
    ])
    .withMessage("Invalid vehicle type."),

  body("vehiclePlateNumber")
    .optional()
    .trim()
    .custom((value) =>
      value === "" ||
      isValidPlate(value)
    )
    .withMessage(PLATE_ERROR)
    .customSanitizer(
      normalizePlate
    ),

  body("driverLicenseNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Driver license number cannot be empty."
    )
    .custom((value) =>
      isValidLicense(value)
    )
    .withMessage(LICENSE_ERROR)
    .customSanitizer(
      normalizeLicense
    ),

  body("emergencyContactName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Emergency contact name cannot be empty."
    ),

  body("emergencyContactNumber")
    .optional()
    .trim()
    .custom((value) =>
      isValidPhone(value)
    )
    .withMessage(PHONE_ERROR)
    .customSanitizer(
      normalizePhone
    ),

  /*
   * Lives on the User account, not the Rider
   * profile (see updateRiderProfile).
   */
  body("phoneNumber")
    .optional()
    .trim()
    .custom((value) =>
      isValidPhone(value)
    )
    .withMessage(PHONE_ERROR)
    .customSanitizer(
      normalizePhone
    ),
];

export const riderAvailabilityValidation = [
  body("isAvailable")
    .isBoolean()
    .withMessage(
      "isAvailable must be true or false."
    ),
];

export const rejectRiderValidation = [
  body("remarks")
    .trim()
    .notEmpty()
    .withMessage(
      "A rejection reason is required."
    )
    .isLength({ max: 500 })
    .withMessage(
      "Remarks cannot exceed 500 characters."
    ),
];

/*
 * =========================================================
 * ADMIN
 * REJECT RIDER REMITTANCE VALIDATION
 * =========================================================
 */

export const rejectRemittanceValidation = [
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

export const validateRiderRequest = (
  req,
  res,
  next
) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return res.status(422).json({
    success: false,
    message: "Validation failed.",
    errors: errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};