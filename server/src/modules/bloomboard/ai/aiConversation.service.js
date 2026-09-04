import AiConversation from "./aiConversation.model.js";
import User from "../../auth/auth.model.js";

/*
 * =========================================================
 * CUSTOMER
 * CREATE AI CONVERSATION
 * =========================================================
 *
 * Conversation creation is kept separate from
 * aiAssistant.service.js so other BloomBoard services
 * can create conversations without depending on the
 * full AI assistant service.
 * =========================================================
 */

export const createAiConversation = async (customerId) => {
  /*
   * =====================================================
   * VERIFY CUSTOMER
   * =====================================================
   */

  const customer = await User.findById(customerId);

  if (!customer) {
    const error = new Error(
      "Customer account was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  if (customer.role !== "customer") {
    const error = new Error(
      "Only customer accounts can use the BloomBoard AI Bouquet Assistant."
    );

    error.statusCode = 403;

    throw error;
  }

  /*
   * =====================================================
   * CREATE CONVERSATION
   * =====================================================
   */

  const conversation = await AiConversation.create({
    customer: customerId,

    title: "New Bouquet Conversation",

    status: "active",

    preferences: {
      occasion: null,

      minBudget: null,

      maxBudget: null,

      flowerTypes: [],

      colors: [],

      styles: [],

      theme: null,

      bouquetSize: null,

      wrapping: null,

      specialInstructions: [],
    },

    lastMessageAt: new Date(),
  });

  return conversation;
};