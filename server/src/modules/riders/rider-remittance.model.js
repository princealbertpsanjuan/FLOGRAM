import mongoose from "mongoose";

/*
 * =========================================================
 * RIDER REMITTANCE ITEM
 * =========================================================
 *
 * Each item represents one COD delivery
 * included in the Rider's shift remittance.
 *
 * Example:
 *
 * Delivery A -> Order A -> ₱1,349
 * Delivery B -> Order B -> ₱1,423
 * Delivery C -> Order C -> ₱1,750
 *
 * All items are grouped into one
 * RiderRemittance document.
 * =========================================================
 */

const riderRemittanceItemSchema =
  new mongoose.Schema(
    {
      delivery: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Delivery",

        required: true,
      },

      order: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Order",

        required: true,
      },

      amount: {
        type: Number,

        required: true,

        min: 0,
      },
    },
    {
      _id: false,
    }
  );

/*
 * =========================================================
 * RIDER REMITTANCE
 * =========================================================
 *
 * ONE Rider
 * +
 * ONE shift date
 * =
 * ONE remittance
 *
 * The remittance may contain multiple
 * COD deliveries completed during
 * the Rider's shift.
 * =========================================================
 */

const riderRemittanceSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * RIDER
       * =====================================================
       */

      rider: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Rider",

        required: true,

        index: true,
      },

      riderUser: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      /*
       * =====================================================
       * SHIFT DATE
       * =====================================================
       *
       * Represents the Rider's daily shift.
       *
       * Store the normalized Philippine
       * calendar date for the shift.
       *
       * Example:
       *
       * 2026-09-01T00:00:00.000Z
       *
       * The service layer will determine
       * the correct Philippine-day grouping.
       * =====================================================
       */

      shiftDate: {
        type: Date,

        required: true,

        index: true,
      },

      /*
       * =====================================================
       * INCLUDED COD DELIVERIES
       * =====================================================
       */

      items: {
        type: [
          riderRemittanceItemSchema,
        ],

        default: [],
      },

      /*
       * =====================================================
       * TOTAL AMOUNT
       * =====================================================
       *
       * Sum of all item amounts.
       *
       * This is the total COD cash that
       * the Rider must remit for the shift.
       * =====================================================
       */

      totalAmount: {
        type: Number,

        required: true,

        min: 0,

        default: 0,
      },

      /*
       * =====================================================
       * STATUS
       * =====================================================
       *
       * pending
       * Rider has COD cash that still
       * needs to be remitted.
       *
       * submitted
       * Rider submitted reference number
       * and proof. Waiting for Admin.
       *
       * verified
       * Admin confirmed the remittance.
       *
       * rejected
       * Admin rejected the submission.
       * Rider may correct and resubmit.
       * =====================================================
       */

      status: {
        type: String,

        enum: [
          "pending",
          "submitted",
          "verified",
          "rejected",
        ],

        default:
          "pending",

        index: true,
      },

      /*
       * =====================================================
       * RIDER SUBMISSION
       * =====================================================
       */

      referenceNumber: {
        type: String,

        trim: true,

        default: "",
      },

      proofImageUrl: {
        type: String,

        trim: true,

        default: null,
      },

      riderRemarks: {
        type: String,

        trim: true,

        default: "",
      },

      submittedAt: {
        type: Date,

        default: null,
      },

      /*
       * =====================================================
       * ADMIN VERIFICATION
       * =====================================================
       */

      verifiedAt: {
        type: Date,

        default: null,
      },

      verifiedBy: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      adminRemarks: {
        type: String,

        trim: true,

        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

/*
 * One Rider can only have one remittance
 * document for one shift date.
 *
 * Example:
 *
 * Pedro + Sept 1
 * =
 * one remittance
 */

riderRemittanceSchema.index(
  {
    rider: 1,
    shiftDate: 1,
  },
  {
    unique: true,
  }
);

/*
 * Prevent the same Delivery from being
 * included in more than one remittance
 * for the same Rider.
 *
 * MongoDB creates a multikey index for
 * items.delivery.
 */

riderRemittanceSchema.index(
  {
    rider: 1,
    "items.delivery": 1,
  }
);

/*
 * Helpful for Admin screens such as:
 *
 * submitted remittances
 * pending remittances
 * verified history
 */

riderRemittanceSchema.index({
  status: 1,
  submittedAt: -1,
});

/*
 * Helpful for Rider remittance history.
 */

riderRemittanceSchema.index({
  rider: 1,
  shiftDate: -1,
});

/*
 * =========================================================
 * VALIDATION
 * =========================================================
 */

riderRemittanceSchema.pre(
  "validate",
  function () {
    /*
     * -----------------------------------------------------
     * REMOVE DUPLICATE DELIVERIES
     * -----------------------------------------------------
     */

    const deliveryIds =
      this.items.map(
        (item) =>
          String(
            item.delivery
          )
      );

    const uniqueDeliveryIds =
      new Set(
        deliveryIds
      );

    if (
      deliveryIds.length !==
      uniqueDeliveryIds.size
    ) {
      throw new Error(
        "A delivery cannot appear more than once in the same Rider remittance."
      );
    }

    /*
     * -----------------------------------------------------
     * CALCULATE TOTAL
     * -----------------------------------------------------
     *
     * Backend calculates the value from
     * the included COD order amounts.
     *
     * Do not trust a client-supplied total.
     */

    this.totalAmount =
      this.items.reduce(
        (
          total,
          item
        ) => {
          const amount =
            Number(
              item.amount ||
                0
            );

          if (
            !Number.isFinite(
              amount
            ) ||
            amount < 0
          ) {
            return total;
          }

          return (
            total +
            amount
          );
        },
        0
      );
  }
);

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const RiderRemittance =
  mongoose.model(
    "RiderRemittance",
    riderRemittanceSchema
  );

export default RiderRemittance;