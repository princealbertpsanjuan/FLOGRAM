import mongoose from "mongoose";

const aiMessageSchema =
  new mongoose.Schema(
    {
      conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AiConversation",
        required: true,
        index: true,
      },

      sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      role: {
        type: String,
        enum: [
          "user",
          "assistant",
        ],
        required: true,
      },

      messageType: {
        type: String,
        enum: [
          "text",
          "product_results",
          "generated_image",
        ],
        default: "text",
      },

      content: {
        type: String,
        trim: true,
        default: "",
      },

      metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

aiMessageSchema.index({
  conversation: 1,
  createdAt: 1,
});

const AiMessage =
  mongoose.model(
    "AiMessage",
    aiMessageSchema
  );

export default AiMessage;