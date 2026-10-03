import mongoose from "mongoose";

/*
 * =========================================================
 * RIDER WORK SHIFT MODEL
 * =========================================================
 *
 * This model represents a work shift created by an Admin.
 *
 * A work shift determines WHEN approved Riders are allowed
 * to work and accept new delivery requests.
 *
 * IMPORTANT:
 *
 * - This is NOT the same as Rider.isAvailable.
 *
 *   Rider.isAvailable:
 *     Online  = accepting new delivery requests
 *     Offline = not accepting new delivery requests
 *
 * - This is NOT the same as RiderRemittance.shiftDate.
 *
 *   RiderRemittance.shiftDate is used for grouping
 *   daily COD remittances.
 *
 * - This is NOT the same as Delivery.availableAt.
 *
 *   Delivery.availableAt determines when a particular
 *   delivery request becomes available to Riders.
 *
 * =========================================================
 */


/*
 * =========================================================
 * RIDER SHIFT RESERVATION SUBDOCUMENT
 * =========================================================
 *
 * Riders request/reserve a slot from an Admin-created shift.
 *
 * Status:
 *
 * pending
 *   Rider requested the shift and is waiting for Admin.
 *
 * approved
 *   Admin approved the Rider.
 *   The Rider occupies one slot for the ENTIRE shift.
 *
 * rejected
 *   Admin rejected the Rider's request.
 *
 * Going Offline does NOT remove an approved reservation
 * and does NOT release the Rider's slot.
 * =========================================================
 */

const riderShiftReservationSchema =
  new mongoose.Schema(
    {
      rider: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "Rider",

        required: [
          true,
          "Rider is required.",
        ],
      },

      riderUser: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required: [
          true,
          "Rider user is required.",
        ],
      },

      status: {
        type:
          String,

        enum: [
          "pending",
          "approved",
          "rejected",
        ],

        default:
          "pending",
      },

      requestedAt: {
        type:
          Date,

        default:
          Date.now,
      },

      reviewedAt: {
        type:
          Date,

        default:
          null,
      },

      reviewedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },
    },
    {
      _id: true,
      timestamps: false,
    }
  );


/*
 * =========================================================
 * RIDER SHIFT
 * =========================================================
 */

const riderShiftSchema =
  new mongoose.Schema(
    {
      /*
       * =====================================================
       * SHIFT SCHEDULE
       * =====================================================
       *
       * startAt and endAt store the complete scheduled
       * date and time.
       *
       * Example:
       *
       * startAt:
       *   2026-10-05 08:00 AM
       *
       * endAt:
       *   2026-10-05 01:00 PM
       *
       * =====================================================
       */

      startAt: {
        type:
          Date,

        required: [
          true,
          "Shift start date and time are required.",
        ],
      },

      endAt: {
        type:
          Date,

        required: [
          true,
          "Shift end date and time are required.",
        ],
      },

      /*
       * =====================================================
       * AVAILABLE SLOTS
       * =====================================================
       *
       * slotLimit is the maximum number of Riders that
       * Admin may approve for this shift.
       *
       * Example:
       *
       * slotLimit = 3
       *
       * Once three Rider reservations are approved,
       * the shift has no remaining slots.
       *
       * Pending and rejected requests do NOT occupy slots.
       *
       * Approved Riders keep their slots even if they
       * temporarily switch Offline.
       * =====================================================
       */

      slotLimit: {
        type:
          Number,

        required: [
          true,
          "Shift slot limit is required.",
        ],

        min: [
          1,
          "Shift must have at least one Rider slot.",
        ],
      },

      /*
       * =====================================================
       * SHIFT STATUS
       * =====================================================
       *
       * open:
       *   Riders may request/reserve the shift.
       *
       * closed:
       *   No new Rider requests are accepted.
       *
       * cancelled:
       *   Admin cancelled the shift.
       *
       * The actual scheduled state such as upcoming,
       * active, or ended should be determined using
       * startAt/endAt rather than permanently storing
       * another time-based status.
       * =====================================================
       */

      status: {
        type:
          String,

        enum: [
          "open",
          "closed",
          "cancelled",
        ],

        default:
          "open",
      },

      /*
       * =====================================================
       * RIDER RESERVATIONS
       * =====================================================
       */

      reservations: {
        type: [
          riderShiftReservationSchema,
        ],

        default: [],
      },

      /*
       * =====================================================
       * ADMIN AUDIT INFORMATION
       * =====================================================
       */

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required: [
          true,
          "Admin who created the shift is required.",
        ],
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        default:
          null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );


/*
 * =========================================================
 * VALIDATE SHIFT SCHEDULE
 * =========================================================
 *
 * The shift must end after it starts.
 * =========================================================
 */

riderShiftSchema.pre(
  "validate",
  // Mongoose 9 no longer passes next() to pre middleware.
  function validateShiftSchedule() {
    if (
      this.startAt &&
      this.endAt &&
      this.endAt <=
        this.startAt
    ) {
      this.invalidate(
        "endAt",
        "Shift end date and time must be after the shift start date and time."
      );
    }
  }
);


/*
 * =========================================================
 * INDEXES
 * =========================================================
 *
 * These indexes support:
 *
 * - finding upcoming shifts
 * - finding active shifts
 * - Admin shift management
 * =========================================================
 */

riderShiftSchema.index({
  startAt: 1,
  endAt: 1,
});

riderShiftSchema.index({
  status: 1,
  startAt: 1,
});


/*
 * =========================================================
 * MODEL
 * =========================================================
 */

const RiderShift =
  mongoose.model(
    "RiderShift",
    riderShiftSchema
  );

export default RiderShift;