import {
  body,
  validationResult,
} from "express-validator";

export const floristProfileValidation = [
  body("shopName")
    .trim()
    .notEmpty()
    .withMessage("Shop name is required.")
    .isLength({ max: 100 })
    .withMessage(
      "Shop name cannot exceed 100 characters."
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description cannot exceed 1000 characters."
    ),

  body("contactNumber")
    .trim()
    .notEmpty()
    .withMessage("Contact number is required.")
    .matches(/^(09|\+639)\d{9}$/)
    .withMessage(
      "Enter a valid Philippine phone number."
    ),

  body("businessEmail")
    .trim()
    .notEmpty()
    .withMessage("Business email is required.")
    .isEmail()
    .withMessage(
      "Enter a valid business email address."
    )
    .normalizeEmail(),

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

export const updateFloristValidation = [
  body("shopName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Shop name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage(
      "Shop name cannot exceed 100 characters."
    ),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description cannot exceed 1000 characters."
    ),

  body("contactNumber")
    .optional()
    .trim()
    .matches(/^(09|\+639)\d{9}$/)
    .withMessage(
      "Enter a valid Philippine phone number."
    ),

  body("businessEmail")
    .optional()
    .trim()
    .isEmail()
    .withMessage(
      "Enter a valid business email address."
    )
    .normalizeEmail(),
];

export const rejectFloristValidation = [
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

export const validateFloristRequest = (
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