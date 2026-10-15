import {
  Router,
} from "express";

import {
  createCheckout,
  createPayMongoSession,
  getMine,
  getOne,
  payMongoWebhook,
  quoteCheckout,
  quoteCustomBouquet,
} from "./checkout.controller.js";

import {
  checkoutIdValidation,
  checkoutQuoteValidation,
  createCheckoutValidation,
  customBouquetQuoteValidation,
  validateCheckoutRequest,
} from "./checkout.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const checkoutRouter =
  Router();

/*
 * =========================================================
 * PAYMONGO GROUPED CHECKOUT WEBHOOK
 * =========================================================
 *
 * IMPORTANT:
 *
 * No authenticate middleware.
 *
 * PayMongo verifies this request through its signature.
 *
 * Keep this route before /:checkoutId routes.
 * =========================================================
 */

checkoutRouter.post(
  "/webhook/paymongo",

  payMongoWebhook
);

/*
 * =========================================================
 * CUSTOMER
 * GET LIVE CHECKOUT QUOTE
 * =========================================================
 *
 * POST /api/v1/checkout/quote
 *
 * Calculates:
 *
 * - product subtotal
 * - delivery fee
 * - pre-order fee
 * - shop breakdown
 * - grand total
 *
 * No Order is created.
 * =========================================================
 */

checkoutRouter.post(
  "/quote",

  authenticate,

  authorize(
    "customer"
  ),

  checkoutQuoteValidation,

  validateCheckoutRequest,

  quoteCheckout
);

/*
 * =========================================================
 * CUSTOMER
 * CUSTOM BOUQUET CHECKOUT QUOTE
 * =========================================================
 *
 * POST /api/v1/checkout/custom-bouquet/quote
 *
 * Accepted custom bouquet (AI conversation): agreed price,
 * delivery fee, pre-order fee and total — the same amounts
 * POST /orders stores and PayMongo charges.
 * =========================================================
 */

checkoutRouter.post(
  "/custom-bouquet/quote",

  authenticate,

  authorize(
    "customer"
  ),

  customBouquetQuoteValidation,

  validateCheckoutRequest,

  quoteCustomBouquet
);

/*
 * =========================================================
 * CUSTOMER
 * CREATE CHECKOUT
 * =========================================================
 *
 * POST /api/v1/checkout
 *
 * Creates:
 *
 * Checkout
 *   ├── Order A
 *   ├── Order B
 *   └── ...
 *
 * The cart is cleared only after all child Orders and the
 * Checkout are successfully created.
 * =========================================================
 */

checkoutRouter.post(
  "/",

  authenticate,

  authorize(
    "customer"
  ),

  createCheckoutValidation,

  validateCheckoutRequest,

  createCheckout
);

/*
 * =========================================================
 * CUSTOMER
 * GET OWN CHECKOUT HISTORY
 * =========================================================
 */

checkoutRouter.get(
  "/mine",

  authenticate,

  authorize(
    "customer"
  ),

  getMine
);

/*
 * =========================================================
 * CUSTOMER
 * CREATE ONE PAYMONGO SESSION FOR ENTIRE CHECKOUT
 * =========================================================
 *
 * POST
 * /api/v1/checkout/:checkoutId/paymongo
 * =========================================================
 */

checkoutRouter.post(
  "/:checkoutId/paymongo",

  authenticate,

  authorize(
    "customer"
  ),

  checkoutIdValidation,

  validateCheckoutRequest,

  createPayMongoSession
);

/*
 * =========================================================
 * CUSTOMER
 * GET ONE CHECKOUT
 * =========================================================
 *
 * Keep after specific routes.
 * =========================================================
 */

checkoutRouter.get(
  "/:checkoutId",

  authenticate,

  authorize(
    "customer"
  ),

  checkoutIdValidation,

  validateCheckoutRequest,

  getOne
);

export default checkoutRouter;