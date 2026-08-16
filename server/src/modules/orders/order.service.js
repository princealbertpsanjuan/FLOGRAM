import Order from "./order.model.js";

import User from "../auth/auth.model.js";
import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";

import CustomBouquetRequest from "../bloomboard/customBouquet/customBouquetRequest.model.js";

const normalizeArray = (
  value
) => {
  return Array.isArray(value)
    ? value
    : [];
};

const validateDeliveryDetails = (
  orderData
) => {
  const fulfillmentType =
    orderData.fulfillmentType ||
    "delivery";

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

      error.statusCode =
        400;

      throw error;
    }
  }

  return fulfillmentType;
};

/*
 * CUSTOMER
 * CREATE ORDER
 */
export const createOrder =
  async (
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

      error.statusCode =
        403;

      throw error;
    }

    const sourceType =
      orderData.sourceType;

    const fulfillmentType =
      validateDeliveryDetails(
        orderData
      );

    const quantity =
      Math.max(
        Number(
          orderData.quantity
        ) || 1,
        1
      );

    let seller;
    let florist;

    let flower = null;

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
     * =====================================
     * NORMAL FLOWER LISTING
     * =====================================
     */
    if (
      sourceType ===
      "flower_listing"
    ) {
      if (!orderData.flowerId) {
        const error =
          new Error(
            "Flower listing ID is required."
          );

        error.statusCode =
          400;

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

        error.statusCode =
          404;

        throw error;
      }

      seller =
        flower.seller;

      florist =
        flower.florist;

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
     * =====================================
     * CUSTOM AI BOUQUET
     * =====================================
     */
    else if (
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

        error.statusCode =
          400;

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

        error.statusCode =
          404;

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

        error.statusCode =
          400;

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

        error.statusCode =
          400;

        throw error;
      }

      /*
       * Prevent duplicate orders for
       * the same custom bouquet request.
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

      if (existingOrder) {
        const error =
          new Error(
            "An active order already exists for this custom bouquet request."
          );

        error.statusCode =
          409;

        throw error;
      }

      florist =
        customBouquetRequest
          .florist;

      const floristProfile =
        await Florist.findById(
          florist
        );

      if (!floristProfile) {
        const error =
          new Error(
            "Florist profile was not found."
          );

        error.statusCode =
          404;

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

      /*
       * Quantity already formed part
       * of the seller/customer custom
       * quotation, so keep that request
       * quantity as the order quantity.
       */
      if (
        customBouquetRequest
          .quantity
      ) {
        /*
         * Replace quantity selected
         * above.
         */
      }

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
    } else {
      const error =
        new Error(
          "Invalid order source type."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * For custom bouquets, use the
     * quantity agreed in the request.
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

    const subtotal =
      Number(unitPrice) *
      finalQuantity;

    /*
     * Delivery pricing will be
     * connected to your delivery
     * module later.
     *
     * Do not trust a client-submitted
     * delivery fee.
     */
    const deliveryFee =
      0;

    const totalAmount =
      subtotal +
      deliveryFee;

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

        error.statusCode =
          400;

        throw error;
      }
    }

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

        productName,

        productDescription,

        inspirationImage,

        unitPrice,

        quantity:
          finalQuantity,

        subtotal,

        deliveryFee,

        totalAmount,

        fulfillmentType,

        deliveryAddress:
          fulfillmentType ===
          "delivery"
            ? orderData
                .deliveryAddress
            : {},

        recipientName:
          orderData
            .recipientName ||
          `${customer.firstName} ${customer.lastName}`,

        recipientPhoneNumber:
          orderData
            .recipientPhoneNumber ||
          customer.phoneNumber ||
          null,

        requestedDeliveryDate,

        customerNotes:
          orderData
            .customerNotes ||
          null,

        occasion,

        flowerTypes,

        colors,

        styles,

        wrapping,

        specialInstructions,

        paymentMethod:
          orderData
            .paymentMethod ||
          null,

        paymentStatus:
          "unpaid",

        orderStatus:
          "pending",
      });

    return Order.findById(
      order._id
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
        "shopName address contactNumber businessEmail shopLogo"
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
 * CUSTOMER
 * GET OWN ORDERS
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

    return Order.find(query)
      .populate(
        "florist",
        "shopName address shopLogo"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * SELLER
 * GET SHOP ORDERS
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

      error.statusCode =
        403;

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

      error.statusCode =
        404;

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

    return Order.find(query)
      .populate(
        "customer",
        "firstName lastName email phoneNumber profileImage"
      )
      .populate(
        "florist",
        "shopName address shopLogo"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * CUSTOMER / SELLER
 * GET ONE ORDER
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

      error.statusCode =
        404;

      throw error;
    }

    const order =
      await Order.findById(
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
          "shopName owner address contactNumber businessEmail shopLogo"
        )
        .populate(
          "flower",
          "name images price"
        )
        .populate(
          "customBouquetRequest"
        );

    if (!order) {
      const error =
        new Error(
          "Order was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      user.role ===
      "customer"
    ) {
      if (
        String(
          order.customer._id
        ) !==
        String(userId)
      ) {
        const error =
          new Error(
            "You do not have permission to view this order."
          );

        error.statusCode =
          403;

        throw error;
      }

      return order;
    }

    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          order.seller._id
        ) !==
        String(userId)
      ) {
        const error =
          new Error(
            "You do not have permission to view this order."
          );

        error.statusCode =
          403;

        throw error;
      }

      return order;
    }

    const error =
      new Error(
        "You do not have permission to view this order."
      );

    error.statusCode =
      403;

    throw error;
  };

/*
 * SELLER
 * UPDATE ORDER STATUS
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
 * CUSTOMER
 * CANCEL ORDER
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

      error.statusCode =
        404;

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

      error.statusCode =
        400;

      throw error;
    }

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