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

      rider: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Rider",

        required:
          true,

        index:
          true,
      },

      riderUser: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

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

      status: {
        type:
          String,

        enum: [
          "assigned",
          "accepted",
          "picked_up",
          "out_for_delivery",
          "delivered",
          "cancelled",
        ],

        default:
          "assigned",

        index:
          true,
      },

      assignedAt: {
        type:
          Date,

        default:
          Date.now,
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

deliverySchema.index({
  rider:
    1,

  status:
    1,

  createdAt:
    -1,
});

deliverySchema.index({
  customer:
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