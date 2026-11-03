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

      /*
       * TAG + RATE A SHOP
       *
       * A customer can tag the florist shop that made the
       * bouquet in the photo and rate it 1-5 stars. A
       * rating needs a delivered/completed order from that
       * shop ("Verified buyer"), so shops cannot be rated by
       * people who never bought from them.
       */
      taggedFlorist: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Florist",
        default: null,
        index: true,
      },

      shopRating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },

      verifiedOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },

      /*
       * AFINN sentiment of the caption when a shop is
       * tagged (feeds the shop's review insights).
       */
      sentiment: {
        label: { type: String, enum: ["positive", "neutral", "negative", null], default: null },
        score: { type: Number, default: null },
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

// One rating per customer per shop (they can still post untagged/unrated)
bloomboardPostSchema.index(
  { author: 1, taggedFlorist: 1 },
  { unique: true, partialFilterExpression: { shopRating: { $type: "number" }, isActive: true } }
);

const BloomboardPost =
  mongoose.model(
    "BloomboardPost",
    bloomboardPostSchema
  );

export default BloomboardPost;