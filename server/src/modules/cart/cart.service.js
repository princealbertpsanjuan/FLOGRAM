import Cart from "./cart.model.js";

import User from "../auth/auth.model.js";
import Flower from "../flowers/flower.model.js";

/*
 * =========================================================
 * CART CONFIGURATION
 * =========================================================
 *
 * FLOGRAM uses product availability instead of detailed
 * stock quantities.
 *
 * Therefore:
 *
 * - quantity must be at least 1
 * - we do NOT invent stock-count restrictions
 * - flower availability is still checked when adding
 * - order service will check availability again at checkout
 * =========================================================
 */

const DEFAULT_QUANTITY = 1;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

/*
 * Validate that the authenticated user is a customer.
 */

const getCustomer = async (
  customerId
) => {
  const customer =
    await User.findById(
      customerId
    );

  if (!customer) {
    const error =
      new Error(
        "Customer account was not found."
      );

    error.statusCode = 404;

    throw error;
  }

  if (
    customer.role !==
    "customer"
  ) {
    const error =
      new Error(
        "Only customer accounts can use the shopping cart."
      );

    error.statusCode = 403;

    throw error;
  }

  return customer;
};

/*
 * =========================================================
 * QUANTITY
 * =========================================================
 */

const normalizeQuantity = (
  value,
  {
    defaultValue =
      DEFAULT_QUANTITY,
  } = {}
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  const quantity =
    Number(value);

  if (
    !Number.isInteger(
      quantity
    ) ||
    quantity < 1
  ) {
    const error =
      new Error(
        "Cart item quantity must be a whole number greater than or equal to 1."
      );

    error.statusCode = 400;

    throw error;
  }

  return quantity;
};

/*
 * =========================================================
 * POPULATE CART
 * =========================================================
 *
 * Do not match only available products here.
 *
 * We want unavailable/deactivated products to remain
 * visible in the customer's cart so the mobile UI can
 * clearly show that they can no longer be purchased.
 * =========================================================
 */

const populateCart = async (
  cartId
) => {
  return Cart.findById(
    cartId
  )
    .populate({
      path: "items.flower",

      select: [
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
        "createdAt",
        "updatedAt",
      ].join(" "),

      populate: {
        path: "florist",

        select: [
          "shopName",
          "shopLogo",
          "address",
          "location",
          "verificationStatus",
          "isActive",
        ].join(" "),
      },
    });
};

/*
 * =========================================================
 * GET OR CREATE CART
 * =========================================================
 *
 * One customer has one cart.
 *
 * An empty cart is automatically created when needed.
 * =========================================================
 */

const getOrCreateCart = async (
  customerId
) => {
  let cart =
    await Cart.findOne({
      customer:
        customerId,
    });

  if (!cart) {
    try {
      cart =
        await Cart.create({
          customer:
            customerId,

          items: [],
        });
    } catch (error) {
      /*
       * Two simultaneous requests could attempt to create
       * the same customer's cart.
       *
       * customer has a unique index, so retrieve the cart
       * that won the race.
       */

      if (
        error?.code ===
        11000
      ) {
        cart =
          await Cart.findOne({
            customer:
              customerId,
          });

        if (cart) {
          return cart;
        }
      }

      throw error;
    }
  }

  return cart;
};

/*
 * =========================================================
 * CART RESPONSE
 * =========================================================
 *
 * Prices below are calculated from the CURRENT populated
 * Flower documents.
 *
 * They are NOT saved permanently in the Cart collection.
 *
 * Checkout must still rely on the Order service as the
 * final authoritative price calculation.
 * =========================================================
 */

const buildCartResponse = (
  cart
) => {
  if (!cart) {
    return {
      _id: null,

      customer: null,

      items: [],

      itemCount: 0,

      totalQuantity: 0,

      availableItemCount: 0,

      unavailableItemCount: 0,

      estimatedSubtotal: 0,
    };
  }

  const cartObject =
    typeof cart.toObject ===
    "function"
      ? cart.toObject()
      : cart;

  const rawItems =
    Array.isArray(
      cartObject.items
    )
      ? cartObject.items
      : [];

  let totalQuantity = 0;

  let availableItemCount = 0;

  let unavailableItemCount = 0;

  let estimatedSubtotal = 0;

  const items =
    rawItems.map(
      (item) => {
        const flower =
          item.flower;

        const quantity =
          Math.max(
            Number(
              item.quantity
            ) || 1,
            1
          );

        totalQuantity +=
          quantity;

        /*
         * If the flower document was deleted entirely,
         * populated value becomes null.
         */

        const flowerExists =
          Boolean(flower);

        const isPurchasable =
          Boolean(
            flowerExists &&
              flower.isActive ===
                true &&
              flower.isAvailable ===
                true
          );

        const currentPrice =
          flowerExists &&
          Number.isFinite(
            Number(
              flower.price
            )
          )
            ? Number(
                flower.price
              )
            : null;

        const lineSubtotal =
          isPurchasable &&
          currentPrice !== null
            ? currentPrice *
              quantity
            : null;

        if (isPurchasable) {
          availableItemCount +=
            1;

          estimatedSubtotal +=
            lineSubtotal || 0;
        } else {
          unavailableItemCount +=
            1;
        }

        return {
          ...item,

          quantity,

          isPurchasable,

          currentPrice,

          lineSubtotal,
        };
      }
    );

  return {
    ...cartObject,

    items,

    itemCount:
      items.length,

    totalQuantity,

    availableItemCount,

    unavailableItemCount,

    estimatedSubtotal,
  };
};

/*
 * =========================================================
 * CUSTOMER
 * GET CART
 * =========================================================
 */

export const getCustomerCart =
  async (
    customerId
  ) => {
    await getCustomer(
      customerId
    );

    const cart =
      await getOrCreateCart(
        customerId
      );

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * ADD FLOWER TO CART
 * =========================================================
 *
 * If flower already exists:
 *
 * quantity += requested quantity
 *
 * Otherwise:
 *
 * create a new cart item.
 * =========================================================
 */

export const addItemToCart =
  async (
    customerId,
    flowerId,
    quantity =
      DEFAULT_QUANTITY
  ) => {
    await getCustomer(
      customerId
    );

    if (!flowerId) {
      const error =
        new Error(
          "Flower listing ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const finalQuantity =
      normalizeQuantity(
        quantity
      );

    /*
     * Use the exact same core product availability rule
     * used by order creation.
     */

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
      const error =
        new Error(
          "Flower listing was not found or is unavailable."
        );

      error.statusCode = 404;

      throw error;
    }

    const cart =
      await getOrCreateCart(
        customerId
      );

    const existingItem =
      cart.items.find(
        (item) =>
          String(
            item.flower
          ) ===
          String(
            flower._id
          )
      );

    if (existingItem) {
      existingItem.quantity =
        normalizeQuantity(
          Number(
            existingItem
              .quantity
          ) +
            finalQuantity
        );
    } else {
      cart.items.push({
        flower:
          flower._id,

        quantity:
          finalQuantity,

        addedAt:
          new Date(),
      });
    }

    await cart.save();

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * UPDATE CART ITEM QUANTITY
 * =========================================================
 */

export const updateCartItemQuantity =
  async (
    customerId,
    cartItemId,
    quantity
  ) => {
    await getCustomer(
      customerId
    );

    if (!cartItemId) {
      const error =
        new Error(
          "Cart item ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const finalQuantity =
      normalizeQuantity(
        quantity,
        {
          defaultValue:
            null,
        }
      );

    const cart =
      await Cart.findOne({
        customer:
          customerId,
      });

    if (!cart) {
      const error =
        new Error(
          "Shopping cart was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const item =
      cart.items.id(
        cartItemId
      );

    if (!item) {
      const error =
        new Error(
          "Cart item was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    /*
     * Check whether the product can still be purchased
     * before changing its quantity.
     */

    const flower =
      await Flower.findOne({
        _id:
          item.flower,

        isActive:
          true,

        isAvailable:
          true,
      });

    if (!flower) {
      const error =
        new Error(
          "This flower listing is no longer available. Remove it from your cart before continuing."
        );

      error.statusCode = 400;

      throw error;
    }

    item.quantity =
      finalQuantity;

    await cart.save();

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * REMOVE CART ITEM
 * =========================================================
 */

export const removeCartItem =
  async (
    customerId,
    cartItemId
  ) => {
    await getCustomer(
      customerId
    );

    if (!cartItemId) {
      const error =
        new Error(
          "Cart item ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const cart =
      await Cart.findOne({
        customer:
          customerId,
      });

    if (!cart) {
      const error =
        new Error(
          "Shopping cart was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const item =
      cart.items.id(
        cartItemId
      );

    if (!item) {
      const error =
        new Error(
          "Cart item was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    item.deleteOne();

    await cart.save();

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * REMOVE FLOWER FROM CART
 * =========================================================
 *
 * Useful after checkout because order creation works with
 * flowerId while cart items have their own embedded _id.
 * =========================================================
 */

export const removeFlowerFromCart =
  async (
    customerId,
    flowerId
  ) => {
    await getCustomer(
      customerId
    );

    if (!flowerId) {
      const error =
        new Error(
          "Flower listing ID is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const cart =
      await Cart.findOne({
        customer:
          customerId,
      });

    if (!cart) {
      return getCustomerCart(
        customerId
      );
    }

    cart.items =
      cart.items.filter(
        (item) =>
          String(
            item.flower
          ) !==
          String(
            flowerId
          )
      );

    await cart.save();

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * CLEAR CART
 * =========================================================
 */

export const clearCustomerCart =
  async (
    customerId
  ) => {
    await getCustomer(
      customerId
    );

    const cart =
      await getOrCreateCart(
        customerId
      );

    cart.items = [];

    await cart.save();

    const populatedCart =
      await populateCart(
        cart._id
      );

    return buildCartResponse(
      populatedCart
    );
  };