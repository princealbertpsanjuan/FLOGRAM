import mongoose from "mongoose";

/*
 * =========================================================
 * RIDER PAYOUT ITEM
 * =========================================================
 *
 * Each item represents one successfully completed delivery
 * whose delivery fee is being paid to the Rider.
 *
 * The amount is the Order.deliveryFee for that delivery.
 *
 * IMPORTANT:
 *
 * This is NOT the COD order amount.
 *
 * COD remittance:
 * Rider -> FLOGRAM
 *
 * Rider payout:
 * FLOGRAM -> Rider
 * =========================================================
 */

const riderPayoutItemSchema = new mongoose.Schema(
  {
    delivery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Delivery",
      required: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    /*
     * Snapshot of the delivery fee earned by the Rider.
     *
     * This value must come from Order.deliveryFee
     * when the payout is created.
     *
     * Do not trust a client-supplied amount.
     */
    deliveryFee: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
     * Delivery completion timestamp.
     *
     * Stored as a snapshot so the payout record clearly
     * shows when the earning was generated.
     */
    deliveredAt: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  }
);

/*
 * =========================================================
 * RIDER PAYOUT
 * =========================================================
 *
 * Represents one payment from FLOGRAM/Admin to a Rider.
 *
 * A payout contains the delivery fees earned from eligible
 * completed deliveries included in the payout period.
 *
 * Payment itself happens externally, such as through
 * a bank transfer.
 *
 * FLOGRAM only records:
 *
 * - payout period
 * - included deliveries
 * - total delivery fees
 * - payment status
 * - transfer/reference number
 * - proof of payment
 * - Admin who recorded the payment
 * =========================================================
 */

const riderPayoutSchema = new mongoose.Schema(
  {
    /*
     * =====================================================
     * RIDER
     * =====================================================
     */

    rider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rider",
      required: true,
      index: true,
    },

    riderUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /*
     * =====================================================
     * PAYOUT PERIOD
     * =====================================================
     *
     * The service layer determines the actual payout
     * period and which completed deliveries belong to it.
     *
     * These values are stored so payout history remains
     * auditable even after the period has passed.
     */

    periodStart: {
      type: Date,
      required: true,
      index: true,
    },

    periodEnd: {
      type: Date,
      required: true,
      index: true,
    },

    /*
     * =====================================================
     * INCLUDED DELIVERY-FEE EARNINGS
     * =====================================================
     */

    items: {
      type: [riderPayoutItemSchema],
      default: [],
    },

    /*
     * =====================================================
     * TOTAL RIDER EARNINGS PAID
     * =====================================================
     *
     * Sum of all item.deliveryFee values.
     *
     * The backend calculates this value.
     * Do not trust a client-supplied total.
     */

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    /*
     * =====================================================
     * PAYOUT STATUS
     * =====================================================
     *
     * pending
     *   Payout record has been prepared but payment has
     *   not yet been recorded by Admin.
     *
     * paid
     *   Admin completed the external payment and recorded
     *   its reference/proof in FLOGRAM.
     *
     * cancelled
     *   Payout was cancelled before being paid.
     *
     * A paid payout must not be changed back to pending.
     */

    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
      index: true,
    },

    /*
     * =====================================================
     * ADMIN PAYMENT RECORD
     * =====================================================
     *
     * Payment is performed outside FLOGRAM.
     *
     * These fields only record the completed external
     * transfer.
     */

    paymentMethod: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100,
    },

    referenceNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    proofImageUrl: {
      type: String,
      trim: true,
      default: null,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    adminRemarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    /*
     * =====================================================
     * CANCELLATION
     * =====================================================
     */

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000,
    },

    /*
     * =====================================================
     * CREATION AUDIT
     * =====================================================
     */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

/*
 * Rider payout history.
 */

riderPayoutSchema.index({
  rider: 1,
  createdAt: -1,
});

/*
 * Rider payout-period lookup.
 */

riderPayoutSchema.index({
  rider: 1,
  periodStart: 1,
  periodEnd: 1,
});

/*
 * Admin payout management.
 */

riderPayoutSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * Rider user lookup.
 */

riderPayoutSchema.index({
  riderUser: 1,
  createdAt: -1,
});

/*
 * =========================================================
 * VALIDATION
 * =========================================================
 */

riderPayoutSchema.pre("validate", function () {
  /*
   * -----------------------------------------------------
   * VALIDATE PAYOUT PERIOD
   * -----------------------------------------------------
   */

  if (
    this.periodStart &&
    this.periodEnd &&
    this.periodEnd < this.periodStart
  ) {
    throw new Error(
      "Payout period end cannot be earlier than the payout period start."
    );
  }

  /*
   * -----------------------------------------------------
   * PREVENT DUPLICATES INSIDE ONE PAYOUT
   * -----------------------------------------------------
   */

  const deliveryIds = this.items.map((item) =>
    String(item.delivery)
  );

  const uniqueDeliveryIds = new Set(deliveryIds);

  if (
    deliveryIds.length !==
    uniqueDeliveryIds.size
  ) {
    throw new Error(
      "A delivery cannot appear more than once in the same Rider payout."
    );
  }

  const orderIds = this.items.map((item) =>
    String(item.order)
  );

  const uniqueOrderIds = new Set(orderIds);

  if (
    orderIds.length !==
    uniqueOrderIds.size
  ) {
    throw new Error(
      "An order cannot appear more than once in the same Rider payout."
    );
  }

  /*
   * -----------------------------------------------------
   * CALCULATE TOTAL
   * -----------------------------------------------------
   *
   * Never trust totalAmount supplied by the client.
   *
   * The service layer must first obtain each deliveryFee
   * from its corresponding Order. This hook then calculates
   * the final payout total from those stored snapshots.
   */

  this.totalAmount = this.items.reduce(
    (total, item) => {
      const deliveryFee = Number(
        item.deliveryFee || 0
      );

      if (
        !Number.isFinite(deliveryFee) ||
        deliveryFee < 0
      ) {
        return total;
      }

      return total + deliveryFee;
    },
    0
  );

  /*
   * -----------------------------------------------------
   * PAID STATUS REQUIREMENTS
   * -----------------------------------------------------
   */

  if (this.status === "paid") {
    if (!this.paidAt) {
      throw new Error(
        "A paid Rider payout must have a payment date."
      );
    }

    if (!this.paidBy) {
      throw new Error(
        "A paid Rider payout must identify the Admin who recorded the payment."
      );
    }

    if (
      !String(this.referenceNumber || "").trim()
    ) {
      throw new Error(
        "A paid Rider payout must have a payment reference number."
      );
    }

    if (
      !String(this.proofImageUrl || "").trim()
    ) {
      throw new Error(
        "A paid Rider payout must have proof of payment."
      );
    }
  }

  /*
   * -----------------------------------------------------
   * CANCELLED STATUS REQUIREMENTS
   * -----------------------------------------------------
   */

  if (this.status === "cancelled") {
    if (!this.cancelledAt) {
      throw new Error(
        "A cancelled Rider payout must have a cancellation date."
      );
    }

    if (!this.cancelledBy) {
      throw new Error(
        "A cancelled Rider payout must identify the Admin who cancelled it."
      );
    }

    if (
      !String(
        this.cancellationReason || ""
      ).trim()
    ) {
      throw new Error(
        "A cancelled Rider payout must have a cancellation reason."
      );
    }
  }
});

/*
 * =========================================================
 * PROTECT PAID PAYOUT RECORDS
 * =========================================================
 *
 * Once a payout has been marked as paid, its included
 * deliveries, Rider, payout period, and total must remain
 * historical records.
 *
 * Additional enforcement will also be performed in the
 * service layer when Admin records the payment.
 */

riderPayoutSchema.pre("save", function () {
  if (
    !this.isNew &&
    this.isModified("status") &&
    this.$locals?.previousStatus === "paid"
  ) {
    throw new Error(
      "A paid Rider payout cannot be reopened."
    );
  }
});

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const RiderPayout = mongoose.model(
  "RiderPayout",
  riderPayoutSchema
);

export default RiderPayout;