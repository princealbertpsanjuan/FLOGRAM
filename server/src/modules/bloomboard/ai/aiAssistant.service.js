import AiConversation from "./aiConversation.model.js";
import AiMessage from "./aiMessage.model.js";
import User from "../../auth/auth.model.js";

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

const normalizeNumber = (
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

const cleanJsonText = (
  text
) => {
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

const parseGrokJson = (
  text
) => {
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

const buildConversationHistory = (
  messages = []
) => {
  return messages
    .filter(
      (message) =>
        message.role === "user" ||
        message.role ===
          "assistant"
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

const interpretCustomerMessage =
  async (
    trimmedContent,
    conversationMessages,
    currentPreferences
  ) => {
    const history =
      buildConversationHistory(
        conversationMessages
      );

    const result =
      await generateGrokResponse([
        {
          role: "system",

          content: `
You are the intent and bouquet-preference interpreter for the FLOGRAM BloomBoard AI Bouquet Assistant.

Analyze the customer's latest message together with the previous conversation and remembered preferences.

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
  }
}

Allowed intent values:

- "conversation"
- "product_search"
- "image_generation"

Intent rules:

1. Use "product_search" when the customer wants to:
   - find
   - search
   - show
   - recommend
   - browse
   - buy
   - see available bouquets
   - see products that can actually be purchased from FLOGRAM

2. Use "image_generation" when the customer explicitly asks to:
   - generate an image
   - create a bouquet image
   - make an inspiration image
   - visualize a bouquet
   - generate a bouquet design
   - show what a custom bouquet could look like as a generated design

3. Use "conversation" for normal bouquet planning, questions, advice, preference gathering, and general discussion.

Preference extraction rules:

- Extract only preferences that the customer has actually provided or clearly confirmed.
- Do not invent missing preferences.
- Budget values must be numbers only.
- "under 1500", "up to 1500", and similar phrases mean maxBudget = 1500.
- "at least 1000" means minBudget = 1000.
- Keep flower names concise, for example "Rose", "Sunflower", "Tulip", "Lily".
- Keep colors concise, for example "Red", "Pink", "White", "Yellow".
- Preserve useful design details in styles, theme, bouquetSize, wrapping, or specialInstructions.
- If the newest message says "show me the best options again", use the remembered preferences and classify it as product_search.
- If the newest message says "generate it", "make an image of it", or similar wording, use the remembered bouquet preferences and classify it as image_generation.

Do not include Markdown.
Do not include an explanation outside the JSON.
          `.trim(),
        },

        {
          role: "system",

          content:
            `Remembered FLOGRAM bouquet preferences:\n${JSON.stringify(
              currentPreferences ||
                {}
            )}`,
        },

        ...history,

        {
          role: "user",

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
      };
    }

    const allowedIntents =
      new Set([
        "conversation",
        "product_search",
        "image_generation",
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
    };
  };

const getConversationSystemPrompt =
  (
    preferences
  ) => {
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

Remembered customer bouquet preferences:

${JSON.stringify(
  preferences || {}
)}

Conversation behavior:

- Be friendly, natural, helpful, and concise.
- Use the remembered preferences when relevant.
- Ask useful follow-up questions only when important details are still missing.
- Do not repeatedly ask for information already supplied by the customer.
- Prices should be written in Philippine pesos when discussing the customer's stated budget.

Important FLOGRAM rules:

1. Never invent FLOGRAM bouquet listings.

2. Never invent florist names, shop names, prices, product availability, delivery availability, or marketplace information.

3. If the customer asks to see real bouquets they can purchase, FLOGRAM will search its MongoDB marketplace separately.

4. Do not pretend you searched FLOGRAM unless real marketplace data is provided by the backend.

5. When helping create a customized bouquet, consider:
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

6. If the customer wants an inspiration image, FLOGRAM uses Grok Imagine separately.

7. Do not claim an image has been generated unless FLOGRAM actually provides the generated image result.

8. Stay primarily focused on flowers, bouquets, BloomBoard, bouquet customization, and related florist assistance.

Your goal is to make bouquet planning feel like a natural conversation with an experienced bouquet design assistant.
    `.trim();
  };

const buildProductContext = (
  flowers = []
) => {
  return flowers.map(
    (flower) => ({
      id:
        String(flower._id),

      name:
        flower.name,

      description:
        flower.description,

      price:
        flower.price,

      category:
        flower.category,

      occasion:
        flower.occasion || [],

      flowerTypes:
        flower.flowerTypes ||
        [],

      colors:
        flower.colors || [],

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

export const createAiConversation =
  async (
    customerId
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
          "Only customer accounts can use the BloomBoard AI Bouquet Assistant."
        );

      error.statusCode = 403;

      throw error;
    }

    const conversation =
      await AiConversation.create({
        customer:
          customerId,

        title:
          "New Bouquet Conversation",

        status:
          "active",

        preferences: {
          occasion:
            null,

          minBudget:
            null,

          maxBudget:
            null,

          flowerTypes:
            [],

          colors:
            [],

          styles:
            [],

          theme:
            null,

          bouquetSize:
            null,

          wrapping:
            null,

          specialInstructions:
            [],
        },

        lastMessageAt:
          new Date(),
      });

    return conversation;
  };

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

      error.statusCode = 404;

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

    return {
      conversation,
      messages,
    };
  };

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

      error.statusCode = 404;

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

      error.statusCode = 400;

      throw error;
    }

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

    let interpretation;

    try {
      interpretation =
        await interpretCustomerMessage(
          trimmedContent,
          previousMessages,
          conversation.preferences ||
            {}
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
        },
      });

    const conversationMessages =
      [
        ...previousMessages,

        userMessage.toObject(),
      ];

    let assistantMessage;

    /*
     * PRODUCT SEARCH
     */
    if (
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
     * IMAGE GENERATION
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

        /*
         * Save xAI image permanently
         * inside FLOGRAM.
         */
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

              /*
               * Permanent FLOGRAM path.
               */
              imageUrl:
                savedImage.path,

              mimeType:
                savedImage.mimeType,

              imageSize:
                savedImage.size,

              filename:
                savedImage.filename,

              /*
               * Temporary source URL
               * returned by xAI.
               */
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
     * NORMAL CONVERSATION
     */
    else {
      const grokMessages = [
        {
          role:
            "system",

          content:
            getConversationSystemPrompt(
              mergedPreferences
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
    };
  };

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

      error.statusCode = 404;

      throw error;
    }

    conversation.status =
      "archived";

    await conversation.save();

    return conversation;
  };