import mongoose from "mongoose";

/*
 * =========================================================
 * REVIEW MODEL
 * =========================================================
 *
 * One Review belongs to one completed Order.
 *
 * A review evaluates the complete FLOGRAM transaction:
 *
 * - Overall customer experience
 * - Order / bouquet quality
 * - Seller / florist performance
 * - Rider / delivery performance
 * - FLOGRAM system experience
 *
 * IMPORTANT:
 *
 * The relationship fields are snapshots of the participants
 * involved in the completed transaction.
 *
 * The frontend must NOT decide which seller, florist,
 * rider, or delivery belongs to the review.
 *
 * review.service.js resolves those relationships from the
 * actual Order and Delivery records.
 * =========================================================
 */

const reviewSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * TRANSACTION
       * =====================================================
       */

      order: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Order",

        required:
          true,

        unique:
          true,

        index:
          true,
      },

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
       * SELLER / FLORIST
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
       * DELIVERY / RIDER
       * =====================================================
       *
       * These are nullable because pickup orders do not
       * involve a delivery or rider.
       */

      delivery: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Delivery",

        default:
          null,

        index:
          true,
      },

      rider: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Rider",

        default:
          null,

        index:
          true,
      },

      riderUser: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,

        index:
          true,
      },

      /*
       * =====================================================
       * RATINGS
       * =====================================================
       *
       * All ratings use a 1 - 5 scale.
       *
       * riderRating is nullable for pickup orders or
       * transactions without an assigned Rider.
       */

      overallRating: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          5,
      },

      orderRating: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          5,
      },

      sellerRating: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          5,
      },

      riderRating: {
        type:
          Number,

        default:
          null,

        min:
          1,

        max:
          5,
      },

      systemRating: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          5,
      },

      /*
       * =====================================================
       * WRITTEN FEEDBACK
       * =====================================================
       */

      comment: {
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
 * =========================================================
 * INDEXES
 * =========================================================
 */

/*
 * Customer review history.
 */

reviewSchema.index({
  customer:
    1,

  createdAt:
    -1,
});

/*
 * Seller performance reports.
 */

reviewSchema.index({
  seller:
    1,

  createdAt:
    -1,
});

/*
 * Florist performance reports.
 */

reviewSchema.index({
  florist:
    1,

  createdAt:
    -1,
});

/*
 * Rider performance reports.
 */

reviewSchema.index({
  riderUser:
    1,

  createdAt:
    -1,
});

/*
 * System-rating analytics.
 */

reviewSchema.index({
  systemRating:
    1,

  createdAt:
    -1,
});

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const Review =
  mongoose.model(
    "Review",
    reviewSchema
  );

export default Review;