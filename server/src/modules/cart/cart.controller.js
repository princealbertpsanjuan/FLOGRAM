import {
  addItemToCart,
  clearCustomerCart,
  getCustomerCart,
  removeCartItem,
  removeFlowerFromCart,
  updateCartItemQuantity,
} from "./cart.service.js";

/*
 * =========================================================
 * AUTHENTICATED USER
 * =========================================================
 */

const getAuthenticatedUserId = (
  req
) =>
  req.user?.userId ||
  req.user?._id ||
  req.user?.id ||
  null;

/*
 * =========================================================
 * CUSTOMER
 * GET SHOPPING CART
 * =========================================================
 */

export const getMine = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const cart =
      await getCustomerCart(
        customerId
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Shopping cart retrieved successfully.",

        data: {
          cart,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * ADD FLOWER TO CART
 * =========================================================
 */

export const addItem = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const cart =
      await addItemToCart(
        customerId,
        req.body.flowerId,
        req.body.quantity
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Flower added to cart successfully.",

        data: {
          cart,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * UPDATE CART ITEM QUANTITY
 * =========================================================
 */

export const updateQuantity =
  async (
    req,
    res,
    next
  ) => {
    try {
      const customerId =
        getAuthenticatedUserId(
          req
        );

      const cart =
        await updateCartItemQuantity(
          customerId,
          req.params
            .cartItemId,
          req.body.quantity
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Cart item quantity updated successfully.",

          data: {
            cart,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * REMOVE CART ITEM
 * =========================================================
 */

export const removeItem = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const cart =
      await removeCartItem(
        customerId,
        req.params.cartItemId
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Cart item removed successfully.",

        data: {
          cart,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * REMOVE FLOWER FROM CART
 * =========================================================
 *
 * This endpoint is useful when an order is successfully
 * created and the app knows the flower listing ID rather
 * than the embedded cart-item ID.
 * =========================================================
 */

export const removeFlower =
  async (
    req,
    res,
    next
  ) => {
    try {
      const customerId =
        getAuthenticatedUserId(
          req
        );

      const cart =
        await removeFlowerFromCart(
          customerId,
          req.params.flowerId
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Flower removed from cart successfully.",

          data: {
            cart,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * CLEAR SHOPPING CART
 * =========================================================
 */

export const clearCart = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const cart =
      await clearCustomerCart(
        customerId
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Shopping cart cleared successfully.",

        data: {
          cart,
        },
      });
  } catch (error) {
    next(error);
  }
};