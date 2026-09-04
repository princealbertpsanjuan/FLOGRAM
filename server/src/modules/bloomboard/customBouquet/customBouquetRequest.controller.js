import {
  cancelCustomBouquetRequest,
  createCustomBouquetRequest,
  getCustomerCustomBouquetRequests,
  getCustomBouquetRequestById,
  getSellerCustomBouquetRequests,
} from "./customBouquetRequest.service.js";

/*
 * =========================================================
 * HELPER
 * GET AUTHENTICATED USER ID
 * =========================================================
 *
 * The current FLOGRAM authentication middleware
 * uses req.user.userId.
 *
 * The fallbacks are included so the controller
 * also remains compatible if authentication later
 * exposes req.user._id or req.user.id.
 * =========================================================
 */

const getAuthenticatedUserId = (
  req
) => {
  return (
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    null
  );
};

/*
 * =========================================================
 * CUSTOMER
 * CREATE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * POST /
 *
 * NEW WORKFLOW:
 *
 * Customer creates ONE open bouquet request.
 *
 * The customer does NOT choose a florist.
 *
 * The request becomes available to approved
 * and active florists so they can submit
 * separate proposals.
 *
 * Supports:
 *
 * 1. MANUAL REFERENCE IMAGE
 *
 *    inspirationImage file
 *
 * 2. AI-GENERATED REFERENCE IMAGE
 *
 *    aiConversationId
 *    sourceMessageId
 *
 * Optional bouquet information:
 *
 * occasion
 * budget
 * quantity
 * requestedDate
 * customerMessage
 *
 * Optional AI/design preferences:
 *
 * flowerTypes
 * colors
 * styles
 * theme
 * bouquetSize
 * wrapping
 * specialInstructions
 * =========================================================
 */

export const create = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const requestData = {
      ...req.body,
    };

    /*
     * =====================================================
     * MANUAL REFERENCE IMAGE
     * =====================================================
     *
     * customBouquetRequest.upload.js stores
     * uploaded files inside:
     *
     * uploads/
     *   bloomboard/
     *     custom-bouquet-requests/
     *
     * The database stores the public
     * server-relative URL.
     *
     * Example:
     *
     * /uploads/bloomboard/
     * custom-bouquet-requests/
     * 123456-reference.jpg
     * =====================================================
     */

    if (req.file) {
      requestData.inspirationImage =
        `/uploads/bloomboard/custom-bouquet-requests/${req.file.filename}`;
    }

    /*
     * =====================================================
     * CREATE REQUEST
     * =====================================================
     *
     * The service will:
     *
     * - verify customer
     * - verify AI conversation when supplied
     * - verify AI generated image when supplied
     * - create AI conversation automatically for
     *   manually uploaded reference requests
     * - create request with status = "open"
     * - florist = null
     * - selectedProposal = null
     * =====================================================
     */

    const request =
      await createCustomBouquetRequest(
        customerId,
        requestData
      );

    return res
      .status(201)
      .json({
        success:
          true,

        message:
          "Custom bouquet request created successfully. Approved florists may now submit proposals.",

        data: {
          request,

          /*
           * Useful for the mobile frontend.
           *
           * After manual request creation,
           * customer-custom-request.tsx can
           * navigate directly to the linked
           * AI conversation.
           */
          aiConversationId:
            request
              .aiConversation
              ?._id
              ? String(
                  request
                    .aiConversation
                    ._id
                )
              : request
                  .aiConversation
                ? String(
                    request
                      .aiConversation
                  )
                : null,

          requestStatus:
            request.status,

          acceptingProposals:
            request.status ===
            "open",
        },
      });
  } catch (error) {
    next(error);
  }
};

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
 *
 * Possible new workflow statuses:
 *
 * open
 * customer_accepted
 * cancelled
 * converted_to_order
 *
 * Legacy statuses may still appear for
 * records created before the proposal
 * workflow migration.
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

    const requests =
      await getCustomerCustomBouquetRequests(
        customerId
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "Custom bouquet requests retrieved successfully.",

        data: {
          count:
            requests.length,

          requests,
        },
      });
  } catch (error) {
    next(error);
  }
};

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
 * Instead of showing only requests assigned
 * directly to one florist, approved sellers
 * can see OPEN bouquet requests.
 *
 * This creates the bidding/proposal workflow:
 *
 * Customer request
 *       ↓
 * All approved sellers
 *       ↓
 * Seller proposals
 *
 * Optional:
 *
 * ?status=open
 *
 * The service determines which closed
 * requests remain visible to the florist.
 * =========================================================
 */

export const getForSeller = async (
  req,
  res,
  next
) => {
  try {
    const sellerId =
      getAuthenticatedUserId(
        req
      );

    const filters = {
      status:
        req.query
          ?.status ||
        null,
    };

    const requests =
      await getSellerCustomBouquetRequests(
        sellerId,
        filters
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "Available custom bouquet requests retrieved successfully.",

        data: {
          count:
            requests.length,

          requests,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET ONE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * GET /:requestId
 *
 * CUSTOMER:
 *
 * Can only view a request that belongs
 * to their own account.
 *
 * SELLER:
 *
 * Approved sellers can view an OPEN request
 * because they may submit a proposal.
 *
 * After selection, access is controlled by
 * the service according to the winning
 * florist.
 * =========================================================
 */

export const getOne = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      getAuthenticatedUserId(
        req
      );

    const request =
      await getCustomBouquetRequestById(
        req.params
          .requestId,
        userId
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "Custom bouquet request retrieved successfully.",

        data: {
          request,
        },
      });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * CANCEL OWN CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * PATCH /:requestId/cancel
 *
 * NEW NORMAL FLOW:
 *
 * open
 *   ↓
 * cancelled
 *
 * Once a customer has selected a proposal:
 *
 * customer_accepted
 *
 * the request can no longer be cancelled
 * through this endpoint.
 *
 * Once cancelled:
 *
 * sellers can no longer submit proposals
 * because proposal creation requires:
 *
 * request.status === "open"
 * =========================================================
 */

export const cancel = async (
  req,
  res,
  next
) => {
  try {
    const customerId =
      getAuthenticatedUserId(
        req
      );

    const request =
      await cancelCustomBouquetRequest(
        req.params
          .requestId,
        customerId
      );

    return res
      .status(200)
      .json({
        success:
          true,

        message:
          "Custom bouquet request cancelled successfully.",

        data: {
          request,

          requestStatus:
            request.status,

          acceptingProposals:
            false,
        },
      });
  } catch (error) {
    next(error);
  }
};