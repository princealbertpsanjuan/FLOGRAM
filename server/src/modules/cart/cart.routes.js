import {
  Router,
} from "express";

import {
  addItem,
  clearCart,
  getMine,
  removeFlower,
  removeItem,
  updateQuantity,
} from "./cart.controller.js";

import {
  addCartItemValidation,
  removeCartItemValidation,
  removeFlowerValidation,
  updateCartItemValidation,
  validateCartRequest,
} from "./cart.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const cartRouter =
  Router();

/*
 * =========================================================
 * ALL CART ROUTES
 * CUSTOMER ONLY
 * =========================================================
 */

cartRouter.use(
  authenticate
);

cartRouter.use(
  authorize("customer")
);

/*
 * =========================================================
 * CUSTOMER
 * GET OWN SHOPPING CART
 *
 * GET
 * /api/v1/cart
 * =========================================================
 */

cartRouter.get(
  "/",
  getMine
);

/*
 * =========================================================
 * CUSTOMER
 * ADD FLOWER TO CART
 *
 * POST
 * /api/v1/cart/items
 *
 * BODY:
 *
 * {
 *   "flowerId": "...",
 *   "quantity": 1
 * }
 * =========================================================
 */

cartRouter.post(
  "/items",

  addCartItemValidation,

  validateCartRequest,

  addItem
);

/*
 * =========================================================
 * CUSTOMER
 * UPDATE CART ITEM QUANTITY
 *
 * PATCH
 * /api/v1/cart/items/:cartItemId
 *
 * BODY:
 *
 * {
 *   "quantity": 2
 * }
 * =========================================================
 */

cartRouter.patch(
  "/items/:cartItemId",

  updateCartItemValidation,

  validateCartRequest,

  updateQuantity
);

/*
 * =========================================================
 * CUSTOMER
 * REMOVE CART ITEM
 *
 * DELETE
 * /api/v1/cart/items/:cartItemId
 * =========================================================
 */

cartRouter.delete(
  "/items/:cartItemId",

  removeCartItemValidation,

  validateCartRequest,

  removeItem
);

/*
 * =========================================================
 * CUSTOMER
 * REMOVE FLOWER BY FLOWER ID
 *
 * DELETE
 * /api/v1/cart/flowers/:flowerId
 *
 * Mainly useful after successful checkout.
 * =========================================================
 */

cartRouter.delete(
  "/flowers/:flowerId",

  removeFlowerValidation,

  validateCartRequest,

  removeFlower
);

/*
 * =========================================================
 * CUSTOMER
 * CLEAR ENTIRE SHOPPING CART
 *
 * DELETE
 * /api/v1/cart
 * =========================================================
 */

cartRouter.delete(
  "/",
  clearCart
);

export default cartRouter;