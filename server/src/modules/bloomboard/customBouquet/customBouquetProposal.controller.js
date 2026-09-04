import {
  createCustomBouquetProposal,
  getCustomerRequestProposals,
  getSellerCustomBouquetProposals,
  getSellerProposalForRequest,
  selectCustomBouquetProposal,
  withdrawCustomBouquetProposal,
  getProposalContextForAi,
} from "./customBouquetProposal.service.js";

/*
 * =========================================================
 * HELPER
 * GET AUTHENTICATED USER ID
 * =========================================================
 *
 * FLOGRAM authentication normally places the
 * authenticated user on req.user.
 *
 * This helper supports both:
 *
 * req.user._id
 * req.user.id
 * =========================================================
 */

const getAuthenticatedUserId = (req) =>
  req.user?.userId ||
  req.user?._id ||
  req.user?.id ||
  null;

/*
 * =========================================================
 * SELLER
 * CREATE PROPOSAL
 * =========================================================
 *
 * POST
 * /:requestId/proposals
 *
 * Body:
 *
 * {
 *   "quotedPrice": 1500,
 *   "sellerResponse": "I can create...",
 *   "proposalImage": null
 * }
 * =========================================================
 */

export const createProposal =
  async (
    req,
    res,
    next
  ) => {
    try {
      const sellerId =
        getAuthenticatedUserId(
          req
        );

      const {
        requestId,
      } =
        req.params;

      const proposal =
        await createCustomBouquetProposal(
          requestId,
          sellerId,
          req.body
        );

      return res
        .status(201)
        .json({
          success:
            true,

          message:
            "Custom bouquet proposal submitted successfully.",

          data: {
            proposal,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * GET PROPOSALS FOR OWN REQUEST
 * =========================================================
 *
 * GET
 * /:requestId/proposals
 *
 * Returns all real seller proposals
 * for the customer's bouquet request.
 * =========================================================
 */

export const getRequestProposals =
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

      const {
        requestId,
      } =
        req.params;

      const proposals =
        await getCustomerRequestProposals(
          requestId,
          customerId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Custom bouquet proposals retrieved successfully.",

          data: {
            count:
              proposals.length,

            proposals,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * SELLER
 * GET OWN PROPOSALS
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
 * =========================================================
 */

export const getMySellerProposals =
  async (
    req,
    res,
    next
  ) => {
    try {
      const sellerId =
        getAuthenticatedUserId(
          req
        );

      const proposals =
        await getSellerCustomBouquetProposals(
          sellerId,
          {
            status:
              req.query
                ?.status ||
              null,
          }
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Seller custom bouquet proposals retrieved successfully.",

          data: {
            count:
              proposals.length,

            proposals,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * SELLER
 * GET OWN PROPOSAL FOR ONE REQUEST
 * =========================================================
 *
 * GET
 * /:requestId/proposals/mine
 *
 * Useful when seller opens a bidding request.
 *
 * Response can tell frontend whether the
 * florist has already submitted a proposal.
 * =========================================================
 */

export const getMyProposalForRequest =
  async (
    req,
    res,
    next
  ) => {
    try {
      const sellerId =
        getAuthenticatedUserId(
          req
        );

      const {
        requestId,
      } =
        req.params;

      const proposal =
        await getSellerProposalForRequest(
          requestId,
          sellerId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            proposal
              ? "Seller proposal retrieved successfully."
              : "No proposal has been submitted for this request.",

          data: {
            hasProposal:
              Boolean(
                proposal
              ),

            proposal:
              proposal ||
              null,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER
 * SELECT PROPOSAL
 * =========================================================
 *
 * PATCH
 * /:requestId/proposals/:proposalId/select
 *
 * Optional body:
 *
 * {
 *   "customerDecisionMessage":
 *     "I choose this proposal."
 * }
 *
 * IMPORTANT:
 *
 * This is also the endpoint that AI will
 * eventually call after it resolves the
 * customer's explicit choice to a REAL
 * proposalId.
 * =========================================================
 */

export const selectProposal =
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

      const {
        requestId,
        proposalId,
      } =
        req.params;

      const result =
        await selectCustomBouquetProposal(
          requestId,
          proposalId,
          customerId,
          req.body
            ?.customerDecisionMessage ||
            null
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Custom bouquet proposal selected successfully. You may now proceed to checkout.",

          data: {
            request:
              result.request,

            selectedProposal:
              result.selectedProposal,

            canProceedToCheckout:
              result
                .canProceedToCheckout,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * SELLER
 * WITHDRAW PROPOSAL
 * =========================================================
 *
 * PATCH
 * /proposals/:proposalId/withdraw
 *
 * Allowed only while:
 *
 * request.status === "open"
 * proposal.status === "submitted"
 * =========================================================
 */

export const withdrawProposal =
  async (
    req,
    res,
    next
  ) => {
    try {
      const sellerId =
        getAuthenticatedUserId(
          req
        );

      const {
        proposalId,
      } =
        req.params;

      const proposal =
        await withdrawCustomBouquetProposal(
          proposalId,
          sellerId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Custom bouquet proposal withdrawn successfully.",

          data: {
            proposal,
          },
        });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * CUSTOMER / AI
 * GET CONSTRAINED PROPOSAL CONTEXT
 * =========================================================
 *
 * GET
 * /:requestId/proposals/ai-context
 *
 * This endpoint returns a controlled list
 * of REAL proposal records.
 *
 * AI should use this data when answering:
 *
 * "Which is cheapest?"
 * "Compare the proposals."
 * "Choose proposal 2."
 * "I want Maria's proposal."
 *
 * AI must NEVER invent proposal IDs,
 * prices, florist names, or offers.
 * =========================================================
 */

export const getAiProposalContext =
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

      const {
        requestId,
      } =
        req.params;

      const context =
        await getProposalContextForAi(
          requestId,
          customerId
        );

      return res
        .status(200)
        .json({
          success:
            true,

          message:
            "Custom bouquet proposal context retrieved successfully.",

          data:
            context,
        });
    } catch (error) {
      next(error);
    }
  };