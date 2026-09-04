import {
  Router,
} from "express";

import {
  cancel,
  create,
  getForSeller,
  getMine,
  getOne,
} from "./customBouquetRequest.controller.js";

import customBouquetProposalRouter from "./customBouquetProposal.routes.js";

import {
  customBouquetRequestUpload,
} from "./customBouquetRequest.upload.js";

import {
  validateCreateCustomBouquetRequest,
  validateCustomBouquetRequestId,
} from "./customBouquetRequest.validation.js";

import authenticate from "../../../middleware/authenticate.js";
import authorize from "../../../middleware/authorize.js";

const customBouquetRequestRouter =
  Router();

/*
 * =========================================================
 * PROPOSAL ROUTES
 * =========================================================
 *
 * The proposal router handles:
 *
 * SELLER
 * POST   /:requestId/proposals
 * GET    /:requestId/proposals/mine
 * GET    /proposals/seller/mine
 * PATCH  /proposals/:proposalId/withdraw
 *
 * CUSTOMER
 * GET    /:requestId/proposals
 * GET    /:requestId/proposals/ai-context
 * PATCH  /:requestId/proposals/:proposalId/select
 *
 * Because this router is mounted inside the existing
 * custom bouquet request router, the final API paths
 * remain under:
 *
 * /api/v1/bloomboard/custom-bouquet-requests
 * =========================================================
 */

customBouquetRequestRouter.use(
  "/",
  customBouquetProposalRouter
);

/*
 * =========================================================
 * CUSTOMER
 * GET OWN CUSTOM BOUQUET REQUESTS
 * =========================================================
 *
 * GET /mine
 *
 * Returns all custom bouquet requests
 * belonging to the authenticated customer.
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
 * GET AVAILABLE CUSTOM BOUQUET REQUESTS
 * =========================================================
 *
 * GET /seller/mine
 *
 * NEW WORKFLOW:
 *
 * Approved + active sellers can see OPEN
 * bouquet requests.
 *
 * They may then submit one proposal for
 * each request.
 *
 * Optional:
 *
 * ?status=open
 *
 * Closed requests are only returned by the
 * request service when appropriate for the
 * florist.
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
 * CREATE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * POST /
 *
 * multipart/form-data
 *
 * Possible fields:
 *
 * inspirationImage
 * occasion
 * budget
 * quantity
 * requestedDate
 * customerMessage
 *
 * Optional AI fields:
 *
 * aiConversationId
 * sourceMessageId
 *
 * Optional preference fields:
 *
 * flowerTypes
 * colors
 * styles
 * theme
 * bouquetSize
 * wrapping
 * specialInstructions
 *
 * IMPORTANT:
 *
 * floristId is intentionally NOT required.
 *
 * The request is created with:
 *
 * status = "open"
 * florist = null
 * selectedProposal = null
 *
 * Approved sellers may then submit proposals.
 * =========================================================
 */

customBouquetRequestRouter.post(
  "/",
  authenticate,
  authorize("customer"),

  /*
   * Upload the customer's
   * reference image first.
   */
  customBouquetRequestUpload.single(
    "inspirationImage"
  ),

  /*
   * Validate and normalize
   * multipart form values.
   */
  validateCreateCustomBouquetRequest,

  create
);

/*
 * =========================================================
 * CUSTOMER
 * CANCEL OWN CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * PATCH /:requestId/cancel
 *
 * A customer can cancel a request while
 * it is still open.
 *
 * Once a proposal has been selected and
 * the request becomes customer_accepted,
 * it can no longer be cancelled through
 * this endpoint.
 * =========================================================
 */

customBouquetRequestRouter.patch(
  "/:requestId/cancel",
  authenticate,
  authorize("customer"),
  validateCustomBouquetRequestId,
  cancel
);

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET ONE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * GET /:requestId
 *
 * CUSTOMER:
 * May only access their own request.
 *
 * SELLER:
 * May access open requests while bidding.
 *
 * After a request closes, access is
 * controlled by the request service.
 *
 * IMPORTANT:
 * Keep this generic parameter route LAST.
 * =========================================================
 */

customBouquetRequestRouter.get(
  "/:requestId",
  authenticate,
  validateCustomBouquetRequestId,
  getOne
);

export default customBouquetRequestRouter;