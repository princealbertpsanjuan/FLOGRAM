import mongoose from "mongoose";

import CustomBouquetProposal from "./customBouquetProposal.model.js";
import CustomBouquetRequest from "./customBouquetRequest.model.js";

import User from "../../auth/auth.model.js";
import Florist from "../../florists/florist.model.js";

import AiConversation from "../ai/aiConversation.model.js";
import AiMessage from "../ai/aiMessage.model.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const createError = (
  message,
  statusCode
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const normalizeOptionalString = (
  value
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized ||
    null;
};

const normalizePrice = (
  value
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  if (
    Number.isNaN(number)
  ) {
    return null;
  }

  return number;
};

const isValidObjectId = (
  value
) => {
  return mongoose.Types.ObjectId.isValid(
    value
  );
};

/*
 * =========================================================
 * GET APPROVED SELLER + FLORIST
 * =========================================================
 *
 * Only seller accounts with an approved
 * and active florist profile may submit
 * proposals.
 * =========================================================
 */

const getApprovedSellerFlorist =
  async (
    sellerId
  ) => {
    const seller =
      await User.findById(
        sellerId
      );

    if (!seller) {
      throw createError(
        "Seller account was not found.",
        404
      );
    }

    if (
      seller.role !==
      "seller"
    ) {
      throw createError(
        "Only seller accounts can submit custom bouquet proposals.",
        403
      );
    }

    const florist =
      await Florist.findOne({
        owner:
          sellerId,

        verificationStatus:
          "approved",

        isActive:
          true,
      });

    if (!florist) {
      throw createError(
        "An approved and active florist profile is required to submit custom bouquet proposals.",
        403
      );
    }

    return {
      seller,
      florist,
    };
  };

/*
 * =========================================================
 * POPULATE PROPOSAL
 * =========================================================
 */

const populateProposal =
  async (
    proposalId
  ) => {
    return CustomBouquetProposal.findById(
      proposalId
    )
      .populate(
        "florist",
        "shopName shopLogo shopDescription address contactNumber businessEmail verificationStatus isActive"
      )
      .populate(
        "seller",
        "firstName lastName profileImage"
      )
      .populate({
        path:
          "request",

        select:
          "customer inspirationImage occasion budget quantity requestedDate customerMessage status selectedProposal florist quotedPrice aiConversation",
      });
  };

/*
 * =========================================================
 * CREATE AI EVENT MESSAGE
 * =========================================================
 *
 * Seller proposals are REAL database records.
 *
 * AI does not invent the proposal.
 *
 * This helper only inserts an assistant/system-style
 * message into the linked AI conversation so the
 * customer can see that a real proposal arrived.
 * =========================================================
 */

const createProposalAiMessage =
  async ({
    request,
    proposal,
    florist,
  }) => {
    if (
      !request.aiConversation
    ) {
      return;
    }

    const conversationId =
      request.aiConversation?._id ??
      request.aiConversation;

    const price =
      Number(
        proposal.quotedPrice
      ).toLocaleString(
        "en-PH",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2,
        }
      );

    const shopName =
      florist.shopName ||
      "A florist";

    await AiMessage.create({
      conversation:
        conversationId,

      sender:
        null,

      role:
        "assistant",

      messageType:
        "text",

      content:
        `${shopName} submitted a proposal for your custom bouquet request for ₱${price}. You can ask me to compare this offer with your other real seller proposals.`,

      metadata: {
        provider:
          "flogram",

        intent:
          "custom_bouquet_proposal",

        eventType:
          "custom_bouquet_proposal_received",

        customBouquetRequestId:
          String(
            request._id
          ),

        proposalId:
          String(
            proposal._id
          ),

        floristId:
          String(
            florist._id
          ),

        shopName,

        quotedPrice:
          proposal.quotedPrice,

        proposalStatus:
          proposal.status,
      },
    });

    await AiConversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessageAt:
          new Date(),
      }
    );
  };

/*
 * =========================================================
 * CREATE AI SELECTION MESSAGE
 * =========================================================
 */

const createSelectionAiMessage =
  async ({
    request,
    proposal,
    florist,
  }) => {
    if (
      !request.aiConversation
    ) {
      return;
    }

    const conversationId =
      request.aiConversation?._id ??
      request.aiConversation;

    const price =
      Number(
        proposal.quotedPrice
      ).toLocaleString(
        "en-PH",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2,
        }
      );

    const shopName =
      florist.shopName ||
      "the selected florist";

    await AiMessage.create({
      conversation:
        conversationId,

      sender:
        null,

      role:
        "assistant",

      messageType:
        "text",

      content:
        `You've selected ${shopName}'s proposal for ₱${price}. Your custom bouquet request is now locked, so florists can no longer submit new proposals. You can now proceed to checkout.`,

      metadata: {
        provider:
          "flogram",

        intent:
          "custom_bouquet_proposal",

        eventType:
          "custom_bouquet_proposal_selected",

        customBouquetRequestId:
          String(
            request._id
          ),

        proposalId:
          String(
            proposal._id
          ),

        floristId:
          String(
            florist._id
          ),

        shopName,

        quotedPrice:
          proposal.quotedPrice,

        proposalStatus:
          "selected",

        requestStatus:
          "customer_accepted",

        canProceedToCheckout:
          true,
      },
    });

    await AiConversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessageAt:
          new Date(),
      }
    );
  };

/*
 * =========================================================
 * SELLER
 * CREATE CUSTOM BOUQUET PROPOSAL
 * =========================================================
 *
 * Rules:
 *
 * 1. Seller must own an approved + active florist.
 *
 * 2. Request must exist.
 *
 * 3. Request MUST still be OPEN.
 *
 * 4. One florist may submit only ONE proposal
 *    for the same request.
 *
 * 5. Once customer selects a proposal,
 *    request status changes away from "open",
 *    therefore no additional proposal can
 *    be submitted.
 * =========================================================
 */

export const createCustomBouquetProposal =
  async (
    requestId,
    sellerId,
    proposalData = {}
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw createError(
        "Invalid custom bouquet request ID.",
        400
      );
    }

    const {
      florist,
    } =
      await getApprovedSellerFlorist(
        sellerId
      );

    /*
     * =====================================================
     * LOAD REQUEST
     * =====================================================
     */

    const request =
      await CustomBouquetRequest.findById(
        requestId
      );

    if (!request) {
      throw createError(
        "Custom bouquet request was not found.",
        404
      );
    }

    /*
     * =====================================================
     * CRITICAL LOCK CHECK
     * =====================================================
     *
     * This is the business rule requested:
     *
     * Once customer selects a proposal,
     * sellers CANNOT send another proposal.
     * =====================================================
     */

    if (
      request.status !==
      "open"
    ) {
      throw createError(
        "This bouquet request is no longer accepting proposals.",
        400
      );
    }

    /*
     * Extra safety:
     *
     * An open request should never already
     * contain a selected proposal.
     */

    if (
      request.selectedProposal
    ) {
      throw createError(
        "This bouquet request already has a selected proposal.",
        409
      );
    }

    /*
     * =====================================================
     * VALIDATE PRICE
     * =====================================================
     */

    const quotedPrice =
      normalizePrice(
        proposalData.quotedPrice
      );

    if (
      quotedPrice === null ||
      quotedPrice < 0
    ) {
      throw createError(
        "A valid quoted price is required.",
        400
      );
    }

    /*
     * =====================================================
     * VALIDATE SELLER RESPONSE
     * =====================================================
     */

    const sellerResponse =
      normalizeOptionalString(
        proposalData.sellerResponse
      );

    if (!sellerResponse) {
      throw createError(
        "A proposal description is required.",
        400
      );
    }

    if (
      sellerResponse.length >
      2000
    ) {
      throw createError(
        "Proposal description must not exceed 2000 characters.",
        400
      );
    }

    /*
     * =====================================================
     * ONE PROPOSAL PER FLORIST
     * =====================================================
     *
     * We check manually for a friendly
     * API error.
     *
     * The unique MongoDB index in the model
     * provides the second layer of protection.
     * =====================================================
     */

    const existingProposal =
      await CustomBouquetProposal.findOne({
        request:
          request._id,

        florist:
          florist._id,
      });

    if (existingProposal) {
      throw createError(
        "Your florist has already submitted a proposal for this bouquet request.",
        409
      );
    }

    /*
     * =====================================================
     * CREATE PROPOSAL
     * =====================================================
     */

    let proposal;

    try {
      proposal =
        await CustomBouquetProposal.create({
          request:
            request._id,

          florist:
            florist._id,

          seller:
            sellerId,

          quotedPrice,

          sellerResponse,

          proposalImage:
            normalizeOptionalString(
              proposalData.proposalImage
            ),

          status:
            "submitted",

          selectedAt:
            null,

          withdrawnAt:
            null,
        });
    } catch (error) {
      /*
       * Mongo duplicate-key protection.
       */

      if (
        error?.code ===
        11000
      ) {
        throw createError(
          "Your florist has already submitted a proposal for this bouquet request.",
          409
        );
      }

      throw error;
    }

    /*
     * =====================================================
     * AI CONVERSATION EVENT
     * =====================================================
     */

    await createProposalAiMessage({
      request,
      proposal,
      florist,
    });

    return populateProposal(
      proposal._id
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * GET PROPOSALS FOR OWN REQUEST
 * =========================================================
 *
 * These are the REAL proposal records that
 * customer-ai.tsx will eventually display.
 *
 * AI should receive these records as context
 * when answering questions such as:
 *
 * "Which is cheapest?"
 * "Compare proposal 1 and proposal 2."
 * "I want Maria's proposal."
 * =========================================================
 */

export const getCustomerRequestProposals =
  async (
    requestId,
    customerId
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw createError(
        "Invalid custom bouquet request ID.",
        400
      );
    }

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        customer:
          customerId,
      });

    if (!request) {
      throw createError(
        "Custom bouquet request was not found or does not belong to this customer.",
        404
      );
    }

    return CustomBouquetProposal.find({
      request:
        request._id,

      /*
       * Withdrawn proposals should not
       * be offered to the customer.
       */
      status: {
        $ne:
          "withdrawn",
      },
    })
      .populate(
        "florist",
        "shopName shopLogo shopDescription address contactNumber businessEmail verificationStatus isActive"
      )
      .populate(
        "seller",
        "firstName lastName profileImage"
      )
      .sort({
        /*
         * Stable ordering is useful
         * when AI/customer refers to:
         *
         * Proposal 1
         * Proposal 2
         * Proposal 3
         */
        createdAt:
          1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET OWN PROPOSALS
 * =========================================================
 */

export const getSellerCustomBouquetProposals =
  async (
    sellerId,
    filters = {}
  ) => {
    const {
      florist,
    } =
      await getApprovedSellerFlorist(
        sellerId
      );

    const query = {
      florist:
        florist._id,

      seller:
        sellerId,
    };

    if (
      filters.status
    ) {
      query.status =
        filters.status;
    }

    return CustomBouquetProposal.find(
      query
    )
      .populate({
        path:
          "request",

        select:
          "customer inspirationImage occasion budget quantity requestedDate customerMessage status selectedProposal florist quotedPrice aiConversation createdAt",

        populate: {
          path:
            "customer",

          select:
            "firstName lastName profileImage",
        },
      })
      .populate(
        "florist",
        "shopName shopLogo address contactNumber businessEmail"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET OWN PROPOSAL FOR ONE REQUEST
 * =========================================================
 *
 * Useful when seller opens a bidding request.
 *
 * Seller UI can determine:
 *
 * hasProposal = true / false
 * =========================================================
 */

export const getSellerProposalForRequest =
  async (
    requestId,
    sellerId
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw createError(
        "Invalid custom bouquet request ID.",
        400
      );
    }

    const {
      florist,
    } =
      await getApprovedSellerFlorist(
        sellerId
      );

    return CustomBouquetProposal.findOne({
      request:
        requestId,

      florist:
        florist._id,
    })
      .populate(
        "florist",
        "shopName shopLogo address contactNumber businessEmail"
      )
      .populate(
        "seller",
        "firstName lastName profileImage"
      );
  };

/*
 * =========================================================
 * CUSTOMER
 * SELECT PROPOSAL
 * =========================================================
 *
 * This is the most important transaction.
 *
 * Customer explicitly chooses ONE proposal.
 *
 * The backend verifies:
 *
 * - request belongs to customer
 * - request is still open
 * - proposal belongs to this request
 * - proposal is still submitted
 *
 * Then:
 *
 * winning proposal -> selected
 * other proposals   -> not_selected
 *
 * request.selectedProposal = winner
 * request.florist           = winner florist
 * request.quotedPrice       = winner price
 * request.sellerResponse    = winner response
 * request.status            = customer_accepted
 *
 * Once request is no longer "open",
 * createCustomBouquetProposal() rejects
 * every later seller submission.
 * =========================================================
 */

export const selectCustomBouquetProposal =
  async (
    requestId,
    proposalId,
    customerId,
    customerDecisionMessage =
      null
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw createError(
        "Invalid custom bouquet request ID.",
        400
      );
    }

    if (
      !isValidObjectId(
        proposalId
      )
    ) {
      throw createError(
        "Invalid custom bouquet proposal ID.",
        400
      );
    }

    /*
     * =====================================================
     * LOAD REQUEST
     * =====================================================
     */

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        customer:
          customerId,
      });

    if (!request) {
      throw createError(
        "Custom bouquet request was not found or does not belong to this customer.",
        404
      );
    }

    /*
     * =====================================================
     * REQUEST MUST STILL BE OPEN
     * =====================================================
     */

    if (
      request.status !==
      "open"
    ) {
      if (
        request.status ===
          "customer_accepted" &&
        request.selectedProposal
      ) {
        throw createError(
          "A proposal has already been selected for this bouquet request.",
          409
        );
      }

      throw createError(
        "This bouquet request is no longer accepting proposal selections.",
        400
      );
    }

    if (
      request.selectedProposal
    ) {
      throw createError(
        "A proposal has already been selected for this bouquet request.",
        409
      );
    }

    /*
     * =====================================================
     * LOAD PROPOSAL
     * =====================================================
     *
     * CRITICAL:
     *
     * request: request._id is included
     * in this query.
     *
     * Therefore the customer cannot submit
     * a proposal ID belonging to another
     * bouquet request.
     * =====================================================
     */

    const proposal =
      await CustomBouquetProposal.findOne({
        _id:
          proposalId,

        request:
          request._id,
      });

    if (!proposal) {
      throw createError(
        "The selected proposal was not found for this bouquet request.",
        404
      );
    }

    if (
      proposal.status !==
      "submitted"
    ) {
      throw createError(
        "This proposal can no longer be selected.",
        400
      );
    }

    /*
     * =====================================================
     * VERIFY FLORIST STILL VALID
     * =====================================================
     */

    const florist =
      await Florist.findOne({
        _id:
          proposal.florist,

        verificationStatus:
          "approved",

        isActive:
          true,
      });

    if (!florist) {
      throw createError(
        "The florist for this proposal is no longer available.",
        400
      );
    }

    const decisionMessage =
      normalizeOptionalString(
        customerDecisionMessage
      );

    if (
      decisionMessage &&
      decisionMessage.length >
        2000
    ) {
      throw createError(
        "Customer decision message must not exceed 2000 characters.",
        400
      );
    }

    /*
     * =====================================================
     * ATOMIC REQUEST LOCK
     * =====================================================
     *
     * We do NOT simply call request.save().
     *
     * Instead we update only if:
     *
     * status = open
     * selectedProposal = null
     *
     * This protects against two customer
     * selection requests arriving at nearly
     * the same time.
     * =====================================================
     */

    const now =
      new Date();

    const lockedRequest =
      await CustomBouquetRequest.findOneAndUpdate(
        {
          _id:
            request._id,

          customer:
            customerId,

          status:
            "open",

          selectedProposal:
            null,
        },
        {
          $set: {
            selectedProposal:
              proposal._id,

            florist:
              proposal.florist,

            quotedPrice:
              proposal.quotedPrice,

            sellerResponse:
              proposal.sellerResponse,

            status:
              "customer_accepted",

            proposalSelectedAt:
              now,

            customerDecisionAt:
              now,

            customerDecisionMessage:
              decisionMessage,
          },
        },
        {
          new:
            true,
        }
      );

    /*
     * Another selection won the race.
     */

    if (!lockedRequest) {
      throw createError(
        "A proposal has already been selected for this bouquet request.",
        409
      );
    }

    /*
     * =====================================================
     * MARK WINNER
     * =====================================================
     */

    await CustomBouquetProposal.updateOne(
      {
        _id:
          proposal._id,

        request:
          request._id,

        status:
          "submitted",
      },
      {
        $set: {
          status:
            "selected",

          selectedAt:
            now,
        },
      }
    );

    /*
     * =====================================================
     * MARK ALL OTHER PROPOSALS NOT SELECTED
     * =====================================================
     */

    await CustomBouquetProposal.updateMany(
      {
        request:
          request._id,

        _id: {
          $ne:
            proposal._id,
        },

        status:
          "submitted",
      },
      {
        $set: {
          status:
            "not_selected",
        },
      }
    );

    /*
     * =====================================================
     * AI CONFIRMATION
     * =====================================================
     */

    await createSelectionAiMessage({
      request:
        lockedRequest,

      proposal,

      florist,
    });

    /*
     * =====================================================
     * RETURN UPDATED RESULT
     * =====================================================
     */

    const updatedRequest =
      await CustomBouquetRequest.findById(
        lockedRequest._id
      )
        .populate(
          "customer",
          "firstName lastName email phoneNumber profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo shopDescription address contactNumber businessEmail"
        )
        .populate({
          path:
            "selectedProposal",

          populate: [
            {
              path:
                "florist",

              select:
                "shopName shopLogo shopDescription address contactNumber businessEmail",
            },
            {
              path:
                "seller",

              select:
                "firstName lastName profileImage",
            },
          ],
        })
        .populate(
          "aiConversation",
          "title status lastMessageAt"
        );

    const selectedProposal =
      await populateProposal(
        proposal._id
      );

    return {
      request:
        updatedRequest,

      selectedProposal,

      canProceedToCheckout:
        true,
    };
  };

/*
 * =========================================================
 * SELLER
 * WITHDRAW OWN PROPOSAL
 * =========================================================
 *
 * Seller may withdraw only while:
 *
 * request = open
 * proposal = submitted
 *
 * Once the customer selects a winner,
 * no proposal may be withdrawn.
 * =========================================================
 */

export const withdrawCustomBouquetProposal =
  async (
    proposalId,
    sellerId
  ) => {
    if (
      !isValidObjectId(
        proposalId
      )
    ) {
      throw createError(
        "Invalid custom bouquet proposal ID.",
        400
      );
    }

    const {
      florist,
    } =
      await getApprovedSellerFlorist(
        sellerId
      );

    const proposal =
      await CustomBouquetProposal.findOne({
        _id:
          proposalId,

        florist:
          florist._id,

        seller:
          sellerId,
      });

    if (!proposal) {
      throw createError(
        "Custom bouquet proposal was not found or does not belong to this florist.",
        404
      );
    }

    if (
      proposal.status !==
      "submitted"
    ) {
      throw createError(
        "This proposal can no longer be withdrawn.",
        400
      );
    }

    const request =
      await CustomBouquetRequest.findById(
        proposal.request
      );

    if (!request) {
      throw createError(
        "The custom bouquet request for this proposal was not found.",
        404
      );
    }

    if (
      request.status !==
      "open"
    ) {
      throw createError(
        "This proposal can no longer be withdrawn because the bouquet request is already closed.",
        400
      );
    }

    proposal.status =
      "withdrawn";

    proposal.withdrawnAt =
      new Date();

    await proposal.save();

    return populateProposal(
      proposal._id
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * GET PROPOSAL SUMMARY FOR AI
 * =========================================================
 *
 * This produces a constrained representation
 * of REAL database proposals.
 *
 * Later we can inject this into the AI
 * context.
 *
 * Example:
 *
 * {
 *   availableProposals: [
 *     {
 *       proposalId: "...",
 *       proposalNumber: 1,
 *       shopName: "...",
 *       quotedPrice: 1500,
 *       sellerResponse: "...",
 *       status: "submitted"
 *     }
 *   ]
 * }
 *
 * The AI must only reference proposal IDs
 * supplied by this function.
 * =========================================================
 */

export const getProposalContextForAi =
  async (
    requestId,
    customerId
  ) => {
    const proposals =
      await getCustomerRequestProposals(
        requestId,
        customerId
      );

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        customer:
          customerId,
      }).select(
        "_id status selectedProposal florist quotedPrice aiConversation"
      );

    if (!request) {
      throw createError(
        "Custom bouquet request was not found or does not belong to this customer.",
        404
      );
    }

    const availableProposals =
      proposals.map(
        (
          proposal,
          index
        ) => {
          return {
            proposalId:
              String(
                proposal._id
              ),

            proposalNumber:
              index + 1,

            floristId:
              proposal.florist
                ? String(
                    proposal
                      .florist
                      ._id
                  )
                : null,

            shopName:
              proposal.florist
                ?.shopName ||
              "Florist",

            quotedPrice:
              proposal
                .quotedPrice,

            sellerResponse:
              proposal
                .sellerResponse,

            proposalImage:
              proposal
                .proposalImage ||
              null,

            status:
              proposal.status,

            createdAt:
              proposal.createdAt,
          };
        }
      );

    return {
      customBouquetRequestId:
        String(
          request._id
        ),

      requestStatus:
        request.status,

      selectedProposalId:
        request.selectedProposal
          ? String(
              request
                .selectedProposal
            )
          : null,

      canSelectProposal:
        request.status ===
          "open" &&
        !request.selectedProposal,

      availableProposals,
    };
  };