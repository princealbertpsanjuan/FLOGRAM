import mongoose from "mongoose";

const aiConversationSchema =
  new mongoose.Schema(
    {
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      title: {
        type: String,
        trim: true,
        maxlength: 120,
        default: "New Bouquet Conversation",
      },

      status: {
        type: String,
        enum: [
          "active",
          "archived",
        ],
        default: "active",
      },

      preferences: {
        occasion: {
          type: String,
          default: null,
        },

        minBudget: {
          type: Number,
          default: null,
        },

        maxBudget: {
          type: Number,
          default: null,
        },

        flowerTypes: {
          type: [String],
          default: [],
        },

        colors: {
          type: [String],
          default: [],
        },

        styles: {
          type: [String],
          default: [],
        },

        theme: {
          type: String,
          default: null,
        },

        bouquetSize: {
          type: String,
          default: null,
        },

        wrapping: {
          type: String,
          default: null,
        },

        specialInstructions: {
          type: [String],
          default: [],
        },
      },

      lastMessageAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

aiConversationSchema.index({
  customer: 1,
  lastMessageAt: -1,
});

const AiConversation =
  mongoose.model(
    "AiConversation",
    aiConversationSchema
  );

export default AiConversation;