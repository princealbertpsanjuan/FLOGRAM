import {
  Router,
} from "express";

import {
  cancel,
  create,
  getForSeller,
  getMine,
  getOne,
  updateStatus,
} from "./order.controller.js";

import {
  cancelOrderValidation,
  createOrderValidation,
  sellerOrderStatusValidation,
  validateOrderRequest,
} from "./order.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const orderRouter =
  Router();

/*
 * CUSTOMER
 * Get own orders.
 */
orderRouter.get(
  "/mine",
  authenticate,
  authorize("customer"),
  getMine
);

/*
 * SELLER
 * Get shop orders.
 */
orderRouter.get(
  "/seller/mine",
  authenticate,
  authorize("seller"),
  getForSeller
);

/*
 * CUSTOMER
 * Create order.
 */
orderRouter.post(
  "/",
  authenticate,
  authorize("customer"),
  createOrderValidation,
  validateOrderRequest,
  create
);

/*
 * SELLER
 * Update fulfillment status.
 */
orderRouter.patch(
  "/:orderId/status",
  authenticate,
  authorize("seller"),
  sellerOrderStatusValidation,
  validateOrderRequest,
  updateStatus
);

/*
 * CUSTOMER
 * Cancel own order.
 */
orderRouter.patch(
  "/:orderId/cancel",
  authenticate,
  authorize("customer"),
  cancelOrderValidation,
  validateOrderRequest,
  cancel
);

/*
 * CUSTOMER / SELLER
 * Get one order.
 *
 * Keep this route last.
 */
orderRouter.get(
  "/:orderId",
  authenticate,
  getOne
);

export default orderRouter;