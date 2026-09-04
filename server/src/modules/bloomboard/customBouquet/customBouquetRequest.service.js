import CustomBouquetRequest from "./customBouquetRequest.model.js";

import User from "../../auth/auth.model.js";
import Florist from "../../florists/florist.model.js";

import AiConversation from "../ai/aiConversation.model.js";
import AiMessage from "../ai/aiMessage.model.js";

import {
  createAiConversation,
} from "../ai/aiConversation.service.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const normalizeStringArray = (
  value
) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((item) =>
          String(item || "").trim()
        )
        .filter(Boolean)
    ),
  ];
};

const normalizeOptionalNumber = (
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

  return Number.isNaN(number)
    ? null
    : number;
};

const getApprovedSellerFlorist =
  async (
    sellerId
  ) => {
    const seller =
      await User.findById(
        sellerId
      );

    if (
      !seller ||
      seller.role !==
        "seller"
    ) {
      const error =
        new Error(
          "Only seller accounts can access custom bouquet requests."
        );

      error.statusCode = 403;

      throw error;
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
      const error =
        new Error(
          "An approved and active florist profile is required."
        );

      error.statusCode = 403;

      throw error;
    }

    return {
      seller,
      florist,
    };
  };

/*
 * =========================================================
 * CUSTOMER
 * CREATE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * NEW WORKFLOW:
 *
 * Customer creates ONE open bouquet request.
 *
 * No florist is selected yet.
 *
 * The request becomes available to all
 * approved + active FLOGRAM florists.
 *
 * Sellers will later submit separate
 * CustomBouquetProposal documents.
 *
 * After the customer selects a proposal:
 *
 * request.selectedProposal
 * request.florist
 * request.quotedPrice
 * request.sellerResponse
 *
 * will contain the winning proposal.
 * =========================================================
 */

export const createCustomBouquetRequest =
  async (
    customerId,
    requestData
  ) => {
    const customer =
      await User.findById(
        customerId
      );

    if (!customer) {
      const error =
        new Error(
          "Customer account was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      customer.role !==
      "customer"
    ) {
      const error =
        new Error(
          "Only customer accounts can create custom bouquet requests."
        );

      error.statusCode = 403;

      throw error;
    }

    /*
     * =====================================================
     * AI CONVERSATION
     * =====================================================
     *
     * If the request came from an existing
     * AI conversation, validate ownership.
     *
     * If the request came from a manually
     * uploaded reference image and does not
     * already have an AI conversation,
     * automatically create one.
     *
     * This allows the customer to later
     * receive, compare, and select seller
     * proposals through the AI conversation.
     * =====================================================
     */

    let aiConversation = null;

    if (
      requestData.aiConversationId
    ) {
      aiConversation =
        await AiConversation.findOne({
          _id:
            requestData
              .aiConversationId,

          customer:
            customerId,
        });

      if (!aiConversation) {
        const error =
          new Error(
            "AI conversation was not found or does not belong to this customer."
          );

        error.statusCode = 404;

        throw error;
      }
    }

    /*
     * =====================================================
     * AI SOURCE MESSAGE
     * =====================================================
     *
     * Used when the customer generated
     * an inspiration image with FLOGRAM AI.
     * =====================================================
     */

    let sourceMessage = null;

    if (
      requestData.sourceMessageId
    ) {
      sourceMessage =
        await AiMessage.findById(
          requestData
            .sourceMessageId
        );

      if (!sourceMessage) {
        const error =
          new Error(
            "AI source message was not found."
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        sourceMessage.role !==
          "assistant" ||
        sourceMessage.messageType !==
          "generated_image"
      ) {
        const error =
          new Error(
            "The selected AI message does not contain a generated bouquet image."
          );

        error.statusCode = 400;

        throw error;
      }

      /*
       * Make sure the generated
       * image belongs to this customer.
       */

      const messageConversation =
        await AiConversation.findOne({
          _id:
            sourceMessage
              .conversation,

          customer:
            customerId,
        });

      if (
        !messageConversation
      ) {
        const error =
          new Error(
            "The generated bouquet image does not belong to this customer."
          );

        error.statusCode = 403;

        throw error;
      }

      /*
       * If both conversation ID and
       * source message ID are supplied,
       * they must belong together.
       */

      if (
        aiConversation &&
        String(
          sourceMessage
            .conversation
        ) !==
          String(
            aiConversation._id
          )
      ) {
        const error =
          new Error(
            "The selected AI image does not belong to the specified AI conversation."
          );

        error.statusCode = 400;

        throw error;
      }

      /*
       * If sourceMessage was supplied
       * but aiConversationId was omitted,
       * use the source message's
       * conversation.
       */

      if (!aiConversation) {
        aiConversation =
          messageConversation;
      }
    }

    /*
     * =====================================================
     * INSPIRATION IMAGE
     * =====================================================
     */

    let inspirationImage =
      null;

    /*
     * AI image takes priority.
     */

    if (sourceMessage) {
      inspirationImage =
        sourceMessage.metadata
          ?.imageUrl ||
        null;

      if (!inspirationImage) {
        const error =
          new Error(
            "The selected AI message does not contain a saved inspiration image."
          );

        error.statusCode = 400;

        throw error;
      }
    }

    /*
     * Manual uploaded image.
     *
     * Controller supplies the
     * permanent /uploads/... path.
     */

    if (
      !inspirationImage &&
      requestData
        .inspirationImage
    ) {
      inspirationImage =
        String(
          requestData
            .inspirationImage
        ).trim();
    }

    if (!inspirationImage) {
      const error =
        new Error(
          "A bouquet inspiration image is required."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * =====================================================
     * AUTO-CREATE AI CONVERSATION
     * =====================================================
     *
     * Manual image requests do not
     * start from the AI page.
     *
     * Create an AI conversation so
     * seller proposals can later be
     * presented and discussed there.
     * =====================================================
     */

    let automaticallyCreatedConversation =
      false;

    if (!aiConversation) {
      aiConversation =
        await createAiConversation(
          customerId
        );

      automaticallyCreatedConversation =
        true;
    }

    /*
     * =====================================================
     * REMEMBERED AI PREFERENCES
     * =====================================================
     */

    const conversationPreferences =
      aiConversation
        ?.preferences
        ?.toObject?.() ||
      aiConversation
        ?.preferences ||
      {};

    const budget =
      normalizeOptionalNumber(
        requestData.budget ??
          conversationPreferences
            .maxBudget
      );

    const quantity =
      normalizeOptionalNumber(
        requestData.quantity
      ) || 1;

    if (quantity < 1) {
      const error =
        new Error(
          "Quantity must be at least 1."
        );

      error.statusCode = 400;

      throw error;
    }

    let requestedDate =
      null;

    if (
      requestData.requestedDate
    ) {
      requestedDate =
        new Date(
          requestData
            .requestedDate
        );

      if (
        Number.isNaN(
          requestedDate
            .getTime()
        )
      ) {
        const error =
          new Error(
            "Requested date is invalid."
          );

        error.statusCode = 400;

        throw error;
      }
    }

    /*
     * =====================================================
     * CREATE OPEN REQUEST
     * =====================================================
     *
     * IMPORTANT:
     *
     * florist = null
     * selectedProposal = null
     *
     * because the customer has not
     * selected a seller yet.
     * =====================================================
     */

    const request =
      await CustomBouquetRequest.create({
        customer:
          customerId,

        florist:
          null,

        selectedProposal:
          null,

        aiConversation:
          aiConversation
            ? aiConversation._id
            : null,

        sourceMessage:
          sourceMessage
            ? sourceMessage._id
            : null,

        inspirationImage,

        occasion:
          requestData.occasion ||
          conversationPreferences
            .occasion ||
          null,

        budget,

        quantity,

        requestedDate,

        flowerTypes:
          normalizeStringArray(
            requestData
              .flowerTypes ??
            conversationPreferences
              .flowerTypes ??
            []
          ),

        colors:
          normalizeStringArray(
            requestData.colors ??
            conversationPreferences
              .colors ??
            []
          ),

        styles:
          normalizeStringArray(
            requestData.styles ??
            conversationPreferences
              .styles ??
            []
          ),

        theme:
          requestData.theme ||
          conversationPreferences
            .theme ||
          null,

        bouquetSize:
          requestData
            .bouquetSize ||
          conversationPreferences
            .bouquetSize ||
          null,

        wrapping:
          requestData.wrapping ||
          conversationPreferences
            .wrapping ||
          null,

        specialInstructions:
          normalizeStringArray(
            requestData
              .specialInstructions ??
            conversationPreferences
              .specialInstructions ??
            []
          ),

        customerMessage:
          requestData
            .customerMessage ||
          null,

        status:
          "open",

        quotedPrice:
          null,

        sellerResponse:
          null,

        proposalSelectedAt:
          null,

        customerDecisionAt:
          null,

        customerDecisionMessage:
          null,

        convertedToOrderAt:
          null,
      });

    /*
     * =====================================================
     * AI CONVERSATION REQUEST MESSAGE
     * =====================================================
     *
     * Add a real assistant message so
     * the request becomes visible in
     * the same AI conversation.
     *
     * Later, proposal cards will be
     * loaded from the real proposal
     * collection using the
     * customBouquetRequestId stored
     * in metadata.
     * =====================================================
     */

    if (aiConversation) {
      const occasionLabel =
        request.occasion
          ? ` for ${request.occasion}`
          : "";

      const budgetLabel =
        request.budget !==
          null &&
        request.budget !==
          undefined
          ? ` with a budget of up to ₱${Number(
              request.budget
            ).toLocaleString(
              "en-PH"
            )}`
          : "";

      await AiMessage.create({
        conversation:
          aiConversation._id,

        sender:
          null,

        role:
          "assistant",

        messageType:
          "text",

        content:
          `Your custom bouquet request${occasionLabel}${budgetLabel} has been submitted to FLOGRAM florists. I'll help you review the real seller proposals here as they arrive. Once you choose a proposal, the request will stop accepting new offers and you can proceed to checkout.`,

        metadata: {
          provider:
            "flogram",

          intent:
            "custom_bouquet_request",

          eventType:
            "custom_bouquet_request_created",

          customBouquetRequestId:
            String(
              request._id
            ),

          requestStatus:
            "open",

          inspirationImage:
            request
              .inspirationImage,

          automaticallyCreatedConversation,
        },
      });

      /*
       * Give automatically created
       * conversations a useful title.
       */

      if (
        automaticallyCreatedConversation
      ) {
        aiConversation.title =
          request.occasion
            ? `Custom ${request.occasion} Bouquet`
            : "Custom Bouquet Request";

        aiConversation.lastMessageAt =
          new Date();

        await aiConversation.save();
      } else {
        aiConversation.lastMessageAt =
          new Date();

        await aiConversation.save();
      }
    }

    /*
     * =====================================================
     * RETURN REQUEST
     * =====================================================
     */

    return CustomBouquetRequest.findById(
      request._id
    )
      .populate(
        "customer",
        "firstName lastName email phoneNumber profileImage"
      )
      .populate(
        "florist",
        "shopName address contactNumber businessEmail shopLogo"
      )
      .populate(
        "selectedProposal"
      )
      .populate(
        "aiConversation",
        "title status preferences lastMessageAt"
      );
  };

/*
 * =========================================================
 * CUSTOMER
 * GET OWN CUSTOM BOUQUET REQUESTS
 * =========================================================
 */

export const getCustomerCustomBouquetRequests =
  async (
    customerId
  ) => {
    return CustomBouquetRequest.find({
      customer:
        customerId,
    })
      .populate(
        "florist",
        "shopName address contactNumber businessEmail shopLogo"
      )
      .populate(
        "selectedProposal"
      )
      .populate(
        "aiConversation",
        "title status lastMessageAt"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET AVAILABLE CUSTOM BOUQUET REQUESTS
 * =========================================================
 *
 * NEW WORKFLOW:
 *
 * All approved + active florists can see
 * all OPEN bouquet requests.
 *
 * A seller may also continue seeing a
 * request they WON after customer selection.
 *
 * The proposal model will later determine
 * whether this seller has already submitted
 * a proposal.
 * =========================================================
 */

export const getSellerCustomBouquetRequests =
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

    let query;

    /*
     * Explicit status filter.
     */

    if (filters.status) {
      if (
        filters.status ===
        "open"
      ) {
        query = {
          status:
            "open",
        };
      } else {
        /*
         * Closed/non-open requests
         * are visible only when this
         * florist became the winner.
         */
        query = {
          florist:
            florist._id,

          status:
            filters.status,
        };
      }
    }

    /*
     * Default seller view:
     *
     * - all currently open requests
     * - requests won by this florist
     */

    else {
      query = {
        $or: [
          {
            status:
              "open",
          },
          {
            florist:
              florist._id,
          },
        ],
      };
    }

    return CustomBouquetRequest.find(
      query
    )
      .populate(
        "customer",
        "firstName lastName profileImage"
      )
      .populate(
        "florist",
        "shopName address contactNumber businessEmail shopLogo"
      )
      .populate(
        "selectedProposal"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET ONE CUSTOM BOUQUET REQUEST
 * =========================================================
 */

export const getCustomBouquetRequestById =
  async (
    requestId,
    userId
  ) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      const error =
        new Error(
          "User account was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const request =
      await CustomBouquetRequest.findById(
        requestId
      )
        .populate(
          "customer",
          "firstName lastName email phoneNumber profileImage"
        )
        .populate(
          "florist",
          "shopName owner address contactNumber businessEmail shopLogo"
        )
        .populate(
          "selectedProposal"
        )
        .populate(
          "aiConversation",
          "title status preferences lastMessageAt"
        );

    if (!request) {
      const error =
        new Error(
          "Custom bouquet request was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    /*
     * =====================================================
     * CUSTOMER ACCESS
     * =====================================================
     */

    if (
      user.role ===
      "customer"
    ) {
      const requestCustomerId =
        request.customer?._id
          ? String(
              request.customer
                ._id
            )
          : String(
              request.customer
            );

      if (
        requestCustomerId !==
        String(userId)
      ) {
        const error =
          new Error(
            "You do not have permission to view this custom bouquet request."
          );

        error.statusCode = 403;

        throw error;
      }

      return request;
    }

    /*
     * =====================================================
     * SELLER ACCESS
     * =====================================================
     *
     * Approved sellers can view OPEN
     * requests because they are allowed
     * to submit proposals.
     *
     * Once the request closes, only the
     * winning florist can continue to
     * access it through this service.
     * =====================================================
     */

    if (
      user.role ===
      "seller"
    ) {
      const {
        florist,
      } =
        await getApprovedSellerFlorist(
          userId
        );

      if (
        request.status ===
        "open"
      ) {
        return request;
      }

      if (
        request.florist &&
        String(
          request.florist._id ??
            request.florist
        ) ===
          String(
            florist._id
          )
      ) {
        return request;
      }

      const error =
        new Error(
          "This custom bouquet request is no longer available to this florist."
        );

      error.statusCode = 403;

      throw error;
    }

    const error =
      new Error(
        "You do not have permission to view this custom bouquet request."
      );

    error.statusCode = 403;

    throw error;
  };

/*
 * =========================================================
 * CUSTOMER
 * CANCEL OWN REQUEST
 * =========================================================
 *
 * A request can only be cancelled while
 * it is still accepting proposals.
 *
 * Legacy pending / accepted states are
 * temporarily supported for old records.
 * =========================================================
 */

export const cancelCustomBouquetRequest =
  async (
    requestId,
    customerId
  ) => {
    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        customer:
          customerId,
      });

    if (!request) {
      const error =
        new Error(
          "Custom bouquet request was not found or does not belong to this customer."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      ![
        "open",

        /*
         * Legacy records
         */
        "pending",
        "accepted",
      ].includes(
        request.status
      )
    ) {
      const error =
        new Error(
          "This custom bouquet request can no longer be cancelled."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "cancelled";

    await request.save();

    /*
     * Inform the AI conversation.
     */

    if (
      request.aiConversation
    ) {
      await AiMessage.create({
        conversation:
          request
            .aiConversation,

        sender:
          null,

        role:
          "assistant",

        messageType:
          "text",

        content:
          "Your custom bouquet request has been cancelled. Florists can no longer submit proposals for this request.",

        metadata: {
          provider:
            "flogram",

          intent:
            "custom_bouquet_request",

          eventType:
            "custom_bouquet_request_cancelled",

          customBouquetRequestId:
            String(
              request._id
            ),

          requestStatus:
            "cancelled",
        },
      });

      await AiConversation.findByIdAndUpdate(
        request
          .aiConversation,
        {
          lastMessageAt:
            new Date(),
        }
      );
    }

    return request;
  };

/*
 * =========================================================
 * LEGACY SINGLE-FLORIST ACTIONS
 * =========================================================
 *
 * These exports are temporarily retained
 * because the existing controller/routes
 * still import them.
 *
 * The old workflow:
 *
 * seller accepts request
 * seller rejects request
 * seller directly quotes request
 * customer accepts/declines quote
 *
 * is being replaced by:
 *
 * CustomBouquetProposal
 *
 * We intentionally prevent these methods
 * from changing NEW open requests so the
 * new proposal workflow cannot be bypassed.
 * =========================================================
 */

const throwLegacyProposalError =
  () => {
    const error =
      new Error(
        "This action belongs to the previous single-florist custom bouquet workflow. Seller responses must now be submitted as bouquet proposals."
      );

    error.statusCode = 410;

    throw error;
  };

/*
 * SELLER
 * Legacy accept request.
 */

export const acceptCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    sellerResponse = null
  ) => {
    void requestId;
    void sellerId;
    void sellerResponse;

    return throwLegacyProposalError();
  };

/*
 * SELLER
 * Legacy reject request.
 */

export const rejectCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    sellerResponse = null
  ) => {
    void requestId;
    void sellerId;
    void sellerResponse;

    return throwLegacyProposalError();
  };

/*
 * SELLER
 * Legacy quote request.
 */

export const quoteCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    quoteData
  ) => {
    void requestId;
    void sellerId;
    void quoteData;

    return throwLegacyProposalError();
  };

/*
 * CUSTOMER
 * Legacy accept quotation.
 */

export const acceptCustomBouquetQuote =
  async (
    requestId,
    customerId,
    customerDecisionMessage =
      null
  ) => {
    void requestId;
    void customerId;
    void customerDecisionMessage;

    return throwLegacyProposalError();
  };

/*
 * CUSTOMER
 * Legacy decline quotation.
 */

export const declineCustomBouquetQuote =
  async (
    requestId,
    customerId,
    customerDecisionMessage =
      null
  ) => {
    void requestId;
    void customerId;
    void customerDecisionMessage;

    return throwLegacyProposalError();
  };