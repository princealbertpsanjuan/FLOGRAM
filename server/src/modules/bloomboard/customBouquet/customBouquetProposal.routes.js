import {
  Router,
} from "express";

import {
  createProposal,
  getAiProposalContext,
  getMyProposalForRequest,
  getMySellerProposals,
  getRequestProposals,
  selectProposal,
  withdrawProposal,
} from "./customBouquetProposal.controller.js";

import authenticate from "../../../middleware/authenticate.js";
import authorize from "../../../middleware/authorize.js";

const customBouquetProposalRouter =
  Router();

/*
 * =========================================================
 * SELLER
 * GET ALL OWN PROPOSALS
 * =========================================================
 *
 * GET
 * /proposals/seller/mine
 *
 * Optional:
 *
 * ?status=submitted
 * ?status=selected
 * ?status=not_selected
 * ?status=withdrawn
 *
 * IMPORTANT:
 * Keep this before routes containing
 * /:requestId so "proposals" cannot be
 * interpreted as a request ID.
 * =========================================================
 */

customBouquetProposalRouter.get(
  "/proposals/seller/mine",
  authenticate,
  authorize("seller"),
  getMySellerProposals
);

/*
 * =========================================================
 * SELLER
 * WITHDRAW OWN PROPOSAL
 * =========================================================
 *
 * PATCH
 * /proposals/:proposalId/withdraw
 * =========================================================
 */

customBouquetProposalRouter.patch(
  "/proposals/:proposalId/withdraw",
  authenticate,
  authorize("seller"),
  withdrawProposal
);

/*
 * =========================================================
 * CUSTOMER
 * GET AI PROPOSAL CONTEXT
 * =========================================================
 *
 * GET
 * /:requestId/proposals/ai-context
 *
 * Returns constrained REAL proposal data
 * for AI comparison / selection.
 *
 * IMPORTANT:
 * Keep this before:
 *
 * /:requestId/proposals/:proposalId/select
 * =========================================================
 */

customBouquetProposalRouter.get(
  "/:requestId/proposals/ai-context",
  authenticate,
  authorize("customer"),
  getAiProposalContext
);

/*
 * =========================================================
 * SELLER
 * GET OWN PROPOSAL FOR ONE REQUEST
 * =========================================================
 *
 * GET
 * /:requestId/proposals/mine
 *
 * Response:
 *
 * {
 *   hasProposal: true/false,
 *   proposal: {...} | null
 * }
 * =========================================================
 */

customBouquetProposalRouter.get(
  "/:requestId/proposals/mine",
  authenticate,
  authorize("seller"),
  getMyProposalForRequest
);

/*
 * =========================================================
 * CUSTOMER
 * SELECT ONE PROPOSAL
 * =========================================================
 *
 * PATCH
 * /:requestId/proposals/:proposalId/select
 *
 * After success:
 *
 * proposal.status = selected
 *
 * other proposals =
 * not_selected
 *
 * request.status =
 * customer_accepted
 *
 * request.selectedProposal =
 * selected proposal
 *
 * request.florist =
 * selected florist
 *
 * request.quotedPrice =
 * selected price
 *
 * No more seller proposals can be submitted.
 * =========================================================
 */

customBouquetProposalRouter.patch(
  "/:requestId/proposals/:proposalId/select",
  authenticate,
  authorize("customer"),
  selectProposal
);

/*
 * =========================================================
 * CUSTOMER
 * GET ALL PROPOSALS FOR OWN REQUEST
 * =========================================================
 *
 * GET
 * /:requestId/proposals
 * =========================================================
 */

customBouquetProposalRouter.get(
  "/:requestId/proposals",
  authenticate,
  authorize("customer"),
  getRequestProposals
);

/*
 * =========================================================
 * SELLER
 * SUBMIT PROPOSAL
 * =========================================================
 *
 * POST
 * /:requestId/proposals
 *
 * Body:
 *
 * {
 *   "quotedPrice": 1500,
 *   "sellerResponse":
 *     "I can recreate the reference bouquet..."
 * }
 *
 * The service verifies:
 *
 * - seller account
 * - approved florist
 * - active florist
 * - request exists
 * - request.status === "open"
 * - florist has not submitted before
 * =========================================================
 */

customBouquetProposalRouter.post(
  "/:requestId/proposals",
  authenticate,
  authorize("seller"),
  createProposal
);

export default customBouquetProposalRouter;