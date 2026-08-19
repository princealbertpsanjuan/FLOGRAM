import mongoose from "mongoose";

const deliverySchema =
  new mongoose.Schema(
    {
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

      customer: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      seller: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      florist: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Florist",

        required:
          true,
      },

      /*
       * Rider is intentionally nullable.
       *
       * A delivery request is first
       * created as "available".
       *
       * The first eligible rider who
       * accepts it becomes the assigned
       * rider.
       */
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

      pickupAddress: {
        street: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        barangay: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        city: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        province: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        postalCode: {
          type:
            String,

          default:
            "",

          trim:
            true,
        },
      },

      deliveryAddress: {
        street: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        barangay: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        city: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        province: {
          type:
            String,

          required:
            true,

          trim:
            true,
        },

        postalCode: {
          type:
            String,

          default:
            "",

          trim:
            true,
        },

        landmark: {
          type:
            String,

          default:
            "",

          trim:
            true,
        },
      },

      recipientName: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      recipientPhoneNumber: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      /*
       * =====================================================
       * DELIVERY LIFECYCLE
       * =====================================================
       *
       * available
       *   = visible to eligible riders
       *
       * accepted
       *   = claimed by one rider
       *
       * picked_up
       *   = bouquet collected
       *
       * out_for_delivery
       *   = rider travelling to customer
       *
       * delivered
       *   = completed delivery
       *
       * cancelled
       *   = delivery request cancelled
       */
      status: {
        type:
          String,

        enum: [
          "available",
          "accepted",
          "picked_up",
          "out_for_delivery",
          "delivered",
          "cancelled",
        ],

        default:
          "available",

        index:
          true,
      },

      /*
       * When the delivery request became
       * visible to riders.
       */
      availableAt: {
        type:
          Date,

        default:
          Date.now,
      },

      /*
       * Kept for compatibility with the
       * previous seller-assignment flow.
       *
       * For self-accepted requests this
       * can be set at the same time as
       * acceptedAt.
       */
      assignedAt: {
        type:
          Date,

        default:
          null,
      },

      acceptedAt: {
        type:
          Date,

        default:
          null,
      },

      pickedUpAt: {
        type:
          Date,

        default:
          null,
      },

      outForDeliveryAt: {
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

      cancelledAt: {
        type:
          Date,

        default:
          null,
      },

      riderNotes: {
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
 * Rider delivery history / active work.
 */
deliverySchema.index({
  rider:
    1,

  status:
    1,

  createdAt:
    -1,
});

/*
 * Customer delivery history.
 */
deliverySchema.index({
  customer:
    1,

  createdAt:
    -1,
});

/*
 * Available delivery requests.
 *
 * Useful when riders request:
 *
 * GET /deliveries/available
 */
deliverySchema.index({
  status:
    1,

  createdAt:
    1,
});

/*
 * Seller / florist delivery requests.
 */
deliverySchema.index({
  florist:
    1,

  status:
    1,

  createdAt:
    -1,
});

const Delivery =
  mongoose.model(
    "Delivery",
    deliverySchema
  );

export default Delivery;