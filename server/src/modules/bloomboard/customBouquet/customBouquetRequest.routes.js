import {
  Router,
} from "express";

import {
  accept,
  acceptQuote,
  cancel,
  create,
  declineQuote,
  getForSeller,
  getMine,
  getOne,
  quote,
  reject,
} from "./customBouquetRequest.controller.js";

import authenticate from "../../../middleware/authenticate.js";
import authorize from "../../../middleware/authorize.js";

const customBouquetRequestRouter =
  Router();

/*
 * =========================================================
 * CUSTOMER
 * Get customer's own custom bouquet requests
 * =========================================================
 */
customBouquetRequestRouter.get(
  "/mine",
  authenticate,
  authorize("customer"),
  getMine
);

/*
 * =========================================================
 * SELLER
 * Get requests sent to seller's florist
 *
 * Optional filters:
 * ?status=pending
 * ?status=accepted
 * ?status=quoted
 * ?status=customer_accepted
 * ?status=customer_declined
 * ?status=rejected
 * ?status=cancelled
 * =========================================================
 */
customBouquetRequestRouter.get(
  "/seller/mine",
  authenticate,
  authorize("seller"),
  getForSeller
);

/*
 * =========================================================
 * CUSTOMER
 * Create custom bouquet request
 * =========================================================
 */
customBouquetRequestRouter.post(
  "/",
  authenticate,
  authorize("customer"),
  create
);

/*
 * =========================================================
 * SELLER
 * Accept request
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/accept",
  authenticate,
  authorize("seller"),
  accept
);

/*
 * =========================================================
 * SELLER
 * Reject request
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/reject",
  authenticate,
  authorize("seller"),
  reject
);

/*
 * =========================================================
 * SELLER
 * Send price quote
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/quote",
  authenticate,
  authorize("seller"),
  quote
);

/*
 * =========================================================
 * CUSTOMER
 * Accept seller quote
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/quote/accept",
  authenticate,
  authorize("customer"),
  acceptQuote
);

/*
 * =========================================================
 * CUSTOMER
 * Decline seller quote
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/quote/decline",
  authenticate,
  authorize("customer"),
  declineQuote
);

/*
 * =========================================================
 * CUSTOMER
 * Cancel own request
 * =========================================================
 */
customBouquetRequestRouter.patch(
  "/:requestId/cancel",
  authenticate,
  authorize("customer"),
  cancel
);

/*
 * =========================================================
 * CUSTOMER / SELLER
 * Get one request
 *
 * Keep this route last.
 * =========================================================
 */
customBouquetRequestRouter.get(
  "/:requestId",
  authenticate,
  getOne
);

export default customBouquetRequestRouter;