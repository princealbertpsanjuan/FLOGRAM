import mongoose from "mongoose";

const bloomboardPostSchema =
  new mongoose.Schema(
    {
      author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      authorRole: {
        type: String,
        enum: [
          "customer",
          "seller",
        ],
        required: true,
      },

      florist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Florist",
        default: null,
      },

      caption: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
      },

      images: {
        type: [String],
        default: [],
      },

      postType: {
        type: String,
        enum: [
          "general",
          "bouquet_inspiration",
        ],
        default: "general",
      },

      likes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

      saves: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

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

bloomboardPostSchema.index({
  createdAt: -1,
});

const BloomboardPost =
  mongoose.model(
    "BloomboardPost",
    bloomboardPostSchema
  );

export default BloomboardPost;