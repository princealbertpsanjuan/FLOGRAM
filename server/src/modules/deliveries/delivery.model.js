import mongoose from "mongoose";

const deliverySchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * RELATIONSHIPS
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
       * Delivery starts as available.
       * The first eligible rider who
       * accepts becomes the assigned rider.
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

      /*
       * =====================================================
       * PICKUP ADDRESS
       * =====================================================
       */

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

      /*
       * =====================================================
       * DELIVERY ADDRESS
       * =====================================================
       */

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

      /*
       * =====================================================
       * DELIVERY TRACKING LOCATIONS
       * =====================================================
       *
       * pickupLocation
       *   = florist/shop coordinates
       *
       * deliveryLocation
       *   = customer coordinates
       *
       * riderLocation
       *   = rider's latest GPS position
       *
       * These coordinates will be used
       * for:
       *
       * - Rider navigation
       * - OpenRouteService routing
       * - Customer live tracking
       * - Seller delivery monitoring
       * =====================================================
       */

      pickupLocation: {
        latitude: {
          type:
            Number,

          required:
            true,

          min:
            -90,

          max:
            90,
        },

        longitude: {
          type:
            Number,

          required:
            true,

          min:
            -180,

          max:
            180,
        },
      },

      deliveryLocation: {
        latitude: {
          type:
            Number,

          required:
            true,

          min:
            -90,

          max:
            90,
        },

        longitude: {
          type:
            Number,

          required:
            true,

          min:
            -180,

          max:
            180,
        },
      },

      /*
       * =====================================================
       * RIDER LIVE LOCATION
       * =====================================================
       *
       * Updated by the assigned rider's
       * device during an active delivery.
       *
       * We only keep the latest location
       * here instead of storing an
       * unlimited GPS history.
       * =====================================================
       */

      riderLocation: {
        latitude: {
          type:
            Number,

          default:
            null,

          min:
            -90,

          max:
            90,
        },

        longitude: {
          type:
            Number,

          default:
            null,

          min:
            -180,

          max:
            180,
        },

        /*
         * GPS accuracy in meters.
         */
        accuracy: {
          type:
            Number,

          default:
            null,

          min:
            0,
        },

        /*
         * Last GPS update received from
         * the rider application.
         */
        updatedAt: {
          type:
            Date,

          default:
            null,
        },
      },

      /*
       * =====================================================
       * CURRENT NAVIGATION INFORMATION
       * =====================================================
       *
       * accepted:
       * rider -> florist
       *
       * picked_up / out_for_delivery:
       * rider -> customer
       *
       * Route geometry itself does not
       * need to be permanently stored.
       * It can be generated through the
       * routing service when requested.
       * =====================================================
       */

      navigation: {
        destinationType: {
          type:
            String,

          enum: [
            "pickup",
            "delivery",
          ],

          default:
            null,
        },

        distanceMeters: {
          type:
            Number,

          default:
            null,

          min:
            0,
        },

        durationSeconds: {
          type:
            Number,

          default:
            null,

          min:
            0,
        },

        estimatedArrivalAt: {
          type:
            Date,

          default:
            null,
        },

        updatedAt: {
          type:
            Date,

          default:
            null,
        },
      },

      /*
       * =====================================================
       * RECIPIENT
       * =====================================================
       */

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
       * =====================================================
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
       * =====================================================
       * SCHEDULED RIDER AVAILABILITY
       * =====================================================
       *
       * For normal orders this can be
       * the time the delivery request
       * was created.
       *
       * For pre-orders this may be a
       * future time calculated from the
       * requested delivery schedule.
       *
       * Example:
       *
       * Delivery = 4:00 PM
       * Rider lead = 60 minutes
       * availableAt = 3:00 PM
       * =====================================================
       */

      availableAt: {
        type:
          Date,

        default:
          Date.now,

        index:
          true,
      },

      /*
       * =====================================================
       * DELIVERY TIMESTAMPS
       * =====================================================
       */

      /*
       * Kept for compatibility with the
       * previous seller-assignment flow.
       *
       * For rider self-assignment this
       * can be set together with
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

      /*
       * =====================================================
       * RIDER NOTES
       * =====================================================
       */

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
 * =========================================================
 * INDEXES
 * =========================================================
 */

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
 * Available delivery marketplace.
 *
 * availableAt is included because
 * scheduled deliveries should only
 * appear once their availability
 * time has been reached.
 */
deliverySchema.index({
  status:
    1,

  availableAt:
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

/*
 * Rider user lookup.
 *
 * Useful when checking deliveries
 * through the authenticated User ID.
 */
deliverySchema.index({
  riderUser:
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