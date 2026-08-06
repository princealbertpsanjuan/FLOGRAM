import { body, validationResult } from "express-validator";

export const registerValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters."),

  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email address is required.")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),

  body("phoneNumber")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required.")
    .matches(/^(09|\+639)\d{9}$/)
    .withMessage(
      "Enter a valid Philippine phone number, such as 09171234567."
    ),

  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 8 })
    .withMessage("Password must contain at least 8 characters.")
    .matches(/[a-z]/)
    .withMessage("Password must contain a lowercase letter.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain an uppercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain a number."),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Password confirmation is required.")
    .custom((confirmPassword, { req }) => {
      if (confirmPassword !== req.body.password) {
        throw new Error("Password confirmation does not match.");
      }

      return true;
    }),

  body("role")
    .optional()
    .isIn(["customer", "seller", "rider"])
    .withMessage("Role must be customer, seller, or rider."),
];

export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email address is required.")
    .isEmail()
    .withMessage("Enter a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required."),
];

/*
 * Converts express-validator results into a consistent JSON response.
 */
export const validateRequest = (req, res, next) => {
  const validationErrors = validationResult(req);

  if (validationErrors.isEmpty()) {
    next();
    return;
  }

  res.status(422).json({
    success: false,
    message: "Validation failed.",
    errors: validationErrors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    })),
  });
};