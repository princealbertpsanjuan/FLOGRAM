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
       * Snapshot values.
       *
       * These are intentionally stored
       * in the order so later edits to
       * a flower listing do not change
       * old orders.
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

      deliveryFee: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },

      totalAmount: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      /*
       * delivery = rider/delivery flow
       * pickup   = customer collects it
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

      requestedDeliveryDate: {
        type:
          Date,

        default:
          null,
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
       * custom request when applicable.
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
       * ORDER LIFECYCLE
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
       * PAYMENT
       *
       * Payment integration can be
       * attached later without changing
       * the main order structure.
       */
      paymentMethod: {
        type:
          String,

        enum: [
          "cash_on_delivery",
          "cash_on_pickup",
          "gcash",
          "online",
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

orderSchema.index({
  customer:
    1,

  createdAt:
    -1,
});

orderSchema.index({
  florist:
    1,

  orderStatus:
    1,

  createdAt:
    -1,
});

orderSchema.index({
  seller:
    1,

  createdAt:
    -1,
});

const Order =
  mongoose.model(
    "Order",
    orderSchema
  );

export default Order;