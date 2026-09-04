import Checkout from "./checkout.model.js";

import User from "../auth/auth.model.js";
import Cart from "../cart/cart.model.js";
import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";
import Order from "../orders/order.model.js";

import {
  createOrder,
} from "../orders/order.service.js";

import {
  clearCustomerCart,
} from "../cart/cart.service.js";

import {
  calculateDeliveryRoute,
} from "../../services/routing.service.js";

import {
  parsePayMongoWebhook,
  verifyPayMongoWebhookSignature,
} from "../payments/paymongo.service.js";

/*
 * =========================================================
 * CONFIGURATION
 * =========================================================
 */

const PRE_ORDER_FEE = 50;

const PAYMONGO_API_URL =
  process.env.PAYMONGO_API_URL ||
  "https://api.paymongo.com";

/*
 * =========================================================
 * ERROR HELPER
 * =========================================================
 */

const createError = (
  message,
  statusCode = 400
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/*
 * =========================================================
 * ID HELPER
 * =========================================================
 */

const getId = (
  value
) => {
  if (!value) {
    return null;
  }

  return (
    value._id ||
    value
  );
};

/*
 * =========================================================
 * CUSTOMER
 * =========================================================
 */

const getCustomer =
  async (
    customerId
  ) => {
    const customer =
      await User.findById(
        customerId
      );

    if (!customer) {
      throw createError(
        "Customer account was not found.",
        404
      );
    }

    if (
      customer.role !==
      "customer"
    ) {
      throw createError(
        "Only customer accounts can create checkouts.",
        403
      );
    }

    return customer;
  };

/*
 * =========================================================
 * VALIDATE FULFILLMENT
 * =========================================================
 */

const validateFulfillment =
  (
    checkoutData
  ) => {
    const fulfillmentType =
      checkoutData
        .fulfillmentType ||
      "delivery";

    if (
      ![
        "delivery",
        "pickup",
      ].includes(
        fulfillmentType
      )
    ) {
      throw createError(
        "Fulfillment type must be delivery or pickup."
      );
    }

    /*
     * =====================================================
     * DELIVERY
     * =====================================================
     */

    if (
      fulfillmentType ===
      "delivery"
    ) {
      const address =
        checkoutData
          .deliveryAddress ||
        {};

      const requiredFields =
        [
          "street",
          "barangay",
          "city",
          "province",
        ];

      const missing =
        requiredFields.filter(
          (field) =>
            !String(
              address[
                field
              ] ||
                ""
            ).trim()
        );

      if (
        missing.length >
        0
      ) {
        throw createError(
          "Complete delivery address is required for delivery checkout."
        );
      }

      const latitude =
        checkoutData
          ?.deliveryLocation
          ?.latitude;

      const longitude =
        checkoutData
          ?.deliveryLocation
          ?.longitude;

      if (
        latitude ===
          undefined ||
        latitude === null ||
        longitude ===
          undefined ||
        longitude === null
      ) {
        throw createError(
          "Delivery location coordinates are required."
        );
      }

      const lat =
        Number(
          latitude
        );

      const lng =
        Number(
          longitude
        );

      if (
        !Number.isFinite(
          lat
        ) ||
        !Number.isFinite(
          lng
        ) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        throw createError(
          "Delivery location coordinates are invalid."
        );
      }
    }

    return fulfillmentType;
  };

/*
 * =========================================================
 * SCHEDULE / PRE-ORDER
 * =========================================================
 */

const resolveSchedule =
  (
    checkoutData
  ) => {
    let requestedDeliveryDate =
      null;

    if (
      checkoutData
        .requestedDeliveryDate
    ) {
      requestedDeliveryDate =
        new Date(
          checkoutData
            .requestedDeliveryDate
        );

      if (
        Number.isNaN(
          requestedDeliveryDate
            .getTime()
        )
      ) {
        throw createError(
          "Requested delivery date is invalid."
        );
      }
    }

    const isPreOrder =
      Boolean(
        checkoutData
          .isPreOrder ||
          requestedDeliveryDate
      );

    if (
      isPreOrder &&
      !requestedDeliveryDate
    ) {
      throw createError(
        "Requested delivery date is required for pre-orders."
      );
    }

    if (
      isPreOrder &&
      requestedDeliveryDate <=
        new Date()
    ) {
      throw createError(
        "Pre-order delivery date must be in the future."
      );
    }

    const requestedDeliveryTimeStart =
      checkoutData
        .requestedDeliveryTimeStart ||
      null;

    const requestedDeliveryTimeEnd =
      checkoutData
        .requestedDeliveryTimeEnd ||
      null;

    /*
     * Both must exist together.
     */

    if (
      Boolean(
        requestedDeliveryTimeStart
      ) !==
      Boolean(
        requestedDeliveryTimeEnd
      )
    ) {
      throw createError(
        "Both delivery start time and delivery end time are required."
      );
    }

    if (
      requestedDeliveryTimeStart &&
      requestedDeliveryTimeEnd &&
      requestedDeliveryTimeEnd <=
        requestedDeliveryTimeStart
    ) {
      throw createError(
        "Delivery end time must be later than delivery start time."
      );
    }

    return {
      isPreOrder,

      requestedDeliveryDate,

      requestedDeliveryTimeStart,

      requestedDeliveryTimeEnd,
    };
  };

/*
 * =========================================================
 * PAYMENT METHOD
 * =========================================================
 */

const validatePaymentMethod =
  (
    paymentMethod,
    fulfillmentType
  ) => {
    const allowedMethods =
      [
        "cash_on_delivery",
        "cash_on_pickup",
        "paymongo",
      ];

    if (
      !allowedMethods.includes(
        paymentMethod
      )
    ) {
      throw createError(
        "Payment method is invalid."
      );
    }

    if (
      fulfillmentType ===
        "delivery" &&
      paymentMethod ===
        "cash_on_pickup"
    ) {
      throw createError(
        "Cash on pickup cannot be used for delivery checkout."
      );
    }

    if (
      fulfillmentType ===
        "pickup" &&
      paymentMethod ===
        "cash_on_delivery"
    ) {
      throw createError(
        "Cash on delivery cannot be used for pickup checkout."
      );
    }

    return paymentMethod;
  };

/*
 * =========================================================
 * GET CART
 * =========================================================
 */

const getCheckoutCart =
  async (
    customerId
  ) => {
    const cart =
      await Cart.findOne({
        customer:
          customerId,
      }).populate({
        path:
          "items.flower",

        select:
          [
            "seller",
            "florist",
            "name",
            "description",
            "price",
            "category",
            "occasion",
            "flowerTypes",
            "colors",
            "images",
            "isAvailable",
            "isActive",
          ].join(" "),
      });

    if (!cart) {
      throw createError(
        "Shopping cart was not found.",
        404
      );
    }

    if (
      !Array.isArray(
        cart.items
      ) ||
      cart.items.length ===
        0
    ) {
      throw createError(
        "Your shopping cart is empty."
      );
    }

    return cart;
  };

/*
 * =========================================================
 * RESOLVE CART ITEMS
 * =========================================================
 *
 * Authoritative product information always comes from
 * MongoDB.
 *
 * The frontend never controls:
 *
 * - price
 * - seller
 * - florist
 * - availability
 * =========================================================
 */

const resolveCartItems =
  async (
    cart
  ) => {
    const resolvedItems =
      [];

    for (
      const cartItem of
      cart.items
    ) {
      const flowerId =
        getId(
          cartItem.flower
        );

      if (!flowerId) {
        throw createError(
          "A flower listing in the cart is invalid."
        );
      }

      const flower =
        await Flower.findOne({
          _id:
            flowerId,

          isActive:
            true,

          isAvailable:
            true,
        });

      if (!flower) {
        throw createError(
          "One or more flower listings in your cart are unavailable.",
          409
        );
      }

      const florist =
        await Florist.findById(
          flower.florist
        );

      if (!florist) {
        throw createError(
          `The florist for ${flower.name} was not found.`,
          404
        );
      }

      const quantity =
        Math.max(
          Number(
            cartItem
              .quantity
          ) || 1,
          1
        );

      const unitPrice =
        Number(
          flower.price
        );

      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice < 0
      ) {
        throw createError(
          `The price for ${flower.name} is invalid.`,
          500
        );
      }

      const subtotal =
        unitPrice *
        quantity;

      resolvedItems.push({
        cartItemId:
          cartItem._id,

        flower,

        florist,

        seller:
          flower.seller,

        quantity,

        unitPrice,

        subtotal,
      });
    }

    return resolvedItems;
  };

/*
 * =========================================================
 * GROUP ITEMS BY FLORIST
 * =========================================================
 *
 * Important FLOGRAM marketplace rule:
 *
 * SAME FLORIST:
 *
 * Bouquet A
 * Bouquet B
 *
 * -> one delivery fee
 * -> one pre-order fee
 *
 * DIFFERENT FLORISTS:
 *
 * Florist A -> delivery fee
 * Florist B -> delivery fee
 *
 * The customer still pays one final checkout total.
 * =========================================================
 */

const groupItemsByFlorist =
  (
    resolvedItems
  ) => {
    const groups =
      new Map();

    for (
      const item of
      resolvedItems
    ) {
      const floristId =
        String(
          item.florist._id
        );

      if (
        !groups.has(
          floristId
        )
      ) {
        groups.set(
          floristId,
          {
            florist:
              item.florist,

            seller:
              item.seller,

            items: [],
          }
        );
      }

      groups.get(
        floristId
      ).items.push(
        item
      );
    }

    return Array.from(
      groups.values()
    );
  };

/*
 * =========================================================
 * CALCULATE SHOP ROUTE
 * =========================================================
 */

const calculateShopDelivery =
  async ({
    florist,
    fulfillmentType,
    deliveryLocation,
  }) => {
    if (
      fulfillmentType !==
      "delivery"
    ) {
      return {
        deliveryFee:
          0,

        deliveryDistanceMeters:
          null,

        deliveryDurationSeconds:
          null,
      };
    }

    const pickupLatitude =
      florist
        ?.location
        ?.latitude;

    const pickupLongitude =
      florist
        ?.location
        ?.longitude;

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
      throw createError(
        `${
          florist.shopName ||
          "A florist"
        } does not have a valid map location yet.`
      );
    }

    const deliveryLatitude =
      Number(
        deliveryLocation
          .latitude
      );

    const deliveryLongitude =
      Number(
        deliveryLocation
          .longitude
      );

    const route =
      await calculateDeliveryRoute({
        pickupLatitude,

        pickupLongitude,

        deliveryLatitude,

        deliveryLongitude,
      });

    return {
      deliveryFee:
        Number(
          route
            .deliveryFee ||
            0
        ),

      deliveryDistanceMeters:
        route
          .distanceMeters ??
        null,

      deliveryDurationSeconds:
        route
          .durationSeconds ??
        null,
    };
  };

/*
 * =========================================================
 * QUOTE CHECKOUT
 * =========================================================
 *
 * No Orders are created here.
 *
 * Fees are calculated per SHOP, not per bouquet.
 * =========================================================
 */

export const quoteCustomerCheckout =
  async (
    customerId,
    checkoutData
  ) => {
    await getCustomer(
      customerId
    );

    const fulfillmentType =
      validateFulfillment(
        checkoutData
      );

    const schedule =
      resolveSchedule(
        checkoutData
      );

    const cart =
      await getCheckoutCart(
        customerId
      );

    const resolvedItems =
      await resolveCartItems(
        cart
      );

    const floristGroups =
      groupItemsByFlorist(
        resolvedItems
      );

    const quotedItems =
      [];

    const quotedShops =
      [];

    let productsSubtotal =
      0;

    let totalDeliveryFee =
      0;

    let totalPreOrderFee =
      0;

    /*
     * =====================================================
     * CALCULATE EACH SHOP
     * =====================================================
     */

    for (
      const group of
      floristGroups
    ) {
      const florist =
        group.florist;

      /*
       * One route calculation for the entire shop.
       */
      const route =
        await calculateShopDelivery({
          florist,

          fulfillmentType,

          deliveryLocation:
            checkoutData
              .deliveryLocation,
        });

      /*
       * One pre-order fee per shop.
       */
      const shopPreOrderFee =
        schedule.isPreOrder
          ? PRE_ORDER_FEE
          : 0;

      const shopProductsSubtotal =
        group.items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.subtotal,
          0
        );

      const shopTotalQuantity =
        group.items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity,
          0
        );

      const shopDeliveryFee =
        Number(
          route.deliveryFee ||
            0
        );

      const shopTotalAmount =
        shopProductsSubtotal +
        shopDeliveryFee +
        shopPreOrderFee;

      /*
       * ===================================================
       * ITEM BREAKDOWN
       * ===================================================
       *
       * We attach the shop-level fees to the first item
       * only.
       *
       * This makes the sum of child Order totals equal
       * exactly to the Checkout total.
       *
       * Example:
       *
       * Rose
       * subtotal       1999
       * delivery         50
       * preorder         50
       * total          2099
       *
       * Lily
       * subtotal       1699
       * delivery          0
       * preorder          0
       * total          1699
       *
       * Checkout       3798
       * ===================================================
       */

      const shopQuotedItems =
        group.items.map(
          (
            item,
            index
          ) => {
            const itemDeliveryFee =
              index === 0
                ? shopDeliveryFee
                : 0;

            const itemPreOrderFee =
              index === 0
                ? shopPreOrderFee
                : 0;

            const totalAmount =
              item.subtotal +
              itemDeliveryFee +
              itemPreOrderFee;

            return {
              cartItemId:
                item.cartItemId,

              flowerId:
                item.flower._id,

              seller:
                item.seller,

              florist:
                florist._id,

              shopName:
                florist.shopName ||
                "FLOGRAM Florist",

              productName:
                item.flower
                  .name,

              inspirationImage:
                item.flower
                  .images?.[0] ||
                null,

              quantity:
                item.quantity,

              unitPrice:
                item.unitPrice,

              subtotal:
                item.subtotal,

              deliveryFee:
                itemDeliveryFee,

              preOrderFee:
                itemPreOrderFee,

              totalAmount,

              /*
               * Route information belongs to the whole
               * shop fulfillment group.
               *
               * We include it on every item for UI and
               * debugging convenience.
               */
              deliveryDistanceMeters:
                route
                  .deliveryDistanceMeters,

              deliveryDurationSeconds:
                route
                  .deliveryDurationSeconds,
            };
          }
        );

      quotedItems.push(
        ...shopQuotedItems
      );

      quotedShops.push({
        florist:
          florist._id,

        shopName:
          florist.shopName ||
          "FLOGRAM Florist",

        itemCount:
          group.items.length,

        totalQuantity:
          shopTotalQuantity,

        productsSubtotal:
          shopProductsSubtotal,

        deliveryFee:
          shopDeliveryFee,

        preOrderFee:
          shopPreOrderFee,

        totalAmount:
          shopTotalAmount,

        deliveryDistanceMeters:
          route
            .deliveryDistanceMeters,

        deliveryDurationSeconds:
          route
            .deliveryDurationSeconds,

        items:
          shopQuotedItems,
      });

      productsSubtotal +=
        shopProductsSubtotal;

      totalDeliveryFee +=
        shopDeliveryFee;

      totalPreOrderFee +=
        shopPreOrderFee;
    }

    const totalAmount =
      productsSubtotal +
      totalDeliveryFee +
      totalPreOrderFee;

    return {
      fulfillmentType,

      isPreOrder:
        schedule.isPreOrder,

      requestedDeliveryDate:
        schedule
          .requestedDeliveryDate,

      requestedDeliveryTimeStart:
        schedule
          .requestedDeliveryTimeStart,

      requestedDeliveryTimeEnd:
        schedule
          .requestedDeliveryTimeEnd,

      itemCount:
        quotedItems.length,

      totalQuantity:
        quotedItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.quantity,
          0
        ),

      shopCount:
        quotedShops.length,

      productsSubtotal,

      deliveryFee:
        totalDeliveryFee,

      preOrderFee:
        totalPreOrderFee,

      totalAmount,

      shops:
        quotedShops,

      items:
        quotedItems,
    };
  };

/*
 * =========================================================
 * POPULATE CHECKOUT
 * =========================================================
 */

const populateCheckout =
  async (
    checkoutId
  ) => {
    return Checkout.findById(
      checkoutId
    )
      .populate(
        "customer",
        "firstName lastName email phoneNumber"
      )
      .populate(
        "items.flower",
        "name description price images isAvailable isActive"
      )
      .populate(
        "items.florist",
        "shopName address location shopLogo"
      )
      .populate({
        path:
          "orders",

        populate: {
          path:
            "florist",

          select:
            "shopName address location shopLogo",
        },
      });
  };

/*
 * =========================================================
 * NORMALIZE CREATED ORDER FEES BY SHOP
 * =========================================================
 *
 * Existing order.service.js still calculates:
 *
 * delivery fee per Order
 * pre-order fee per Order
 *
 * However cart checkout now follows:
 *
 * one delivery fee per SHOP
 * one pre-order fee per SHOP
 *
 * So after the real Orders are created, we normalize their
 * fee snapshots.
 *
 * The first Order of each florist keeps the shop-level fees.
 * Remaining Orders from that florist have those fees set to 0.
 *
 * This lets us reuse the existing Order creation logic
 * without duplicating marketplace fees.
 * =========================================================
 */

const normalizeCreatedOrderFees =
  async (
    createdOrders
  ) => {
    const groups =
      new Map();

    /*
     * Load authoritative persisted Orders.
     */

    for (
      const createdOrder of
      createdOrders
    ) {
      const order =
        await Order.findById(
          createdOrder._id
        );

      if (!order) {
        throw createError(
          "A created order could not be reloaded.",
          500
        );
      }

      const floristId =
        String(
          getId(
            order.florist
          )
        );

      if (
        !groups.has(
          floristId
        )
      ) {
        groups.set(
          floristId,
          []
        );
      }

      groups.get(
        floristId
      ).push(
        order
      );
    }

    const normalizedOrders =
      [];

    /*
     * =====================================================
     * NORMALIZE EACH SHOP
     * =====================================================
     */

    for (
      const groupOrders of
      groups.values()
    ) {
      if (
        groupOrders.length ===
        0
      ) {
        continue;
      }

      /*
       * All Orders from this florist use the same route
       * and checkout schedule.
       *
       * Keep the fee from the first Order as the canonical
       * shop-level fee.
       */

      const firstOrder =
        groupOrders[0];

      const shopDeliveryFee =
        Number(
          firstOrder
            .deliveryFee ||
            0
        );

      const shopPreOrderFee =
        Number(
          firstOrder
            .preOrderFee ||
            0
        );

      for (
        let index = 0;
        index <
        groupOrders.length;
        index += 1
      ) {
        const order =
          groupOrders[
            index
          ];

        if (
          index === 0
        ) {
          order.deliveryFee =
            shopDeliveryFee;

          order.preOrderFee =
            shopPreOrderFee;
        } else {
          order.deliveryFee =
            0;

          order.preOrderFee =
            0;
        }

        /*
         * Recalculate total from the authoritative subtotal.
         */

        order.totalAmount =
          Number(
            order.subtotal ||
              0
          ) +
          Number(
            order.deliveryFee ||
              0
          ) +
          Number(
            order.preOrderFee ||
              0
          );

        await order.save();

        normalizedOrders.push(
          order
        );
      }
    }

    /*
     * Preserve original checkout/cart order.
     */

    const position =
      new Map(
        createdOrders.map(
          (
            order,
            index
          ) => [
            String(
              order._id
            ),
            index,
          ]
        )
      );

    normalizedOrders.sort(
      (
        a,
        b
      ) =>
        position.get(
          String(
            a._id
          )
        ) -
        position.get(
          String(
            b._id
          )
        )
    );

    return normalizedOrders;
  };

/*
 * =========================================================
 * CREATE CUSTOMER CHECKOUT
 * =========================================================
 */

export const createCustomerCheckout =
  async (
    customerId,
    checkoutData
  ) => {
    const customer =
      await getCustomer(
        customerId
      );

    const fulfillmentType =
      validateFulfillment(
        checkoutData
      );

    const paymentMethod =
      validatePaymentMethod(
        checkoutData
          .paymentMethod,
        fulfillmentType
      );

    /*
     * Calculate a fresh server-side quote immediately
     * before creating Orders.
     */

    const quote =
      await quoteCustomerCheckout(
        customerId,
        checkoutData
      );

    const createdOrders =
      [];

    let createdCheckout =
      null;

    try {
      /*
       * ===================================================
       * CREATE INDIVIDUAL ORDERS
       * ===================================================
       */

      for (
        const quotedItem of
        quote.items
      ) {
        const order =
          await createOrder(
            customerId,
            {
              sourceType:
                "flower_listing",

              flowerId:
                quotedItem
                  .flowerId,

              quantity:
                quotedItem
                  .quantity,

              fulfillmentType,

              recipientName:
                String(
                  checkoutData
                    .recipientName ||
                    ""
                ).trim(),

              recipientPhoneNumber:
                String(
                  checkoutData
                    .recipientPhoneNumber ||
                    ""
                ).trim(),

              deliveryAddress:
                fulfillmentType ===
                "delivery"
                  ? checkoutData
                      .deliveryAddress
                  : undefined,

              deliveryLocation:
                fulfillmentType ===
                "delivery"
                  ? checkoutData
                      .deliveryLocation
                  : undefined,

              isPreOrder:
                quote.isPreOrder,

              requestedDeliveryDate:
                quote
                  .requestedDeliveryDate,

              requestedDeliveryTimeStart:
                quote
                  .requestedDeliveryTimeStart,

              requestedDeliveryTimeEnd:
                quote
                  .requestedDeliveryTimeEnd,

              paymentMethod,

              customerNotes:
                checkoutData
                  .customerNotes ||
                null,
            }
          );

        createdOrders.push(
          order
        );
      }

      /*
       * ===================================================
       * NORMALIZE SHOP FEES
       * ===================================================
       *
       * This converts:
       *
       * Same shop:
       *
       * Order A fee = 50
       * Order B fee = 50
       *
       * into:
       *
       * Order A fee = 50
       * Order B fee = 0
       *
       * so the customer pays the shop fulfillment fee once.
       * ===================================================
       */

      const normalizedOrders =
        await normalizeCreatedOrderFees(
          createdOrders
        );

      /*
       * ===================================================
       * AUTHORITATIVE CHECKOUT TOTAL
       * ===================================================
       */

      const productsSubtotal =
        normalizedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.subtotal ||
                0
            ),
          0
        );

      const deliveryFee =
        normalizedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.deliveryFee ||
                0
            ),
          0
        );

      const preOrderFee =
        normalizedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.preOrderFee ||
                0
            ),
          0
        );

      const totalAmount =
        normalizedOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.totalAmount ||
                0
            ),
          0
        );

      /*
       * ===================================================
       * CHECKOUT ITEM SNAPSHOTS
       * ===================================================
       */

      const checkoutItems =
        normalizedOrders.map(
          (
            order,
            index
          ) => {
            const quotedItem =
              quote.items[
                index
              ];

            return {
              cartItem:
                quotedItem
                  .cartItemId,

              flower:
                getId(
                  order.flower
                ),

              seller:
                getId(
                  order.seller
                ),

              florist:
                getId(
                  order.florist
                ),

              order:
                order._id,

              productName:
                order
                  .productName,

              inspirationImage:
                order
                  .inspirationImage,

              quantity:
                order.quantity,

              unitPrice:
                order.unitPrice,

              subtotal:
                order.subtotal,

              deliveryFee:
                order.deliveryFee,

              preOrderFee:
                order.preOrderFee,

              totalAmount:
                order.totalAmount,

              deliveryDistanceMeters:
                order
                  .deliveryDistanceMeters ??
                quotedItem
                  .deliveryDistanceMeters ??
                null,

              deliveryDurationSeconds:
                order
                  .deliveryDurationSeconds ??
                quotedItem
                  .deliveryDurationSeconds ??
                null,
            };
          }
        );

      /*
       * ===================================================
       * SHOP BREAKDOWN
       * ===================================================
       */

      const shopMap =
        new Map();

      for (
        const item of
        checkoutItems
      ) {
        const floristId =
          String(
            item.florist
          );

        const quoteShop =
          quote.shops.find(
            (shop) =>
              String(
                shop.florist
              ) ===
              floristId
          );

        if (
          !shopMap.has(
            floristId
          )
        ) {
          shopMap.set(
            floristId,
            {
              florist:
                item.florist,

              shopName:
                quoteShop
                  ?.shopName ||
                "FLOGRAM Florist",

              itemCount:
                0,

              totalQuantity:
                0,

              productsSubtotal:
                0,

              deliveryFee:
                0,

              preOrderFee:
                0,

              totalAmount:
                0,

              orders: [],
            }
          );
        }

        const shop =
          shopMap.get(
            floristId
          );

        shop.itemCount +=
          1;

        shop.totalQuantity +=
          Number(
            item.quantity ||
              0
          );

        shop.productsSubtotal +=
          Number(
            item.subtotal ||
              0
          );

        shop.deliveryFee +=
          Number(
            item.deliveryFee ||
              0
          );

        shop.preOrderFee +=
          Number(
            item.preOrderFee ||
              0
          );

        shop.totalAmount +=
          Number(
            item.totalAmount ||
              0
          );

        shop.orders.push(
          item.order
        );
      }

      /*
       * ===================================================
       * CREATE CHECKOUT
       * ===================================================
       */

      createdCheckout =
        await Checkout.create({
          customer:
            customer._id,

          items:
            checkoutItems,

          orders:
            normalizedOrders.map(
              (order) =>
                order._id
            ),

          shopBreakdown:
            Array.from(
              shopMap.values()
            ),

          fulfillmentType,

          recipientName:
            String(
              checkoutData
                .recipientName ||
                `${customer.firstName || ""} ${customer.lastName || ""}`
            ).trim(),

          recipientPhoneNumber:
            String(
              checkoutData
                .recipientPhoneNumber ||
                customer.phoneNumber ||
                ""
            ).trim(),

          deliveryAddress:
            fulfillmentType ===
            "delivery"
              ? checkoutData
                  .deliveryAddress
              : {},

          deliveryLocation:
            fulfillmentType ===
            "delivery"
              ? {
                  latitude:
                    Number(
                      checkoutData
                        .deliveryLocation
                        .latitude
                    ),

                  longitude:
                    Number(
                      checkoutData
                        .deliveryLocation
                        .longitude
                    ),
                }
              : {
                  latitude:
                    null,

                  longitude:
                    null,
                },

          isPreOrder:
            quote.isPreOrder,

          requestedDeliveryDate:
            quote
              .requestedDeliveryDate,

          requestedDeliveryTimeStart:
            quote
              .requestedDeliveryTimeStart,

          requestedDeliveryTimeEnd:
            quote
              .requestedDeliveryTimeEnd,

          customerNotes:
            checkoutData
              .customerNotes
              ? String(
                  checkoutData
                    .customerNotes
                ).trim()
              : null,

          productsSubtotal,

          deliveryFee,

          preOrderFee,

          totalAmount,

          paymentMethod,

          paymentProvider:
            paymentMethod ===
            "paymongo"
              ? "paymongo"
              : null,

          paymentStatus:
            "unpaid",

          checkoutStatus:
            "created",
        });

      /*
       * ===================================================
       * CLEAR CART
       * ===================================================
       *
       * Only after:
       *
       * - all Orders exist
       * - fees are normalized
       * - Checkout exists
       * ===================================================
       */

      await clearCustomerCart(
        customerId
      );

      return populateCheckout(
        createdCheckout._id
      );
    } catch (error) {
      /*
       * ===================================================
       * COMPENSATING ROLLBACK
       * ===================================================
       */

      if (
        createdCheckout?._id
      ) {
        try {
          await Checkout.deleteOne({
            _id:
              createdCheckout._id,

            customer:
              customerId,

            paymentStatus: {
              $ne: "paid",
            },
          });
        } catch (
          checkoutRollbackError
        ) {
          console.error(
            "Checkout rollback failed:",
            checkoutRollbackError
          );
        }
      }

      if (
        createdOrders.length >
        0
      ) {
        try {
          await Order.deleteMany({
            _id: {
              $in:
                createdOrders.map(
                  (order) =>
                    order._id
                ),
            },

            customer:
              customerId,

            paymentStatus: {
              $ne: "paid",
            },
          });
        } catch (
          orderRollbackError
        ) {
          console.error(
            "Order rollback failed:",
            orderRollbackError
          );
        }
      }

      throw error;
    }
  };

/*
 * =========================================================
 * GET ONE CUSTOMER CHECKOUT
 * =========================================================
 */

export const getCustomerCheckout =
  async (
    checkoutId,
    customerId
  ) => {
    const checkout =
      await populateCheckout(
        checkoutId
      );

    if (!checkout) {
      throw createError(
        "Checkout was not found.",
        404
      );
    }

    const ownerId =
      getId(
        checkout.customer
      );

    if (
      String(
        ownerId
      ) !==
      String(
        customerId
      )
    ) {
      throw createError(
        "You do not have permission to view this checkout.",
        403
      );
    }

    return checkout;
  };

/*
 * =========================================================
 * GET CUSTOMER CHECKOUT HISTORY
 * =========================================================
 */

export const getCustomerCheckouts =
  async (
    customerId
  ) => {
    await getCustomer(
      customerId
    );

    return Checkout.find({
      customer:
        customerId,
    })
      .populate(
        "orders",
        [
          "productName",
          "inspirationImage",
          "totalAmount",
          "orderStatus",
          "paymentStatus",
        ].join(" ")
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * PAYMONGO CONFIGURATION
 * =========================================================
 */

const getPayMongoSecretKey =
  () => {
    const secretKey =
      process.env
        .PAYMONGO_SECRET_KEY;

    if (!secretKey) {
      throw createError(
        "PAYMONGO_SECRET_KEY is not configured.",
        500
      );
    }

    return secretKey.trim();
  };

const getPayMongoMethods =
  () => {
    const configured =
      process.env
        .PAYMONGO_PAYMENT_METHODS;

    if (!configured) {
      return [
        "card",
        "gcash",
        "qrph",
      ];
    }

    return configured
      .split(",")
      .map(
        (method) =>
          method.trim()
      )
      .filter(Boolean);
  };

/*
 * =========================================================
 * PESOS -> CENTAVOS
 * =========================================================
 */

const pesoToCentavos =
  (
    value
  ) => {
    const amount =
      Number(value);

    if (
      !Number.isFinite(
        amount
      ) ||
      amount < 0
    ) {
      throw createError(
        "Payment amount is invalid."
      );
    }

    return Math.round(
      amount *
        100
    );
  };

/*
 * =========================================================
 * PAYMONGO AUTH
 * =========================================================
 */

const getPayMongoAuthorization =
  () => {
    return (
      "Basic " +
      Buffer.from(
        `${getPayMongoSecretKey()}:`
      ).toString(
        "base64"
      )
    );
  };

/*
 * =========================================================
 * REDIRECT URL
 * =========================================================
 */

const buildCheckoutRedirect =
  (
    baseUrl,
    checkoutId
  ) => {
    const fallback =
      "https://example.com";

    const value =
      baseUrl ||
      fallback;

    try {
      const url =
        new URL(
          value
        );

      url.searchParams.set(
        "checkoutId",
        String(
          checkoutId
        )
      );

      return url.toString();
    } catch {
      return value;
    }
  };

/*
 * =========================================================
 * CREATE PAYMONGO SESSION FOR ENTIRE CHECKOUT
 * =========================================================
 *
 * Multiple bouquets
 * Multiple shops
 * Multiple Orders
 *
 * ONE PayMongo Hosted Checkout session.
 * =========================================================
 */

export const createCheckoutPayMongoSession =
  async (
    checkoutId,
    customerId
  ) => {
    const checkout =
      await Checkout.findOne({
        _id:
          checkoutId,

        customer:
          customerId,
      })
        .populate(
          "customer",
          "firstName lastName email phoneNumber"
        )
        .populate({
          path:
            "orders",

          populate: {
            path:
              "florist",

            select:
              "shopName",
          },
        });

    if (!checkout) {
      throw createError(
        "Checkout was not found or does not belong to this customer.",
        404
      );
    }

    if (
      checkout.checkoutStatus ===
      "cancelled"
    ) {
      throw createError(
        "Payment cannot be initiated for a cancelled checkout."
      );
    }

    if (
      checkout.paymentMethod !==
      "paymongo"
    ) {
      throw createError(
        "This checkout does not use PayMongo."
      );
    }

    if (
      checkout.paymentStatus ===
      "paid"
    ) {
      throw createError(
        "This checkout has already been paid.",
        409
      );
    }

    /*
     * =====================================================
     * REUSE EXISTING SESSION
     * =====================================================
     */

    if (
      checkout.paymentStatus ===
        "pending" &&
      checkout
        .paymongoCheckoutSessionId &&
      checkout
        .paymentCheckoutUrl
    ) {
      return {
        checkoutId:
          checkout._id,

        checkoutSessionId:
          checkout
            .paymongoCheckoutSessionId,

        checkoutUrl:
          checkout
            .paymentCheckoutUrl,

        paymentStatus:
          checkout
            .paymentStatus,

        totalAmount:
          checkout
            .totalAmount,
      };
    }

    /*
     * =====================================================
     * PAYMONGO LINE ITEMS
     * =====================================================
     */

    const lineItems =
      [];

    for (
      const order of
      checkout.orders
    ) {
      /*
       * Product.
       */

      lineItems.push({
        name:
          String(
            order.productName ||
              "FLOGRAM Bouquet"
          ).slice(
            0,
            100
          ),

        description:
          String(
            order.florist
              ?.shopName ||
              "FLOGRAM Florist"
          ).slice(
            0,
            200
          ),

        amount:
          pesoToCentavos(
            order.unitPrice
          ),

        currency:
          "PHP",

        quantity:
          Math.max(
            Number(
              order.quantity
            ) || 1,
            1
          ),
      });

      /*
       * Delivery fee.
       *
       * Only the first Order belonging to a florist has
       * this after fee normalization.
       */

      if (
        Number(
          order.deliveryFee
        ) > 0
      ) {
        lineItems.push({
          name:
            `Delivery Fee - ${
              order.florist
                ?.shopName ||
              "Florist"
            }`.slice(
              0,
              100
            ),

          description:
            "FLOGRAM shop delivery fee",

          amount:
            pesoToCentavos(
              order.deliveryFee
            ),

          currency:
            "PHP",

          quantity:
            1,
        });
      }

      /*
       * Pre-order fee.
       *
       * Also only appears once per florist group.
       */

      if (
        Number(
          order.preOrderFee
        ) > 0
      ) {
        lineItems.push({
          name:
            `Pre-order Fee - ${
              order.florist
                ?.shopName ||
              "Florist"
            }`.slice(
              0,
              100
            ),

          description:
            "FLOGRAM scheduled order fee",

          amount:
            pesoToCentavos(
              order.preOrderFee
            ),

          currency:
            "PHP",

          quantity:
            1,
        });
      }
    }

    /*
     * =====================================================
     * VERIFY PAYMONGO LINE ITEM TOTAL
     * =====================================================
     *
     * Prevent opening a PayMongo checkout if our line items
     * do not equal the persisted Checkout total.
     * =====================================================
     */

    const payMongoLineTotal =
      lineItems.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item.amount
          ) *
            Number(
              item.quantity
            ),
        0
      );

    const expectedCentavos =
      pesoToCentavos(
        checkout.totalAmount
      );

    if (
      payMongoLineTotal !==
      expectedCentavos
    ) {
      console.error(
        "PayMongo checkout total mismatch:",
        {
          checkoutId:
            checkout._id,

          payMongoLineTotal,

          expectedCentavos,
        }
      );

      throw createError(
        "Checkout payment total does not match the order breakdown.",
        500
      );
    }

    /*
     * =====================================================
     * BILLING DETAILS
     * =====================================================
     */

    const customer =
      checkout.customer;

    const billing = {};

    const customerName =
      `${customer?.firstName || ""} ${
        customer?.lastName ||
        ""
      }`.trim();

    if (
      customerName
    ) {
      billing.name =
        customerName;
    }

    if (
      customer?.email
    ) {
      billing.email =
        customer.email;
    }

    if (
      customer
        ?.phoneNumber
    ) {
      billing.phone =
        customer.phoneNumber;
    }

    /*
     * =====================================================
     * REDIRECT URLS
     * =====================================================
     */

    const successUrl =
      buildCheckoutRedirect(
        process.env
          .PAYMONGO_SUCCESS_URL ||
          "https://example.com/payment-success",

        checkout._id
      );

    const cancelUrl =
      buildCheckoutRedirect(
        process.env
          .PAYMONGO_CANCEL_URL ||
          "https://example.com/payment-cancelled",

        checkout._id
      );

    /*
     * =====================================================
     * PAYMONGO ATTRIBUTES
     * =====================================================
     */

    const attributes =
      {
        line_items:
          lineItems,

        payment_method_types:
          getPayMongoMethods(),

        success_url:
          successUrl,

        cancel_url:
          cancelUrl,

        reference_number:
          `FLOGRAM-CHECKOUT-${checkout._id}`,

        metadata: {
          checkoutId:
            String(
              checkout._id
            ),

          customerId:
            String(
              customerId
            ),

          orderIds:
            checkout.orders
              .map(
                (
                  order
                ) =>
                  String(
                    order._id
                  )
              )
              .join(
                ","
              ),

          totalAmount:
            String(
              checkout
                .totalAmount
            ),

          checkoutType:
            "multi_order",
        },

        send_email_receipt:
          true,

        show_description:
          true,

        show_line_items:
          true,
      };

    if (
      Object.keys(
        billing
      ).length >
      0
    ) {
      attributes.billing =
        billing;
    }

    /*
     * =====================================================
     * CREATE HOSTED CHECKOUT
     * =====================================================
     */

    const response =
      await fetch(
        `${PAYMONGO_API_URL}/v1/checkout_sessions`,
        {
          method:
            "POST",

          headers: {
            Authorization:
              getPayMongoAuthorization(),

            "Content-Type":
              "application/json",

            /*
             * Prevent duplicate sessions for the same
             * FLOGRAM Checkout.
             */

            "Idempotency-Key":
              `flogram-checkout-${checkout._id}`,
          },

          body:
            JSON.stringify({
              data: {
                attributes,
              },
            }),
        }
      );

    let result;

    try {
      result =
        await response.json();
    } catch {
      throw createError(
        "Unable to read the PayMongo response.",
        502
      );
    }

    if (
      !response.ok
    ) {
      console.error(
        "PayMongo grouped checkout error:",
        result
      );

      const message =
        result
          ?.errors?.[0]
          ?.detail ||
        result
          ?.errors?.[0]
          ?.code ||
        result
          ?.message ||
        "Unable to create PayMongo checkout session.";

      throw createError(
        message,
        502
      );
    }

    const session =
      result?.data;

    const checkoutUrl =
      session
        ?.attributes
        ?.checkout_url;

    if (
      !session?.id ||
      !checkoutUrl
    ) {
      console.error(
        "Unexpected PayMongo grouped checkout response:",
        result
      );

      throw createError(
        "PayMongo returned an invalid checkout session.",
        502
      );
    }

    const now =
      new Date();

    /*
     * =====================================================
     * UPDATE CHECKOUT
     * =====================================================
     */

    checkout.paymentStatus =
      "pending";

    checkout.checkoutStatus =
      "payment_pending";

    checkout.paymongoCheckoutSessionId =
      session.id;

    checkout.paymentCheckoutUrl =
      checkoutUrl;

    checkout.paymentInitiatedAt =
      now;

    checkout.paymentFailedAt =
      null;

    await checkout.save();

    /*
     * =====================================================
     * UPDATE ALL CHILD ORDERS
     * =====================================================
     */

    await Order.updateMany(
      {
        _id: {
          $in:
            checkout.orders.map(
              (
                order
              ) =>
                order._id
            ),
        },

        customer:
          customerId,
      },
      {
        $set: {
          paymentProvider:
            "paymongo",

          paymentStatus:
            "pending",

          paymongoCheckoutSessionId:
            session.id,

          paymentCheckoutUrl:
            checkoutUrl,

          paymentInitiatedAt:
            now,

          paymentFailedAt:
            null,
        },
      }
    );

    return {
      checkoutId:
        checkout._id,

      checkoutSessionId:
        session.id,

      checkoutUrl,

      paymentStatus:
        checkout
          .paymentStatus,

      productsSubtotal:
        checkout
          .productsSubtotal,

      deliveryFee:
        checkout
          .deliveryFee,

      preOrderFee:
        checkout
          .preOrderFee,

      totalAmount:
        checkout
          .totalAmount,
    };
  };

/*
 * =========================================================
 * PROCESS GROUPED PAYMONGO WEBHOOK
 * =========================================================
 */

export const processCheckoutPayMongoWebhook =
  async (
    rawBody,
    signatureHeader
  ) => {
    /*
     * =====================================================
     * VERIFY SIGNATURE
     * =====================================================
     */

    const valid =
      verifyPayMongoWebhookSignature(
        rawBody,
        signatureHeader
      );

    if (!valid) {
      throw createError(
        "Invalid PayMongo webhook signature.",
        401
      );
    }

    /*
     * =====================================================
     * PARSE EVENT
     * =====================================================
     */

    const payload =
      parsePayMongoWebhook(
        rawBody
      );

    const eventId =
      payload?.data?.id ||
      null;

    /*
     * Existing FLOGRAM payment code has supported more than
     * one PayMongo payload shape.
     */

    const eventType =
      payload?.data
        ?.attributes
        ?.type ||
      payload?.data?.type ||
      null;

    /*
     * Ignore events this module does not handle.
     */

    if (
      eventType !==
      "checkout_session.payment.paid"
    ) {
      return {
        acknowledged:
          true,

        eventType,

        processed:
          false,
      };
    }

    /*
     * =====================================================
     * SESSION
     * =====================================================
     */

    const session =
      payload?.data
        ?.attributes
        ?.data ||
      payload?.data?.data ||
      null;

    if (!session) {
      return {
        acknowledged:
          true,

        processed:
          false,

        reason:
          "Checkout session was not included in the webhook.",
      };
    }

    const attributes =
      session.attributes ||
      {};

    const metadata =
      attributes.metadata ||
      {};

    const checkoutId =
      metadata.checkoutId ||
      null;

    /*
     * =====================================================
     * FIND CHECKOUT
     * =====================================================
     */

    const queryOptions =
      [];

    if (
      session.id
    ) {
      queryOptions.push({
        paymongoCheckoutSessionId:
          session.id,
      });
    }

    if (
      checkoutId
    ) {
      queryOptions.push({
        _id:
          checkoutId,
      });
    }

    if (
      queryOptions.length ===
      0
    ) {
      return {
        acknowledged:
          true,

        processed:
          false,

        reason:
          "Grouped checkout could not be identified.",
      };
    }

    const checkout =
      await Checkout.findOne({
        $or:
          queryOptions,
      });

    /*
     * The event may belong to FLOGRAM's older
     * single-Order PayMongo implementation.
     */

    if (!checkout) {
      return {
        acknowledged:
          true,

        processed:
          false,

        reason:
          "Grouped checkout was not found.",
      };
    }

    /*
     * =====================================================
     * CHECK SESSION CONSISTENCY
     * =====================================================
     */

    if (
      checkout
        .paymongoCheckoutSessionId &&
      session.id &&
      checkout
        .paymongoCheckoutSessionId !==
        session.id
    ) {
      throw createError(
        "PayMongo checkout session does not match this FLOGRAM checkout.",
        409
      );
    }

    /*
     * =====================================================
     * IDEMPOTENCY
     * =====================================================
     */

    if (
      eventId &&
      checkout
        .lastPaymentEventId ===
        eventId
    ) {
      return {
        acknowledged:
          true,

        processed:
          true,

        duplicate:
          true,

        checkoutId:
          checkout._id,

        paymentStatus:
          checkout
            .paymentStatus,
      };
    }

    /*
     * =====================================================
     * FIND PAID PAYMENT
     * =====================================================
     */

    const payments =
      Array.isArray(
        attributes.payments
      )
        ? attributes.payments
        : [];

    const paidPayment =
      payments.find(
        (
          payment
        ) =>
          payment
            ?.attributes
            ?.status ===
          "paid"
      ) ||
      payments[0] ||
      null;

    const paymentId =
      paidPayment?.id ||
      null;

    const paymentChannel =
      paidPayment
        ?.attributes
        ?.source
        ?.type ||
      paidPayment
        ?.attributes
        ?.payment_method_type ||
      null;

    const now =
      new Date();

    /*
     * =====================================================
     * MARK CHECKOUT PAID
     * =====================================================
     */

    checkout.paymentStatus =
      "paid";

    checkout.checkoutStatus =
      "paid";

    checkout.paymongoPaymentId =
      paymentId;

    checkout.paidAt =
      now;

    checkout.paymentFailedAt =
      null;

    checkout.lastPaymentEventId =
      eventId;

    if (
      session.id &&
      !checkout
        .paymongoCheckoutSessionId
    ) {
      checkout.paymongoCheckoutSessionId =
        session.id;
    }

    await checkout.save();

    /*
     * =====================================================
     * MARK ALL CHILD ORDERS PAID
     * =====================================================
     */

    await Order.updateMany(
      {
        _id: {
          $in:
            checkout.orders,
        },
      },
      {
        $set: {
          paymentStatus:
            "paid",

          paymentProvider:
            "paymongo",

          paymongoCheckoutSessionId:
            session.id ||
            checkout
              .paymongoCheckoutSessionId,

          paymongoPaymentId:
            paymentId,

          paymentChannel,

          paidAt:
            now,

          paymentFailedAt:
            null,

          lastPaymentEventId:
            eventId,
        },
      }
    );

    return {
      acknowledged:
        true,

      processed:
        true,

      checkoutId:
        checkout._id,

      orderIds:
        checkout.orders,

      paymentId,

      paymentStatus:
        "paid",
    };
  };