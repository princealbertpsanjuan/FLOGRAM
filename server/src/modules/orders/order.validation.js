import {
  body,
  validationResult,
} from "express-validator";

/*
 * =========================================================
 * CUSTOMER
 * CREATE ORDER
 * =========================================================
 */
export const createOrderValidation = [
  body("sourceType")
    .notEmpty()
    .withMessage(
      "Order source type is required."
    )
    .isIn([
      "flower_listing",
      "custom_bouquet",
    ])
    .withMessage(
      "Order source type must be flower_listing or custom_bouquet."
    ),

  body("flowerId")
    .optional({
      nullable: true,
    })
    .isMongoId()
    .withMessage(
      "Flower ID is invalid."
    ),

  body("customBouquetRequestId")
    .optional({
      nullable: true,
    })
    .isMongoId()
    .withMessage(
      "Custom bouquet request ID is invalid."
    ),

  body("quantity")
    .optional()
    .isInt({
      min: 1,
    })
    .withMessage(
      "Quantity must be at least 1."
    ),

  body("fulfillmentType")
    .optional()
    .isIn([
      "delivery",
      "pickup",
    ])
    .withMessage(
      "Fulfillment type must be delivery or pickup."
    ),

  /*
   * DELIVERY ADDRESS
   *
   * Detailed requirement checks are
   * still handled by order.service.js
   * because they depend on
   * fulfillmentType.
   */
  body("deliveryAddress")
    .optional({
      nullable: true,
    })
    .isObject()
    .withMessage(
      "Delivery address must be an object."
    ),

  body("deliveryAddress.street")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 200,
    })
    .withMessage(
      "Street cannot exceed 200 characters."
    ),

  body("deliveryAddress.barangay")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 150,
    })
    .withMessage(
      "Barangay cannot exceed 150 characters."
    ),

  body("deliveryAddress.city")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 150,
    })
    .withMessage(
      "City cannot exceed 150 characters."
    ),

  body("deliveryAddress.province")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 150,
    })
    .withMessage(
      "Province cannot exceed 150 characters."
    ),

  body("deliveryAddress.postalCode")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 20,
    })
    .withMessage(
      "Postal code cannot exceed 20 characters."
    ),

  body("deliveryAddress.landmark")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 300,
    })
    .withMessage(
      "Landmark cannot exceed 300 characters."
    ),

  /*
   * RECIPIENT
   */
  body("recipientName")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 150,
    })
    .withMessage(
      "Recipient name cannot exceed 150 characters."
    ),

  body("recipientPhoneNumber")
    .optional({
      nullable: true,
    })
    .trim()
    .matches(
      /^(09|\+639)\d{9}$/
    )
    .withMessage(
      "Enter a valid Philippine phone number."
    ),

  body("requestedDeliveryDate")
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage(
      "Requested delivery date is invalid."
    ),

  body("customerNotes")
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

  /*
   * PAYMENT
   *
   * PayMongo is the provider.
   *
   * GCash/card/QR Ph/etc. will be
   * handled later as PayMongo payment
   * channels rather than separate
   * FLOGRAM payment methods.
   */
  body("paymentMethod")
    .optional({
      nullable: true,
    })
    .isIn([
      "cash_on_delivery",
      "cash_on_pickup",
      "paymongo",
    ])
    .withMessage(
      "Payment method must be cash_on_delivery, cash_on_pickup, or paymongo."
    ),
];

/*
 * =========================================================
 * SELLER
 * UPDATE ORDER STATUS
 * =========================================================
 */
export const sellerOrderStatusValidation = [
  body("status")
    .notEmpty()
    .withMessage(
      "Order status is required."
    )
    .isIn([
      "confirmed",
      "preparing",
      "ready_for_pickup",
      "ready_for_delivery",
    ])
    .withMessage(
      "Seller order status is invalid."
    ),

  body("sellerNotes")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 2000,
    })
    .withMessage(
      "Seller notes cannot exceed 2000 characters."
    ),
];

/*
 * =========================================================
 * CUSTOMER
 * CANCEL ORDER
 * =========================================================
 */
export const cancelOrderValidation = [
  body("reason")
    .optional({
      nullable: true,
    })
    .trim()
    .isLength({
      max: 1000,
    })
    .withMessage(
      "Cancellation reason cannot exceed 1000 characters."
    ),
];

/*
 * =========================================================
 * VALIDATION RESPONSE
 * =========================================================
 */
export const validateOrderRequest = (
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