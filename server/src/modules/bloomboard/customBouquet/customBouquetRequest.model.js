import mongoose from "mongoose";

const customBouquetRequestSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * CUSTOMER
       * =====================================================
       */

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

      /*
       * =====================================================
       * WINNING FLORIST
       * =====================================================
       *
       * IMPORTANT:
       *
       * A custom bouquet request is now broadcast
       * to all eligible/approved florists.
       *
       * Therefore, florist is NULL while the
       * request is still accepting proposals.
       *
       * It is filled only after the customer
       * selects one seller proposal.
       * =====================================================
       */

      florist: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Florist",

        default:
          null,

        index:
          true,
      },

      /*
       * =====================================================
       * SELECTED PROPOSAL
       * =====================================================
       *
       * References the winning
       * CustomBouquetProposal.
       *
       * NULL while the request is still open.
       * =====================================================
       */

      selectedProposal: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "CustomBouquetProposal",

        default:
          null,

        index:
          true,
      },

      /*
       * =====================================================
       * AI CONNECTION
       * =====================================================
       *
       * AI-created requests can point to the
       * customer's existing AI conversation
       * and generated-image message.
       *
       * Manual image requests may also later
       * receive an AI conversation so the
       * customer can discuss seller proposals.
       * =====================================================
       */

      aiConversation: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "AiConversation",

        default:
          null,

        index:
          true,
      },

      sourceMessage: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "AiMessage",

        default:
          null,
      },

      /*
       * =====================================================
       * INSPIRATION IMAGE
       * =====================================================
       *
       * Can come from:
       *
       * - manually uploaded reference image
       * - AI-generated bouquet image
       * =====================================================
       */

      inspirationImage: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * =====================================================
       * CUSTOMER REQUEST DETAILS
       * =====================================================
       */

      occasion: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * Customer's preferred / maximum
       * budget.
       *
       * This is NOT the seller's quote.
       */
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

      /*
       * =====================================================
       * OPTIONAL DESIGN PREFERENCES
       * =====================================================
       *
       * These remain supported because AI
       * conversations may automatically provide
       * them.
       *
       * Manual reference-photo requests do not
       * have to require these fields in the UI.
       * =====================================================
       */

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
       * =====================================================
       * REQUEST LIFECYCLE
       * =====================================================
       *
       * NEW FLOW:
       *
       * open
       *   ↓
       * sellers submit proposals
       *   ↓
       * customer selects one proposal
       *   ↓
       * customer_accepted
       *   ↓
       * checkout / order creation
       *   ↓
       * converted_to_order
       *
       * The customer may cancel while the
       * request is still open.
       *
       * -----------------------------------------------------
       * Legacy statuses are temporarily retained
       * in the enum so existing database records
       * from the previous single-florist workflow
       * remain readable during development.
       * -----------------------------------------------------
       */

      status: {
        type:
          String,

        enum: [
          /*
           * New proposal workflow
           */
          "open",
          "customer_accepted",
          "cancelled",
          "converted_to_order",

          /*
           * Legacy workflow
           */
          "pending",
          "accepted",
          "rejected",
          "quoted",
          "customer_declined",
        ],

        default:
          "open",

        index:
          true,
      },

      /*
       * =====================================================
       * WINNING PROPOSAL SNAPSHOT
       * =====================================================
       *
       * These fields stay on the request so
       * existing order/checkout logic can continue
       * reading:
       *
       * request.florist
       * request.quotedPrice
       * request.sellerResponse
       *
       * They remain NULL until a proposal is
       * selected.
       * =====================================================
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

      quotedPrice: {
        type:
          Number,

        default:
          null,

        min:
          0,
      },

      /*
       * =====================================================
       * PROPOSAL SELECTION
       * =====================================================
       */

      proposalSelectedAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * Existing field retained for compatibility.
       *
       * When the customer chooses a proposal,
       * customerDecisionAt can also record the
       * selection time.
       */
      customerDecisionAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * Can store an optional customer note
       * associated with the selection.
       *
       * Example:
       * "I choose Maria's proposal."
       */
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

      /*
       * =====================================================
       * ORDER CONVERSION
       * =====================================================
       *
       * Records when the selected proposal
       * was converted into an actual order.
       * =====================================================
       */

      convertedToOrderAt: {
        type:
          Date,

        default:
          null,
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
 * =========================================================
 * CUSTOMER REQUEST HISTORY
 * =========================================================
 */

customBouquetRequestSchema.index({
  customer: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * OPEN REQUESTS
 * =========================================================
 *
 * Used by sellers when viewing bouquet
 * requests that are still accepting
 * proposals.
 * =========================================================
 */

customBouquetRequestSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * CUSTOMER + STATUS
 * =========================================================
 */

customBouquetRequestSchema.index({
  customer: 1,
  status: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * AI CONVERSATION
 * =========================================================
 *
 * Allows us to efficiently find the custom
 * bouquet request associated with an
 * AI conversation.
 * =========================================================
 */

customBouquetRequestSchema.index({
  aiConversation: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * WINNING FLORIST
 * =========================================================
 *
 * florist is NULL while bidding is open.
 *
 * After selection this makes it easy to
 * locate requests won by a particular shop.
 * =========================================================
 */

customBouquetRequestSchema.index({
  florist: 1,
  status: 1,
  createdAt: -1,
});

const CustomBouquetRequest =
  mongoose.model(
    "CustomBouquetRequest",
    customBouquetRequestSchema
  );

export default CustomBouquetRequest;