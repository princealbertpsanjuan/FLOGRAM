import {
  Router,
} from "express";

import {
  createCheckout,
  getPaymentStatus,
  payMongoWebhook,
} from "./payment.controller.js";

import {
  orderPaymentValidation,
  validatePaymentRequest,
} from "./payment.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const paymentRouter =
  Router();

/*
 * =========================================================
 * PAYMONGO WEBHOOK
 * =========================================================
 *
 * IMPORTANT:
 *
 * app.js already preserves the original
 * raw request body in req.rawBody before
 * express.json() parses the payload.
 *
 * Do NOT use express.raw() here anymore.
 *
 * No authenticate middleware is used.
 * PayMongo webhook authenticity is
 * verified using the PayMongo signature.
 * =========================================================
 */
paymentRouter.post(
  "/webhook/paymongo",
  payMongoWebhook
);

/*
 * =========================================================
 * CUSTOMER
 * CREATE PAYMONGO CHECKOUT SESSION
 * =========================================================
 *
 * POST
 * /api/v1/payments/orders/:orderId/checkout
 * =========================================================
 */
paymentRouter.post(
  "/orders/:orderId/checkout",

  authenticate,

  authorize(
    "customer"
  ),

  orderPaymentValidation,

  validatePaymentRequest,

  createCheckout
);

/*
 * =========================================================
 * CUSTOMER
 * GET PAYMENT STATUS
 * =========================================================
 *
 * GET
 * /api/v1/payments/orders/:orderId/status
 * =========================================================
 */
paymentRouter.get(
  "/orders/:orderId/status",

  authenticate,

  authorize(
    "customer"
  ),

  orderPaymentValidation,

  validatePaymentRequest,

  getPaymentStatus
);

export default paymentRouter;