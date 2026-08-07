import {
  query,
  validationResult,
} from "express-validator";

export const pendingVerificationQueryValidation = [
  query("role")
    .optional()
    .isIn(["seller", "rider"])
    .withMessage("Role must be either seller or rider."),
];

export const validateVerificationRequest = (
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