import mongoose from "mongoose";

const bloomboardCommentSchema =
  new mongoose.Schema(
    {
      post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BloomboardPost",
        required: true,
        index: true,
      },

      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      isActive: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

bloomboardCommentSchema.index({
  post: 1,
  createdAt: 1,
});

const BloomboardComment =
  mongoose.model(
    "BloomboardComment",
    bloomboardCommentSchema
  );

export default BloomboardComment;