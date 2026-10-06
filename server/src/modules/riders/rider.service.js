import Rider from "./rider.model.js";
import { notifyAdmins, notifySafely } from "../notifications/notify-helpers.js";
import User from "../auth/auth.model.js";
import Verification from "../verification/verification.model.js";
import Delivery from "../deliveries/delivery.model.js";
import Order from "../orders/order.model.js";
import RiderRemittance from "./rider-remittance.model.js";
import RiderPayout from "./rider-payout.model.js";
import Review from "../reviews/review.model.js";
import {
  getRiderWorkShiftStatus,
  requireActiveApprovedShiftForRider,
} from "./rider-shift.service.js";

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const ACTIVE_DELIVERY_STATUSES = [
  "accepted",
  "picked_up",
  "out_for_delivery",
];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getRiderProfileByUserId = async (
  userId
) => {
  const rider = await Rider.findOne({
    owner: userId,
  });

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  return rider;
};

const validateApprovedActiveRider = (
  rider
) => {
  if (
    rider.verificationStatus !==
    "approved"
  ) {
    const error = new Error(
      "Only approved riders can perform this action."
    );

    error.statusCode = 403;

    throw error;
  }

  if (rider.isActive !== true) {
    const error = new Error(
      "This rider account is not active."
    );

    error.statusCode = 403;

    throw error;
  }
};

/*
 * =========================================================
 * CREATE RIDER PROFILE
 * =========================================================
 */

export const createRiderProfile = async (
  userId,
  profileData
) => {
  const user = await User.findById(
    userId
  );

  if (!user) {
    const error = new Error(
      "User account was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  if (user.role !== "rider") {
    const error = new Error(
      "Only rider accounts can create rider profiles."
    );

    error.statusCode = 403;

    throw error;
  }

  const existingProfile =
    await Rider.findOne({
      owner: userId,
    });

  if (existingProfile) {
    const error = new Error(
      "A rider profile already exists for this account."
    );

    error.statusCode = 409;

    throw error;
  }

  const rider = await Rider.create({
    owner: userId,

    address:
      profileData.address,

    vehicleType:
      profileData.vehicleType,

    vehiclePlateNumber:
      profileData.vehiclePlateNumber ||
      "",

    driverLicenseNumber:
      profileData.driverLicenseNumber,

    emergencyContactName:
      profileData.emergencyContactName,

    emergencyContactNumber:
      profileData.emergencyContactNumber,

    verificationStatus:
      "pending",

    isAvailable:
      false,
  });

  user.verificationStatus =
    "pending";

  await user.save();

  return rider;
};

/*
 * =========================================================
 * GET MY RIDER PROFILE
 * =========================================================
 */

export const getMyRiderProfile =
  async (
    userId
  ) => {
    const rider =
      await Rider.findOne({
        owner: userId,
      }).populate(
        "owner",
        "firstName lastName email phoneNumber role verificationStatus"
      );

    if (!rider) {
      const error = new Error(
        "Rider profile was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    return rider;
  };

/*
 * =========================================================
 * UPDATE RIDER PROFILE
 * =========================================================
 */

export const updateRiderProfile =
  async (
    userId,
    profileData
  ) => {
    const rider =
      await Rider.findOne({
        owner: userId,
      });

    if (!rider) {
      const error = new Error(
        "Rider profile was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    const allowedFields = [
      "vehicleType",
      "vehiclePlateNumber",
      "driverLicenseNumber",
      "emergencyContactName",
      "emergencyContactNumber",
    ];

    allowedFields.forEach(
      (field) => {
        if (
          profileData[field] !==
          undefined
        ) {
          rider[field] =
            profileData[field];
        }
      }
    );

    if (profileData.address) {
      rider.address = {
        ...rider.address.toObject(),

        ...profileData.address,
      };
    }

    await rider.save();

    return rider;
  };

/*
 * =========================================================
 * GET PENDING RIDERS
 * =========================================================
 */

export const getPendingRiders =
  async () => {
    /*
     * Only applicants who already uploaded their
     * requirements are ready for review.
     */
    const submitted =
      await Verification.find({
        role: "rider",
        status: "pending",
      }).distinct("user");

    return Rider.find({
      verificationStatus:
        "pending",
      owner: {
        $in: submitted,
      },
    })
      .populate(
        "owner",
        "firstName lastName email phoneNumber role verificationStatus"
      )
      .sort({
        createdAt: 1,
      });
  };

/*
 * =========================================================
 * GET RIDER BY ID
 * =========================================================
 */

export const getRiderById = async (
  riderId
) => {
  const rider =
    await Rider.findById(
      riderId
    )
      .populate(
        "owner",
        "firstName lastName email phoneNumber role verificationStatus"
      )
      .populate(
        "verifiedBy",
        "firstName lastName email"
      );

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  return rider;
};

/*
 * =========================================================
 * APPROVE RIDER
 * =========================================================
 */

export const approveRider = async (
  riderId,
  adminId
) => {
  const rider =
    await Rider.findById(
      riderId
    );

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  const verification =
    await Verification.findOne({
      user: rider.owner,

      role: "rider",
    });

  if (!verification) {
    const error = new Error(
      "Rider verification documents were not found."
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    verification.status !==
    "pending"
  ) {
    const error = new Error(
      `This rider verification is already ${verification.status}.`
    );

    error.statusCode = 400;

    throw error;
  }

  const reviewedAt =
    new Date();

  rider.verificationStatus =
    "approved";

  rider.verificationRemarks =
    "";

  rider.verifiedAt =
    reviewedAt;

  rider.verifiedBy =
    adminId;

  await rider.save();

  await User.findByIdAndUpdate(
    rider.owner,
    {
      verificationStatus:
        "approved",
    },
    {
      runValidators:
        true,
    }
  );

  verification.status =
    "approved";

  verification.remarks =
    "";

  verification.reviewedBy =
    adminId;

  verification.reviewedAt =
    reviewedAt;

  await verification.save();

  await notifySafely({
    recipient: rider.owner,
    role: "rider",
    type: "verification_approved",
    title: "You're approved as a FLOGRAM Rider",
    message: "You can now request work shifts and accept deliveries.",
  });

  return rider;
};

/*
 * =========================================================
 * REJECT RIDER
 * =========================================================
 */

export const rejectRider = async (
  riderId,
  adminId,
  remarks
) => {
  const rider =
    await Rider.findById(
      riderId
    );

  if (!rider) {
    const error = new Error(
      "Rider profile was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  const verification =
    await Verification.findOne({
      user: rider.owner,

      role: "rider",
    });

  if (!verification) {
    const error = new Error(
      "Rider verification documents were not found."
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    verification.status !==
    "pending"
  ) {
    const error = new Error(
      `This rider verification is already ${verification.status}.`
    );

    error.statusCode = 400;

    throw error;
  }

  const reviewedAt =
    new Date();

  rider.verificationStatus =
    "rejected";

  rider.verificationRemarks =
    remarks;

  rider.verifiedAt =
    reviewedAt;

  rider.verifiedBy =
    adminId;

  rider.isAvailable =
    false;

  await rider.save();

  await User.findByIdAndUpdate(
    rider.owner,
    {
      verificationStatus:
        "rejected",
    },
    {
      runValidators:
        true,
    }
  );

  verification.status =
    "rejected";

  verification.remarks =
    remarks;

  verification.reviewedBy =
    adminId;

  verification.reviewedAt =
    reviewedAt;

  await verification.save();

  await notifySafely({
    recipient: rider.owner,
    role: "rider",
    type: "verification_rejected",
    title: "Rider application needs changes",
    message: remarks ? `Admin's remarks: ${String(remarks).slice(0, 300)}. Please update and resubmit your requirements.` : "Please update and resubmit your requirements.",
  });

  return rider;
};

/*
 * =========================================================
 * RIDER
 * UPDATE AVAILABILITY
 * =========================================================
 *
 * OFF:
 * Rider may manually go offline.
 *
 * ON:
 * Rider must:
 *
 * - be approved
 * - be active
 * - have no active delivery
 *
 * This prevents a rider from manually
 * becoming available while already
 * handling another delivery.
 * =========================================================
 */

export const updateRiderAvailability =
  async (
    userId,
    isAvailable
  ) => {
    const rider =
      await getRiderProfileByUserId(
        userId
      );

    validateApprovedActiveRider(
      rider
    );

    /*
     * =====================================================
     * GO OFFLINE
     * =====================================================
     */

    if (isAvailable === false) {
      rider.isAvailable =
        false;

      await rider.save();

      return {
        isAvailable:
          rider.isAvailable,
      };
    }

    /*
     * =====================================================
     * GO ONLINE
     * =====================================================
     *
     * Rider cannot become available
     * while another delivery is active.
     */

    /*
     * Rider must have an active approved
     * work shift before going Online.
     * Going Offline does not release or
     * cancel the approved shift slot.
     */

    await requireActiveApprovedShiftForRider(
      rider._id
    );

    const activeDelivery =
      await Delivery.findOne({
        rider:
          rider._id,

        riderUser:
          userId,

        status: {
          $in:
            ACTIVE_DELIVERY_STATUSES,
        },
      })
        .select(
          "_id status"
        )
        .lean();

    if (activeDelivery) {
      /*
       * Ensure database availability
       * remains consistent.
       */

      if (
        rider.isAvailable !==
        false
      ) {
        rider.isAvailable =
          false;

        await rider.save();
      }

      const error = new Error(
        "You cannot become available while you have an active delivery."
      );

      error.statusCode = 409;

      throw error;
    }

    rider.isAvailable =
      true;

    await rider.save();

    return {
      isAvailable:
        rider.isAvailable,
    };
  };

/*
 * =========================================================
 * RIDER
 * DASHBOARD
 * =========================================================
 */

export const getRiderDashboard =
  async (
    userId
  ) => {
    const rider =
      await Rider.findOne({
        owner: userId,
      }).populate(
        "owner",
        "firstName lastName"
      );

    if (!rider) {
      const error = new Error(
        "Rider profile was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    validateApprovedActiveRider(
      rider
    );

    /*
     * =====================================================
     * WORK SHIFT STATUS
     * =====================================================
     */

    const workShift =
      await getRiderWorkShiftStatus(
        rider._id
      );

    /*
     * If the approved shift has ended,
     * the Rider must not remain Online
     * for new delivery requests.
     *
     * Active deliveries may still be
     * completed after the shift ends.
     */

    if (
      rider.isAvailable === true &&
      workShift.canGoOnline !== true
    ) {
      rider.isAvailable =
        false;

      await rider.save();
    }

    /*
     * =====================================================
     * DELIVERY COUNTS
     * =====================================================
     */

    const [
      total,
      completed,
      active,
      cancelled,
    ] =
      await Promise.all([
        Delivery.countDocuments({
          rider:
            rider._id,

          riderUser:
            userId,
        }),

        Delivery.countDocuments({
          rider:
            rider._id,

          riderUser:
            userId,

          status:
            "delivered",
        }),

        Delivery.countDocuments({
          rider:
            rider._id,

          riderUser:
            userId,

          status: {
            $in:
              ACTIVE_DELIVERY_STATUSES,
          },
        }),

        Delivery.countDocuments({
          rider:
            rider._id,

          riderUser:
            userId,

          status:
            "cancelled",
        }),
      ]);

    /*
     * =====================================================
     * DELIVERED ORDERS
     * =====================================================
     *
     * Rider earnings come from the actual
     * Order.deliveryFee.
     *
     * They DO NOT come from Order.totalAmount.
     */

    const deliveredDeliveries =
      await Delivery.find({
        rider:
          rider._id,

        riderUser:
          userId,

        status:
          "delivered",
      })
        .select(
          "order deliveredAt"
        )
        .lean();

    const orderIds =
      deliveredDeliveries
        .map(
          (delivery) =>
            delivery.order
        )
        .filter(Boolean);

    const orders =
      orderIds.length > 0
        ? await Order.find({
            _id: {
              $in:
                orderIds,
            },
          })
            .select(
              "_id deliveryFee"
            )
            .lean()
        : [];

    const deliveryFeeByOrderId =
      new Map(
        orders.map(
          (order) => [
            String(
              order._id
            ),

            Number(
              order.deliveryFee ||
                0
            ),
          ]
        )
      );

    /*
     * =====================================================
     * PHILIPPINE DATE BOUNDARIES
     * =====================================================
     */

    const now =
      new Date();

    const PH_OFFSET_MS =
      8 *
      60 *
      60 *
      1000;

    const phNow =
      new Date(
        now.getTime() +
          PH_OFFSET_MS
      );

    const todayStartPH =
      Date.UTC(
        phNow.getUTCFullYear(),
        phNow.getUTCMonth(),
        phNow.getUTCDate()
      ) -
      PH_OFFSET_MS;

    const monthStartPH =
      Date.UTC(
        phNow.getUTCFullYear(),
        phNow.getUTCMonth(),
        1
      ) -
      PH_OFFSET_MS;

    /*
     * =====================================================
     * RIDER DELIVERY-FEE EARNINGS
     * =====================================================
     */

    let totalDeliveryFees =
      0;

    let todayDeliveryFees =
      0;

    let thisMonthDeliveryFees =
      0;

    deliveredDeliveries.forEach(
      (delivery) => {
        const deliveryFee =
          deliveryFeeByOrderId.get(
            String(
              delivery.order
            )
          ) || 0;

        totalDeliveryFees +=
          deliveryFee;

        if (
          !delivery.deliveredAt
        ) {
          return;
        }

        const deliveredTime =
          new Date(
            delivery.deliveredAt
          ).getTime();

        if (
          deliveredTime >=
          todayStartPH
        ) {
          todayDeliveryFees +=
            deliveryFee;
        }

        if (
          deliveredTime >=
          monthStartPH
        ) {
          thisMonthDeliveryFees +=
            deliveryFee;
        }
      }
    );

    /*
     * =====================================================
     * WEEKLY DELIVERY STATISTICS
     * =====================================================
     */

    const WEEKDAY_LABELS = [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ];

    const phDayOfWeek =
      phNow.getUTCDay();

    const mondayIndex =
      (phDayOfWeek + 6) %
      7;

    const weekStartPH =
      Date.UTC(
        phNow.getUTCFullYear(),
        phNow.getUTCMonth(),
        phNow.getUTCDate() -
          mondayIndex
      ) -
      PH_OFFSET_MS;

    const nextWeekStartPH =
      weekStartPH +
      7 *
        24 *
        60 *
        60 *
        1000;

    const weeklyDeliveryCounts =
      [0, 0, 0, 0, 0, 0, 0];

    deliveredDeliveries.forEach(
      (delivery) => {
        if (
          !delivery.deliveredAt
        ) {
          return;
        }

        const deliveredTime =
          new Date(
            delivery.deliveredAt
          ).getTime();

        if (
          deliveredTime <
            weekStartPH ||
          deliveredTime >=
            nextWeekStartPH
        ) {
          return;
        }

        const deliveredPH =
          new Date(
            deliveredTime +
              PH_OFFSET_MS
          );

        const jsDay =
          deliveredPH.getUTCDay();

        const dayIndex =
          (jsDay + 6) %
          7;

        weeklyDeliveryCounts[
          dayIndex
        ] += 1;
      }
    );

    const weeklyDeliveries =
      WEEKDAY_LABELS.map(
        (
          day,
          index
        ) => ({
          day,

          value:
            weeklyDeliveryCounts[
              index
            ],
        })
      );

    /*
     * =====================================================
     * COMPLETION RATE
     * =====================================================
     */

    const finishedDeliveries =
      completed +
      cancelled;

    const completionRate =
      finishedDeliveries > 0
        ? Number(
            (
              (
                completed /
                finishedDeliveries
              ) *
              100
            ).toFixed(1)
          )
        : 0;

    /*
     * =====================================================
     * RATING
     * =====================================================
     *
     * Average of customer riderRating values from
     * submitted order reviews for this Rider.
     *
     * Stays null when no rating exists yet.
     * Never fabricate a rating.
     */

    const [ratingStats] =
      await Review.aggregate([
        {
          $match: {
            rider:
              rider._id,
            riderRating: {
              $ne: null,
            },
          },
        },
        {
          $group: {
            _id: null,
            average: {
              $avg:
                "$riderRating",
            },
            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const rating = {
      average:
        ratingStats?.count > 0
          ? Number(
              ratingStats.average.toFixed(1)
            )
          : null,

      count:
        ratingStats?.count || 0,
    };

    const owner =
      rider.owner;

    /*
     * =====================================================
     * FINAL DASHBOARD RESPONSE
     * =====================================================
     */

    return {
      rider: {
        id:
          String(
            rider._id
          ),

        firstName:
          owner?.firstName ||
          "",

        lastName:
          owner?.lastName ||
          "",

        isAvailable:
          rider.isAvailable ===
          true,

        isActive:
          rider.isActive ===
          true,

        verificationStatus:
          rider.verificationStatus ||
          null,
      },

      workShift,

      deliveries: {
        total,
        completed,
        active,
        cancelled,
      },

      /*
       * Actual Rider earnings from
       * completed delivery fees.
       */
      deliveryFees: {
        total:
          totalDeliveryFees,

        today:
          todayDeliveryFees,

        thisMonth:
          thisMonthDeliveryFees,
      },

      performance: {
        completionRate,
      },

      weeklyDeliveries,

      rating,
    };
  };

/*
 * =========================================================
 * RIDER
 * WALLET
 * =========================================================
 *
 * COD REMITTANCE:
 *
 * Rider -> FLOGRAM
 *
 * This remains separate from Rider
 * delivery-fee earnings and payouts.
 * =========================================================
 */

const getPhilippineShiftDate = (
  value
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const PH_OFFSET_MS =
    8 *
    60 *
    60 *
    1000;

  const phDate =
    new Date(
      date.getTime() +
        PH_OFFSET_MS
    );

  return new Date(
    Date.UTC(
      phDate.getUTCFullYear(),
      phDate.getUTCMonth(),
      phDate.getUTCDate()
    )
  );
};

const getShiftDateKey = (
  value
) => {
  const shiftDate =
    getPhilippineShiftDate(
      value
    );

  return shiftDate
    ? shiftDate
        .toISOString()
        .slice(0, 10)
    : null;
};

/*
 * =========================================================
 * RIDER
 * GET WALLET
 * =========================================================
 */

export const getRiderWallet =
  async (
    userId
  ) => {
    const rider =
      await Rider.findOne({
        owner:
          userId,
      });

    if (!rider) {
      const error =
        new Error(
          "Rider profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    validateApprovedActiveRider(
      rider
    );

    const delivered =
      await Delivery.find({
        rider:
          rider._id,

        riderUser:
          userId,

        status:
          "delivered",
      })
        .populate(
          "order",
          [
            "productName",
            "totalAmount",
            "deliveryFee",
            "paymentMethod",
            "paymentStatus",
          ].join(" ")
        )
        .sort({
          deliveredAt:
            -1,
        });

    /*
     * =====================================================
     * BUILD COD SHIFT GROUPS
     * =====================================================
     */

    const shiftGroups =
      new Map();

    for (
      const delivery
      of delivered
    ) {
      const order =
        delivery.order;

      if (
        !order ||
        typeof order !==
          "object"
      ) {
        continue;
      }

      const paymentMethod =
        String(
          order.paymentMethod ||
            ""
        ).toLowerCase();

      const paymentStatus =
        String(
          order.paymentStatus ||
            ""
        ).toLowerCase();

      if (
        paymentMethod !==
          "cash_on_delivery" ||
        paymentStatus !==
          "paid" ||
        !delivery.deliveredAt
      ) {
        continue;
      }

      const shiftDate =
        getPhilippineShiftDate(
          delivery.deliveredAt
        );

      const shiftKey =
        getShiftDateKey(
          delivery.deliveredAt
        );

      if (
        !shiftDate ||
        !shiftKey
      ) {
        continue;
      }

      if (
        !shiftGroups.has(
          shiftKey
        )
      ) {
        shiftGroups.set(
          shiftKey,
          {
            shiftDate,

            items: [],
          }
        );
      }

      shiftGroups
        .get(
          shiftKey
        )
        .items.push({
          delivery:
            delivery._id,

          order:
            order._id,

          amount:
            Number(
              order.totalAmount ||
                0
            ),
        });
    }

    /*
     * =====================================================
     * REMOVE OLD LEGACY REMITTANCE RECORDS
     * =====================================================
     */

    await RiderRemittance.deleteMany({
      rider:
        rider._id,

      riderUser:
        userId,

      $or: [
        {
          shiftDate: {
            $exists:
              false,
          },
        },

        {
          shiftDate:
            null,
        },
      ],
    });

    /*
     * =====================================================
     * CREATE / UPDATE DAILY REMITTANCES
     * =====================================================
     */

    /*
     * Process days oldest first. COD collected after a day
     * was already submitted/verified is carried to the next
     * day's remittance so it can still be remitted.
     */
    const orderedKeys =
      [...shiftGroups.keys()].sort();

    for (
      let keyIndex = 0;
      keyIndex < orderedKeys.length;
      keyIndex += 1
    ) {
      const group =
        shiftGroups.get(
          orderedKeys[keyIndex]
        );

      const existing =
        await RiderRemittance.findOne({
          rider:
            rider._id,

          riderUser:
            userId,

          shiftDate:
            group.shiftDate,
        });

      if (!existing) {
        const remittance =
          new RiderRemittance({
            rider:
              rider._id,

            riderUser:
              userId,

            shiftDate:
              group.shiftDate,

            items:
              group.items,

            status:
              "pending",
          });

        await remittance.save();

        continue;
      }

      if (
        [
          "submitted",
          "verified",
        ].includes(
          existing.status
        )
      ) {
        const included =
          new Set(
            (existing.items || []).map(
              (item) =>
                String(item.delivery)
            )
          );

        const leftovers =
          group.items.filter(
            (item) =>
              !included.has(
                String(item.delivery)
              )
          );

        if (leftovers.length) {
          const nextDate =
            new Date(
              group.shiftDate.getTime() +
                24 * 60 * 60 * 1000
            );

          const nextKey =
            nextDate
              .toISOString()
              .slice(0, 10);

          if (!shiftGroups.has(nextKey)) {
            shiftGroups.set(nextKey, {
              shiftDate: nextDate,
              items: [],
            });

            orderedKeys.push(nextKey);
            orderedKeys.sort();
          }

          shiftGroups
            .get(nextKey)
            .items.push(...leftovers);
        }

        continue;
      }

      existing.items =
        group.items;

      await existing.save();
    }

    /*
     * =====================================================
     * GET DAILY REMITTANCES
     * =====================================================
     */

    const remittances =
      await RiderRemittance.find({
        rider:
          rider._id,

        riderUser:
          userId,
      })
        .sort({
          shiftDate:
            -1,
        });

    /*
     * =====================================================
     * DELIVERY -> REMITTANCE LOOKUP
     * =====================================================
     */

    const remittanceByDelivery =
      new Map();

    remittances.forEach(
      (
        remittance
      ) => {
        const items =
          Array.isArray(
            remittance.items
          )
            ? remittance.items
            : [];

        items.forEach(
          (
            item
          ) => {
            if (
              item?.delivery
            ) {
              remittanceByDelivery.set(
                String(
                  item.delivery
                ),
                remittance
              );
            }
          }
        );
      }
    );

    /*
     * =====================================================
     * TRANSACTION HISTORY
     * =====================================================
     */

    const transactions =
      delivered
        .filter(
          (
            delivery
          ) =>
            delivery.order &&
            typeof delivery.order ===
              "object"
        )
        .map(
          (
            delivery
          ) => {
            const order =
              delivery.order;

            const paymentMethod =
              String(
                order.paymentMethod ||
                  ""
              ).toLowerCase();

            const isCashOnDelivery =
              paymentMethod ===
              "cash_on_delivery";

            const remittance =
              isCashOnDelivery
                ? remittanceByDelivery.get(
                    String(
                      delivery._id
                    )
                  )
                : null;

            return {
              deliveryId:
                String(
                  delivery._id
                ),

              deliveryStatus:
                delivery.status,

              deliveredAt:
                delivery.deliveredAt ||
                null,

              orderId:
                String(
                  order._id
                ),

              productName:
                order.productName ||
                "Flower Order",

              recipientName:
                delivery.recipientName ||
                "Recipient",

              amount:
                Number(
                  order.totalAmount ||
                    0
                ),

              /*
               * Actual Rider earning for
               * this completed delivery.
               */
              deliveryFee:
                Number(
                  order.deliveryFee ||
                    0
                ),

              paymentMethod:
                order.paymentMethod ||
                null,

              paymentStatus:
                order.paymentStatus ||
                null,

              remittanceStatus:
                isCashOnDelivery
                  ? remittance
                      ?.status ||
                    "pending"
                  : null,

              remittanceId:
                isCashOnDelivery &&
                remittance
                  ? String(
                      remittance._id
                    )
                  : null,

              remittanceShiftDate:
                remittance
                  ?.shiftDate ||
                null,

              remittanceTotalAmount:
                remittance
                  ? Number(
                      remittance
                        .totalAmount ||
                        0
                    )
                  : null,

              remittanceSubmittedAt:
                remittance
                  ?.submittedAt ||
                null,

              remittanceVerifiedAt:
                remittance
                  ?.verifiedAt ||
                null,
            };
          }
        );

    /*
     * =====================================================
     * TODAY'S SHIFT
     * =====================================================
     */

    const todayShiftKey =
      getShiftDateKey(
        new Date()
      );

    const todayRemittance =
      todayShiftKey
        ? remittances.find(
            (
              remittance
            ) =>
              getShiftDateKey(
                remittance
                  .shiftDate
              ) ===
              todayShiftKey
          ) ||
          null
        : null;

    /*
     * =====================================================
     * WALLET SUMMARY
     * =====================================================
     */

    const cashCollectedToday =
      todayRemittance
        ? Number(
            todayRemittance
              .totalAmount ||
              0
          )
        : 0;

    const totalCashCollected =
      transactions
        .filter(
          (
            transaction
          ) =>
            String(
              transaction
                .paymentMethod ||
                ""
            ).toLowerCase() ===
              "cash_on_delivery" &&
            String(
              transaction
                .paymentStatus ||
                ""
            ).toLowerCase() ===
              "paid"
        )
        .reduce(
          (
            totalAmount,
            transaction
          ) =>
            totalAmount +
            Number(
              transaction.amount ||
                0
            ),
          0
        );

    const sumRemittancesByStatus =
      (
        status
      ) =>
        remittances
          .filter(
            (
              remittance
            ) =>
              remittance.status ===
              status
          )
          .reduce(
            (
              totalAmount,
              remittance
            ) =>
              totalAmount +
              Number(
                remittance
                  .totalAmount ||
                  0
              ),
            0
          );

    const pendingRemittance =
      sumRemittancesByStatus(
        "pending"
      );

    const submittedRemittance =
      sumRemittancesByStatus(
        "submitted"
      );

    const verifiedRemittance =
      sumRemittancesByStatus(
        "verified"
      );

    const rejectedRemittance =
      sumRemittancesByStatus(
        "rejected"
      );

    const codTransactionCount =
      transactions.filter(
        (
          transaction
        ) =>
          String(
            transaction
              .paymentMethod ||
              ""
          ).toLowerCase() ===
            "cash_on_delivery"
      ).length;

    const onlineTransactionCount =
      transactions.filter(
        (
          transaction
        ) =>
          String(
            transaction
              .paymentMethod ||
              ""
          ).toLowerCase() !==
            "cash_on_delivery"
      ).length;

    const dailyRemittances =
      remittances.map(
        (
          remittance
        ) => {
          const items =
            Array.isArray(
              remittance.items
            )
              ? remittance.items
              : [];

          return {
            id:
              String(
                remittance._id
              ),

            shiftDate:
              remittance
                .shiftDate,

            status:
              remittance
                .status,

            totalAmount:
              Number(
                remittance
                  .totalAmount ||
                  0
              ),

            deliveryCount:
              items.length,

            referenceNumber:
              remittance
                .referenceNumber ||
              "",

            proofImageUrl:
              remittance
                .proofImageUrl ||
              null,

            riderRemarks:
              remittance
                .riderRemarks ||
              "",

            submittedAt:
              remittance
                .submittedAt ||
              null,

            verifiedAt:
              remittance
                .verifiedAt ||
              null,

            adminRemarks:
              remittance
                .adminRemarks ||
              "",
          };
        }
      );

    const currentShift =
      todayRemittance
        ? {
            remittanceId:
              String(
                todayRemittance
                  ._id
              ),

            shiftDate:
              todayRemittance
                .shiftDate,

            status:
              todayRemittance
                .status,

            totalAmount:
              Number(
                todayRemittance
                  .totalAmount ||
                  0
              ),

            deliveryCount:
              Array.isArray(
                todayRemittance
                  .items
              )
                ? todayRemittance
                    .items
                    .length
                : 0,

            submittedAt:
              todayRemittance
                .submittedAt ||
              null,

            verifiedAt:
              todayRemittance
                .verifiedAt ||
              null,

            adminRemarks:
              todayRemittance
                .adminRemarks ||
              "",
          }
        : null;

    /*
     * =====================================================
     * FINAL WALLET RESPONSE
     * =====================================================
     */

    return {
      summary: {
        cashCollectedToday,

        totalCashCollected,

        pendingRemittance,

        submittedRemittance,

        verifiedRemittance,

        rejectedRemittance,
      },

      counts: {
        totalTransactions:
          transactions.length,

        codTransactions:
          codTransactionCount,

        onlineTransactions:
          onlineTransactionCount,

        pendingRemittances:
          remittances.filter(
            (
              item
            ) =>
              item.status ===
              "pending"
          ).length,

        submittedRemittances:
          remittances.filter(
            (
              item
            ) =>
              item.status ===
              "submitted"
          ).length,

        verifiedRemittances:
          remittances.filter(
            (
              item
            ) =>
              item.status ===
              "verified"
          ).length,

        rejectedRemittances:
          remittances.filter(
            (
              item
            ) =>
              item.status ===
              "rejected"
          ).length,
      },

      currentShift,

      transactions,

      remittances:
        dailyRemittances,
    };
  };
  /*
 * =========================================================
 * RIDER
 * SUBMIT DAILY COD REMITTANCE
 * =========================================================
 *
 * A Rider submits ONE remittance for the
 * entire Philippine calendar day.
 *
 * Required:
 *
 * - referenceNumber
 * - proofImageUrl
 *
 * Optional:
 *
 * - riderRemarks
 *
 * Allowed status:
 *
 * pending
 *    ↓
 * submitted
 *
 * rejected
 *    ↓
 * submitted
 *
 * NOT allowed:
 *
 * submitted → submitted
 * verified  → submitted
 *
 * Admin verification is handled separately.
 * =========================================================
 */

export const submitRiderRemittance =
  async (
    userId,
    remittanceId,
    submissionData = {}
  ) => {
    /*
     * =====================================================
     * RIDER
     * =====================================================
     */

    const rider =
      await getRiderProfileByUserId(
        userId
      );

    validateApprovedActiveRider(
      rider
    );

    /*
     * =====================================================
     * REMITTANCE
     * =====================================================
     */

    const remittance =
      await RiderRemittance.findOne({
        _id:
          remittanceId,

        rider:
          rider._id,

        riderUser:
          userId,
      });

    if (!remittance) {
      const error =
        new Error(
          "Remittance record was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    /*
     * =====================================================
     * STATUS VALIDATION
     * =====================================================
     */

    if (
      remittance.status ===
      "verified"
    ) {
      const error =
        new Error(
          "This remittance has already been verified and can no longer be changed."
        );

      error.statusCode =
        409;

      throw error;
    }

    if (
      remittance.status ===
      "submitted"
    ) {
      const error =
        new Error(
          "This remittance has already been submitted and is awaiting admin verification."
        );

      error.statusCode =
        409;

      throw error;
    }

    if (
      ![
        "pending",
        "rejected",
      ].includes(
        remittance.status
      )
    ) {
      const error =
        new Error(
          "This remittance cannot be submitted in its current status."
        );

      error.statusCode =
        409;

      throw error;
    }

    /*
     * =====================================================
     * REMITTANCE ITEMS
     * =====================================================
     */

    const items =
      Array.isArray(
        remittance.items
      )
        ? remittance.items
        : [];

    if (
      items.length ===
      0
    ) {
      const error =
        new Error(
          "This shift does not contain any COD deliveries to remit."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * REVALIDATE EVERY DELIVERY / ORDER
     * =====================================================
     */

    const validatedItems =
      [];

    for (
      const item
      of items
    ) {
      const delivery =
        await Delivery.findOne({
          _id:
            item.delivery,

          rider:
            rider._id,

          riderUser:
            userId,

          status:
            "delivered",
        });

      if (!delivery) {
        const error =
          new Error(
            "One of the completed deliveries included in this remittance could not be verified."
          );

        error.statusCode =
          400;

        throw error;
      }

      const order =
        await Order.findById(
          item.order
        );

      if (!order) {
        const error =
          new Error(
            "One of the orders included in this remittance could not be found."
          );

        error.statusCode =
          404;

        throw error;
      }

      if (
        String(
          delivery.order
        ) !==
        String(
          order._id
        )
      ) {
        const error =
          new Error(
            "A delivery and order included in this remittance do not match."
          );

        error.statusCode =
          400;

        throw error;
      }

      const paymentMethod =
        String(
          order.paymentMethod ||
            ""
        ).toLowerCase();

      const paymentStatus =
        String(
          order.paymentStatus ||
            ""
        ).toLowerCase();

      if (
        paymentMethod !==
        "cash_on_delivery"
      ) {
        const error =
          new Error(
            "Only Cash on Delivery transactions can be included in Rider remittance."
          );

        error.statusCode =
          400;

        throw error;
      }

      if (
        paymentStatus !==
        "paid"
      ) {
        const error =
          new Error(
            "Every Cash on Delivery order in the remittance must already be marked as paid."
          );

        error.statusCode =
          400;

        throw error;
      }

      const deliveryShiftKey =
        getShiftDateKey(
          delivery.deliveredAt
        );

      const remittanceShiftKey =
        getShiftDateKey(
          remittance.shiftDate
        );

      if (
        !deliveryShiftKey ||
        !remittanceShiftKey ||
        deliveryShiftKey !==
          remittanceShiftKey
      ) {
        const error =
          new Error(
            "A delivery does not belong to this Rider shift remittance."
          );

        error.statusCode =
          400;

        throw error;
      }

      validatedItems.push({
        delivery:
          delivery._id,

        order:
          order._id,

        amount:
          Number(
            order.totalAmount ||
              0
          ),
      });
    }

    /*
     * =====================================================
     * SUBMISSION DATA
     * =====================================================
     */

    const referenceNumber =
      String(
        submissionData
          .referenceNumber ||
          ""
      ).trim();

    const proofImageUrl =
      String(
        submissionData
          .proofImageUrl ||
          ""
      ).trim();

    const riderRemarks =
      String(
        submissionData
          .riderRemarks ||
          ""
      ).trim();

    if (!referenceNumber) {
      const error =
        new Error(
          "Remittance reference number is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (!proofImageUrl) {
      const error =
        new Error(
          "Proof of remittance is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * SAVE SUBMISSION
     * =====================================================
     */

    remittance.items =
      validatedItems;

    remittance.referenceNumber =
      referenceNumber;

    remittance.proofImageUrl =
      proofImageUrl;

    remittance.riderRemarks =
      riderRemarks;

    remittance.status =
      "submitted";

    remittance.submittedAt =
      new Date();

    remittance.adminRemarks =
      "";

    remittance.verifiedAt =
      null;

    remittance.verifiedBy =
      null;

    await remittance.save();

    await notifyAdmins({
      type: "remittance_submitted",
      title: "COD remittance submitted",
      message: `A rider submitted ₱${Number(remittance.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (ref ${remittance.referenceNumber || "—"}) for verification.`,
      remittance: remittance._id,
    });

    return {
      id:
        String(
          remittance._id
        ),

      shiftDate:
        remittance
          .shiftDate,

      deliveryCount:
        remittance
          .items
          .length,

      items:
        remittance
          .items
          .map(
            (
              item
            ) => ({
              deliveryId:
                String(
                  item.delivery
                ),

              orderId:
                String(
                  item.order
                ),

              amount:
                Number(
                  item.amount ||
                    0
                ),
            })
          ),

      totalAmount:
        Number(
          remittance
            .totalAmount ||
            0
        ),

      status:
        remittance
          .status,

      referenceNumber:
        remittance
          .referenceNumber,

      proofImageUrl:
        remittance
          .proofImageUrl,

      riderRemarks:
        remittance
          .riderRemarks,

      submittedAt:
        remittance
          .submittedAt,

      verifiedAt:
        remittance
          .verifiedAt,
    };
  };

/*
 * =========================================================
 * ADMIN
 * GET RIDER REMITTANCES
 * =========================================================
 */

export const getAdminRiderRemittances =
  async (
    status = null
  ) => {
    const allowedStatuses = [
      "pending",
      "submitted",
      "verified",
      "rejected",
    ];

    const filter = {};

    if (status) {
      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        const error =
          new Error(
            "Invalid remittance status."
          );

        error.statusCode = 400;

        throw error;
      }

      filter.status = status;
    }

    const remittances =
      await RiderRemittance.find(
        filter
      )
        .populate(
          "riderUser",
          "firstName lastName email phoneNumber"
        )
        .populate({
          path: "rider",
          select:
            "owner vehicleType vehiclePlateNumber verificationStatus",
        })
        .populate(
          "verifiedBy",
          "firstName lastName email"
        )
        .sort({
          submittedAt: -1,
          createdAt: -1,
        })
        .lean();

    return remittances.map(
      (remittance) => ({
        id:
          String(
            remittance._id
          ),

        riderId:
          remittance.rider?._id
            ? String(
                remittance
                  .rider
                  ._id
              )
            : null,

        rider:
          remittance.rider ||
          null,

        riderUser:
          remittance.riderUser ||
          null,

        shiftDate:
          remittance.shiftDate,

        deliveryCount:
          Array.isArray(
            remittance.items
          )
            ? remittance
                .items
                .length
            : 0,

        totalAmount:
          Number(
            remittance
              .totalAmount ||
              0
          ),

        status:
          remittance.status,

        referenceNumber:
          remittance.referenceNumber ||
          "",

        proofImageUrl:
          remittance.proofImageUrl ||
          null,

        riderRemarks:
          remittance.riderRemarks ||
          "",

        adminRemarks:
          remittance.adminRemarks ||
          "",

        submittedAt:
          remittance.submittedAt,

        verifiedAt:
          remittance.verifiedAt,

        verifiedBy:
          remittance.verifiedBy ||
          null,

        createdAt:
          remittance.createdAt,

        updatedAt:
          remittance.updatedAt,
      })
    );
  };

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER REMITTANCE
 * =========================================================
 */

export const getAdminRiderRemittanceById =
  async (
    remittanceId
  ) => {
    const remittance =
      await RiderRemittance.findById(
        remittanceId
      )
        .populate(
          "riderUser",
          "firstName lastName email phoneNumber"
        )
        .populate({
          path: "rider",
          select:
            "owner vehicleType vehiclePlateNumber verificationStatus",
        })
        .populate(
          "verifiedBy",
          "firstName lastName email"
        )
        .populate({
          path: "items.delivery",
          select:
            "_id status deliveredAt",
        })
        .populate({
          path: "items.order",
          select:
            "_id productName totalAmount paymentMethod paymentStatus orderStatus createdAt",
        });

    if (!remittance) {
      const error =
        new Error(
          "Remittance record was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    return {
      id:
        String(
          remittance._id
        ),

      riderId:
        remittance.rider?._id
          ? String(
              remittance
                .rider
                ._id
            )
          : null,

      rider:
        remittance.rider ||
        null,

      riderUser:
        remittance.riderUser ||
        null,

      shiftDate:
        remittance.shiftDate,

      deliveryCount:
        remittance.items.length,

      items:
        remittance.items.map(
          (item) => ({
            delivery:
              item.delivery ||
              null,

            order:
              item.order ||
              null,

            deliveryId:
              item.delivery?._id
                ? String(
                    item
                      .delivery
                      ._id
                  )
                : item.delivery
                  ? String(
                      item.delivery
                    )
                  : null,

            orderId:
              item.order?._id
                ? String(
                    item
                      .order
                      ._id
                  )
                : item.order
                  ? String(
                      item.order
                    )
                  : null,

            amount:
              Number(
                item.amount ||
                  0
              ),
          })
        ),

      totalAmount:
        Number(
          remittance
            .totalAmount ||
            0
        ),

      status:
        remittance.status,

      referenceNumber:
        remittance.referenceNumber ||
        "",

      proofImageUrl:
        remittance.proofImageUrl ||
        null,

      riderRemarks:
        remittance.riderRemarks ||
        "",

      adminRemarks:
        remittance.adminRemarks ||
        "",

      submittedAt:
        remittance.submittedAt,

      verifiedAt:
        remittance.verifiedAt,

      verifiedBy:
        remittance.verifiedBy ||
        null,

      createdAt:
        remittance.createdAt,

      updatedAt:
        remittance.updatedAt,
    };
  };
  /*
 * =========================================================
 * ADMIN
 * VERIFY RIDER REMITTANCE
 * =========================================================
 */

export const verifyRiderRemittance =
  async (
    remittanceId,
    adminId,
    adminRemarks = ""
  ) => {
    const remittance =
      await RiderRemittance.findById(
        remittanceId
      );

    if (!remittance) {
      const error =
        new Error(
          "Remittance record was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      remittance.status ===
      "verified"
    ) {
      const error =
        new Error(
          "This remittance has already been verified."
        );

      error.statusCode = 409;

      throw error;
    }

    if (
      remittance.status !==
      "submitted"
    ) {
      const error =
        new Error(
          "Only submitted remittances can be verified."
        );

      error.statusCode = 409;

      throw error;
    }

    if (
      !Array.isArray(
        remittance.items
      ) ||
      remittance.items.length ===
        0
    ) {
      const error =
        new Error(
          "This remittance does not contain any COD transactions."
        );

      error.statusCode = 400;

      throw error;
    }

    for (
      const item
      of remittance.items
    ) {
      const order =
        await Order.findById(
          item.order
        );

      if (!order) {
        const error =
          new Error(
            "One of the orders included in this remittance could not be found."
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        order.paymentMethod !==
        "cash_on_delivery"
      ) {
        const error =
          new Error(
            "This remittance contains a non-COD order."
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        order.paymentStatus !==
        "paid"
      ) {
        const error =
          new Error(
            "Every COD order must be paid before the remittance can be verified."
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        order.orderStatus !==
          "delivered" &&
        order.orderStatus !==
          "completed"
      ) {
        const error =
          new Error(
            "Every COD order must be delivered before the remittance can be verified."
          );

        error.statusCode = 400;

        throw error;
      }

      const expectedAmount =
        Number(
          order.totalAmount ||
            0
        );

      const remittedAmount =
        Number(
          item.amount ||
            0
        );

      if (
        expectedAmount !==
        remittedAmount
      ) {
        const error =
          new Error(
            "A COD remittance amount no longer matches the order total."
          );

        error.statusCode = 409;

        throw error;
      }
    }

    remittance.status =
      "verified";

    remittance.verifiedAt =
      new Date();

    remittance.verifiedBy =
      adminId;

    remittance.adminRemarks =
      String(
        adminRemarks ||
          ""
      ).trim();

    await remittance.save();

    await notifySafely({
      recipient: remittance.riderUser,
      role: "rider",
      type: "remittance_verified",
      title: "COD remittance verified",
      message: `Admin verified your remittance of ₱${Number(remittance.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Thank you!`,
      remittance: remittance._id,
    });

    return getAdminRiderRemittanceById(
      remittance._id
    );
  };

/*
 * =========================================================
 * ADMIN
 * REJECT RIDER REMITTANCE
 * =========================================================
 */

export const rejectRiderRemittance =
  async (
    remittanceId,
    adminId,
    remarks
  ) => {
    const remittance =
      await RiderRemittance.findById(
        remittanceId
      );

    if (!remittance) {
      const error =
        new Error(
          "Remittance record was not found."
        );

      error.statusCode = 404;

      throw error;
    }

    if (
      remittance.status ===
      "verified"
    ) {
      const error =
        new Error(
          "A verified remittance can no longer be rejected."
        );

      error.statusCode = 409;

      throw error;
    }

    if (
      remittance.status !==
      "submitted"
    ) {
      const error =
        new Error(
          "Only submitted remittances can be rejected."
        );

      error.statusCode = 409;

      throw error;
    }

    const cleanRemarks =
      String(
        remarks ||
          ""
      ).trim();

    if (!cleanRemarks) {
      const error =
        new Error(
          "A rejection reason is required."
        );

      error.statusCode = 400;

      throw error;
    }

    remittance.status =
      "rejected";

    remittance.verifiedBy =
      adminId;

    remittance.verifiedAt =
      null;

    remittance.adminRemarks =
      cleanRemarks;

    await remittance.save();

    await notifySafely({
      recipient: remittance.riderUser,
      role: "rider",
      type: "remittance_rejected",
      title: "COD remittance rejected",
      message: cleanRemarks
        ? `Admin's remarks: ${String(cleanRemarks).slice(0, 300)}. Please submit again with the correct proof.`
        : "Please check the amount and proof, then submit again.",
      remittance: remittance._id,
    });

    return getAdminRiderRemittanceById(
      remittance._id
    );
  };
  /*
 * =========================================================
 * RIDER PAYOUT / DELIVERY-FEE EARNINGS
 * =========================================================
 *
 * Rider earnings are the actual Order.deliveryFee values
 * from successfully delivered deliveries.
 *
 * COD remittance is separate and is never netted against
 * Rider earnings.
 * =========================================================
 */

const getRiderPayoutDeliveryIds = async (riderId) => {
  const payouts = await RiderPayout.find({
    rider: riderId,
    status: { $in: ["pending", "paid"] },
  })
    .select("items.delivery")
    .lean();

  return new Set(
    payouts.flatMap((payout) =>
      (Array.isArray(payout.items) ? payout.items : [])
        .map((item) => item?.delivery)
        .filter(Boolean)
        .map(String)
    )
  );
};

const buildRiderEarningItems = async (
  rider,
  userId,
  { periodStart = null, periodEnd = null, excludeReserved = false } = {}
) => {
  const filter = {
    rider: rider._id,
    riderUser: userId,
    status: "delivered",
    deliveredAt: { $ne: null },
  };

  if (periodStart || periodEnd) {
    filter.deliveredAt = {};

    if (periodStart) {
      filter.deliveredAt.$gte = periodStart;
    }

    if (periodEnd) {
      filter.deliveredAt.$lte = periodEnd;
    }
  }

  const deliveries = await Delivery.find(filter)
    .select("_id order deliveredAt")
    .lean();

  const reservedDeliveryIds = excludeReserved
    ? await getRiderPayoutDeliveryIds(rider._id)
    : new Set();

  const eligibleDeliveries = deliveries.filter(
    (delivery) => !reservedDeliveryIds.has(String(delivery._id))
  );

  const orderIds = eligibleDeliveries
    .map((delivery) => delivery.order)
    .filter(Boolean);

  const orders = orderIds.length
    ? await Order.find({ _id: { $in: orderIds } })
        .select("_id deliveryFee")
        .lean()
    : [];

  const orderById = new Map(
    orders.map((order) => [String(order._id), order])
  );

  return eligibleDeliveries
    .map((delivery) => {
      const order = orderById.get(String(delivery.order));

      if (!order || !delivery.deliveredAt) {
        return null;
      }

      const deliveryFee = Number(order.deliveryFee || 0);

      if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
        return null;
      }

      return {
        delivery: delivery._id,
        order: order._id,
        deliveryFee,
        deliveredAt: delivery.deliveredAt,
      };
    })
    .filter(Boolean);
};

const formatRiderPayout = (payout) => ({
  id: String(payout._id),
  rider: payout.rider || null,
  riderUser: payout.riderUser || null,
  periodStart: payout.periodStart,
  periodEnd: payout.periodEnd,
  deliveryCount: Array.isArray(payout.items) ? payout.items.length : 0,

  items: (Array.isArray(payout.items) ? payout.items : []).map((item) => ({
    delivery: item.delivery || null,
    order: item.order || null,

    deliveryId: item.delivery?._id
      ? String(item.delivery._id)
      : item.delivery
        ? String(item.delivery)
        : null,

    orderId: item.order?._id
      ? String(item.order._id)
      : item.order
        ? String(item.order)
        : null,

    deliveryFee: Number(item.deliveryFee || 0),
    deliveredAt: item.deliveredAt || null,
  })),

  totalAmount: Number(payout.totalAmount || 0),
  status: payout.status,
  paymentMethod: payout.paymentMethod || "",
  referenceNumber: payout.referenceNumber || "",
  proofImageUrl: payout.proofImageUrl || null,
  paidAt: payout.paidAt || null,
  paidBy: payout.paidBy || null,
  adminRemarks: payout.adminRemarks || "",
  cancelledAt: payout.cancelledAt || null,
  cancelledBy: payout.cancelledBy || null,
  cancellationReason: payout.cancellationReason || "",
  createdBy: payout.createdBy || null,
  createdAt: payout.createdAt,
  updatedAt: payout.updatedAt,
});

/*
 * =========================================================
 * RIDER
 * GET EARNINGS
 * =========================================================
 */

export const getRiderEarnings = async (userId) => {
  const rider = await getRiderProfileByUserId(userId);

  validateApprovedActiveRider(rider);

  const items = await buildRiderEarningItems(
    rider,
    userId
  );

  const payouts = await RiderPayout.find({
    rider: rider._id,
  })
    .sort({
      periodStart: -1,
      createdAt: -1,
    })
    .lean();

  const paidDeliveryIds = new Set(
    payouts
      .filter(
        (payout) =>
          payout.status === "paid"
      )
      .flatMap((payout) =>
        (
          Array.isArray(payout.items)
            ? payout.items
            : []
        )
          .map(
            (item) =>
              item?.delivery
          )
          .filter(Boolean)
          .map(String)
      )
  );

  const pendingDeliveryIds = new Set(
    payouts
      .filter(
        (payout) =>
          payout.status === "pending"
      )
      .flatMap((payout) =>
        (
          Array.isArray(payout.items)
            ? payout.items
            : []
        )
          .map(
            (item) =>
              item?.delivery
          )
          .filter(Boolean)
          .map(String)
      )
  );

  const now = new Date();

  const PH_OFFSET_MS =
    8 *
    60 *
    60 *
    1000;

  const phNow = new Date(
    now.getTime() +
      PH_OFFSET_MS
  );

  const todayStart = new Date(
    Date.UTC(
      phNow.getUTCFullYear(),
      phNow.getUTCMonth(),
      phNow.getUTCDate()
    ) -
      PH_OFFSET_MS
  );

  const totalEarned =
    items.reduce(
      (sum, item) =>
        sum +
        Number(
          item.deliveryFee ||
            0
        ),
      0
    );

  const today =
    items
      .filter(
        (item) =>
          new Date(
            item.deliveredAt
          ) >=
          todayStart
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.deliveryFee ||
              0
          ),
        0
      );

  const paid =
    items
      .filter(
        (item) =>
          paidDeliveryIds.has(
            String(
              item.delivery
            )
          )
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.deliveryFee ||
              0
          ),
        0
      );

  const pendingPayout =
    items
      .filter(
        (item) =>
          pendingDeliveryIds.has(
            String(
              item.delivery
            )
          )
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.deliveryFee ||
              0
          ),
        0
      );

  const unpaid =
    items
      .filter(
        (item) =>
          !paidDeliveryIds.has(
            String(
              item.delivery
            )
          ) &&
          !pendingDeliveryIds.has(
            String(
              item.delivery
            )
          )
      )
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.deliveryFee ||
              0
          ),
        0
      );

  return {
    summary: {
      today,
      totalEarned,
      unpaid,
      pendingPayout,
      paid,
    },

    payouts:
      payouts.map(
        formatRiderPayout
      ),
  };
};

/*
 * =========================================================
 * RIDER
 * GET ONE PAYOUT
 * =========================================================
 */

export const getRiderPayoutById = async (
  userId,
  payoutId
) => {
  const rider =
    await getRiderProfileByUserId(
      userId
    );

  validateApprovedActiveRider(
    rider
  );

  const payout =
    await RiderPayout.findOne({
      _id:
        payoutId,

      rider:
        rider._id,

      riderUser:
        userId,
    })
      .populate(
        "paidBy",
        "firstName lastName email"
      )
      .populate(
        "items.delivery",
        "_id status deliveredAt"
      )
      .populate(
        "items.order",
        "_id productName deliveryFee orderStatus"
      )
      .lean();

  if (!payout) {
    const error =
      new Error(
        "Rider payout record was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  return formatRiderPayout(
    payout
  );
};

/*
 * =========================================================
 * ADMIN
 * CREATE RIDER PAYOUT
 * =========================================================
 */

export const createAdminRiderPayout = async (
  riderId,
  adminId,
  payoutData = {}
) => {
  const rider =
    await Rider.findById(
      riderId
    );

  if (!rider) {
    const error =
      new Error(
        "Rider profile was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  validateApprovedActiveRider(
    rider
  );

  const periodStart =
    new Date(
      payoutData.periodStart
    );

  const periodEnd =
    new Date(
      payoutData.periodEnd
    );

  if (
    Number.isNaN(
      periodStart.getTime()
    ) ||
    Number.isNaN(
      periodEnd.getTime()
    )
  ) {
    const error =
      new Error(
        "A valid payout period start and end are required."
      );

    error.statusCode =
      400;

    throw error;
  }

  if (
    periodEnd <
    periodStart
  ) {
    const error =
      new Error(
        "Payout period end cannot be earlier than its start."
      );

    error.statusCode =
      400;

    throw error;
  }

  const existing =
    await RiderPayout.findOne({
      rider:
        rider._id,

      status: {
        $in: [
          "pending",
          "paid",
        ],
      },

      periodStart: {
        $lte:
          periodEnd,
      },

      periodEnd: {
        $gte:
          periodStart,
      },
    }).lean();

  if (existing) {
    const error =
      new Error(
        "This Rider already has a pending or paid payout that overlaps this payout period."
      );

    error.statusCode =
      409;

    throw error;
  }

  const items =
    await buildRiderEarningItems(
      rider,
      rider.owner,
      {
        periodStart,
        periodEnd,
        excludeReserved:
          true,
      }
    );

  if (
    items.length ===
    0
  ) {
    const error =
      new Error(
        "No unpaid completed delivery fees were found for this Rider and payout period."
      );

    error.statusCode =
      400;

    throw error;
  }

  const payout =
    new RiderPayout({
      rider:
        rider._id,

      riderUser:
        rider.owner,

      periodStart,

      periodEnd,

      items,

      status:
        "pending",

      createdBy:
        adminId,
    });

  await payout.save();

  await notifySafely({
    recipient: rider.owner,
    role: "rider",
    type: "payout_update",
    title: "Payout being prepared",
    message: `FLOGRAM is preparing your delivery-fee payout of ₱${Number(payout.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}.`,
    metadata: { riderPayoutId: String(payout._id) },
  });

  return getAdminRiderPayoutById(
    payout._id
  );
};

/*
 * =========================================================
 * ADMIN
 * GET RIDER PAYOUTS
 * =========================================================
 */

export const getAdminRiderPayouts = async (
  status = null
) => {
  const allowedStatuses = [
    "pending",
    "paid",
    "cancelled",
  ];

  const filter = {};

  if (status) {
    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      const error =
        new Error(
          "Invalid Rider payout status."
        );

      error.statusCode =
        400;

      throw error;
    }

    filter.status =
      status;
  }

  const payouts =
    await RiderPayout.find(
      filter
    )
      .populate(
        "riderUser",
        "firstName lastName email phoneNumber"
      )
      .populate(
        "paidBy",
        "firstName lastName email"
      )
      .populate(
        "createdBy",
        "firstName lastName email"
      )
      .sort({
        periodStart:
          -1,

        createdAt:
          -1,
      })
      .lean();

  return payouts.map(
    formatRiderPayout
  );
};

/*
 * =========================================================
 * ADMIN
 * GET ONE RIDER PAYOUT
 * =========================================================
 */

export const getAdminRiderPayoutById = async (
  payoutId
) => {
  const payout =
    await RiderPayout.findById(
      payoutId
    )
      .populate(
        "riderUser",
        "firstName lastName email phoneNumber"
      )
      .populate({
        path:
          "rider",

        select:
          "owner vehicleType vehiclePlateNumber verificationStatus isActive",
      })
      .populate(
        "paidBy",
        "firstName lastName email"
      )
      .populate(
        "createdBy",
        "firstName lastName email"
      )
      .populate(
        "cancelledBy",
        "firstName lastName email"
      )
      .populate(
        "items.delivery",
        "_id status deliveredAt"
      )
      .populate(
        "items.order",
        "_id productName deliveryFee orderStatus"
      )
      .lean();

  if (!payout) {
    const error =
      new Error(
        "Rider payout record was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  return formatRiderPayout(
    payout
  );
};

/*
 * =========================================================
 * ADMIN
 * MARK RIDER PAYOUT AS PAID
 * =========================================================
 */

export const markRiderPayoutPaid = async (
  payoutId,
  adminId,
  paymentData = {}
) => {
  const payout =
    await RiderPayout.findById(
      payoutId
    );

  if (!payout) {
    const error =
      new Error(
        "Rider payout record was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  if (
    payout.status ===
    "paid"
  ) {
    const error =
      new Error(
        "This Rider payout has already been marked as paid."
      );

    error.statusCode =
      409;

    throw error;
  }

  if (
    payout.status !==
    "pending"
  ) {
    const error =
      new Error(
        "Only pending Rider payouts can be marked as paid."
      );

    error.statusCode =
      409;

    throw error;
  }

  const referenceNumber =
    String(
      paymentData.referenceNumber ||
        ""
    ).trim();

  const proofImageUrl =
    String(
      paymentData.proofImageUrl ||
        ""
    ).trim();

  const paymentMethod =
    String(
      paymentData.paymentMethod ||
        "Bank Transfer"
    ).trim();

  const adminRemarks =
    String(
      paymentData.adminRemarks ||
        ""
    ).trim();

  if (!referenceNumber) {
    const error =
      new Error(
        "Payment reference number is required."
      );

    error.statusCode =
      400;

    throw error;
  }

  if (!proofImageUrl) {
    const error =
      new Error(
        "Proof of Rider payment is required."
      );

    error.statusCode =
      400;

    throw error;
  }

  /*
   * =====================================================
   * DOUBLE-PAYMENT CHECK
   * =====================================================
   */

  const paidDeliveryIds =
    await getRiderPayoutDeliveryIds(
      payout.rider
    );

  const currentIds =
    new Set(
      (
        payout.items ||
        []
      ).map(
        (item) =>
          String(
            item.delivery
          )
      )
    );

  for (
    const deliveryId
    of paidDeliveryIds
  ) {
    if (
      !currentIds.has(
        deliveryId
      )
    ) {
      continue;
    }

    const duplicate =
      await RiderPayout.exists({
        _id: {
          $ne:
            payout._id,
        },

        status: {
          $in: [
            "pending",
            "paid",
          ],
        },

        "items.delivery":
          deliveryId,
      });

    if (duplicate) {
      const error =
        new Error(
          "One of the deliveries in this payout is already included in another Rider payout."
        );

      error.statusCode =
        409;

      throw error;
    }
  }

  /*
   * =====================================================
   * REVALIDATE PAYOUT ITEMS
   * =====================================================
   */

  const validatedItems =
    [];

  for (
    const item
    of payout.items
  ) {
    const delivery =
      await Delivery.findOne({
        _id:
          item.delivery,

        rider:
          payout.rider,

        riderUser:
          payout.riderUser,

        status:
          "delivered",
      }).lean();

    if (
      !delivery ||
      !delivery.deliveredAt
    ) {
      const error =
        new Error(
          "One of the deliveries in this payout is no longer a valid completed Rider delivery."
        );

      error.statusCode =
        409;

      throw error;
    }

    const order =
      await Order.findById(
        item.order
      )
        .select(
          "_id deliveryFee"
        )
        .lean();

    if (
      !order ||
      String(
        delivery.order
      ) !==
        String(
          order._id
        )
    ) {
      const error =
        new Error(
          "One of the delivery and order records in this Rider payout no longer matches."
        );

      error.statusCode =
        409;

      throw error;
    }

    const authoritativeFee =
      Number(
        order.deliveryFee ||
          0
      );

    if (
      authoritativeFee !==
      Number(
        item.deliveryFee ||
          0
      )
    ) {
      const error =
        new Error(
          "A Rider delivery fee no longer matches the authoritative Order delivery fee."
        );

      error.statusCode =
        409;

      throw error;
    }

    validatedItems.push({
      delivery:
        delivery._id,

      order:
        order._id,

      deliveryFee:
        authoritativeFee,

      deliveredAt:
        delivery.deliveredAt,
    });
  }

  /*
   * =====================================================
   * RECORD EXTERNAL PAYMENT
   * =====================================================
   */

  payout.items =
    validatedItems;

  payout.paymentMethod =
    paymentMethod;

  payout.referenceNumber =
    referenceNumber;

  payout.proofImageUrl =
    proofImageUrl;

  payout.adminRemarks =
    adminRemarks;

  payout.paidAt =
    new Date();

  payout.paidBy =
    adminId;

  payout.status =
    "paid";

  await payout.save();

  await notifySafely({
    recipient: payout.riderUser,
    role: "rider",
    type: "payout_update",
    title: "Payout sent",
    message: `Admin sent your payout of ₱${Number(payout.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} (ref ${payout.referenceNumber || "—"}).`,
    metadata: { riderPayoutId: String(payout._id) },
  });

  return getAdminRiderPayoutById(
    payout._id
  );
};

/*
 * =========================================================
 * ADMIN
 * CANCEL RIDER PAYOUT
 * =========================================================
 */

export const cancelRiderPayout = async (
  payoutId,
  adminId,
  reason
) => {
  const payout =
    await RiderPayout.findById(
      payoutId
    );

  if (!payout) {
    const error =
      new Error(
        "Rider payout record was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  if (
    payout.status ===
    "paid"
  ) {
    const error =
      new Error(
        "A paid Rider payout cannot be cancelled."
      );

    error.statusCode =
      409;

    throw error;
  }

  if (
    payout.status !==
    "pending"
  ) {
    const error =
      new Error(
        "Only pending Rider payouts can be cancelled."
      );

    error.statusCode =
      409;

    throw error;
  }

  const cancellationReason =
    String(
      reason ||
        ""
    ).trim();

  if (!cancellationReason) {
    const error =
      new Error(
        "A Rider payout cancellation reason is required."
      );

    error.statusCode =
      400;

    throw error;
  }

  payout.status =
    "cancelled";

  payout.cancelledAt =
    new Date();

  payout.cancelledBy =
    adminId;

  payout.cancellationReason =
    cancellationReason;

  await payout.save();

  return getAdminRiderPayoutById(
    payout._id
  );
};
/*
 * =========================================================
 * ADMIN
 * RIDER PAYOUT BALANCES (AMOUNT OWED)
 * =========================================================
 *
 * For each approved Rider, returns the completed
 * delivery fees that are not yet included in a
 * pending or paid payout.
 *
 * Admin uses this list to decide which Rider to pay
 * and which payout period to create.
 *
 * COD remittance is NOT included here. Only
 * Order.deliveryFee from delivered orders counts.
 * =========================================================
 */

export const getAdminRiderPayoutBalances = async () => {
  const riders = await Rider.find({
    verificationStatus: "approved",
  })
    .populate(
      "owner",
      "firstName lastName email phoneNumber"
    )
    .lean();

  const balances = await Promise.all(
    riders.map(async (rider) => {
      const ownerId = rider.owner?._id || rider.owner;

      const items = await buildRiderEarningItems(
        rider,
        ownerId,
        { excludeReserved: true }
      );

      const amountOwed = items.reduce(
        (sum, item) => sum + Number(item.deliveryFee || 0),
        0
      );

      const deliveredTimes = items
        .map((item) => new Date(item.deliveredAt).getTime())
        .filter((time) => Number.isFinite(time));

      return {
        riderId: String(rider._id),
        riderUser: rider.owner
          ? {
              id: String(ownerId),
              firstName: rider.owner.firstName || "",
              lastName: rider.owner.lastName || "",
              email: rider.owner.email || "",
              phoneNumber: rider.owner.phoneNumber || "",
            }
          : null,
        isActive: rider.isActive === true,
        unpaidDeliveryCount: items.length,
        amountOwed,
        oldestUnpaidAt: deliveredTimes.length
          ? new Date(Math.min(...deliveredTimes))
          : null,
        latestUnpaidAt: deliveredTimes.length
          ? new Date(Math.max(...deliveredTimes))
          : null,
      };
    })
  );

  return balances.sort(
    (a, b) => b.amountOwed - a.amountOwed
  );
};
