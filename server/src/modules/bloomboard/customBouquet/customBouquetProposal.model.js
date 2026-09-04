import mongoose from "mongoose";

const customBouquetProposalSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * CUSTOM BOUQUET REQUEST
       * =====================================================
       *
       * Every proposal belongs to exactly
       * one CustomBouquetRequest.
       * =====================================================
       */

      request: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "CustomBouquetRequest",

        required:
          true,

        index:
          true,
      },

      /*
       * =====================================================
       * FLORIST
       * =====================================================
       *
       * The florist/shop submitting
       * this proposal.
       * =====================================================
       */

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

      /*
       * =====================================================
       * SELLER
       * =====================================================
       *
       * User account that owns the florist
       * and submitted the proposal.
       * =====================================================
       */

      seller: {
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
       * SELLER QUOTED PRICE
       * =====================================================
       */

      quotedPrice: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      /*
       * =====================================================
       * SELLER RESPONSE
       * =====================================================
       *
       * Description of what the florist
       * proposes to create.
       * =====================================================
       */

      sellerResponse: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          2000,
      },

      /*
       * =====================================================
       * OPTIONAL SELLER PROPOSAL IMAGE
       * =====================================================
       *
       * Can later be used if the seller
       * wants to attach their own proposed
       * bouquet design or mockup.
       *
       * It is NOT required for the initial
       * proposal workflow.
       * =====================================================
       */

      proposalImage: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * =====================================================
       * PROPOSAL STATUS
       * =====================================================
       *
       * submitted
       *    ↓
       * selected
       *
       * OR
       *
       * submitted
       *    ↓
       * not_selected
       *
       * OR
       *
       * submitted
       *    ↓
       * withdrawn
       * =====================================================
       */

      status: {
        type:
          String,

        enum: [
          "submitted",
          "selected",
          "not_selected",
          "withdrawn",
        ],

        default:
          "submitted",

        index:
          true,
      },

      /*
       * =====================================================
       * SELECTION TIME
       * =====================================================
       */

      selectedAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * =====================================================
       * WITHDRAWAL TIME
       * =====================================================
       */

      withdrawnAt: {
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
 * ONE PROPOSAL PER FLORIST PER REQUEST
 * =========================================================
 *
 * This prevents one florist from sending
 * multiple proposals to the same request.
 *
 * Example:
 *
 * Request A + Florist 1
 *
 * First proposal  -> allowed
 * Second proposal -> rejected by MongoDB
 * =========================================================
 */

customBouquetProposalSchema.index(
  {
    request:
      1,

    florist:
      1,
  },
  {
    unique:
      true,
  }
);

/*
 * =========================================================
 * REQUEST PROPOSAL LIST
 * =========================================================
 *
 * Used when the customer / AI conversation
 * loads all proposals for one request.
 * =========================================================
 */

customBouquetProposalSchema.index({
  request:
    1,

  status:
    1,

  createdAt:
    -1,
});

/*
 * =========================================================
 * SELLER PROPOSAL HISTORY
 * =========================================================
 */

customBouquetProposalSchema.index({
  seller:
    1,

  createdAt:
    -1,
});

/*
 * =========================================================
 * FLORIST PROPOSAL HISTORY
 * =========================================================
 */

customBouquetProposalSchema.index({
  florist:
    1,

  createdAt:
    -1,
});

const CustomBouquetProposal =
  mongoose.model(
    "CustomBouquetProposal",
    customBouquetProposalSchema
  );

export default CustomBouquetProposal;