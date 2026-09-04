import {
  body,
  param,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * SHARED CHECKOUT VALIDATION
 * =========================================================
 */

const checkoutBodyValidation =
  [
    /*
     * ===============================================
     * FULFILLMENT
     * ===============================================
     */

    body(
      "fulfillmentType"
    )
      .notEmpty()
      .withMessage(
        "Fulfillment type is required."
      )
      .isIn([
        "delivery",
        "pickup",
      ])
      .withMessage(
        "Fulfillment type must be delivery or pickup."
      ),

    /*
     * ===============================================
     * RECIPIENT
     * ===============================================
     */

    body(
      "recipientName"
    )
      .trim()
      .notEmpty()
      .withMessage(
        "Recipient name is required."
      )
      .isLength({
        max: 200,
      })
      .withMessage(
        "Recipient name cannot exceed 200 characters."
      ),

    body(
      "recipientPhoneNumber"
    )
      .trim()
      .notEmpty()
      .withMessage(
        "Recipient phone number is required."
      )
      .matches(
        /^(09|\+639)\d{9}$/
      )
      .withMessage(
        "Enter a valid Philippine mobile number."
      ),

    /*
     * ===============================================
     * DELIVERY ADDRESS
     * ===============================================
     */

    body(
      "deliveryAddress.street"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .trim()
      .notEmpty()
      .withMessage(
        "Street or house number is required for delivery."
      ),

    body(
      "deliveryAddress.barangay"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .trim()
      .notEmpty()
      .withMessage(
        "Barangay is required for delivery."
      ),

    body(
      "deliveryAddress.city"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .trim()
      .notEmpty()
      .withMessage(
        "City is required for delivery."
      ),

    body(
      "deliveryAddress.province"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .trim()
      .notEmpty()
      .withMessage(
        "Province is required for delivery."
      ),

    body(
      "deliveryAddress.postalCode"
    )
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 20,
      })
      .withMessage(
        "Postal code is too long."
      ),

    body(
      "deliveryAddress.landmark"
    )
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 500,
      })
      .withMessage(
        "Landmark cannot exceed 500 characters."
      ),

    /*
     * ===============================================
     * LOCATION
     * ===============================================
     */

    body(
      "deliveryLocation.latitude"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .notEmpty()
      .withMessage(
        "Delivery latitude is required."
      )
      .bail()
      .isFloat({
        min: -90,
        max: 90,
      })
      .withMessage(
        "Delivery latitude is invalid."
      )
      .toFloat(),

    body(
      "deliveryLocation.longitude"
    )
      .if(
        body(
          "fulfillmentType"
        ).equals(
          "delivery"
        )
      )
      .notEmpty()
      .withMessage(
        "Delivery longitude is required."
      )
      .bail()
      .isFloat({
        min: -180,
        max: 180,
      })
      .withMessage(
        "Delivery longitude is invalid."
      )
      .toFloat(),

    /*
     * ===============================================
     * SCHEDULE
     * ===============================================
     */

    body(
      "isPreOrder"
    )
      .optional()
      .isBoolean()
      .withMessage(
        "isPreOrder must be true or false."
      )
      .toBoolean(),

    body(
      "requestedDeliveryDate"
    )
      .optional({
        nullable: true,
      })
      .isISO8601()
      .withMessage(
        "Requested delivery date must be a valid date."
      ),

    body(
      "requestedDeliveryTimeStart"
    )
      .optional({
        nullable: true,
      })
      .matches(
        /^([01]\d|2[0-3]):[0-5]\d$/
      )
      .withMessage(
        "Delivery start time must use HH:MM format."
      ),

    body(
      "requestedDeliveryTimeEnd"
    )
      .optional({
        nullable: true,
      })
      .matches(
        /^([01]\d|2[0-3]):[0-5]\d$/
      )
      .withMessage(
        "Delivery end time must use HH:MM format."
      ),

    /*
     * Both or neither.
     */

    body().custom(
      (value) => {
        const start =
          value
            .requestedDeliveryTimeStart;

        const end =
          value
            .requestedDeliveryTimeEnd;

        if (
          !start &&
          !end
        ) {
          return true;
        }

        if (
          !start ||
          !end
        ) {
          throw new Error(
            "Both delivery start time and delivery end time are required."
          );
        }

        if (
          end <= start
        ) {
          throw new Error(
            "Delivery end time must be later than delivery start time."
          );
        }

        return true;
      }
    ),

    /*
     * Pre-order requires a date.
     */

    body().custom(
      (value) => {
        if (
          value.isPreOrder &&
          !value
            .requestedDeliveryDate
        ) {
          throw new Error(
            "Requested delivery date is required for pre-orders."
          );
        }

        return true;
      }
    ),

    /*
     * ===============================================
     * NOTES
     * ===============================================
     */

    body(
      "customerNotes"
    )
      .optional({
        nullable: true,
      })
      .trim()
      .isLength({
        max: 2000,
      })
      .withMessage(
        "Customer notes cannot exceed 2000 characters."
      ),
  ];

/*
 * =========================================================
 * QUOTE
 * =========================================================
 *
 * Payment method is NOT required to calculate a quote.
 * =========================================================
 */

export const checkoutQuoteValidation =
  checkoutBodyValidation;

/*
 * =========================================================
 * CREATE CHECKOUT
 * =========================================================
 */

export const createCheckoutValidation =
  [
    ...checkoutBodyValidation,

    body(
      "paymentMethod"
    )
      .notEmpty()
      .withMessage(
        "Payment method is required."
      )
      .isIn([
        "cash_on_delivery",
        "cash_on_pickup",
        "paymongo",
      ])
      .withMessage(
        "Payment method is invalid."
      ),

    /*
     * COD cannot be used for pickup.
     */

    body().custom(
      (value) => {
        if (
          value.fulfillmentType ===
            "pickup" &&
          value.paymentMethod ===
            "cash_on_delivery"
        ) {
          throw new Error(
            "Cash on delivery cannot be used for pickup."
          );
        }

        if (
          value.fulfillmentType ===
            "delivery" &&
          value.paymentMethod ===
            "cash_on_pickup"
        ) {
          throw new Error(
            "Cash on pickup cannot be used for delivery."
          );
        }

        return true;
      }
    ),
  ];

/*
 * =========================================================
 * CHECKOUT ID
 * =========================================================
 */

export const checkoutIdValidation =
  [
    param(
      "checkoutId"
    )
      .notEmpty()
      .withMessage(
        "Checkout ID is required."
      )
      .bail()
      .isMongoId()
      .withMessage(
        "Checkout ID is invalid."
      ),
  ];

/*
 * =========================================================
 * VALIDATION RESPONSE
 * =========================================================
 */

export const validateCheckoutRequest =
  (
    req,
    res,
    next
  ) => {
    const errors =
      validationResult(
        req
      );

    if (
      errors.isEmpty()
    ) {
      next();

      return;
    }

    return res
      .status(422)
      .json({
        success:
          false,

        message:
          "Validation failed.",

        errors:
          errors
            .array()
            .map(
              (
                error
              ) => ({
                field:
                  error.path ||
                  "request",

                message:
                  error.msg,
              })
            ),
      });
  };