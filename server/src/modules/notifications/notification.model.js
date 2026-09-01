import mongoose from "mongoose";

/*
 * =========================================================
 * NOTIFICATION MODEL
 * =========================================================
 *
 * Shared notification model for FLOGRAM.
 *
 * Can be used by:
 *
 * - customer
 * - seller
 * - rider
 * - admin
 *
 * Notifications belong to a USER account.
 * =========================================================
 */

const notificationSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * RECIPIENT
       * =====================================================
       */

      recipient: {
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
       * RECIPIENT ROLE
       * =====================================================
       *
       * Stored so notifications may easily be filtered
       * according to the user's FLOGRAM role.
       */

      role: {
        type:
          String,

        enum: [
          "customer",
          "seller",
          "rider",
          "admin",
        ],

        required:
          true,

        index:
          true,
      },

      /*
       * =====================================================
       * NOTIFICATION TYPE
       * =====================================================
       *
       * Shared notification types used throughout FLOGRAM.
       */

      type: {
        type:
          String,

        enum: [
          /*
           * =================================================
           * DELIVERY
           * =================================================
           */

          /*
           * A delivery request is now available.
           *
           * Mainly intended for Rider delivery-request
           * notifications.
           */
          "delivery_available",

          /*
           * Rider successfully accepted a delivery.
           */
          "delivery_accepted",

          /*
           * Order is ready for delivery / pickup.
           */
          "delivery_ready",

          /*
           * Reminder for an accepted delivery that still
           * needs to be picked up from the florist.
           */
          "delivery_pickup_reminder",

          /*
           * Rider successfully picked up the bouquet.
           */
          "delivery_picked_up",

          /*
           * Rider started travelling toward the customer.
           */
          "delivery_out_for_delivery",

          /*
           * Delivery was successfully completed.
           */
          "delivery_completed",

          /*
           * Delivery was cancelled.
           */
          "delivery_cancelled",

          /*
           * =================================================
           * REMITTANCE
           * =================================================
           */

          /*
           * Rider submitted the daily COD remittance.
           */
          "remittance_submitted",

          /*
           * Admin verified the Rider's COD remittance.
           */
          "remittance_verified",

          /*
           * Admin rejected the Rider's COD remittance.
           */
          "remittance_rejected",

          /*
           * =================================================
           * ORDER
           * =================================================
           */

          "order_created",
          "order_updated",
          "order_cancelled",

          /*
           * =================================================
           * ACCOUNT / VERIFICATION
           * =================================================
           */

          "verification_approved",
          "verification_rejected",

          /*
           * =================================================
           * FUTURE REVIEW / RATING
           * =================================================
           *
           * This type may remain unused until the real
           * Review/Rating module is implemented.
           */

          "rating_received",

          /*
           * =================================================
           * GENERAL
           * =================================================
           */

          "system",
          "announcement",
        ],

        required:
          true,

        index:
          true,
      },

      /*
       * =====================================================
       * CONTENT
       * =====================================================
       */

      title: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      message: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          500,
      },

      /*
       * =====================================================
       * READ STATUS
       * =====================================================
       */

      isRead: {
        type:
          Boolean,

        default:
          false,

        index:
          true,
      },

      readAt: {
        type:
          Date,

        default:
          null,
      },

      /*
       * =====================================================
       * RELATED RECORDS
       * =====================================================
       *
       * Optional references used by the frontend when the
       * user taps a notification.
       */

      delivery: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Delivery",

        default:
          null,
      },

      order: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Order",

        default:
          null,
      },

      remittance: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "RiderRemittance",

        default:
          null,
      },

      /*
       * =====================================================
       * OPTIONAL METADATA
       * =====================================================
       *
       * Additional information that does not require its own
       * database field.
       *
       * Examples:
       *
       * {
       *   screen: "delivery"
       * }
       *
       * {
       *   screen: "wallet",
       *   amount: 4522
       * }
       */

      metadata: {
        type:
          mongoose.Schema.Types.Mixed,

        default: () => ({}),
      },
    },
    {
      timestamps:
        true,
    }
  );

/*
 * =========================================================
 * INDEXES
 * =========================================================
 */

/*
 * Fast notification list:
 *
 * newest notifications for one user
 */

notificationSchema.index({
  recipient:
    1,

  createdAt:
    -1,
});

/*
 * Fast unread notification lookup.
 */

notificationSchema.index({
  recipient:
    1,

  isRead:
    1,

  createdAt:
    -1,
});

/*
 * Useful when filtering notifications
 * by recipient role and type.
 */

notificationSchema.index({
  recipient:
    1,

  role:
    1,

  type:
    1,

  createdAt:
    -1,
});

/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const Notification =
  mongoose.model(
    "Notification",
    notificationSchema
  );

export default Notification;