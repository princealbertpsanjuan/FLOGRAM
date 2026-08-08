import {
  body,
  validationResult,
} from "express-validator";

export const createFlowerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage(
      "Flower name is required."
    ),

  body("description")
    .trim()
    .notEmpty()
    .withMessage(
      "Description is required."
    ),

  body("price")
    .isFloat({ min: 0 })
    .withMessage(
      "Price must be a valid non-negative number."
    ),

  body("category")
    .trim()
    .notEmpty()
    .withMessage(
      "Category is required."
    ),

  body("occasion")
    .optional()
    .isArray()
    .withMessage(
      "Occasion must be an array."
    ),

  body("flowerTypes")
    .optional()
    .isArray()
    .withMessage(
      "Flower types must be an array."
    ),

  body("colors")
    .optional()
    .isArray()
    .withMessage(
      "Colors must be an array."
    ),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage(
      "isAvailable must be true or false."
    ),
];

export const updateFlowerValidation = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Flower name cannot be empty."
    ),

  body("description")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Description cannot be empty."
    ),

  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage(
      "Price must be a valid non-negative number."
    ),

  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Category cannot be empty."
    ),

  body("occasion")
    .optional()
    .isArray()
    .withMessage(
      "Occasion must be an array."
    ),

  body("flowerTypes")
    .optional()
    .isArray()
    .withMessage(
      "Flower types must be an array."
    ),

  body("colors")
    .optional()
    .isArray()
    .withMessage(
      "Colors must be an array."
    ),

  body("isAvailable")
    .optional()
    .isBoolean()
    .withMessage(
      "isAvailable must be true or false."
    ),
];

export const validateFlowerRequest = (
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