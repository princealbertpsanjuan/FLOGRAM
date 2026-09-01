import Rider from "./rider.model.js";
import User from "../auth/auth.model.js";
import Verification from "../verification/verification.model.js";
import Delivery from "../deliveries/delivery.model.js";
import Order from "../orders/order.model.js";
import RiderRemittance from "./rider-remittance.model.js";

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
    return Rider.find({
      verificationStatus:
        "pending",
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
 *
 * Dashboard contains:
 *
 * - Rider availability
 * - Delivery statistics
 * - Total value of delivered orders
 * - Rider rating
 *
 * IMPORTANT:
 *
 * deliveryValue is NOT Rider salary.
 *
 * It represents the monetary value of
 * orders successfully handled/delivered
 * by the Rider.
 *
 * Rider salary/payroll is a separate
 * FLOGRAM feature.
 *
 * Rating remains null until a Rider
 * review module is implemented.
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

    /*
     * Dashboard can be accessed whether
     * the Rider is online or offline.
     */

    validateApprovedActiveRider(
      rider
    );

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
     * We first obtain deliveries owned
     * by this Rider.
     *
     * Only deliveries with status
     * "delivered" contribute to the
     * dashboard monetary value.
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

    /*
     * =====================================================
     * ORDER VALUES
     * =====================================================
     *
     * totalAmount already represents
     * the complete amount charged for
     * the order.
     *
     * It already includes applicable
     * order charges such as:
     *
     * - flower/product subtotal
     * - delivery fee
     * - pre-order fee, when applicable
     *
     * Therefore we DO NOT add
     * deliveryFee separately.
     * =====================================================
     */

    const orders =
      orderIds.length > 0
        ? await Order.find({
            _id: {
              $in:
                orderIds,
            },
          })
            .select(
              "_id totalAmount"
            )
            .lean()
        : [];

    const orderValueById =
      new Map(
        orders.map(
          (order) => [
            String(
              order._id
            ),

            Number(
              order.totalAmount ||
                0
            ),
          ]
        )
      );

    /*
     * =====================================================
     * PHILIPPINE DATE BOUNDARIES
     * =====================================================
     *
     * Dashboard values for:
     *
     * - today
     * - this month
     *
     * follow Philippine time (UTC+8),
     * even if the backend server runs
     * in UTC.
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
     * DELIVERY VALUE
     * =====================================================
     *
     * This is NOT Rider earnings.
     *
     * It is the total value of orders
     * successfully delivered by the
     * Rider.
     */

    let totalDeliveryValue =
      0;

    let todayDeliveryValue =
      0;

    let thisMonthDeliveryValue =
      0;

    deliveredDeliveries.forEach(
      (delivery) => {
        const orderValue =
          orderValueById.get(
            String(
              delivery.order
            )
          ) || 0;

        /*
         * Total value includes every
         * successfully delivered order.
         */

        totalDeliveryValue +=
          orderValue;

        /*
         * Date-specific values require
         * deliveredAt.
         */

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
          todayDeliveryValue +=
            orderValue;
        }

        if (
          deliveredTime >=
          monthStartPH
        ) {
          thisMonthDeliveryValue +=
            orderValue;
        }
      }
    );

    /*
     * =====================================================
     * RATING
     * =====================================================
     *
     * Rider rating/review model has not
     * been implemented yet.
     *
     * Never fabricate a rating.
     */

    /*
 * =====================================================
 * WEEKLY DELIVERY STATISTICS
 * =====================================================
 *
 * Shows successfully completed deliveries
 * for the current Philippine calendar week.
 *
 * Week:
 *
 * Monday -> Sunday
 *
 * IMPORTANT:
 *
 * These values come from real delivered
 * Delivery records.
 *
 * They are NOT hardcoded.
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

/*
 * phNow is already shifted to Philippine
 * time above.
 *
 * getUTCDay():
 *
 * Sunday = 0
 * Monday = 1
 * ...
 * Saturday = 6
 */

const phDayOfWeek =
  phNow.getUTCDay();

/*
 * Convert the JS Sunday-first index into
 * a Monday-first index.
 *
 * Monday = 0
 * Tuesday = 1
 * ...
 * Sunday = 6
 */

const mondayIndex =
  (phDayOfWeek + 6) %
  7;

/*
 * Start of the current Monday in
 * Philippine time, converted back to UTC.
 */

const weekStartPH =
  Date.UTC(
    phNow.getUTCFullYear(),
    phNow.getUTCMonth(),
    phNow.getUTCDate() -
      mondayIndex
  ) -
  PH_OFFSET_MS;

/*
 * Start of next Monday.
 */

const nextWeekStartPH =
  weekStartPH +
  7 *
    24 *
    60 *
    60 *
    1000;

/*
 * Start with zero deliveries for
 * every day.
 */

const weeklyDeliveryCounts =
  [0, 0, 0, 0, 0, 0, 0];

/*
 * Count only successfully delivered
 * deliveries belonging to the
 * current Philippine week.
 */

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

    /*
     * Ignore deliveries outside
     * the current PH week.
     */

    if (
      deliveredTime <
        weekStartPH ||
      deliveredTime >=
        nextWeekStartPH
    ) {
      return;
    }

    /*
     * Determine which Philippine
     * calendar day this delivery
     * belongs to.
     */

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

/*
 * Mobile-friendly response.
 */

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
 *
 * Percentage of finished delivery
 * attempts that were successfully
 * delivered.
 *
 * Active deliveries are excluded
 * because they are not finished yet.
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
 * Rider rating/review model has not
 * been implemented yet.
 *
 * Never fabricate a rating.
 */

const rating = {
  average:
    null,

  count:
    0,
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

      deliveries: {
        total,
        completed,
        active,
        cancelled,
      },

      /*
       * NOT RIDER SALARY.
       *
       * Total monetary value of orders
       * handled through completed
       * deliveries.
       */
deliveryValue: {
  /*
   * NOT RIDER EARNINGS.
   *
   * Monetary value of successfully
   * delivered customer orders.
   */

  total:
    totalDeliveryValue,

  today:
    todayDeliveryValue,

  thisMonth:
    thisMonthDeliveryValue,
},

/*
 * =====================================================
 * PERFORMANCE
 * =====================================================
 */

performance: {
  completionRate,
},

/*
 * =====================================================
 * CURRENT WEEK
 * =====================================================
 */

weeklyDeliveries,

/*
 * =====================================================
 * RATING
 * =====================================================
 *
 * Remains null until the Review /
 * Rating module is implemented.
 */

rating,
    };
  };


/*
 * =========================================================
 * RIDER
 * WALLET
 * =========================================================
 *
 * BUSINESS RULE:
 *
 * One Rider + one Philippine calendar day
 * = one shift remittance.
 *
 * All delivered + paid COD orders completed
 * by the Rider during that day are grouped
 * into ONE remittance.
 *
 * PayMongo / online payments remain visible
 * in transaction history but are never
 * included in Rider remittance.
 *
 * Rider salary/payroll is separate.
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
    /*
     * =====================================================
     * RIDER PROFILE
     * =====================================================
     */

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

    /*
     * =====================================================
     * DELIVERED RIDER ORDERS
     * =====================================================
     */

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
     *
     * Each Philippine calendar day becomes
     * one potential Rider remittance.
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

      /*
       * Only delivered + paid COD orders
       * belong to Rider remittance.
       */

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

          /*
           * order.totalAmount is already
           * the complete customer payment.
           *
           * Do NOT add deliveryFee again.
           */
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
     *
     * Old version:
     *
     * one delivery = one remittance
     *
     * New version:
     *
     * one Rider + one Philippine day
     * = one remittance
     *
     * Only legacy records without shiftDate
     * are removed.
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

    for (
      const group
      of shiftGroups.values()
    ) {
      const existing =
        await RiderRemittance.findOne({
          rider:
            rider._id,

          riderUser:
            userId,

          shiftDate:
            group.shiftDate,
        });

      /*
       * No remittance yet for this day.
       */

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

      /*
       * Once submitted or verified,
       * do not silently modify what
       * was submitted.
       */

      if (
        [
          "submitted",
          "verified",
        ].includes(
          existing.status
        )
      ) {
        continue;
      }

      /*
       * Pending/rejected shifts may
       * still be synchronized.
       */

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
     *
     * Individual deliveries remain visible
     * even though COD remittance is grouped
     * per shift/day.
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
              /*
               * DELIVERY
               */

              deliveryId:
                String(
                  delivery._id
                ),

              deliveryStatus:
                delivery.status,

              deliveredAt:
                delivery.deliveredAt ||
                null,

              /*
               * ORDER
               */

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

              /*
               * PAYMENT
               */

              amount:
                Number(
                  order.totalAmount ||
                    0
                ),

              paymentMethod:
                order.paymentMethod ||
                null,

              paymentStatus:
                order.paymentStatus ||
                null,

              /*
               * DAILY REMITTANCE
               */

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
     * CURRENT PHILIPPINE SHIFT
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
     * CASH COLLECTED TODAY
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

    /*
     * =====================================================
     * TOTAL HISTORICAL COD COLLECTED
     * =====================================================
     */

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
            total,
            transaction
          ) =>
            total +
            Number(
              transaction.amount ||
                0
            ),
          0
        );

    /*
     * =====================================================
     * REMITTANCE TOTALS
     * =====================================================
     */

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
              total,
              remittance
            ) =>
              total +
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

    /*
     * =====================================================
     * TRANSACTION COUNTS
     * =====================================================
     */

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

    /*
     * =====================================================
     * DAILY REMITTANCE HISTORY
     * =====================================================
     */

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

    /*
     * =====================================================
     * CURRENT SHIFT SUMMARY
     * =====================================================
     *
     * Mobile Rider Wallet should use this
     * record for the end-of-day submission.
     * =====================================================
     */

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

      /*
       * Today's shift remittance.
       */
      currentShift,

      /*
       * Individual delivered orders.
       */
      transactions,

      /*
       * One remittance record per day.
       */
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
 * One submission covers every COD delivery
 * included in the selected Rider shift/day.
 *
 * pending
 *    ↓
 * submitted
 *    ↓
 * Admin verifies/rejects later
 *
 * rejected may be corrected and resubmitted.
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
     * REMITTANCE OWNERSHIP
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
     * VERIFY EVERY DELIVERY / ORDER
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

      /*
       * Delivery and Order must match.
       */

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

      /*
       * Only COD is remitted.
       */

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

      /*
       * COD must already be paid.
       */

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

      /*
       * Verify that this delivery belongs
       * to the same Philippine calendar
       * day as the remittance.
       */

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

      /*
       * Never trust amount supplied by
       * the mobile application.
       *
       * Rebuild it from Order.totalAmount.
       */

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
     * LOCK AUTHORITATIVE SHIFT CONTENT
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

    /*
     * Clear previous Admin decision
     * when a rejected shift is
     * resubmitted.
     */

    remittance.adminRemarks =
      "";

    remittance.verifiedAt =
      null;

    remittance.verifiedBy =
      null;

    /*
     * Your RiderRemittance model should
     * recalculate totalAmount from items
     * before validation/save.
     */

    await remittance.save();

    /*
     * =====================================================
     * FINAL RESPONSE
     * =====================================================
     */

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