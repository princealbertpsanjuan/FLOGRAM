import Order from "./order.model.js";

import User from "../auth/auth.model.js";
import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";

import CustomBouquetRequest from "../bloomboard/customBouquet/customBouquetRequest.model.js";

import {
  calculateDeliveryRoute,
} from "../../services/routing.service.js";

/*
 * =========================================================
 * PRE-ORDER CONFIGURATION
 * =========================================================
 *
 * Additional charge applied when the customer
 * schedules an order for a future delivery date.
 */
const PRE_ORDER_FEE = 50;

/*
 * =========================================================
 * PRE-ORDER FULFILLMENT CONFIGURATION
 * =========================================================
 *
 * Seller may begin preparing a scheduled order
 * this many hours before its requested delivery time.
 *
 * Default: 24 hours
 *
 * .env:
 * PREORDER_PREPARATION_LEAD_HOURS=24
 */
const getPreOrderPreparationLeadHours =
  () => {
    const hours =
      Number(
        process.env
          .PREORDER_PREPARATION_LEAD_HOURS ||
          24
      );

    if (
      !Number.isFinite(hours) ||
      hours < 0
    ) {
      return 24;
    }

    return hours;
  };

/*
 * Calculate when preparation becomes available.
 *
 * requestedDeliveryDate already contains the
 * customer's exact scheduled date/time.
 *
 * Example:
 *
 * Delivery:
 * Aug 30, 2026 2:00 PM
 *
 * Lead time:
 * 24 hours
 *
 * Preparation opens:
 * Aug 29, 2026 2:00 PM
 */
const getPreOrderPreparationOpenAt =
  (
    order
  ) => {
    if (
      !order
        ?.requestedDeliveryDate
    ) {
      return null;
    }

    const scheduledDelivery =
      new Date(
        order
          .requestedDeliveryDate
      );

    if (
      Number.isNaN(
        scheduledDelivery
          .getTime()
      )
    ) {
      return null;
    }

    const leadHours =
      getPreOrderPreparationLeadHours();

    return new Date(
      scheduledDelivery.getTime() -
        leadHours *
          60 *
          60 *
          1000
    );
  };

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const normalizeArray = (value) => {
  return Array.isArray(value)
    ? value
    : [];
};

/*
 * Validate delivery / pickup information.
 */
const validateDeliveryDetails = (
  orderData
) => {
  const fulfillmentType =
    orderData.fulfillmentType ||
    "delivery";

  if (
    ![
      "delivery",
      "pickup",
    ].includes(
      fulfillmentType
    )
  ) {
    const error = new Error(
      "Fulfillment type must be delivery or pickup."
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    fulfillmentType ===
    "delivery"
  ) {
    const address =
      orderData.deliveryAddress ||
      {};

    const requiredFields = [
      "street",
      "barangay",
      "city",
      "province",
    ];

    const missing =
      requiredFields.filter(
        (field) =>
          !String(
            address[field] || ""
          ).trim()
      );

    if (
      missing.length >
      0
    ) {
      const error =
        new Error(
          "Complete delivery address is required for delivery orders."
        );

      error.statusCode = 400;

      throw error;
    }
  }

  return fulfillmentType;
};

/*
 * Validate payment method.
 *
 * DELIVERY
 * - cash_on_delivery
 * - paymongo
 *
 * PICKUP
 * - cash_on_pickup
 * - paymongo
 */
const validatePaymentMethod = (
  paymentMethod,
  fulfillmentType
) => {
  if (
    paymentMethod ===
      undefined ||
    paymentMethod ===
      null ||
    paymentMethod === ""
  ) {
    return null;
  }

  const normalized =
    String(
      paymentMethod
    ).trim();

  const allowedMethods = [
    "cash_on_delivery",
    "cash_on_pickup",
    "paymongo",
  ];

  if (
    !allowedMethods.includes(
      normalized
    )
  ) {
    const error =
      new Error(
        "Payment method is invalid."
      );

    error.statusCode = 400;

    throw error;
  }

  if (
    normalized ===
      "cash_on_delivery" &&
    fulfillmentType !==
      "delivery"
  ) {
    const error =
      new Error(
        "Cash on delivery can only be used for delivery orders."
      );

    error.statusCode = 400;

    throw error;
  }

  if (
    normalized ===
      "cash_on_pickup" &&
    fulfillmentType !==
      "pickup"
  ) {
    const error =
      new Error(
        "Cash on pickup can only be used for pickup orders."
      );

    error.statusCode = 400;

    throw error;
  }

  return normalized;
};

/*
 * Populate complete order.
 */
const populateOrder = (
  orderId
) => {
  return Order.findById(
    orderId
  )
    .populate(
      "customer",
      "firstName lastName email phoneNumber profileImage"
    )
    .populate(
      "seller",
      "firstName lastName email phoneNumber"
    )
    .populate(
      "florist",
      "shopName address location contactNumber businessEmail shopLogo"
    )
    .populate(
      "flower",
      "name images price"
    )
    .populate(
      "customBouquetRequest"
    );
};

/*
 * =========================================================
 * CUSTOMER
 * CREATE ORDER
 * =========================================================
 */
export const createOrder = async (
  customerId,
  orderData
) => {
  const customer =
    await User.findById(
      customerId
    );

  if (
    !customer ||
    customer.role !==
      "customer"
  ) {
    const error =
      new Error(
        "Only customer accounts can create orders."
      );

    error.statusCode = 403;

    throw error;
  }

  /*
   * =======================================================
   * ORDER SOURCE
   * =======================================================
   */
  const sourceType =
    orderData.sourceType;

  if (
    ![
      "flower_listing",
      "custom_bouquet",
    ].includes(
      sourceType
    )
  ) {
    const error =
      new Error(
        "Invalid order source type."
      );

    error.statusCode = 400;

    throw error;
  }

  const fulfillmentType =
    validateDeliveryDetails(
      orderData
    );

  const paymentMethod =
    validatePaymentMethod(
      orderData.paymentMethod,
      fulfillmentType
    );

  const quantity =
    Math.max(
      Number(
        orderData.quantity
      ) || 1,
      1
    );

  /*
   * These will be resolved from either
   * a normal flower listing or custom
   * bouquet quotation.
   */
  let seller;

  let florist;

  let floristProfile =
    null;

  let flower =
    null;

  let customBouquetRequest =
    null;

  let productName;

  let productDescription =
    null;

  let inspirationImage =
    null;

  let unitPrice;

  let occasion =
    null;

  let flowerTypes =
    [];

  let colors =
    [];

  let styles =
    [];

  let wrapping =
    null;

  let specialInstructions =
    [];

  /*
   * =======================================================
   * NORMAL FLOWER LISTING
   * =======================================================
   */
  if (
    sourceType ===
    "flower_listing"
  ) {
    if (
      !orderData.flowerId
    ) {
      const error =
        new Error(
          "Flower listing ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    flower =
      await Flower.findOne({
        _id:
          orderData.flowerId,

        isActive:
          true,

        isAvailable:
          true,
      });

    if (!flower) {
      const error =
        new Error(
          "Flower listing was not found or is unavailable."
        );

      error.statusCode = 404;

      throw error;
    }

    seller =
      flower.seller;

    florist =
      flower.florist;

    floristProfile =
      await Florist.findById(
        florist
      );

    if (!floristProfile) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    productName =
      flower.name;

    productDescription =
      flower.description;

    unitPrice =
      flower.price;

    inspirationImage =
      flower.images?.[0] ||
      null;

    occasion =
      flower.occasion?.[0] ||
      null;

    flowerTypes =
      normalizeArray(
        flower.flowerTypes
      );

    colors =
      normalizeArray(
        flower.colors
      );
  }

  /*
   * =======================================================
   * CUSTOM BOUQUET
   * =======================================================
   */
  if (
    sourceType ===
    "custom_bouquet"
  ) {
    if (
      !orderData
        .customBouquetRequestId
    ) {
      const error =
        new Error(
          "Custom bouquet request ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    customBouquetRequest =
      await CustomBouquetRequest.findOne({
        _id:
          orderData
            .customBouquetRequestId,

        customer:
          customerId,
      });

    if (
      !customBouquetRequest
    ) {
      const error =
        new Error(
          "Custom bouquet request was not found or does not belong to this customer."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      customBouquetRequest
        .status !==
      "customer_accepted"
    ) {
      const error =
        new Error(
          "Only customer-accepted custom bouquet quotes can be converted into an order."
        );

      error.statusCode = 400;

      throw error;
    }

    if (
      customBouquetRequest
        .quotedPrice ===
        null ||
      customBouquetRequest
        .quotedPrice ===
        undefined
    ) {
      const error =
        new Error(
          "The custom bouquet request does not have a valid quoted price."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Prevent duplicate active orders.
     */
    const existingOrder =
      await Order.findOne({
        customBouquetRequest:
          customBouquetRequest
            ._id,

        orderStatus: {
          $ne:
            "cancelled",
        },
      });

    if (
      existingOrder
    ) {
      const error =
        new Error(
          "An active order already exists for this custom bouquet request."
        );

      error.statusCode = 409;

      throw error;
    }

    florist =
      customBouquetRequest
        .florist;

    floristProfile =
      await Florist.findById(
        florist
      );

    if (
      !floristProfile
    ) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    seller =
      floristProfile.owner;

    productName =
      customBouquetRequest
        .occasion
        ? `Custom ${customBouquetRequest.occasion} Bouquet`
        : "Custom Bouquet";

    productDescription =
      customBouquetRequest
        .customerMessage ||
      "Customized bouquet based on the customer's approved florist quotation.";

    inspirationImage =
      customBouquetRequest
        .inspirationImage;

    unitPrice =
      customBouquetRequest
        .quotedPrice;

    occasion =
      customBouquetRequest
        .occasion;

    flowerTypes =
      normalizeArray(
        customBouquetRequest
          .flowerTypes
      );

    colors =
      normalizeArray(
        customBouquetRequest
          .colors
      );

    styles =
      normalizeArray(
        customBouquetRequest
          .styles
      );

    wrapping =
      customBouquetRequest
        .wrapping;

    specialInstructions =
      normalizeArray(
        customBouquetRequest
          .specialInstructions
      );
  }

  /*
   * =======================================================
   * QUANTITY
   * =======================================================
   */
  const finalQuantity =
    sourceType ===
      "custom_bouquet"
      ? Math.max(
          Number(
            customBouquetRequest
              .quantity
          ) || 1,
          1
        )
      : quantity;

  /*
   * =======================================================
   * PRODUCT SUBTOTAL
   * =======================================================
   *
   * Never trust frontend subtotal.
   */
  const subtotal =
    Number(
      unitPrice
    ) *
    finalQuantity;

  /*
   * =======================================================
   * DELIVERY ROUTING + FEE
   * =======================================================
   *
   * SAME calculation for:
   *
   * - cash_on_delivery
   * - paymongo
   *
   * Payment method does NOT determine
   * the delivery fee.
   *
   * Distance determines the delivery fee.
   */
  let deliveryFee =
    0;

  let deliveryLocation = {
    latitude:
      null,

    longitude:
      null,
  };

  let pickupLocation = {
    latitude:
      null,

    longitude:
      null,
  };

  let deliveryDistanceMeters =
    null;

  let deliveryDurationSeconds =
    null;

  /*
   * Only delivery orders require
   * routing.
   *
   * Pickup orders remain ₱0 delivery.
   */
  if (
    fulfillmentType ===
    "delivery"
  ) {
    if (
      !floristProfile
    ) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const pickupLatitude =
      floristProfile
        ?.location
        ?.latitude;

    const pickupLongitude =
      floristProfile
        ?.location
        ?.longitude;

    /*
     * Shop must have map coordinates.
     */
    if (
      pickupLatitude ===
        undefined ||
      pickupLatitude ===
        null ||
      pickupLongitude ===
        undefined ||
      pickupLongitude ===
        null
    ) {
      const error =
        new Error(
          "The florist does not have a valid map location yet."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Customer's exact map pin.
     */
    const deliveryLatitude =
      orderData
        ?.deliveryLocation
        ?.latitude;

    const deliveryLongitude =
      orderData
        ?.deliveryLocation
        ?.longitude;

    if (
      deliveryLatitude ===
        undefined ||
      deliveryLatitude ===
        null ||
      deliveryLongitude ===
        undefined ||
      deliveryLongitude ===
        null
    ) {
      const error =
        new Error(
          "Delivery location coordinates are required for delivery orders."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * OpenRouteService:
     *
     * Florist shop
     *      ↓
     * Customer map location
     *
     * Returns:
     *
     * - road distance
     * - travel duration
     * - calculated delivery fee
     */
    const route =
      await calculateDeliveryRoute({
        pickupLatitude,

        pickupLongitude,

        deliveryLatitude,

        deliveryLongitude,
      });

    deliveryFee =
      route.deliveryFee;

    deliveryDistanceMeters =
      route.distanceMeters;

    deliveryDurationSeconds =
      route.durationSeconds;

    /*
     * Snapshot florist location.
     */
    pickupLocation = {
      latitude:
        Number(
          pickupLatitude
        ),

      longitude:
        Number(
          pickupLongitude
        ),
    };

    /*
     * Snapshot customer location.
     */
    deliveryLocation = {
      latitude:
        Number(
          deliveryLatitude
        ),

      longitude:
        Number(
          deliveryLongitude
        ),
    };
  }

/*
 * =======================================================
 * PRE-ORDER / SCHEDULED DELIVERY
 * =======================================================
 */
let requestedDeliveryDate =
  null;

if (
  orderData
    .requestedDeliveryDate
) {
  requestedDeliveryDate =
    new Date(
      orderData
        .requestedDeliveryDate
    );

  if (
    Number.isNaN(
      requestedDeliveryDate
        .getTime()
    )
  ) {
    const error =
      new Error(
        "Requested delivery date is invalid."
      );

    error.statusCode = 400;

    throw error;
  }
}

/*
 * If customer sends a delivery date,
 * automatically treat it as a pre-order.
 */
const isPreOrder =
  Boolean(
    orderData.isPreOrder ||
    requestedDeliveryDate
  );

if (
  isPreOrder &&
  !requestedDeliveryDate
) {
  const error =
    new Error(
      "Requested delivery date is required for pre-orders."
    );

  error.statusCode = 400;

  throw error;
}

if (
  isPreOrder &&
  requestedDeliveryDate <=
    new Date()
) {
  const error =
    new Error(
      "Pre-order delivery date must be in the future."
    );

  error.statusCode = 400;

  throw error;
}

const requestedDeliveryTimeStart =
  orderData
    .requestedDeliveryTimeStart ||
  null;

const requestedDeliveryTimeEnd =
  orderData
    .requestedDeliveryTimeEnd ||
  null;

/*
 * Both times must be supplied together.
 */
if (
  Boolean(
    requestedDeliveryTimeStart
  ) !==
  Boolean(
    requestedDeliveryTimeEnd
  )
) {
  const error =
    new Error(
      "Both delivery start time and delivery end time are required."
    );

  error.statusCode = 400;

  throw error;
}

if (
  requestedDeliveryTimeStart &&
  requestedDeliveryTimeEnd &&
  requestedDeliveryTimeEnd <=
    requestedDeliveryTimeStart
) {
  const error =
    new Error(
      "Delivery end time must be later than delivery start time."
    );

  error.statusCode = 400;

  throw error;
}

/*
 * =======================================================
 * PRE-ORDER FEE
 * =======================================================
 *
 * Normal order:
 * preOrderFee = 0
 *
 * Scheduled / pre-order:
 * preOrderFee = ₱50
 */
const preOrderFee =
  isPreOrder
    ? PRE_ORDER_FEE
    : 0;

/*
 * =======================================================
 * FINAL AMOUNT
 * =======================================================
 *
 * PRODUCT
 * +
 * DISTANCE-BASED DELIVERY
 * +
 * PRE-ORDER FEE
 *
 * This total is used by both:
 *
 * - Cash on Delivery
 * - Cash on Pickup
 * - PayMongo
 */
const totalAmount =
  subtotal +
  deliveryFee +
  preOrderFee;

  /*
   * =======================================================
   * PAYMENT PROVIDER
   * =======================================================
   */
  const paymentProvider =
    paymentMethod ===
      "paymongo"
      ? "paymongo"
      : null;

  /*
   * =======================================================
   * CREATE ORDER
   * =======================================================
   */
  const order =
    await Order.create({
      customer:
        customerId,

      seller,

      florist,

      sourceType,

      flower:
        flower?._id ||
        null,

      customBouquetRequest:
        customBouquetRequest
          ?._id ||
        null,

      /*
       * PRODUCT SNAPSHOT
       */
      productName,

      productDescription,

      inspirationImage,

      unitPrice,

      quantity:
        finalQuantity,

      subtotal,

      /*
       * DELIVERY PRICING
       */
      deliveryFee,

      totalAmount,

      fulfillmentType,

      deliveryAddress:
        fulfillmentType ===
        "delivery"
          ? orderData
              .deliveryAddress
          : {},

      /*
       * Customer map pin.
       */
      deliveryLocation:
        fulfillmentType ===
        "delivery"
          ? deliveryLocation
          : {
              latitude:
                null,

              longitude:
                null,
            },

      /*
       * Florist map snapshot.
       */
      pickupLocation:
        fulfillmentType ===
        "delivery"
          ? pickupLocation
          : {
              latitude:
                null,

              longitude:
                null,
            },

      /*
       * Route snapshot.
       */
      deliveryDistanceMeters:
        fulfillmentType ===
        "delivery"
          ? deliveryDistanceMeters
          : null,

      deliveryDurationSeconds:
        fulfillmentType ===
        "delivery"
          ? deliveryDurationSeconds
          : null,

      /*
       * RECIPIENT
       */
      recipientName:
        orderData
          .recipientName ||
        `${customer.firstName} ${customer.lastName}`,

      recipientPhoneNumber:
        orderData
          .recipientPhoneNumber ||
        customer.phoneNumber ||
        null,

/*
 * PRE-ORDER
 */
requestedDeliveryDate,

isPreOrder,

preOrderFee,

requestedDeliveryTimeStart,

requestedDeliveryTimeEnd,

customerNotes:
  orderData
    .customerNotes ||
  null,

      /*
       * BOUQUET DETAILS
       */
      occasion,

      flowerTypes,

      colors,

      styles,

      wrapping,

      specialInstructions,

      /*
       * ===================================================
       * PAYMENT
       * ===================================================
       *
       * PAYMONGO:
       * unpaid
       *   ↓
       * pending
       *   ↓
       * paid
       *
       * COD:
       * remains unpaid until successful
       * rider delivery.
       */
      paymentMethod,

      paymentProvider,

      paymentChannel:
        null,

      paymentStatus:
        "unpaid",

      paymongoCheckoutSessionId:
        null,

      paymongoPaymentIntentId:
        null,

      paymongoPaymentId:
        null,

      paymentCheckoutUrl:
        null,

      paymentInitiatedAt:
        null,

      paidAt:
        null,

      paymentFailedAt:
        null,

      refundedAt:
        null,

      lastPaymentEventId:
        null,

      /*
       * ORDER
       */
      orderStatus:
        "pending",
    });

  return populateOrder(
    order._id
  );
};

/*
 * =========================================================
 * CUSTOMER
 * GET OWN ORDERS
 * =========================================================
 */
export const getCustomerOrders =
  async (
    customerId,
    filters = {}
  ) => {
    const query = {
      customer:
        customerId,
    };

    if (
      filters.status
    ) {
      query.orderStatus =
        filters.status;
    }

    if (
      filters.paymentStatus
    ) {
      query.paymentStatus =
        filters.paymentStatus;
    }

    return Order.find(
      query
    )
      .populate(
        "florist",
        "shopName address location shopLogo"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET SHOP ORDERS
 * =========================================================
 */
export const getSellerOrders =
  async (
    sellerId,
    filters = {}
  ) => {
    const seller =
      await User.findById(
        sellerId
      );

    if (
      !seller ||
      seller.role !==
        "seller"
    ) {
      const error =
        new Error(
          "Only seller accounts can view shop orders."
        );

      error.statusCode = 403;

      throw error;
    }

    const florist =
      await Florist.findOne({
        owner:
          sellerId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const query = {
      florist:
        florist._id,
    };

    if (
      filters.status
    ) {
      query.orderStatus =
        filters.status;
    }

    if (
      filters.paymentStatus
    ) {
      query.paymentStatus =
        filters.paymentStatus;
    }

    return Order.find(
      query
    )
      .populate(
        "customer",
        "firstName lastName email phoneNumber profileImage"
      )
      .populate(
        "florist",
        "shopName address location shopLogo"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET ONE ORDER
 * =========================================================
 */
export const getOrderById =
  async (
    orderId,
    userId
  ) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      const error =
        new Error(
          "User account was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const order =
      await populateOrder(
        orderId
      );

    if (!order) {
      const error =
        new Error(
          "Order was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    /*
     * CUSTOMER
     */
    if (
      user.role ===
      "customer"
    ) {
      if (
        String(
          order.customer._id
        ) !==
        String(
          userId
        )
      ) {
        const error =
          new Error(
            "You do not have permission to view this order."
          );

        error.statusCode = 403;

        throw error;
      }

      return order;
    }

    /*
     * SELLER
     */
    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          order.seller._id
        ) !==
        String(
          userId
        )
      ) {
        const error =
          new Error(
            "You do not have permission to view this order."
          );

        error.statusCode = 403;

        throw error;
      }

      return order;
    }

    const error =
      new Error(
        "You do not have permission to view this order."
      );

    error.statusCode = 403;

    throw error;
  };

/*
 * =========================================================
 * SELLER
 * UPDATE ORDER STATUS
 * =========================================================
 */
export const updateSellerOrderStatus =
  async (
    orderId,
    sellerId,
    status,
    sellerNotes = null
  ) => {
    const order =
      await Order.findOne({
        _id:
          orderId,

        seller:
          sellerId,
      });

    if (!order) {
      const error =
        new Error(
          "Order was not found or does not belong to this seller."
        );

      error.statusCode =
        404;

      throw error;
    }

    /*
     * =====================================================
     * PAYMONGO
     * =====================================================
     *
     * Seller cannot confirm until
     * payment webhook verifies payment.
     */
    if (
      status ===
        "confirmed" &&
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus !==
        "paid"
    ) {
      const error =
        new Error(
          "This PayMongo order cannot be confirmed until payment is completed."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * PRE-ORDER PREPARATION LOCK
     * =====================================================
     *
     * Seller may confirm a future pre-order immediately.
     *
     * Seller may only start preparing it
     * within the configured lead time.
     *
     * Default:
     * 24 hours before scheduled delivery.
     */
    if (
      order.isPreOrder &&
      status ===
        "preparing"
    ) {
      if (
        !order
          .requestedDeliveryDate
      ) {
        const error =
          new Error(
            "This pre-order does not have a requested delivery date."
          );

        error.statusCode =
          400;

        throw error;
      }

      const scheduledDelivery =
        new Date(
          order
            .requestedDeliveryDate
        );

      if (
        Number.isNaN(
          scheduledDelivery
            .getTime()
        )
      ) {
        const error =
          new Error(
            "The scheduled delivery date for this pre-order is invalid."
          );

        error.statusCode =
          400;

        throw error;
      }

      const leadHours =
        Number(
          process.env
            .PREORDER_PREPARATION_LEAD_HOURS ||
            24
        );

      const safeLeadHours =
        Number.isFinite(
          leadHours
        ) &&
        leadHours >= 0
          ? leadHours
          : 24;

      const preparationOpenAt =
        new Date(
          scheduledDelivery.getTime() -
            safeLeadHours *
              60 *
              60 *
              1000
        );

      const now =
        new Date();

      if (
        now <
        preparationOpenAt
      ) {
        const error =
          new Error(
            `This pre-order cannot be prepared yet. Preparation becomes available at ${preparationOpenAt.toISOString()}.`
          );

        error.statusCode =
          400;

        throw error;
      }
    }

    /*
     * =====================================================
     * CASH ON DELIVERY
     * =====================================================
     *
     * COD stays unpaid while seller
     * fulfills the order.
     *
     * Payment becomes paid only after
     * successful delivery.
     */
    const transitions = {
      pending: [
        "confirmed",
      ],

      confirmed: [
        "preparing",
      ],

      preparing: [
        order.fulfillmentType ===
        "pickup"
          ? "ready_for_pickup"
          : "ready_for_delivery",
      ],
    };

    const allowed =
      transitions[
        order.orderStatus
      ] || [];

    if (
      !allowed.includes(
        status
      )
    ) {
      const error =
        new Error(
          `Order cannot move from ${order.orderStatus} to ${status}.`
        );

      error.statusCode =
        400;

      throw error;
    }

    order.orderStatus =
      status;

    if (
      sellerNotes !==
        undefined &&
      sellerNotes !==
        null
    ) {
      order.sellerNotes =
        String(
          sellerNotes
        ).trim();
    }

    const now =
      new Date();

    if (
      status ===
      "confirmed"
    ) {
      order.confirmedAt =
        now;
    }

    if (
      status ===
      "preparing"
    ) {
      order.preparingAt =
        now;
    }

    if (
      status ===
        "ready_for_pickup" ||
      status ===
        "ready_for_delivery"
    ) {
      order.readyAt =
        now;
    }

    await order.save();

    return order;
  };

/*
 * =========================================================
 * CUSTOMER
 * CANCEL ORDER
 * =========================================================
 */
export const cancelCustomerOrder =
  async (
    orderId,
    customerId,
    reason = null
  ) => {
    const order =
      await Order.findOne({
        _id:
          orderId,

        customer:
          customerId,
      });

    if (!order) {
      const error =
        new Error(
          "Order was not found or does not belong to this customer."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      ![
        "pending",
        "confirmed",
      ].includes(
        order.orderStatus
      )
    ) {
      const error =
        new Error(
          "This order can no longer be cancelled."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Paid PayMongo orders need
     * refund handling.
     */
    if (
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus ===
        "paid"
    ) {
      const error =
        new Error(
          "A paid PayMongo order cannot be cancelled through the standard cancellation endpoint. A refund must be processed."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Unpaid COD can still be cancelled
     * while pending / confirmed.
     */
    order.orderStatus =
      "cancelled";

    order.cancelledAt =
      new Date();

    order.cancellationReason =
      reason
        ? String(
            reason
          ).trim()
        : null;

    await order.save();

    return order;
  };

/*
 * =========================================================
 * CUSTOMER
 * COMPLETE DELIVERED ORDER
 * =========================================================
 */
export const completeCustomerOrder =
  async (
    orderId,
    customerId
  ) => {
    const order =
      await Order.findOne({
        _id:
          orderId,

        customer:
          customerId,
      });

    if (!order) {
      const error =
        new Error(
          "Order was not found or does not belong to this customer."
        );

      error.statusCode = 404;

      throw error;
    }

    /*
     * Rider must have successfully
     * delivered the bouquet first.
     */
    if (
      order.orderStatus !==
      "delivered"
    ) {
      const error =
        new Error(
          "Only delivered orders can be completed."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * =====================================================
     * PAYMENT MUST BE PAID
     * =====================================================
     *
     * PAYMONGO:
     * payment webhook sets this earlier.
     *
     * COD:
     * markDeliveryDelivered() sets
     * paymentStatus = paid.
     */
    if (
      order.paymentStatus !==
      "paid"
    ) {
      const error =
        new Error(
          "The order cannot be completed until payment has been confirmed."
        );

      error.statusCode = 400;

      throw error;
    }

    order.orderStatus =
      "completed";

    order.completedAt =
      new Date();

    await order.save();

    return populateOrder(
      order._id
    );
  };