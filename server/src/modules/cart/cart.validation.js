import {
  body,
  param,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * CUSTOMER
 * ADD FLOWER TO CART
 * =========================================================
 */

export const addCartItemValidation =
  [
    body("flowerId")
      .notEmpty()
      .withMessage(
        "Flower listing ID is required."
      )
      .bail()
      .isMongoId()
      .withMessage(
        "Flower listing ID is invalid."
      ),

    body("quantity")
      .optional()
      .isInt({
        min: 1,
      })
      .withMessage(
        "Quantity must be a whole number greater than or equal to 1."
      )
      .toInt(),
  ];

/*
 * =========================================================
 * CUSTOMER
 * UPDATE CART ITEM QUANTITY
 * =========================================================
 */

export const updateCartItemValidation =
  [
    param("cartItemId")
      .notEmpty()
      .withMessage(
        "Cart item ID is required."
      )
      .bail()
      .isMongoId()
      .withMessage(
        "Cart item ID is invalid."
      ),

    body("quantity")
      .notEmpty()
      .withMessage(
        "Quantity is required."
      )
      .bail()
      .isInt({
        min: 1,
      })
      .withMessage(
        "Quantity must be a whole number greater than or equal to 1."
      )
      .toInt(),
  ];

/*
 * =========================================================
 * CUSTOMER
 * REMOVE CART ITEM
 * =========================================================
 */

export const removeCartItemValidation =
  [
    param("cartItemId")
      .notEmpty()
      .withMessage(
        "Cart item ID is required."
      )
      .bail()
      .isMongoId()
      .withMessage(
        "Cart item ID is invalid."
      ),
  ];

/*
 * =========================================================
 * CUSTOMER
 * REMOVE FLOWER FROM CART
 * =========================================================
 */

export const removeFlowerValidation =
  [
    param("flowerId")
      .notEmpty()
      .withMessage(
        "Flower listing ID is required."
      )
      .bail()
      .isMongoId()
      .withMessage(
        "Flower listing ID is invalid."
      ),
  ];

/*
 * =========================================================
 * VALIDATION RESULT
 * =========================================================
 */

export const validateCartRequest =
  (
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

    return res
      .status(422)
      .json({
        success: false,

        message:
          "Validation failed.",

        errors: errors
          .array()
          .map(
            (error) => ({
              field:
                error.path,

              message:
                error.msg,
            })
          ),
      });
  };