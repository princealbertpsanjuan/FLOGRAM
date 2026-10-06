import RiderShift from "./rider-shift.model.js";
import Rider from "./rider.model.js";
import RiderRemittance from "./rider-remittance.model.js";
import Delivery from "../deliveries/delivery.model.js";
import { notifyAdmins, notifyAllRiders, notifySafely } from "../notifications/notify-helpers.js";

/*
 * =========================================================
 * UNREMITTED COD
 * =========================================================
 *
 * Cash collected on delivered COD orders that is not yet in
 * a submitted or verified remittance. A Rider with unremitted
 * COD cannot reserve another shift.
 */
export const getUnremittedCod = async (riderUserId) => {
  const deliveries = await Delivery.find({ riderUser: riderUserId, status: "delivered" })
    .select("order")
    .populate("order", "paymentMethod totalAmount")
    .lean();

  const codDeliveries = deliveries.filter((delivery) => delivery.order?.paymentMethod === "cash_on_delivery");

  if (!codDeliveries.length) {
    return { count: 0, amount: 0 };
  }

  const remitted = await RiderRemittance.find({
    riderUser: riderUserId,
    status: { $in: ["submitted", "verified"] },
  })
    .select("items.order")
    .lean();

  const remittedOrders = new Set(remitted.flatMap((entry) => (entry.items || []).map((item) => String(item.order))));

  const outstanding = codDeliveries.filter((delivery) => !remittedOrders.has(String(delivery.order._id)));

  return {
    count: outstanding.length,
    amount: outstanding.reduce((sum, delivery) => sum + Number(delivery.order.totalAmount || 0), 0),
  };
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const createError = (
  message,
  statusCode = 400
) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const toDate = (
  value,
  fieldName
) => {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createError(
      `${fieldName} must be a valid date and time.`
    );
  }

  return date;
};

const normalizeId = (
  value
) => {
  if (!value) {
    return "";
  }

  if (
    typeof value === "object" &&
    value._id
  ) {
    return String(
      value._id
    );
  }

  return String(value);
};

const getApprovedReservationCount = (
  shift
) =>
  (
    shift?.reservations || []
  ).filter(
    (reservation) =>
      reservation.status ===
      "approved"
  ).length;

/*
 * MongoDB expression: number of approved reservations
 * is still below the shift's slot limit. Used inside
 * atomic updates so concurrent requests cannot overfill
 * a shift.
 */
const approvedCountBelowLimitExpr = {
  $lt: [
    {
      $size: {
        $filter: {
          input: {
            $ifNull: [
              "$reservations",
              [],
            ],
          },
          as: "reservation",
          cond: {
            $eq: [
              "$$reservation.status",
              "approved",
            ],
          },
        },
      },
    },
    "$slotLimit",
  ],
};

const getRemainingSlots = (
  shift
) =>
  Math.max(
    0,
    Number(
      shift?.slotLimit || 0
    ) -
      getApprovedReservationCount(
        shift
      )
  );

const getTimeStatus = (
  shift,
  now = new Date()
) => {
  const startAt =
    new Date(
      shift.startAt
    );

  const endAt =
    new Date(
      shift.endAt
    );

  if (
    now < startAt
  ) {
    return "upcoming";
  }

  if (
    now >= startAt &&
    now < endAt
  ) {
    return "active";
  }

  return "ended";
};

const findRiderReservation = (
  shift,
  riderId
) => {
  if (!riderId) {
    return null;
  }

  return (
    (
      shift?.reservations ||
      []
    ).find(
      (reservation) =>
        normalizeId(
          reservation.rider
        ) ===
        normalizeId(
          riderId
        )
    ) || null
  );
};

const formatShift = (
  shift,
  riderId = null
) => {
  if (!shift) {
    return null;
  }

  const source =
    typeof shift.toObject ===
    "function"
      ? shift.toObject()
      : shift;

  const approvedCount =
    getApprovedReservationCount(
      source
    );

  const remainingSlots =
    getRemainingSlots(
      source
    );

  const myReservation =
    riderId
      ? findRiderReservation(
          source,
          riderId
        )
      : null;

  return {
    ...source,

    approvedCount,

    remainingSlots,

    timeStatus:
      getTimeStatus(
        source
      ),

    myReservation,
  };
};


/*
 * =========================================================
 * GET VERIFIED RIDER
 * =========================================================
 */

const getVerifiedRiderByUserId =
  async (userId) => {
    const rider =
      await Rider.findOne({
        owner: userId,
      });

    if (!rider) {
      throw createError(
        "Rider profile not found.",
        404
      );
    }

    if (
      rider.verificationStatus !==
      "approved"
    ) {
      throw createError(
        "Your Rider account must be approved before using work shifts.",
        403
      );
    }

    if (
      rider.isActive !== true
    ) {
      throw createError(
        "Your Rider account is not active.",
        403
      );
    }

    return rider;
  };


/*
 * =========================================================
 * ADMIN — CREATE RIDER SHIFT
 * =========================================================
 */

export const createRiderShift =
  async (
    shiftData,
    adminUserId
  ) => {
    if (!adminUserId) {
      throw createError(
        "Admin user is required.",
        401
      );
    }

    const startAt =
      toDate(
        shiftData?.startAt,
        "Shift start"
      );

    const endAt =
      toDate(
        shiftData?.endAt,
        "Shift end"
      );

    if (
      endAt <= startAt
    ) {
      throw createError(
        "Shift end date and time must be after the shift start date and time."
      );
    }

    const slotLimit =
      Number(
        shiftData?.slotLimit
      );

    if (
      !Number.isInteger(
        slotLimit
      ) ||
      slotLimit < 1
    ) {
      throw createError(
        "Shift slot limit must be a whole number greater than zero."
      );
    }

    const shift =
      await RiderShift.create({
        startAt,
        endAt,
        slotLimit,

        status:
          "open",

        reservations: [],

        createdBy:
          adminUserId,

        updatedBy:
          adminUserId,
      });

    const startLabel = new Date(startAt).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

    await notifyAllRiders({
      type: "shift_update",
      title: "New work shift posted",
      message: `A shift on ${startLabel} has ${slotLimit} slot${slotLimit === 1 ? "" : "s"}. Request it in Work Shifts.`,
      metadata: { screen: "shifts", shiftId: String(shift._id) },
    });

    return formatShift(
      shift
    );
  };


/*
 * =========================================================
 * ADMIN — GET ALL RIDER SHIFTS
 * =========================================================
 */

export const getAdminRiderShifts =
  async () => {
    const shifts =
      await RiderShift.find({})
        .sort({
          startAt: -1,
        })
        .populate(
          "createdBy",
          "firstName lastName email"
        )
        .populate(
          "updatedBy",
          "firstName lastName email"
        )
        .populate(
          "reservations.riderUser",
          "firstName lastName email phoneNumber"
        )
        .populate(
          "reservations.reviewedBy",
          "firstName lastName email"
        );

    return shifts.map(
      (shift) =>
        formatShift(
          shift
        )
    );
  };


/*
 * =========================================================
 * ADMIN — GET ONE RIDER SHIFT
 * =========================================================
 */

export const getAdminRiderShiftById =
  async (shiftId) => {
    const shift =
      await RiderShift.findById(
        shiftId
      )
        .populate(
          "createdBy",
          "firstName lastName email"
        )
        .populate(
          "updatedBy",
          "firstName lastName email"
        )
        .populate(
          "reservations.riderUser",
          "firstName lastName email phoneNumber"
        )
        .populate(
          "reservations.reviewedBy",
          "firstName lastName email"
        );

    if (!shift) {
      throw createError(
        "Rider shift not found.",
        404
      );
    }

    return formatShift(
      shift
    );
  };


/*
 * =========================================================
 * ADMIN — UPDATE RIDER SHIFT
 * =========================================================
 */

export const updateRiderShift =
  async (
    shiftId,
    shiftData,
    adminUserId
  ) => {
    const shift =
      await RiderShift.findById(
        shiftId
      );

    if (!shift) {
      throw createError(
        "Rider shift not found.",
        404
      );
    }

    /*
     * Do not allow schedule or slot changes after
     * the shift has already ended.
     */

    if (
      new Date() >=
        new Date(
          shift.endAt
        ) &&
      (
        shiftData?.startAt !==
          undefined ||
        shiftData?.endAt !==
          undefined ||
        shiftData?.slotLimit !==
          undefined
      )
    ) {
      throw createError(
        "An ended Rider shift can no longer be rescheduled or have its slot limit changed."
      );
    }

    if (
      shiftData?.startAt !==
      undefined
    ) {
      shift.startAt =
        toDate(
          shiftData.startAt,
          "Shift start"
        );
    }

    if (
      shiftData?.endAt !==
      undefined
    ) {
      shift.endAt =
        toDate(
          shiftData.endAt,
          "Shift end"
        );
    }

    if (
      shift.endAt <=
      shift.startAt
    ) {
      throw createError(
        "Shift end date and time must be after the shift start date and time."
      );
    }

    if (
      shiftData?.slotLimit !==
      undefined
    ) {
      const slotLimit =
        Number(
          shiftData.slotLimit
        );

      if (
        !Number.isInteger(
          slotLimit
        ) ||
        slotLimit < 1
      ) {
        throw createError(
          "Shift slot limit must be a whole number greater than zero."
        );
      }

      const approvedCount =
        getApprovedReservationCount(
          shift
        );

      if (
        slotLimit <
        approvedCount
      ) {
        throw createError(
          `Shift already has ${approvedCount} approved Rider${
            approvedCount === 1
              ? ""
              : "s"
          }. Slot limit cannot be lower than the number of approved Riders.`
        );
      }

      shift.slotLimit =
        slotLimit;
    }

    if (
      shiftData?.status !==
      undefined
    ) {
      const allowedStatuses =
        [
          "open",
          "closed",
          "cancelled",
        ];

      if (
        !allowedStatuses.includes(
          shiftData.status
        )
      ) {
        throw createError(
          "Invalid Rider shift status."
        );
      }

      shift.status =
        shiftData.status;
    }

    shift.updatedBy =
      adminUserId || null;

    await shift.save();

    return formatShift(
      shift
    );
  };


/*
 * =========================================================
 * RIDER — GET AVAILABLE SHIFTS
 * =========================================================
 *
 * Riders see:
 *
 * - open current/future shifts with remaining slots
 * - shifts they already requested
 *
 * Cancelled shifts are not returned here.
 * =========================================================
 */

export const getRiderAvailableShifts =
  async (userId) => {
    const rider =
      await getVerifiedRiderByUserId(
        userId
      );

    const now =
      new Date();

    const shifts =
      await RiderShift.find({
        endAt: {
          $gt:
            now,
        },

        status: {
          $ne:
            "cancelled",
        },
      })
        .sort({
          startAt: 1,
        })
        .populate(
          "reservations.reviewedBy",
          "firstName lastName"
        );

    return shifts
      .map(
        (shift) =>
          formatShift(
            shift,
            rider._id
          )
      )
      .filter(
        (shift) => {
          if (
            shift.myReservation
          ) {
            return true;
          }

          return (
            shift.status ===
              "open" &&
            shift.remainingSlots >
              0
          );
        }
      );
  };


/*
 * =========================================================
 * RIDER — GET MY SHIFT HISTORY
 * =========================================================
 *
 * This includes:
 *
 * - pending
 * - approved
 * - rejected
 * - upcoming
 * - active
 * - ended
 *
 * Historical reservations are preserved.
 * =========================================================
 */

export const getRiderShiftHistory =
  async (userId) => {
    const rider =
      await getVerifiedRiderByUserId(
        userId
      );

    const shifts =
      await RiderShift.find({
        "reservations.rider":
          rider._id,
      })
        .sort({
          startAt: -1,
        })
        .populate(
          "reservations.reviewedBy",
          "firstName lastName"
        );

    return shifts.map(
      (shift) =>
        formatShift(
          shift,
          rider._id
        )
    );
  };


/*
 * =========================================================
 * RIDER — REQUEST SHIFT
 * =========================================================
 */

export const requestRiderShift =
  async (
    shiftId,
    userId
  ) => {
    const rider =
      await getVerifiedRiderByUserId(
        userId
      );

    /*
     * Remit collected COD before taking a new shift.
     */
    const unremitted =
      await getUnremittedCod(userId);

    if (unremitted.count > 0) {
      throw createError(
        `Please remit your COD collections first (₱${unremitted.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })} from ${unremitted.count} deliver${unremitted.count === 1 ? "y" : "ies"}) in Wallet before requesting a new shift.`,
        409
      );
    }

    const shift =
      await RiderShift.findById(
        shiftId
      );

    if (!shift) {
      throw createError(
        "Rider shift not found.",
        404
      );
    }

    const now =
      new Date();

    if (
      shift.status !==
      "open"
    ) {
      throw createError(
        "This Rider shift is not open for requests."
      );
    }

    /*
     * Do not allow a new reservation after the
     * scheduled shift has already started.
     */

    if (
      now >=
      new Date(
        shift.startAt
      )
    ) {
      throw createError(
        "This Rider shift has already started and can no longer be requested."
      );
    }

    const existingReservation =
      findRiderReservation(
        shift,
        rider._id
      );

    if (
      existingReservation
    ) {
      throw createError(
        "You already requested this Rider shift."
      );
    }

    if (
      getRemainingSlots(
        shift
      ) <= 0
    ) {
      throw createError(
        "This Rider shift has no available slots."
      );
    }

    /*
     * Atomic reservation.
     *
     * The checks above give friendly errors, but two
     * requests can still arrive at the same time. The
     * filter below re-checks every rule inside MongoDB
     * so the same Rider can never be added twice and a
     * full shift can never take a new request.
     */
    const updatedShift =
      await RiderShift.findOneAndUpdate(
        {
          _id: shift._id,
          status: "open",
          startAt: {
            $gt: now,
          },
          "reservations.rider": {
            $ne: rider._id,
          },
          $expr:
            approvedCountBelowLimitExpr,
        },
        {
          $push: {
            reservations: {
              rider:
                rider._id,
              riderUser:
                userId,
              status:
                "pending",
              requestedAt:
                now,
              reviewedAt:
                null,
              reviewedBy:
                null,
            },
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!updatedShift) {
      throw createError(
        "This Rider shift could not be reserved. You may have already requested it, or it is now full or closed."
      );
    }

    await notifyAdmins({
      type: "shift_update",
      title: "Shift request",
      message: `A rider requested the shift on ${new Date(updatedShift.startAt).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" })}. Review it in Work Shifts.`,
      metadata: { screen: "shifts", shiftId: String(updatedShift._id) },
    });

    return formatShift(
      updatedShift,
      rider._id
    );
  };



/*
 * =========================================================
 * ADMIN — REVIEW RIDER SHIFT REQUEST
 * =========================================================
 */

export const reviewRiderShiftRequest =
  async (
    shiftId,
    reservationId,
    decision,
    adminUserId
  ) => {
    if (
      ![
        "approved",
        "rejected",
      ].includes(
        decision
      )
    ) {
      throw createError(
        "Shift request decision must be approved or rejected."
      );
    }

    const shift =
      await RiderShift.findById(
        shiftId
      );

    if (!shift) {
      throw createError(
        "Rider shift not found.",
        404
      );
    }

    if (
      shift.status ===
      "cancelled"
    ) {
      throw createError(
        "A cancelled Rider shift cannot be reviewed."
      );
    }

    const now =
      new Date();

    if (
      now >=
      new Date(
        shift.startAt
      )
    ) {
      throw createError(
        "This Rider shift has already started and pending requests can no longer be reviewed."
      );
    }

    const reservation =
      shift.reservations.id(
        reservationId
      );

    if (!reservation) {
      throw createError(
        "Rider shift request not found.",
        404
      );
    }

    if (
      reservation.status !==
      "pending"
    ) {
      throw createError(
        "This Rider shift request has already been reviewed."
      );
    }

    if (
      decision ===
      "approved"
    ) {
      /*
       * Re-read the current approved count immediately
       * before approval.
       *
       * The delivery acceptance layer will later receive
       * its own server-side shift authorization as well.
       */

      const approvedCount =
        getApprovedReservationCount(
          shift
        );

      if (
        approvedCount >=
        Number(
          shift.slotLimit
        )
      ) {
        throw createError(
          "This Rider shift already has the maximum number of approved Riders."
        );
      }
    }

    /*
     * Atomic review.
     *
     * Approval re-checks the slot limit inside MongoDB,
     * so two Admins approving different Riders at the
     * same moment can never push the shift over its
     * slot limit. The reservation must also still be
     * pending, so it cannot be reviewed twice.
     */
    const reviewFilter = {
      _id: shift._id,
      status: {
        $ne: "cancelled",
      },
      startAt: {
        $gt: now,
      },
      reservations: {
        $elemMatch: {
          _id: reservation._id,
          status: "pending",
        },
      },
    };

    if (
      decision ===
      "approved"
    ) {
      reviewFilter.$expr =
        approvedCountBelowLimitExpr;
    }

    const updatedShift =
      await RiderShift.findOneAndUpdate(
        reviewFilter,
        {
          $set: {
            "reservations.$.status":
              decision,
            "reservations.$.reviewedAt":
              now,
            "reservations.$.reviewedBy":
              adminUserId,
            updatedBy:
              adminUserId,
          },
        },
        {
          returnDocument: "after",
        }
      );

    if (!updatedShift) {
      throw createError(
        decision === "approved"
          ? "This Rider shift request could not be approved. The shift may already be full, or the request was already reviewed."
          : "This Rider shift request could not be rejected because it was already reviewed."
      );
    }

    await notifySafely({
      recipient: reservation.riderUser,
      role: "rider",
      type: "shift_update",
      title: decision === "approved" ? "Shift request approved" : "Shift request not approved",
      message:
        decision === "approved"
          ? `You're scheduled on ${new Date(updatedShift.startAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Go Online during the shift to accept deliveries.`
          : "Admin did not approve your shift request. Check Work Shifts for other open shifts.",
      metadata: { screen: "shifts", shiftId: String(updatedShift._id) },
    });

    return formatShift(
      updatedShift
    );
  };


/*
 * =========================================================
 * GET ACTIVE APPROVED SHIFT FOR RIDER
 * =========================================================
 *
 * This is the shared server-side authorization check.
 *
 * A Rider has an active approved shift when:
 *
 * - the shift is not cancelled
 * - startAt <= current time
 * - endAt > current time
 * - the Rider has an approved reservation
 *
 * Rider.isAvailable is intentionally NOT checked here.
 *
 * Approved shift:
 *   permission to work
 *
 * Rider.isAvailable:
 *   whether Rider currently wants new deliveries
 * =========================================================
 */

export const getActiveApprovedShiftForRider =
  async (
    riderId,
    now = new Date()
  ) => {
    if (!riderId) {
      return null;
    }

    const shift =
      await RiderShift.findOne({
        status: {
          $ne:
            "cancelled",
        },

        startAt: {
          $lte:
            now,
        },

        endAt: {
          $gt:
            now,
        },

        reservations: {
          $elemMatch: {
            rider:
              riderId,

            status:
              "approved",
          },
        },
      })
        .sort({
          startAt: 1,
        })
        .lean();

    if (!shift) {
      return null;
    }

    return formatShift(
      shift,
      riderId
    );
  };


/*
 * =========================================================
 * GET NEXT APPROVED SHIFT FOR RIDER
 * =========================================================
 *
 * Useful for the Rider Dashboard.
 *
 * Example:
 *
 * Approved Shift
 * Oct 5, 2026
 * 8:00 AM - 1:00 PM
 * Starts in 25 minutes
 * =========================================================
 */

export const getNextApprovedShiftForRider =
  async (
    riderId,
    now = new Date()
  ) => {
    if (!riderId) {
      return null;
    }

    const shift =
      await RiderShift.findOne({
        status: {
          $ne:
            "cancelled",
        },

        startAt: {
          $gt:
            now,
        },

        reservations: {
          $elemMatch: {
            rider:
              riderId,

            status:
              "approved",
          },
        },
      })
        .sort({
          startAt: 1,
        })
        .lean();

    if (!shift) {
      return null;
    }

    return formatShift(
      shift,
      riderId
    );
  };


/*
 * =========================================================
 * REQUIRE ACTIVE APPROVED SHIFT
 * =========================================================
 *
 * Used by operations that require current permission
 * to receive new work.
 *
 * Later this will protect:
 *
 * - switching Online
 * - GET /deliveries/available
 * - PATCH /deliveries/:id/accept
 * =========================================================
 */

export const requireActiveApprovedShiftForRider =
  async (
    riderId,
    now = new Date()
  ) => {
    const shift =
      await getActiveApprovedShiftForRider(
        riderId,
        now
      );

    if (!shift) {
      throw createError(
        "You can only go Online or accept new deliveries during an approved Rider shift.",
        403
      );
    }

    return shift;
  };


/*
 * =========================================================
 * CAN RIDER RECEIVE NEW DELIVERIES
 * =========================================================
 */

export const canRiderReceiveNewDeliveries =
  async (
    riderId,
    now = new Date()
  ) => {
    const shift =
      await getActiveApprovedShiftForRider(
        riderId,
        now
      );

    return Boolean(
      shift
    );
  };


/*
 * =========================================================
 * GET RIDER WORK-SHIFT STATUS
 * =========================================================
 *
 * Gives the Dashboard one consistent source of truth.
 *
 * Possible authorization states:
 *
 * active
 * upcoming
 * none
 *
 * Online/Offline remains separate and comes from
 * Rider.isAvailable.
 * =========================================================
 */

export const getRiderWorkShiftStatus =
  async (
    riderId,
    now = new Date()
  ) => {
    const activeShift =
      await getActiveApprovedShiftForRider(
        riderId,
        now
      );

    if (activeShift) {
      return {
        authorization:
          "active",

        canGoOnline:
          true,

        canAcceptNewDeliveries:
          true,

        activeShift,

        nextShift:
          null,
      };
    }

    const nextShift =
      await getNextApprovedShiftForRider(
        riderId,
        now
      );

    if (nextShift) {
      return {
        authorization:
          "upcoming",

        canGoOnline:
          false,

        canAcceptNewDeliveries:
          false,

        activeShift:
          null,

        nextShift,
      };
    }

    return {
      authorization:
        "none",

      canGoOnline:
        false,

      canAcceptNewDeliveries:
        false,

      activeShift:
        null,

      nextShift:
        null,
    };
  };