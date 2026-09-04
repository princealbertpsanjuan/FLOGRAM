import mongoose from "mongoose";

/*
 * =========================================================
 * CHECKOUT ITEM SNAPSHOT
 * =========================================================
 *
 * One cart product becomes one Order document.
 *
 * The Checkout groups those separate orders into one
 * customer-facing transaction.
 * =========================================================
 */

const checkoutItemSchema =
  new mongoose.Schema(
    {
      cartItem: {
        type:
          mongoose.Schema.Types.ObjectId,

        default:
          null,
      },

      flower: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Flower",

        required: true,
      },

      seller: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      florist: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Florist",

        required: true,
      },

      order: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Order",

        default:
          null,
      },

      productName: {
        type: String,

        required: true,

        trim: true,
      },

      inspirationImage: {
        type: String,

        default: null,
      },

      quantity: {
        type: Number,

        required: true,

        min: 1,
      },

      unitPrice: {
        type: Number,

        required: true,

        min: 0,
      },

      subtotal: {
        type: Number,

        required: true,

        min: 0,
      },

      deliveryFee: {
        type: Number,

        required: true,

        default: 0,

        min: 0,
      },

      preOrderFee: {
        type: Number,

        required: true,

        default: 0,

        min: 0,
      },

      totalAmount: {
        type: Number,

        required: true,

        min: 0,
      },

      deliveryDistanceMeters: {
        type: Number,

        default: null,

        min: 0,
      },

      deliveryDurationSeconds: {
        type: Number,

        default: null,

        min: 0,
      },
    },
    {
      _id: true,
    }
  );

/*
 * =========================================================
 * SHOP BREAKDOWN
 * =========================================================
 */

const shopBreakdownSchema =
  new mongoose.Schema(
    {
      florist: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Florist",

        required: true,
      },

      shopName: {
        type: String,

        required: true,

        trim: true,
      },

      itemCount: {
        type: Number,

        required: true,

        min: 1,
      },

      totalQuantity: {
        type: Number,

        required: true,

        min: 1,
      },

      productsSubtotal: {
        type: Number,

        required: true,

        min: 0,
      },

      deliveryFee: {
        type: Number,

        required: true,

        min: 0,

        default: 0,
      },

      preOrderFee: {
        type: Number,

        required: true,

        min: 0,

        default: 0,
      },

      totalAmount: {
        type: Number,

        required: true,

        min: 0,
      },

      orders: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "Order",
        },
      ],
    },
    {
      _id: false,
    }
  );

/*
 * =========================================================
 * ADDRESS
 * =========================================================
 */

const checkoutAddressSchema =
  new mongoose.Schema(
    {
      street: {
        type: String,

        trim: true,

        default: "",
      },

      barangay: {
        type: String,

        trim: true,

        default: "",
      },

      city: {
        type: String,

        trim: true,

        default: "",
      },

      province: {
        type: String,

        trim: true,

        default: "",
      },

      postalCode: {
        type: String,

        trim: true,

        default: "",
      },

      landmark: {
        type: String,

        trim: true,

        default: "",
      },
    },
    {
      _id: false,
    }
  );

/*
 * =========================================================
 * LOCATION
 * =========================================================
 */

const checkoutLocationSchema =
  new mongoose.Schema(
    {
      latitude: {
        type: Number,

        default: null,
      },

      longitude: {
        type: Number,

        default: null,
      },
    },
    {
      _id: false,
    }
  );

/*
 * =========================================================
 * CHECKOUT
 * =========================================================
 */

const checkoutSchema =
  new mongoose.Schema(
    {
      customer: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        index: true,
      },

      /*
       * ===============================================
       * ITEMS + ORDERS
       * ===============================================
       */

      items: {
        type: [checkoutItemSchema],

        required: true,

        default: [],
      },

      orders: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "Order",
        },
      ],

      shopBreakdown: {
        type: [shopBreakdownSchema],

        default: [],
      },

      /*
       * ===============================================
       * FULFILLMENT
       * ===============================================
       */

      fulfillmentType: {
        type: String,

        enum: [
          "delivery",
          "pickup",
        ],

        required: true,
      },

      recipientName: {
        type: String,

        required: true,

        trim: true,
      },

      recipientPhoneNumber: {
        type: String,

        required: true,

        trim: true,
      },

      deliveryAddress: {
        type: checkoutAddressSchema,

        default: () => ({}),
      },

      deliveryLocation: {
        type: checkoutLocationSchema,

        default: () => ({
          latitude: null,

          longitude: null,
        }),
      },

      /*
       * ===============================================
       * SCHEDULE
       * ===============================================
       */

      isPreOrder: {
        type: Boolean,

        default: false,
      },

      requestedDeliveryDate: {
        type: Date,

        default: null,
      },

      requestedDeliveryTimeStart: {
        type: String,

        default: null,
      },

      requestedDeliveryTimeEnd: {
        type: String,

        default: null,
      },

      customerNotes: {
        type: String,

        trim: true,

        default: null,

        maxlength: 2000,
      },

      /*
       * ===============================================
       * PRICE SNAPSHOT
       * ===============================================
       */

      productsSubtotal: {
        type: Number,

        required: true,

        min: 0,
      },

      deliveryFee: {
        type: Number,

        required: true,

        min: 0,

        default: 0,
      },

      preOrderFee: {
        type: Number,

        required: true,

        min: 0,

        default: 0,
      },

      totalAmount: {
        type: Number,

        required: true,

        min: 0,
      },

      /*
       * ===============================================
       * PAYMENT
       * ===============================================
       */

      paymentMethod: {
        type: String,

        enum: [
          "cash_on_delivery",
          "cash_on_pickup",
          "paymongo",
        ],

        required: true,
      },

      paymentProvider: {
        type: String,

        enum: [
          "paymongo",
          null,
        ],

        default: null,
      },

      paymentStatus: {
        type: String,

        enum: [
          "unpaid",
          "pending",
          "paid",
          "failed",
          "refunded",
        ],

        default: "unpaid",

        index: true,
      },

      paymongoCheckoutSessionId: {
        type: String,

        default: null,

        index: true,
      },

      paymongoPaymentId: {
        type: String,

        default: null,
      },

      paymentCheckoutUrl: {
        type: String,

        default: null,
      },

      paymentInitiatedAt: {
        type: Date,

        default: null,
      },

      paidAt: {
        type: Date,

        default: null,
      },

      paymentFailedAt: {
        type: Date,

        default: null,
      },

      lastPaymentEventId: {
        type: String,

        default: null,
      },

      /*
       * ===============================================
       * CHECKOUT STATE
       * ===============================================
       */

      checkoutStatus: {
        type: String,

        enum: [
          "created",
          "payment_pending",
          "paid",
          "completed",
          "cancelled",
          "failed",
        ],

        default: "created",

        index: true,
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

checkoutSchema.index({
  customer: 1,

  createdAt: -1,
});

checkoutSchema.index({
  "orders": 1,
});

checkoutSchema.index({
  "items.flower": 1,
});

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const Checkout =
  mongoose.models.Checkout ||
  mongoose.model(
    "Checkout",
    checkoutSchema
  );

export default Checkout;