import { body, validationResult } from "express-validator";

export const updateProfileValidation = [
  body("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name cannot be empty.")
    .isLength({ max: 50 })
    .withMessage("First name cannot exceed 50 characters."),

  body("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name cannot be empty.")
    .isLength({ max: 50 })
    .withMessage("Last name cannot exceed 50 characters."),

  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^(09|\+639)\d{9}$/)
    .withMessage(
      "Enter a valid Philippine phone number."
    ),
];

export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required.")
    .isLength({ min: 8 })
    .withMessage(
      "New password must contain at least 8 characters."
    )
    .matches(/[a-z]/)
    .withMessage(
      "New password must contain a lowercase letter."
    )
    .matches(/[A-Z]/)
    .withMessage(
      "New password must contain an uppercase letter."
    )
    .matches(/[0-9]/)
    .withMessage(
      "New password must contain a number."
    ),

  body("confirmNewPassword")
    .notEmpty()
    .withMessage("Password confirmation is required.")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error(
          "Password confirmation does not match."
        );
      }

      return true;
    }),
];

export const validateUserRequest = (req, res, next) => {
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