import mongoose from "mongoose";

const customBouquetRequestSchema =
  new mongoose.Schema(
    {
      customer: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      florist: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Florist",

        required:
          true,

        index:
          true,
      },

      aiConversation: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "AiConversation",

        default:
          null,
      },

      sourceMessage: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "AiMessage",

        default:
          null,
      },

      inspirationImage: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      occasion: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      budget: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      quantity: {
        type:
          Number,

        default:
          1,

        min:
          1,
      },

      requestedDate: {
        type:
          Date,

        default:
          null,
      },

      flowerTypes: {
        type:
          [String],

        default:
          [],
      },

      colors: {
        type:
          [String],

        default:
          [],
      },

      styles: {
        type:
          [String],

        default:
          [],
      },

      theme: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      bouquetSize: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      wrapping: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      specialInstructions: {
        type:
          [String],

        default:
          [],
      },

      customerMessage: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          2000,
      },

      /*
       * Request lifecycle:
       *
       * pending
       *   ↓
       * accepted / rejected
       *   ↓
       * quoted
       *   ↓
       * customer_accepted
       * or
       * customer_declined
       */
      status: {
        type:
          String,

        enum: [
          "pending",
          "accepted",
          "rejected",
          "quoted",
          "customer_accepted",
          "customer_declined",
          "cancelled",
        ],

        default:
          "pending",

        index:
          true,
      },

      /*
       * SELLER RESPONSE
       */
      sellerResponse: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          2000,
      },

      /*
       * SELLER'S FINAL QUOTE
       */
      quotedPrice: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      /*
       * Last time the seller
       * accepted, rejected, or quoted.
       */
      respondedAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * CUSTOMER QUOTE DECISION
       */
      customerDecisionAt: {
        type:
          Date,

        default:
          null,
      },

      customerDecisionMessage: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          2000,
      },
    },
    {
      timestamps:
        true,

      versionKey:
        false,
    }
  );

/*
 * Customer request history.
 */
customBouquetRequestSchema.index({
  customer:
    1,

  createdAt:
    -1,
});

/*
 * Seller florist inbox.
 */
customBouquetRequestSchema.index({
  florist:
    1,

  status:
    1,

  createdAt:
    -1,
});

const CustomBouquetRequest =
  mongoose.model(
    "CustomBouquetRequest",
    customBouquetRequestSchema
  );

export default CustomBouquetRequest;