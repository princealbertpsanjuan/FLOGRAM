import AiConversation from "./aiConversation.model.js";
import AiMessage from "./aiMessage.model.js";

import CustomBouquetRequest from "../customBouquet/customBouquetRequest.model.js";

import {
  createAiConversation,
} from "./aiConversation.service.js";

export {
  createAiConversation,
};

import {
  generateGrokImage,
  generateGrokResponse,
} from "../../../services/grok.service.js";

import {
  saveRemoteAiImage,
} from "../../../services/imageStorage.service.js";

import {
  getRecommendedFlowers,
} from "../../flowers/flower.service.js";

import {
  getProposalContextForAi,
  selectCustomBouquetProposal,
} from "../customBouquet/customBouquetProposal.service.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const normalizeStringArray = (value) => {
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

const normalizeNumber = (value) => {
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

const cleanJsonText = (text) => {
  return String(text || "")
    .trim()
    .replace(
      /^```json\s*/i,
      ""
    )
    .replace(
      /^```\s*/i,
      ""
    )
    .replace(
      /\s*```$/,
      ""
    )
    .trim();
};

const parseGrokJson = (text) => {
  try {
    return JSON.parse(
      cleanJsonText(text)
    );
  } catch {
    return null;
  }
};

const mergePreferences = (
  currentPreferences = {},
  detectedPreferences = {}
) => {
  const current =
    currentPreferences || {};

  const detected =
    detectedPreferences || {};

  const detectedMinBudget =
    normalizeNumber(
      detected.minBudget
    );

  const detectedMaxBudget =
    normalizeNumber(
      detected.maxBudget
    );

  return {
    occasion:
      detected.occasion ||
      current.occasion ||
      null,

    minBudget:
      detectedMinBudget !== null
        ? detectedMinBudget
        : normalizeNumber(
            current.minBudget
          ),

    maxBudget:
      detectedMaxBudget !== null
        ? detectedMaxBudget
        : normalizeNumber(
            current.maxBudget
          ),

    flowerTypes:
      normalizeStringArray([
        ...normalizeStringArray(
          current.flowerTypes
        ),
        ...normalizeStringArray(
          detected.flowerTypes
        ),
      ]),

    colors:
      normalizeStringArray([
        ...normalizeStringArray(
          current.colors
        ),
        ...normalizeStringArray(
          detected.colors
        ),
      ]),

    styles:
      normalizeStringArray([
        ...normalizeStringArray(
          current.styles
        ),
        ...normalizeStringArray(
          detected.styles
        ),
      ]),

    theme:
      detected.theme ||
      current.theme ||
      null,

    bouquetSize:
      detected.bouquetSize ||
      current.bouquetSize ||
      null,

    wrapping:
      detected.wrapping ||
      current.wrapping ||
      null,

    specialInstructions:
      normalizeStringArray([
        ...normalizeStringArray(
          current.specialInstructions
        ),
        ...normalizeStringArray(
          detected.specialInstructions
        ),
      ]),
  };
};

/*
 * =========================================================
 * CONVERSATION HISTORY
 * =========================================================
 */

const buildConversationHistory = (
  messages = []
) => {
  return messages
    .filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant"
    )
    .map((message) => {
      let content =
        String(
          message.content || ""
        ).trim();

      if (
        message.messageType ===
        "product_results"
      ) {
        content =
          `${content}\n\n` +
          "[FLOGRAM returned real marketplace product results in this message.]";
      }

      if (
        message.messageType ===
        "generated_image"
      ) {
        content =
          `${content}\n\n` +
          "[FLOGRAM generated a bouquet inspiration image in this message.]";
      }

      if (
        message.metadata
          ?.eventType ===
        "custom_bouquet_proposal_received"
      ) {
        content =
          `${content}\n\n` +
          "[A real FLOGRAM seller proposal was received.]";
      }

      if (
        message.metadata
          ?.eventType ===
        "custom_bouquet_proposal_selected"
      ) {
        content =
          `${content}\n\n` +
          "[The customer selected a real FLOGRAM seller proposal.]";
      }

      return {
        role:
          message.role,

        content,
      };
    })
    .filter(
      (message) =>
        message.content
    );
};

/*
 * =========================================================
 * LINKED CUSTOM BOUQUET REQUEST
 * =========================================================
 */

const getLinkedCustomBouquetRequest =
  async (
    conversationId,
    customerId
  ) => {
    return CustomBouquetRequest.findOne({
      aiConversation:
        conversationId,

      customer:
        customerId,
    })
      .sort({
        createdAt:
          -1,
      })
      .select(
        "_id customer aiConversation status selectedProposal florist quotedPrice createdAt"
      );
  };

/*
 * =========================================================
 * LOAD REAL PROPOSAL CONTEXT
 * =========================================================
 */

const loadProposalContext =
  async (
    conversationId,
    customerId
  ) => {
    const request =
      await getLinkedCustomBouquetRequest(
        conversationId,
        customerId
      );

    if (!request) {
      return {
        request:
          null,

        proposalContext:
          null,
      };
    }

    try {
      const proposalContext =
        await getProposalContextForAi(
          request._id,
          customerId
        );

      return {
        request,
        proposalContext,
      };
    } catch (error) {
      console.error(
        "Unable to load proposal context:",
        error.message
      );

      return {
        request,
        proposalContext:
          null,
      };
    }
  };

/*
 * =========================================================
 * PROPOSAL HELPERS
 * =========================================================
 */

const getAvailableProposalById = (
  proposalContext,
  proposalId
) => {
  if (
    !proposalContext ||
    !proposalId
  ) {
    return null;
  }

  return (
    proposalContext
      .availableProposals
      ?.find(
        (proposal) =>
          String(
            proposal.proposalId
          ) ===
          String(proposalId)
      ) ||
    null
  );
};

const resolveProposalSelection = (
  proposalContext,
  interpretation
) => {
  if (
    !proposalContext ||
    !Array.isArray(
      proposalContext.availableProposals
    )
  ) {
    return null;
  }

  const proposals =
    proposalContext
      .availableProposals;

  /*
   * Exact proposal ID supplied by Grok.
   */

  if (
    interpretation.proposalId
  ) {
    const byId =
      proposals.find(
        (proposal) =>
          String(
            proposal.proposalId
          ) ===
          String(
            interpretation
              .proposalId
          )
      );

    if (byId) {
      return byId;
    }
  }

  /*
   * Proposal number.
   *
   * Example:
   * "proposal 2"
   */

  const proposalNumber =
    Number(
      interpretation
        .proposalNumber
    );

  if (
    Number.isInteger(
      proposalNumber
    ) &&
    proposalNumber > 0
  ) {
    const byNumber =
      proposals.find(
        (proposal) =>
          Number(
            proposal
              .proposalNumber
          ) ===
          proposalNumber
      );

    if (byNumber) {
      return byNumber;
    }
  }

  /*
   * Shop name fallback.
   *
   * Grok may return the exact
   * shop name from the supplied context.
   */

  const selectedShopName =
    String(
      interpretation
        .shopName || ""
    )
      .trim()
      .toLowerCase();

  if (selectedShopName) {
    const matches =
      proposals.filter(
        (proposal) =>
          String(
            proposal.shopName ||
            ""
          )
            .trim()
            .toLowerCase() ===
          selectedShopName
      );

    if (
      matches.length ===
      1
    ) {
      return matches[0];
    }
  }

  return null;
};

const buildProposalPromptContext = (
  proposalContext
) => {
  if (!proposalContext) {
    return {
      customBouquetRequestId:
        null,

      requestStatus:
        null,

      selectedProposalId:
        null,

      canSelectProposal:
        false,

      availableProposals:
        [],
    };
  }

  return {
    customBouquetRequestId:
      proposalContext
        .customBouquetRequestId,

    requestStatus:
      proposalContext
        .requestStatus,

    selectedProposalId:
      proposalContext
        .selectedProposalId,

    canSelectProposal:
      proposalContext
        .canSelectProposal,

    availableProposals:
      (
        proposalContext
          .availableProposals ||
        []
      ).map(
        (proposal) => ({
          proposalId:
            proposal.proposalId,

          proposalNumber:
            proposal.proposalNumber,

          floristId:
            proposal.floristId,

          shopName:
            proposal.shopName,

          quotedPrice:
            proposal.quotedPrice,

          sellerResponse:
            proposal.sellerResponse,

          status:
            proposal.status,
        })
      ),
  };
};

/*
 * =========================================================
 * INTENT INTERPRETER
 * =========================================================
 */

const interpretCustomerMessage =
  async (
    trimmedContent,
    conversationMessages,
    currentPreferences,
    proposalContext = null
  ) => {
    const history =
      buildConversationHistory(
        conversationMessages
      );

    const proposalPromptContext =
      buildProposalPromptContext(
        proposalContext
      );

    const result =
      await generateGrokResponse([
        {
          role:
            "system",

          content: `
You are the intent and bouquet-preference interpreter for the FLOGRAM BloomBoard AI Bouquet Assistant.

Analyze the customer's latest message together with:
- previous conversation
- remembered bouquet preferences
- REAL FLOGRAM seller proposal context supplied by the backend

Return ONLY valid JSON.

Use exactly this structure:

{
  "intent": "conversation",
  "preferences": {
    "occasion": null,
    "minBudget": null,
    "maxBudget": null,
    "flowerTypes": [],
    "colors": [],
    "styles": [],
    "theme": null,
    "bouquetSize": null,
    "wrapping": null,
    "specialInstructions": []
  },
  "proposalId": null,
  "proposalNumber": null,
  "shopName": null
}

Allowed intent values:

- "conversation"
- "product_search"
- "image_generation"
- "proposal_question"
- "select_proposal"

=========================================================
PRODUCT SEARCH
=========================================================

Use "product_search" when the customer wants to:
- find bouquets
- search bouquets
- show bouquets
- recommend bouquets
- browse bouquets
- buy an existing bouquet
- see available bouquet products
- see products that can actually be purchased from FLOGRAM

=========================================================
IMAGE GENERATION
=========================================================

Use "image_generation" only when the customer explicitly asks to:
- generate an image
- create a bouquet image
- make an inspiration image
- visualize a bouquet
- generate a bouquet design
- show what a custom bouquet could look like

=========================================================
PROPOSAL QUESTION
=========================================================

Use "proposal_question" when the customer wants information about REAL seller proposals, including:

- "Which proposal is cheapest?"
- "Which is the lowest price?"
- "Compare the proposals."
- "What is proposal 2 offering?"
- "Which florist has the best price?"
- "What are my offers?"
- "How many proposals do I have?"
- "Tell me about Maria's proposal."

A proposal question does NOT select a proposal.

Questions such as:
- "Which is best?"
- "Which would you recommend?"
- "Which is cheapest?"
- "Should I choose proposal 2?"

must NOT be treated as selection.

They are proposal_question.

=========================================================
SELECT PROPOSAL
=========================================================

Use "select_proposal" ONLY when the customer clearly and explicitly instructs FLOGRAM to choose, select, accept, pick, or proceed with ONE real seller proposal.

Examples:

- "Choose proposal 2."
- "Select proposal 1."
- "I want proposal 3."
- "Accept Maria Flower Shop's proposal."
- "Go with the ₱1,500 proposal."
- "Pick the second offer."
- "Yes, choose proposal 2."

Do NOT select automatically.

Do NOT interpret:
- asking which proposal is best
- asking which is cheapest
- asking for a recommendation
- comparing proposals

as permission to select.

A customer must make an explicit selection.

=========================================================
PROPOSAL SECURITY RULES
=========================================================

The proposal records below come from the FLOGRAM database.

You MUST obey all of these rules:

1. Never invent a proposal.

2. Never invent a proposalId.

3. Never invent a proposal number.

4. Never invent a florist or shop.

5. Never change a quoted price.

6. Never change the seller response.

7. Never claim that a proposal exists unless it appears in REAL PROPOSAL CONTEXT.

8. If intent is "select_proposal", proposalId MUST exactly match one proposalId in REAL PROPOSAL CONTEXT.

9. If the customer's selection is ambiguous, return:
   "intent": "proposal_question"
   and proposalId = null.

10. If there are no proposals, never invent one.

11. If canSelectProposal is false, do not create a new selection.

12. The backend, not you, makes the final authorization decision.

=========================================================
PREFERENCE EXTRACTION
=========================================================

- Extract only preferences actually provided or clearly confirmed.
- Do not invent missing preferences.
- Budget values must be numbers only.
- "under 1500" or "up to 1500" means maxBudget = 1500.
- "at least 1000" means minBudget = 1000.
- Keep flower names concise.
- Keep colors concise.
- Preserve useful design details.
- If the newest message says "show me the best options again",
  use remembered preferences and classify as product_search.
- If it says "generate it" or "make an image of it",
  use remembered preferences and classify as image_generation.

Do not include Markdown.
Do not include explanation outside the JSON.
          `.trim(),
        },

        {
          role:
            "system",

          content:
            `Remembered FLOGRAM bouquet preferences:\n${JSON.stringify(
              currentPreferences ||
              {}
            )}`,
        },

        {
          role:
            "system",

          content:
            `REAL FLOGRAM PROPOSAL CONTEXT:\n${JSON.stringify(
              proposalPromptContext
            )}`,
        },

        ...history,

        {
          role:
            "user",

          content:
            trimmedContent,
        },
      ]);

    const parsed =
      parseGrokJson(
        result.content
      );

    if (!parsed) {
      console.error(
        "Unable to parse Grok intent response:",
        result.content
      );

      return {
        intent:
          "conversation",

        preferences:
          {},

        proposalId:
          null,

        proposalNumber:
          null,

        shopName:
          null,
      };
    }

    const allowedIntents =
      new Set([
        "conversation",
        "product_search",
        "image_generation",
        "proposal_question",
        "select_proposal",
      ]);

    return {
      intent:
        allowedIntents.has(
          parsed.intent
        )
          ? parsed.intent
          : "conversation",

      preferences:
        parsed.preferences &&
        typeof parsed.preferences ===
          "object"
          ? parsed.preferences
          : {},

      proposalId:
        parsed.proposalId
          ? String(
              parsed.proposalId
            )
          : null,

      proposalNumber:
        normalizeNumber(
          parsed.proposalNumber
        ),

      shopName:
        parsed.shopName
          ? String(
              parsed.shopName
            ).trim()
          : null,
    };
  };

/*
 * =========================================================
 * NORMAL CONVERSATION SYSTEM PROMPT
 * =========================================================
 */

const getConversationSystemPrompt =
  (
    preferences,
    proposalContext = null
  ) => {
    const proposalPromptContext =
      buildProposalPromptContext(
        proposalContext
      );

    return `
You are the FLOGRAM BloomBoard AI Bouquet Assistant.

Your role is to help customers explore, plan, design, and customize flower bouquets through natural conversation.

You can help with:

- bouquet ideas
- flower types
- colors
- occasions
- themes
- styles
- budgets
- bouquet sizes
- wrapping styles
- ribbons
- decorations
- customized bouquet requests
- bouquet recommendations
- explaining real seller proposals

Remembered customer bouquet preferences:

${JSON.stringify(
  preferences || {}
)}

REAL FLOGRAM SELLER PROPOSAL CONTEXT:

${JSON.stringify(
  proposalPromptContext
)}

Conversation behavior:

- Be friendly, natural, helpful, and concise.
- Use remembered preferences when relevant.
- Ask useful follow-up questions only when important details are missing.
- Do not repeatedly ask for information already supplied.
- Prices should be written in Philippine pesos.

Important FLOGRAM rules:

1. Never invent FLOGRAM bouquet listings.

2. Never invent florist names, shop names, prices, product availability, delivery availability, or marketplace information.

3. Never invent seller proposals.

4. Never invent proposal IDs.

5. Never alter seller proposal prices or descriptions.

6. Only discuss seller proposals contained in REAL FLOGRAM SELLER PROPOSAL CONTEXT.

7. Never claim the customer selected a proposal unless the backend actually completed the selection.

8. Asking for advice, comparison, cheapest price, or recommendation is NOT permission to select a proposal.

9. A proposal requires an explicit customer selection before checkout.

10. If the customer asks to see real bouquet products, FLOGRAM searches its MongoDB marketplace separately.

11. Do not pretend you searched FLOGRAM unless real marketplace data is provided.

12. When helping create a customized bouquet, consider:
    - occasion
    - budget
    - flowers
    - colors
    - theme
    - style
    - bouquet size
    - wrapping
    - ribbons
    - decorations
    - special instructions

13. If the customer wants an inspiration image, FLOGRAM uses Grok Imagine separately.

14. Do not claim an image has been generated unless FLOGRAM actually provides it.

15. Stay primarily focused on flowers, bouquets, BloomBoard, bouquet customization, real seller proposals, and related florist assistance.

Your goal is to make bouquet planning feel like a natural conversation with an experienced bouquet design assistant.
    `.trim();
  };

/*
 * =========================================================
 * PRODUCT CONTEXT
 * =========================================================
 */

const buildProductContext = (
  flowers = []
) => {
  return flowers.map(
    (flower) => ({
      id:
        String(
          flower._id
        ),

      name:
        flower.name,

      description:
        flower.description,

      price:
        flower.price,

      category:
        flower.category,

      occasion:
        flower.occasion ||
        [],

      flowerTypes:
        flower.flowerTypes ||
        [],

      colors:
        flower.colors ||
        [],

      florist:
        flower.florist
          ? {
              id:
                String(
                  flower.florist
                    ._id
                ),

              shopName:
                flower.florist
                  .shopName,

              address:
                flower.florist
                  .address,
            }
          : null,

      recommendationScore:
        flower.recommendationScore,

      matchedCriteria:
        flower.matchedCriteria ||
        [],
    })
  );
};

/*
 * =========================================================
 * PROPOSAL FALLBACK TEXT
 * =========================================================
 */

const buildProposalFallbackText = (
  proposalContext
) => {
  const proposals =
    proposalContext
      ?.availableProposals ||
    [];

  if (
    proposals.length ===
    0
  ) {
    return "There are no active seller proposals for this custom bouquet request yet. I'll only show you real proposals submitted through FLOGRAM.";
  }

  const sortedByPrice =
    [...proposals].sort(
      (a, b) =>
        Number(
          a.quotedPrice
        ) -
        Number(
          b.quotedPrice
        )
    );

  const cheapest =
    sortedByPrice[0];

  const lines =
    proposals.map(
      (proposal) =>
        `Proposal ${proposal.proposalNumber}: ${proposal.shopName} — ₱${Number(
          proposal.quotedPrice
        ).toLocaleString(
          "en-PH"
        )}. ${proposal.sellerResponse}`
    );

  return (
    `You currently have ${proposals.length} real seller proposal${
      proposals.length === 1
        ? ""
        : "s"
    }.\n\n` +
    `${lines.join(
      "\n\n"
    )}\n\n` +
    `The lowest quoted price is Proposal ${cheapest.proposalNumber} from ${cheapest.shopName} at ₱${Number(
      cheapest.quotedPrice
    ).toLocaleString(
      "en-PH"
    )}.`
  );
};

/*
 * =========================================================
 * CUSTOMER
 * GET OWN AI CONVERSATIONS
 * =========================================================
 */

export const getMyAiConversations =
  async (
    customerId
  ) => {
    return AiConversation.find({
      customer:
        customerId,
    }).sort({
      lastMessageAt:
        -1,
    });
  };

/*
 * =========================================================
 * CUSTOMER
 * GET ONE AI CONVERSATION
 * =========================================================
 *
 * Also returns real proposal context when this
 * conversation is linked to a custom bouquet request.
 * =========================================================
 */

export const getAiConversationById =
  async (
    conversationId,
    customerId
  ) => {
    const conversation =
      await AiConversation.findOne({
        _id:
          conversationId,

        customer:
          customerId,
      });

    if (!conversation) {
      const error =
        new Error(
          "AI conversation was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const messages =
      await AiMessage.find({
        conversation:
          conversationId,
      }).sort({
        createdAt:
          1,
      });

    const {
      request,
      proposalContext,
    } =
      await loadProposalContext(
        conversationId,
        customerId
      );

    return {
      conversation,

      messages,

      customBouquetRequest:
        request,

      proposalContext,
    };
  };

/*
 * =========================================================
 * CUSTOMER
 * SEND AI MESSAGE
 * =========================================================
 */

export const sendAiMessage =
  async (
    conversationId,
    customerId,
    content
  ) => {
    const conversation =
      await AiConversation.findOne({
        _id:
          conversationId,

        customer:
          customerId,

        status:
          "active",
      });

    if (!conversation) {
      const error =
        new Error(
          "Active AI conversation was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const trimmedContent =
      String(
        content || ""
      ).trim();

    if (!trimmedContent) {
      const error =
        new Error(
          "Message content is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * LOAD PREVIOUS MESSAGES
     * =====================================================
     */

    const previousMessages =
      await AiMessage.find({
        conversation:
          conversationId,
      })
        .sort({
          createdAt:
            1,
        })
        .lean();

    /*
     * =====================================================
     * LOAD REAL PROPOSALS
     * =====================================================
     */

    const {
      request:
        linkedRequest,

      proposalContext,
    } =
      await loadProposalContext(
        conversationId,
        customerId
      );

    /*
     * =====================================================
     * INTERPRET CUSTOMER MESSAGE
     * =====================================================
     */

    let interpretation;

    try {
      interpretation =
        await interpretCustomerMessage(
          trimmedContent,
          previousMessages,
          conversation.preferences ||
            {},
          proposalContext
        );
    } catch (error) {
      console.error(
        "Grok interpretation failed:",
        error.message
      );

      interpretation = {
        intent:
          "conversation",

        preferences:
          {},

        proposalId:
          null,

        proposalNumber:
          null,

        shopName:
          null,
      };
    }

    const intent =
      interpretation.intent;

    const mergedPreferences =
      mergePreferences(
        conversation.preferences ||
          {},
        interpretation.preferences ||
          {}
      );

    conversation.preferences =
      mergedPreferences;

    /*
     * =====================================================
     * SAVE CUSTOMER MESSAGE
     * =====================================================
     */

    const userMessage =
      await AiMessage.create({
        conversation:
          conversationId,

        sender:
          customerId,

        role:
          "user",

        messageType:
          "text",

        content:
          trimmedContent,

        metadata: {
          detectedIntent:
            intent,

          customBouquetRequestId:
            linkedRequest
              ? String(
                  linkedRequest._id
                )
              : null,

          detectedProposalId:
            interpretation
              .proposalId,

          detectedProposalNumber:
            interpretation
              .proposalNumber,

          detectedProposalShopName:
            interpretation
              .shopName,
        },
      });

    const conversationMessages =
      [
        ...previousMessages,

        userMessage.toObject(),
      ];

    let assistantMessage;

    /*
     * =====================================================
     * PROPOSAL QUESTION
     * =====================================================
     */

    if (
      intent ===
      "proposal_question"
    ) {
      if (
        !linkedRequest
      ) {
        assistantMessage =
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
              "This AI conversation is not linked to a custom bouquet request yet. Create a custom bouquet request first, and I'll help you review real seller proposals here.",

            metadata: {
              provider:
                "flogram",

              intent:
                "proposal_question",

              eventType:
                "proposal_context_missing",

              availableProposals:
                [],
            },
          });
      } else if (
        !proposalContext ||
        (
          proposalContext
            .availableProposals ||
          []
        ).length ===
          0
      ) {
        assistantMessage =
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
              "There are no seller proposals for this custom bouquet request yet. I'll only compare offers that have actually been submitted through FLOGRAM.",

            metadata: {
              provider:
                "flogram",

              intent:
                "proposal_question",

              eventType:
                "custom_bouquet_proposals_empty",

              customBouquetRequestId:
                String(
                  linkedRequest._id
                ),

              requestStatus:
                linkedRequest.status,

              availableProposals:
                [],
            },
          });
      } else {
        const realProposalContext =
          buildProposalPromptContext(
            proposalContext
          );

        let explanation;

        try {
          const grokResult =
            await generateGrokResponse([
              {
                role:
                  "system",

                content: `
You are the FLOGRAM BloomBoard AI Bouquet Assistant.

The FLOGRAM backend has supplied REAL seller proposals for the customer's custom bouquet request.

Use ONLY these proposal records.

REAL PROPOSALS:

${JSON.stringify(
  realProposalContext
)}

Rules:

- Never invent a proposal.
- Never invent a florist.
- Never invent a shop.
- Never invent or modify a price.
- Never invent or modify a seller response.
- Proposal numbers correspond exactly to the supplied proposalNumber values.
- Proposal IDs must never be exposed unnecessarily to the customer.
- Prices are Philippine pesos.
- You may compare price, seller description, and other supplied proposal information.
- If asked which is cheapest, calculate using quotedPrice.
- If asked which is best, explain that "best" depends on the customer's priorities and compare only supplied facts.
- Do not pretend to know quality, delivery reliability, flower quality, or seller reputation unless that information is explicitly supplied.
- Do NOT select a proposal.
- Do NOT say a proposal was selected.
- Asking for comparison or advice does not authorize a selection.
- Keep the response concise and useful.
                `.trim(),
              },

              {
                role:
                  "user",

                content:
                  trimmedContent,
              },
            ]);

          explanation =
            grokResult.content;
        } catch (error) {
          console.error(
            "Grok proposal comparison failed:",
            error.message
          );

          explanation =
            buildProposalFallbackText(
              proposalContext
            );
        }

        assistantMessage =
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
              explanation,

            metadata: {
              provider:
                "flogram+xai",

              intent:
                "proposal_question",

              eventType:
                "custom_bouquet_proposal_comparison",

              customBouquetRequestId:
                proposalContext
                  .customBouquetRequestId,

              requestStatus:
                proposalContext
                  .requestStatus,

              selectedProposalId:
                proposalContext
                  .selectedProposalId,

              canSelectProposal:
                proposalContext
                  .canSelectProposal,

              availableProposals:
                proposalContext
                  .availableProposals,
            },
          });
      }
    }

    /*
     * =====================================================
     * SELECT REAL PROPOSAL
     * =====================================================
     */

    else if (
      intent ===
      "select_proposal"
    ) {
      /*
       * No linked request.
       */

      if (!linkedRequest) {
        assistantMessage =
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
              "There isn't a custom bouquet request linked to this conversation yet, so there is no seller proposal I can select.",

            metadata: {
              provider:
                "flogram",

              intent:
                "select_proposal",

              selectionCompleted:
                false,

              reason:
                "no_linked_request",
            },
          });
      }

      /*
       * No proposal context.
       */

      else if (
        !proposalContext
      ) {
        assistantMessage =
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
              "I couldn't load the seller proposals for this bouquet request right now. No proposal has been selected.",

            metadata: {
              provider:
                "flogram",

              intent:
                "select_proposal",

              customBouquetRequestId:
                String(
                  linkedRequest._id
                ),

              selectionCompleted:
                false,

              reason:
                "proposal_context_unavailable",
            },
          });
      }

      /*
       * Request already has a selected proposal.
       */

      else if (
        !proposalContext
          .canSelectProposal
      ) {
        const selectedProposal =
          getAvailableProposalById(
            proposalContext,
            proposalContext
              .selectedProposalId
          );

        assistantMessage =
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
              selectedProposal
                ? `You've already selected Proposal ${selectedProposal.proposalNumber} from ${selectedProposal.shopName} for ₱${Number(
                    selectedProposal.quotedPrice
                  ).toLocaleString(
                    "en-PH"
                  )}. You can proceed to checkout.`
                : "This custom bouquet request is already closed and is no longer accepting proposal selections.",

            metadata: {
              provider:
                "flogram",

              intent:
                "select_proposal",

              eventType:
                selectedProposal
                  ? "custom_bouquet_proposal_already_selected"
                  : "custom_bouquet_request_closed",

              customBouquetRequestId:
                proposalContext
                  .customBouquetRequestId,

              requestStatus:
                proposalContext
                  .requestStatus,

              proposalId:
                selectedProposal
                  ?.proposalId ||
                proposalContext
                  .selectedProposalId ||
                null,

              shopName:
                selectedProposal
                  ?.shopName ||
                null,

              quotedPrice:
                selectedProposal
                  ?.quotedPrice ??
                null,

              canProceedToCheckout:
                proposalContext
                  .requestStatus ===
                "customer_accepted",

              selectionCompleted:
                false,
            },
          });
      }

      /*
       * No proposals.
       */

      else if (
        (
          proposalContext
            .availableProposals ||
          []
        ).length ===
        0
      ) {
        assistantMessage =
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
              "There are no active seller proposals to select yet. No proposal has been selected.",

            metadata: {
              provider:
                "flogram",

              intent:
                "select_proposal",

              customBouquetRequestId:
                proposalContext
                  .customBouquetRequestId,

              requestStatus:
                proposalContext
                  .requestStatus,

              selectionCompleted:
                false,

              availableProposals:
                [],
            },
          });
      }

      /*
       * Resolve model interpretation against
       * REAL proposal records.
       */

      else {
        const selectedCandidate =
          resolveProposalSelection(
            proposalContext,
            interpretation
          );

        /*
         * Ambiguous selection.
         */

        if (!selectedCandidate) {
          assistantMessage =
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
                "I want to make sure I select the correct seller offer. Please tell me exactly which proposal you want, for example, “Choose proposal 2.” No proposal has been selected yet.",

              metadata: {
                provider:
                  "flogram",

                intent:
                  "select_proposal",

                eventType:
                  "custom_bouquet_proposal_selection_ambiguous",

                customBouquetRequestId:
                  proposalContext
                    .customBouquetRequestId,

                requestStatus:
                  proposalContext
                    .requestStatus,

                selectionCompleted:
                  false,

                availableProposals:
                  proposalContext
                    .availableProposals,
              },
            });
        }

        /*
         * Real proposal identified.
         *
         * CRITICAL:
         *
         * AI does NOT modify MongoDB directly.
         *
         * We call the proposal service,
         * which validates ownership,
         * request status,
         * proposal membership,
         * florist validity,
         * and performs the atomic request lock.
         */

        else {
          try {
            const selectionResult =
              await selectCustomBouquetProposal(
                proposalContext
                  .customBouquetRequestId,

                selectedCandidate
                  .proposalId,

                customerId,

                trimmedContent
              );

            /*
             * selectCustomBouquetProposal()
             * already creates the official
             * selection confirmation message
             * inside the AI conversation.
             *
             * Retrieve that real message instead
             * of creating a duplicate.
             */

            assistantMessage =
              await AiMessage.findOne({
                conversation:
                  conversationId,

                "metadata.eventType":
                  "custom_bouquet_proposal_selected",

                "metadata.proposalId":
                  String(
                    selectedCandidate
                      .proposalId
                  ),
              }).sort({
                createdAt:
                  -1,
              });

            /*
             * Safety fallback.
             *
             * This should normally not execute
             * because the proposal service
             * creates the selection message.
             */

            if (!assistantMessage) {
              assistantMessage =
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
                    `You've selected Proposal ${selectedCandidate.proposalNumber} from ${selectedCandidate.shopName} for ₱${Number(
                      selectedCandidate
                        .quotedPrice
                    ).toLocaleString(
                      "en-PH"
                    )}. Your request is now locked and you can proceed to checkout.`,

                  metadata: {
                    provider:
                      "flogram",

                    intent:
                      "select_proposal",

                    eventType:
                      "custom_bouquet_proposal_selected",

                    customBouquetRequestId:
                      proposalContext
                        .customBouquetRequestId,

                    proposalId:
                      selectedCandidate
                        .proposalId,

                    proposalNumber:
                      selectedCandidate
                        .proposalNumber,

                    floristId:
                      selectedCandidate
                        .floristId,

                    shopName:
                      selectedCandidate
                        .shopName,

                    quotedPrice:
                      selectedCandidate
                        .quotedPrice,

                    proposalStatus:
                      "selected",

                    requestStatus:
                      "customer_accepted",

                    canProceedToCheckout:
                      true,

                    selectionCompleted:
                      true,
                  },
                });
            }

            /*
             * Ensure checkout metadata is
             * available in the send-message
             * response as well.
             */

            return await finalizeAiResponse({
              conversation,

              conversationId,

              trimmedContent,

              intent,

              mergedPreferences,

              userMessage,

              assistantMessage,

              extra: {
                customBouquetRequestId:
                  proposalContext
                    .customBouquetRequestId,

                selectedProposalId:
                  selectedCandidate
                    .proposalId,

                selectedProposal:
                  selectionResult
                    .selectedProposal,

                request:
                  selectionResult
                    .request,

                canProceedToCheckout:
                  true,
              },
            });
          } catch (error) {
            /*
             * Backend selection is the
             * source of truth.
             *
             * Never pretend selection
             * succeeded after a backend
             * validation failure.
             */

            console.error(
              "Proposal selection failed:",
              error.message
            );

            assistantMessage =
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
                  `I couldn't select that proposal. ${error.message}`,

                metadata: {
                  provider:
                    "flogram",

                  intent:
                    "select_proposal",

                  eventType:
                    "custom_bouquet_proposal_selection_failed",

                  customBouquetRequestId:
                    proposalContext
                      .customBouquetRequestId,

                  proposalId:
                    selectedCandidate
                      .proposalId,

                  selectionCompleted:
                    false,

                  canProceedToCheckout:
                    false,

                  errorMessage:
                    error.message,
                },
              });
          }
        }
      }
    }

    /*
     * =====================================================
     * PRODUCT SEARCH
     * =====================================================
     */

    else if (
      intent ===
      "product_search"
    ) {
      const recommendedFlowers =
        await getRecommendedFlowers(
          mergedPreferences,
          5
        );

      if (
        recommendedFlowers.length ===
        0
      ) {
        assistantMessage =
          await AiMessage.create({
            conversation:
              conversationId,

            sender:
              null,

            role:
              "assistant",

            messageType:
              "product_results",

            content:
              "I couldn't find an available bouquet that matches those preferences right now. You can change the budget, flower type, color, or occasion, or create a custom bouquet inspiration instead.",

            metadata: {
              provider:
                "flogram",

              intent:
                "product_search",

              preferences:
                mergedPreferences,

              flowerIds:
                [],

              products:
                [],
            },
          });
      } else {
        const productContext =
          buildProductContext(
            recommendedFlowers
          );

        let explanation;

        try {
          const grokResult =
            await generateGrokResponse([
              {
                role:
                  "system",

                content: `
You are the FLOGRAM BloomBoard AI Bouquet Assistant.

The FLOGRAM backend has already searched the real marketplace.

You MUST use only the marketplace listings supplied below.

Rules:

- Never invent another product.
- Never invent another florist.
- Never change a supplied price.
- Never claim a product is available unless it is in the supplied list.
- Mention the strongest matches first.
- Respect the customer's remembered preferences.
- If a product exceeds the customer's maximum budget, clearly say so.
- Do not claim that a weaker result perfectly matches when it only matches some criteria.
- Keep the answer natural and concise.
- Prices are in Philippine pesos.
- You may suggest changing preferences if the results are weak.

Customer preferences:

${JSON.stringify(
  mergedPreferences
)}

Real FLOGRAM marketplace results:

${JSON.stringify(
  productContext
)}
                `.trim(),
              },

              {
                role:
                  "user",

                content:
                  trimmedContent,
              },
            ]);

          explanation =
            grokResult.content;
        } catch (error) {
          console.error(
            "Grok product explanation failed:",
            error.message
          );

          const bestFlower =
            recommendedFlowers[0];

          explanation =
            `I found ${recommendedFlowers.length} available bouquet option${
              recommendedFlowers.length ===
              1
                ? ""
                : "s"
            } based on your preferences. ` +
            `The strongest match is "${bestFlower.name}"` +
            `${
              bestFlower.florist
                ?.shopName
                ? ` from ${bestFlower.florist.shopName}`
                : ""
            } for ₱${Number(
              bestFlower.price
            ).toLocaleString(
              "en-PH"
            )}.`;
        }

        assistantMessage =
          await AiMessage.create({
            conversation:
              conversationId,

            sender:
              null,

            role:
              "assistant",

            messageType:
              "product_results",

            content:
              explanation,

            metadata: {
              provider:
                "flogram+xai",

              intent:
                "product_search",

              preferences:
                mergedPreferences,

              flowerIds:
                recommendedFlowers.map(
                  (flower) =>
                    String(
                      flower._id
                    )
                ),

              products:
                recommendedFlowers.map(
                  (flower) => ({
                    _id:
                      flower._id,

                    name:
                      flower.name,

                    description:
                      flower.description,

                    price:
                      flower.price,

                    category:
                      flower.category,

                    occasion:
                      flower.occasion ||
                      [],

                    flowerTypes:
                      flower.flowerTypes ||
                      [],

                    colors:
                      flower.colors ||
                      [],

                    images:
                      flower.images ||
                      [],

                    florist:
                      flower.florist,

                    recommendationScore:
                      flower.recommendationScore,

                    matchedCriteria:
                      flower.matchedCriteria ||
                      [],
                  })
                ),
            },
          });
      }
    }

    /*
     * =====================================================
     * IMAGE GENERATION
     * =====================================================
     */

    else if (
      intent ===
      "image_generation"
    ) {
      const imagePrompt = `
Create a realistic, professional florist bouquet inspiration image for a customer of FLOGRAM.

Customer's latest request:
${trimmedContent}

Remembered bouquet preferences:
${JSON.stringify(
  mergedPreferences
)}

Image requirements:

- Create one complete flower bouquet.
- The bouquet should look realistic and professionally arranged by a florist.
- Follow the customer's requested flowers, colors, occasion, style, wrapping, theme, bouquet size, and special instructions whenever provided.
- Focus clearly on the bouquet.
- Use realistic flowers, foliage, ribbons, wrapping paper, and florist materials.
- Use an elegant professional product-photography presentation.
- Make the bouquet visually useful as inspiration that a customer could later show to a florist.
- Do not include written text.
- Do not include prices.
- Do not include florist names.
- Do not include shop names.
- Do not include logos.
- Do not include watermarks.
- Do not include FLOGRAM branding.
      `.trim();

      try {
        const imageResult =
          await generateGrokImage(
            imagePrompt
          );

        const savedImage =
          await saveRemoteAiImage(
            imageResult.url
          );

        assistantMessage =
          await AiMessage.create({
            conversation:
              conversationId,

            sender:
              null,

            role:
              "assistant",

            messageType:
              "generated_image",

            content:
              "Here is a bouquet inspiration image based on your request.",

            metadata: {
              provider:
                "xai",

              model:
                imageResult.model,

              intent:
                "image_generation",

              imageUrl:
                savedImage.path,

              mimeType:
                savedImage.mimeType,

              imageSize:
                savedImage.size,

              filename:
                savedImage.filename,

              sourceImageUrl:
                imageResult.url,

              revisedPrompt:
                imageResult.revisedPrompt ||
                null,

              originalPrompt:
                trimmedContent,

              preferences:
                mergedPreferences,

              imageGenerated:
                true,

              fileId:
                imageResult.fileId ||
                null,

              persistentUrl:
                imageResult.persistentUrl ||
                null,
            },
          });
      } catch (error) {
        console.error(
          "Grok Imagine unavailable:",
          error.message
        );

        assistantMessage =
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
              "I couldn't generate or save the bouquet image right now. Your bouquet preferences are still saved, so you can try generating the inspiration image again.",

            metadata: {
              provider:
                "flogram-fallback",

              intent:
                "image_generation",

              preferences:
                mergedPreferences,

              imageGenerated:
                false,

              errorMessage:
                error.message,
            },
          });
      }
    }

    /*
     * =====================================================
     * NORMAL CONVERSATION
     * =====================================================
     */

    else {
      const grokMessages = [
        {
          role:
            "system",

          content:
            getConversationSystemPrompt(
              mergedPreferences,
              proposalContext
            ),
        },

        ...buildConversationHistory(
          conversationMessages
        ),
      ];

      try {
        const grokResult =
          await generateGrokResponse(
            grokMessages
          );

        assistantMessage =
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
              grokResult.content,

            metadata: {
              provider:
                "xai",

              model:
                grokResult.model,

              responseId:
                grokResult.responseId ||
                null,

              intent:
                "conversation",

              preferences:
                mergedPreferences,

              customBouquetRequestId:
                linkedRequest
                  ? String(
                      linkedRequest._id
                    )
                  : null,
            },
          });
      } catch (error) {
        console.error(
          "Grok conversation unavailable:",
          error.message
        );

        assistantMessage =
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
              "I'm having trouble reaching the bouquet assistant right now. Your conversation and bouquet preferences are still saved, so you can try again shortly.",

            metadata: {
              provider:
                "flogram-fallback",

              intent:
                "conversation",

              preferences:
                mergedPreferences,
            },
          });
      }
    }

    /*
     * =====================================================
     * FINALIZE
     * =====================================================
     */

    return finalizeAiResponse({
      conversation,

      conversationId,

      trimmedContent,

      intent,

      mergedPreferences,

      userMessage,

      assistantMessage,

      extra: {
        customBouquetRequestId:
          linkedRequest
            ? String(
                linkedRequest._id
              )
            : null,

        proposalContext,
      },
    });
  };

/*
 * =========================================================
 * FINALIZE AI RESPONSE
 * =========================================================
 */

const finalizeAiResponse =
  async ({
    conversation,
    conversationId,
    trimmedContent,
    intent,
    mergedPreferences,
    userMessage,
    assistantMessage,
    extra = {},
  }) => {
    const userMessageCount =
      await AiMessage.countDocuments({
        conversation:
          conversationId,

        role:
          "user",
      });

    if (
      userMessageCount ===
      1
    ) {
      conversation.title =
        trimmedContent.length >
        60
          ? `${trimmedContent.slice(
              0,
              57
            )}...`
          : trimmedContent;
    }

    conversation.lastMessageAt =
      new Date();

    await conversation.save();

    return {
      intent,

      preferences:
        mergedPreferences,

      userMessage,

      assistantMessage,

      ...extra,
    };
  };

/*
 * =========================================================
 * CUSTOMER
 * ARCHIVE AI CONVERSATION
 * =========================================================
 */

export const archiveAiConversation =
  async (
    conversationId,
    customerId
  ) => {
    const conversation =
      await AiConversation.findOne({
        _id:
          conversationId,

        customer:
          customerId,
      });

    if (!conversation) {
      const error =
        new Error(
          "AI conversation was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    conversation.status =
      "archived";

    await conversation.save();

    return conversation;
  };