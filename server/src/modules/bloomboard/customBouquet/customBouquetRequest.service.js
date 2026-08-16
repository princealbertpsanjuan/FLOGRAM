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

/*
 * =========================================================
 * CUSTOMER
 * CREATE CUSTOM BOUQUET REQUEST
 * =========================================================
 *
 * The customer can create a proposal
 * from a generated AI bouquet image
 * and send it to a florist.
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
     * Florist is required because the
     * customer is sending the proposal
     * to a specific shop.
     */
    if (!requestData.floristId) {
      const error =
        new Error(
          "Florist is required."
        );

      error.statusCode = 400;

      throw error;
    }

    const florist =
      await Florist.findById(
        requestData.floristId
      );

    if (!florist) {
      const error =
        new Error(
          "Florist was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    /*
     * Only approved florists should
     * receive custom bouquet requests.
     */
    if (
      florist.verificationStatus !==
      "approved"
    ) {
      const error =
        new Error(
          "Custom bouquet requests can only be sent to approved florists."
        );

      error.statusCode = 403;

      throw error;
    }

    /*
     * Optional:
     * verify the AI conversation belongs
     * to the customer.
     */
    let aiConversation = null;

    if (
      requestData.aiConversationId
    ) {
      aiConversation =
        await AiConversation.findOne({
          _id:
            requestData.aiConversationId,

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
     * Optional:
     * verify the generated AI message.
     *
     * The image used for the custom
     * bouquet request must come from
     * this customer's own AI conversation.
     */
    let sourceMessage = null;

    if (
      requestData.sourceMessageId
    ) {
      sourceMessage =
        await AiMessage.findById(
          requestData.sourceMessageId
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
       * Make sure the message belongs
       * to one of this customer's
       * conversations.
       */
      const messageConversation =
        await AiConversation.findOne({
          _id:
            sourceMessage.conversation,

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
       * If both IDs were provided,
       * they must point to the same
       * conversation.
       */
      if (
        aiConversation &&
        String(
          sourceMessage.conversation
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
    }

    /*
     * Get the permanent image path.
     *
     * Prefer the image stored in the
     * generated AiMessage so customers
     * cannot submit arbitrary image paths.
     */
    let inspirationImage = null;

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
     * If no AI source message is supplied,
     * optionally allow a direct inspiration
     * image path.
     *
     * This also lets us support manually
     * uploaded bouquet inspirations later.
     */
    if (
      !inspirationImage &&
      requestData.inspirationImage
    ) {
      inspirationImage =
        String(
          requestData.inspirationImage
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
     * Pull remembered AI preferences
     * when available.
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

    let requestedDate = null;

    if (
      requestData.requestedDate
    ) {
      requestedDate =
        new Date(
          requestData.requestedDate
        );

      if (
        Number.isNaN(
          requestedDate.getTime()
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

    const request =
      await CustomBouquetRequest.create({
        customer:
          customerId,

        florist:
          florist._id,

        aiConversation:
          aiConversation
            ? aiConversation._id
            : sourceMessage
              ? sourceMessage
                  .conversation
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
          "pending",
      });

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
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET REQUESTS SENT TO SELLER'S SHOP
 * =========================================================
 */
export const getSellerCustomBouquetRequests =
  async (
    sellerId,
    filters = {}
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
          "Only seller accounts can view florist custom bouquet requests."
        );

      error.statusCode = 403;

      throw error;
    }

    const florist =
      await Florist.findOne({
        owner:
          sellerId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const query = {
      florist:
        florist._id,
    };

    if (
      filters.status
    ) {
      query.status =
        filters.status;
    }

    return CustomBouquetRequest.find(
      query
    )
      .populate(
        "customer",
        "firstName lastName email phoneNumber profileImage"
      )
      .populate(
        "florist",
        "shopName address contactNumber businessEmail shopLogo"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET ONE REQUEST
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
     * Customer can only read own request.
     */
    if (
      user.role ===
      "customer"
    ) {
      if (
        String(
          request.customer._id
        ) !==
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
     * Seller can only read requests
     * belonging to their own florist.
     */
    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          request.florist.owner
        ) !==
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

    const error =
      new Error(
        "You do not have permission to view this custom bouquet request."
      );

    error.statusCode = 403;

    throw error;
  };

/*
 * =========================================================
 * SELLER
 * ACCEPT REQUEST
 * =========================================================
 */
export const acceptCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    sellerResponse = null
  ) => {
    const florist =
      await Florist.findOne({
        owner:
          sellerId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        florist:
          florist._id,
      });

    if (!request) {
      const error =
        new Error(
          "Custom bouquet request was not found or does not belong to this florist."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      request.status !==
      "pending"
    ) {
      const error =
        new Error(
          "Only pending custom bouquet requests can be accepted."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "accepted";

    request.sellerResponse =
      sellerResponse
        ? String(
            sellerResponse
          ).trim()
        : null;

    request.respondedAt =
      new Date();

    await request.save();

    return request;
  };

/*
 * =========================================================
 * SELLER
 * REJECT REQUEST
 * =========================================================
 */
export const rejectCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    sellerResponse = null
  ) => {
    const florist =
      await Florist.findOne({
        owner:
          sellerId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        florist:
          florist._id,
      });

    if (!request) {
      const error =
        new Error(
          "Custom bouquet request was not found or does not belong to this florist."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      request.status !==
      "pending"
    ) {
      const error =
        new Error(
          "Only pending custom bouquet requests can be rejected."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "rejected";

    request.sellerResponse =
      sellerResponse
        ? String(
            sellerResponse
          ).trim()
        : null;

    request.quotedPrice =
      null;

    request.respondedAt =
      new Date();

    await request.save();

    return request;
  };

/*
 * =========================================================
 * SELLER
 * SEND PRICE QUOTE
 * =========================================================
 */
export const quoteCustomBouquetRequest =
  async (
    requestId,
    sellerId,
    quoteData
  ) => {
    const florist =
      await Florist.findOne({
        owner:
          sellerId,
      });

    if (!florist) {
      const error =
        new Error(
          "Florist profile was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    const request =
      await CustomBouquetRequest.findOne({
        _id:
          requestId,

        florist:
          florist._id,
      });

    if (!request) {
      const error =
        new Error(
          "Custom bouquet request was not found or does not belong to this florist."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      request.status !==
        "pending" &&
      request.status !==
        "accepted"
    ) {
      const error =
        new Error(
          "This custom bouquet request can no longer be quoted."
        );

      error.statusCode = 400;

      throw error;
    }

    const quotedPrice =
      normalizeOptionalNumber(
        quoteData.quotedPrice
      );

    if (
      quotedPrice === null ||
      quotedPrice < 0
    ) {
      const error =
        new Error(
          "A valid quoted price is required."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "quoted";

    request.quotedPrice =
      quotedPrice;

    request.sellerResponse =
      quoteData.sellerResponse
        ? String(
            quoteData
              .sellerResponse
          ).trim()
        : null;

    request.respondedAt =
      new Date();

    await request.save();

    return request;
  };

/*
 * =========================================================
 * CUSTOMER
 * CANCEL OWN REQUEST
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

    /*
     * Once rejected/cancelled,
     * there is nothing more to cancel.
     *
     * We also prevent cancellation
     * after a final quote for now.
     */
    if (
      ![
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

    return request;
  };

  /*
 * =========================================================
 * CUSTOMER
 * ACCEPT SELLER QUOTE
 * =========================================================
 */
export const acceptCustomBouquetQuote =
  async (
    requestId,
    customerId,
    customerDecisionMessage = null
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
          "Only customer accounts can accept custom bouquet quotes."
        );

      error.statusCode = 403;

      throw error;
    }

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

    /*
     * Customer can only accept after
     * the seller has submitted a quote.
     */
    if (
      request.status !==
      "quoted"
    ) {
      const error =
        new Error(
          "Only quoted custom bouquet requests can be accepted."
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * A valid seller quote must exist.
     */
    if (
      request.quotedPrice ===
        null ||
      request.quotedPrice ===
        undefined
    ) {
      const error =
        new Error(
          "This custom bouquet request does not have a valid seller quote."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "customer_accepted";

    request.customerDecisionAt =
      new Date();

    request.customerDecisionMessage =
      customerDecisionMessage
        ? String(
            customerDecisionMessage
          ).trim()
        : null;

    await request.save();

    return request;
  };

/*
 * =========================================================
 * CUSTOMER
 * DECLINE SELLER QUOTE
 * =========================================================
 */
export const declineCustomBouquetQuote =
  async (
    requestId,
    customerId,
    customerDecisionMessage = null
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
          "Only customer accounts can decline custom bouquet quotes."
        );

      error.statusCode = 403;

      throw error;
    }

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

    /*
     * Customer can only decline after
     * the seller has submitted a quote.
     */
    if (
      request.status !==
      "quoted"
    ) {
      const error =
        new Error(
          "Only quoted custom bouquet requests can be declined."
        );

      error.statusCode = 400;

      throw error;
    }

    request.status =
      "customer_declined";

    request.customerDecisionAt =
      new Date();

    request.customerDecisionMessage =
      customerDecisionMessage
        ? String(
            customerDecisionMessage
          ).trim()
        : null;

    await request.save();

    return request;
  };