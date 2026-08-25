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
    )
    .toInt(),

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
   * =======================================================
   * DELIVERY ADDRESS
   * =======================================================
   *
   * Required delivery-address checks
   * that depend on fulfillmentType
   * are still handled in service.
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
   * =======================================================
   * CUSTOMER DELIVERY MAP LOCATION
   * =======================================================
   */
  body("deliveryLocation")
    .optional({
      nullable: true,
    })
    .isObject()
    .withMessage(
      "Delivery location must be an object."
    ),

  body("deliveryLocation.latitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -90,
      max: 90,
    })
    .withMessage(
      "Delivery latitude must be between -90 and 90."
    )
    .toFloat(),

  body("deliveryLocation.longitude")
    .optional({
      nullable: true,
    })
    .isFloat({
      min: -180,
      max: 180,
    })
    .withMessage(
      "Delivery longitude must be between -180 and 180."
    )
    .toFloat(),

  /*
   * =======================================================
   * RECIPIENT
   * =======================================================
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

  /*
   * =======================================================
   * PRE-ORDER / SCHEDULED DELIVERY
   * =======================================================
   */
  body("isPreOrder")
    .optional()
    .isBoolean()
    .withMessage(
      "isPreOrder must be true or false."
    )
    .toBoolean(),

  body("requestedDeliveryDate")
    .optional({
      nullable: true,
    })
    .isISO8601()
    .withMessage(
      "Requested delivery date is invalid."
    )
    .toDate(),

  body("requestedDeliveryTimeStart")
    .optional({
      nullable: true,
    })
    .matches(
      /^([01]\d|2[0-3]):[0-5]\d$/
    )
    .withMessage(
      "Requested delivery start time must use HH:MM format."
    ),

  body("requestedDeliveryTimeEnd")
    .optional({
      nullable: true,
    })
    .matches(
      /^([01]\d|2[0-3]):[0-5]\d$/
    )
    .withMessage(
      "Requested delivery end time must use HH:MM format."
    ),

  /*
   * =======================================================
   * CUSTOMER NOTES
   * =======================================================
   */
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
   * =======================================================
   * PAYMENT
   * =======================================================
   *
   * PayMongo is the payment provider.
   *
   * GCash, card and QRPh are payment
   * channels selected inside PayMongo.
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

  /*
   * =======================================================
   * CROSS-FIELD VALIDATION
   * =======================================================
   */

  /*
   * Delivery coordinates must be
   * supplied together.
   */
  body().custom((value) => {
    const location =
      value.deliveryLocation;

    if (!location) {
      return true;
    }

    const hasLatitude =
      location.latitude !==
        undefined &&
      location.latitude !==
        null;

    const hasLongitude =
      location.longitude !==
        undefined &&
      location.longitude !==
        null;

    if (
      hasLatitude !==
      hasLongitude
    ) {
      throw new Error(
        "Delivery latitude and longitude must be provided together."
      );
    }

    return true;
  }),

  /*
   * Delivery orders must contain a
   * map location.
   *
   * Pickup orders don't need it.
   */
  body().custom((value) => {
    const fulfillmentType =
      value.fulfillmentType ||
      "delivery";

    if (
      fulfillmentType !==
      "delivery"
    ) {
      return true;
    }

    const latitude =
      value.deliveryLocation
        ?.latitude;

    const longitude =
      value.deliveryLocation
        ?.longitude;

    if (
      latitude === undefined ||
      latitude === null ||
      longitude === undefined ||
      longitude === null
    ) {
      throw new Error(
        "Delivery location coordinates are required for delivery orders."
      );
    }

    return true;
  }),

  /*
   * Pre-orders must contain a future
   * delivery date.
   */
  body().custom((value) => {
    if (
      value.isPreOrder !==
      true
    ) {
      return true;
    }

    if (
      !value.requestedDeliveryDate
    ) {
      throw new Error(
        "Requested delivery date is required for pre-orders."
      );
    }

    const requestedDate =
      new Date(
        value.requestedDeliveryDate
      );

    if (
      Number.isNaN(
        requestedDate.getTime()
      )
    ) {
      throw new Error(
        "Requested delivery date is invalid."
      );
    }

    if (
      requestedDate <=
      new Date()
    ) {
      throw new Error(
        "Pre-order delivery date must be in the future."
      );
    }

    return true;
  }),

  /*
   * If a delivery window is used,
   * both start and end times are
   * required.
   */
  body().custom((value) => {
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

    return true;
  }),

  /*
   * Delivery end time must be later
   * than delivery start time.
   */
  body().custom((value) => {
    const start =
      value
        .requestedDeliveryTimeStart;

    const end =
      value
        .requestedDeliveryTimeEnd;

    if (
      !start ||
      !end
    ) {
      return true;
    }

    if (
      end <= start
    ) {
      throw new Error(
        "Delivery end time must be later than delivery start time."
      );
    }

    return true;
  }),
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
            error.path ||
            "request",

          message:
            error.msg,
        })
      ),
  });
};