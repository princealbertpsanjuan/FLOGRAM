import mongoose from "mongoose";

const orderSchema =
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
       * Order source:
       *
       * flower_listing
       * = normal marketplace product
       *
       * custom_bouquet
       * = AI/custom bouquet request
       */
      sourceType: {
        type:
          String,

        enum: [
          "flower_listing",
          "custom_bouquet",
        ],

        required:
          true,
      },

      flower: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Flower",

        default:
          null,
      },

      customBouquetRequest: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "CustomBouquetRequest",

        default:
          null,
      },

      /*
       * Product snapshot.
       */
      productName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          200,
      },

      productDescription: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          3000,
      },

      inspirationImage: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      unitPrice: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      quantity: {
        type:
          Number,

        required:
          true,

        min:
          1,

        default:
          1,
      },

      subtotal: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

/*
 * Calculated by backend based on
 * route distance.
 */
deliveryFee: {
  type: Number,

  default: 0,

  min: 0,
},

/*
 * Additional fee charged for
 * scheduled / pre-order purchases.
 *
 * Normal order = 0
 * Pre-order = calculated by backend
 */
preOrderFee: {
  type: Number,

  default: 0,

  min: 0,
},

totalAmount: {
  type: Number,

  required: true,

  min: 0,
},

      /*
       * delivery = rider delivery
       * pickup = customer pickup
       */
      fulfillmentType: {
        type:
          String,

        enum: [
          "delivery",
          "pickup",
        ],

        default:
          "delivery",
      },

      /*
       * =====================================================
       * DELIVERY ADDRESS
       * =====================================================
       */
      deliveryAddress: {
        street: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },

        barangay: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },

        city: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },

        province: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },

        postalCode: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },

        landmark: {
          type:
            String,

          default:
            null,

          trim:
            true,
        },
      },

      /*
       * =====================================================
       * CUSTOMER DELIVERY LOCATION
       * =====================================================
       *
       * Exact map point selected by
       * customer.
       */
      deliveryLocation: {
        latitude: {
          type:
            Number,

          min:
            -90,

          max:
            90,

          default:
            null,
        },

        longitude: {
          type:
            Number,

          min:
            -180,

          max:
            180,

          default:
            null,
        },
      },

      /*
       * =====================================================
       * FLORIST PICKUP LOCATION SNAPSHOT
       * =====================================================
       *
       * Copied from florist location
       * when the order is created.
       */
      pickupLocation: {
        latitude: {
          type:
            Number,

          min:
            -90,

          max:
            90,

          default:
            null,
        },

        longitude: {
          type:
            Number,

          min:
            -180,

          max:
            180,

          default:
            null,
        },
      },

      /*
       * =====================================================
       * ROUTE SNAPSHOT
       * =====================================================
       */
      deliveryDistanceMeters: {
        type:
          Number,

        min:
          0,

        default:
          null,
      },

      deliveryDurationSeconds: {
        type:
          Number,

        min:
          0,

        default:
          null,
      },

      recipientName: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          150,
      },

      recipientPhoneNumber: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * =====================================================
       * PRE-ORDER / SCHEDULED DELIVERY
       * =====================================================
       */
      requestedDeliveryDate: {
        type:
          Date,

        default:
          null,
      },

      isPreOrder: {
        type:
          Boolean,

        default:
          false,
      },

      requestedDeliveryTimeStart: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      requestedDeliveryTimeEnd: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      customerNotes: {
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
       * Bouquet details copied from
       * custom bouquet request.
       */
      occasion: {
        type:
          String,

        default:
          null,

        trim:
          true,
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

      /*
       * =====================================================
       * ORDER LIFECYCLE
       * =====================================================
       */
      orderStatus: {
        type:
          String,

        enum: [
          "pending",
          "confirmed",
          "preparing",
          "ready_for_pickup",
          "ready_for_delivery",
          "out_for_delivery",
          "delivered",
          "completed",
          "cancelled",
        ],

        default:
          "pending",

        index:
          true,
      },

      /*
       * =====================================================
       * PAYMENT
       * =====================================================
       */
      paymentMethod: {
        type:
          String,

        enum: [
          "cash_on_delivery",
          "cash_on_pickup",
          "paymongo",
          null,
        ],

        default:
          null,
      },

      paymentStatus: {
        type:
          String,

        enum: [
          "unpaid",
          "pending",
          "paid",
          "failed",
          "refunded",
        ],

        default:
          "unpaid",

        index:
          true,
      },

      paymentProvider: {
        type:
          String,

        enum: [
          "paymongo",
          null,
        ],

        default:
          null,
      },

      paymentChannel: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      paymongoCheckoutSessionId: {
        type:
          String,

        default:
          null,

        trim:
          true,

        index:
          true,
      },

      paymongoPaymentIntentId: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      paymongoPaymentId: {
        type:
          String,

        default:
          null,

        trim:
          true,

        index:
          true,
      },

      paymentCheckoutUrl: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      paymentInitiatedAt: {
        type:
          Date,

        default:
          null,
      },

      paidAt: {
        type:
          Date,

        default:
          null,
      },

      paymentFailedAt: {
        type:
          Date,

        default:
          null,
      },

      refundedAt: {
        type:
          Date,

        default:
          null,
      },

      lastPaymentEventId: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      /*
       * =====================================================
       * SELLER / ORDER TIMESTAMPS
       * =====================================================
       */
      sellerNotes: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          2000,
      },

      confirmedAt: {
        type:
          Date,

        default:
          null,
      },

      preparingAt: {
        type:
          Date,

        default:
          null,
      },

      readyAt: {
        type:
          Date,

        default:
          null,
      },

      deliveredAt: {
        type:
          Date,

        default:
          null,
      },

      completedAt: {
        type:
          Date,

        default:
          null,
      },

      cancelledAt: {
        type:
          Date,

        default:
          null,
      },

      cancellationReason: {
        type:
          String,

        default:
          null,

        trim:
          true,

        maxlength:
          1000,
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
 * Customer order history.
 */
orderSchema.index({
  customer:
    1,

  createdAt:
    -1,
});

/*
 * Seller shop order management.
 */
orderSchema.index({
  florist:
    1,

  orderStatus:
    1,

  createdAt:
    -1,
});

/*
 * Seller order history.
 */
orderSchema.index({
  seller:
    1,

  createdAt:
    -1,
});

/*
 * Payment lookup.
 */
orderSchema.index({
  paymentProvider:
    1,

  paymentStatus:
    1,

  createdAt:
    -1,
});

/*
 * Scheduled / pre-order lookup.
 */
orderSchema.index({
  isPreOrder:
    1,

  requestedDeliveryDate:
    1,

  orderStatus:
    1,
});

const Order =
  mongoose.model(
    "Order",
    orderSchema
  );

export default Order;