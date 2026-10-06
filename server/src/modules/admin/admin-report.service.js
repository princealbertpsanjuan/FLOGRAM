import User from "../auth/auth.model.js";
import Order from "../orders/order.model.js";
import Florist from "../florists/florist.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";

import {
  endOfManilaDay,
  getRevenueSummary,
  startOfManilaDay,
} from "./revenue.service.js";

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const COMPLETED_ORDER_STATUSES = [
  "delivered",
  "completed",
];

const REPORT_PERIODS = {
  today: 1,
  "7d": 7,
  "30d": 30,
  "6m": 183,
  "1y": 365,
};

/*
 * =========================================================
 * DATE HELPERS
 * =========================================================
 */

/*
 * Report periods are Philippine calendar days.
 * "today" = 00:00 Manila today until now.
 */
const getPeriodRange = (
  period = "today"
) => {
  const normalizedPeriod =
    Object.prototype.hasOwnProperty.call(
      REPORT_PERIODS,
      period
    ) || period === "all"
      ? period
      : "today";

  const now = new Date();

  const endDate =
    endOfManilaDay(now);

  if (normalizedPeriod === "all") {
    return {
      key: "all",
      startDate: null,
      endDate,
    };
  }

  const days =
    REPORT_PERIODS[
      normalizedPeriod
    ];

  const startDate =
    new Date(
      startOfManilaDay(now).getTime() -
        (days - 1) *
          24 *
          60 *
          60 *
          1000
    );

  return {
    key: normalizedPeriod,
    startDate,
    endDate,
  };
};

const buildDateMatch = (
  field,
  startDate,
  endDate
) => {
  if (!startDate) {
    return {
      [field]: {
        $lte: endDate,
      },
    };
  }

  return {
    [field]: {
      $gte: startDate,
      $lte: endDate,
    },
  };
};

/*
 * =========================================================
 * NUMBER HELPERS
 * =========================================================
 */

const safeNumber = (value) => {
  const number =
    Number(value || 0);

  return Number.isFinite(number)
    ? number
    : 0;
};

const roundMoney = (value) =>
  Math.round(
    (safeNumber(value) +
      Number.EPSILON) *
      100
  ) / 100;

/*
 * =========================================================
 * TREND HELPERS
 * =========================================================
 */

const getTrendGranularity = (
  period
) => {
  if (
    period === "today" ||
    period === "7d" ||
    period === "30d"
  ) {
    return "day";
  }

  return "month";
};

const getMongoDateFormat = (
  granularity
) => {
  if (granularity === "day") {
    return "%Y-%m-%d";
  }

  return "%Y-%m";
};

/*
 * =========================================================
 * ONLINE SALES
 * =========================================================
 *
 * Recognized online sales:
 *
 * paymentStatus = paid
 * paymentMethod != cash_on_delivery
 * orderStatus != cancelled
 *
 * Revenue date:
 * paidAt
 * =========================================================
 */

/*
 * =========================================================
 * ORDER ANALYTICS
 * =========================================================
 */

const getOrderAnalytics =
  async ({
    startDate,
    endDate,
    granularity,
  }) => {
    const dateMatch =
      buildDateMatch(
        "createdAt",
        startDate,
        endDate
      );

    const result =
      await Order.aggregate([
        {
          $match:
            dateMatch,
        },

        {
          $facet: {
            total: [
              {
                $count:
                  "count",
              },
            ],

            completed: [
              {
                $match: {
                  orderStatus: {
                    $in:
                      COMPLETED_ORDER_STATUSES,
                  },
                },
              },

              {
                $count:
                  "count",
              },
            ],

            cancelled: [
              {
                $match: {
                  orderStatus:
                    "cancelled",
                },
              },

              {
                $count:
                  "count",
              },
            ],

            byStatus: [
              {
                $group: {
                  _id:
                    "$orderStatus",

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            byFulfillment: [
              {
                $group: {
                  _id:
                    "$fulfillmentType",

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            byPaymentMethod: [
              {
                $group: {
                  _id:
                    "$paymentMethod",

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            byPaymentStatus: [
              {
                $group: {
                  _id:
                    "$paymentStatus",

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            bySource: [
              {
                $group: {
                  _id:
                    "$sourceType",

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  count: -1,
                },
              },
            ],

            preOrders: [
              {
                $match: {
                  isPreOrder:
                    true,
                },
              },

              {
                $count:
                  "count",
              },
            ],

            trend: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format:
                        getMongoDateFormat(
                          granularity
                        ),

                      timezone: "Asia/Manila",

                      date:
                        "$createdAt",
                    },
                  },

                  orders: {
                    $sum: 1,
                  },

                  grossOrderValue: {
                    $sum:
                      "$totalAmount",
                  },
                },
              },

              {
                $sort: {
                  _id: 1,
                },
              },
            ],
          },
        },
      ]);

    const data =
      result[0] || {};

    const mapBreakdown = (
      items = []
    ) =>
      items.map(
        (item) => ({
          key:
            item._id ??
            "unknown",

          count:
            safeNumber(
              item.count
            ),
        })
      );

    return {
      total:
        safeNumber(
          data.total?.[0]
            ?.count
        ),

      completed:
        safeNumber(
          data.completed?.[0]
            ?.count
        ),

      cancelled:
        safeNumber(
          data.cancelled?.[0]
            ?.count
        ),

      preOrders:
        safeNumber(
          data.preOrders?.[0]
            ?.count
        ),

      byStatus:
        mapBreakdown(
          data.byStatus
        ),

      byFulfillment:
        mapBreakdown(
          data.byFulfillment
        ),

      byPaymentMethod:
        mapBreakdown(
          data.byPaymentMethod
        ),

      byPaymentStatus:
        mapBreakdown(
          data.byPaymentStatus
        ),

      bySource:
        mapBreakdown(
          data.bySource
        ),

      trend:
        (
          data.trend || []
        ).map(
          (item) => ({
            period:
              item._id,

            orders:
              safeNumber(
                item.orders
              ),

            grossOrderValue:
              roundMoney(
                item
                  .grossOrderValue
              ),
          })
        ),
    };
  };

/*
 * =========================================================
 * USER ANALYTICS
 * =========================================================
 */

const getUserAnalytics =
  async ({
    startDate,
    endDate,
    granularity,
  }) => {
    const dateMatch =
      buildDateMatch(
        "createdAt",
        startDate,
        endDate
      );

    const result =
      await User.aggregate([
        {
          $match: {
            role: {
              $in: [
                "customer",
                "seller",
                "rider",
              ],
            },

            ...dateMatch,
          },
        },

        {
          $facet: {
            total: [
              {
                $count:
                  "count",
              },
            ],

            byRole: [
              {
                $group: {
                  _id:
                    "$role",

                  count: {
                    $sum: 1,
                  },
                },
              },
            ],

            growth: [
              {
                $group: {
                  _id: {
                    period: {
                      $dateToString:
                        {
                          format:
                            getMongoDateFormat(
                              granularity
                            ),

                      timezone: "Asia/Manila",

                          date:
                            "$createdAt",
                        },
                    },

                    role:
                      "$role",
                  },

                  count: {
                    $sum: 1,
                  },
                },
              },

              {
                $sort: {
                  "_id.period":
                    1,
                },
              },
            ],
          },
        },
      ]);

    const data =
      result[0] || {};

    const roleCounts = {
      customer: 0,
      seller: 0,
      rider: 0,
    };

    for (
      const item of
        data.byRole || []
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          roleCounts,
          item._id
        )
      ) {
        roleCounts[
          item._id
        ] =
          safeNumber(
            item.count
          );
      }
    }

    const growthMap =
      new Map();

    for (
      const item of
        data.growth || []
    ) {
      const periodKey =
        item._id?.period;

      const role =
        item._id?.role;

      if (!periodKey) {
        continue;
      }

      const existing =
        growthMap.get(
          periodKey
        ) || {
          period:
            periodKey,

          customers: 0,
          sellers: 0,
          riders: 0,
          total: 0,
        };

      const count =
        safeNumber(
          item.count
        );

      if (
        role ===
        "customer"
      ) {
        existing.customers +=
          count;
      }

      if (
        role ===
        "seller"
      ) {
        existing.sellers +=
          count;
      }

      if (
        role ===
        "rider"
      ) {
        existing.riders +=
          count;
      }

      existing.total +=
        count;

      growthMap.set(
        periodKey,
        existing
      );
    }

    return {
      newUsers:
        safeNumber(
          data.total?.[0]
            ?.count
        ),

      newCustomers:
        roleCounts.customer,

      newSellers:
        roleCounts.seller,

      newRiders:
        roleCounts.rider,

      growth:
        Array.from(
          growthMap.values()
        ).sort((a, b) =>
          String(
            a.period
          ).localeCompare(
            String(
              b.period
            )
          )
        ),
    };
  };

/*
 * =========================================================
 * TOTAL PLATFORM USERS
 * =========================================================
 */

const getTotalPlatformUsers =
  async () => {
    const [
      total,
      customers,
      sellers,
      riders,
    ] = await Promise.all([
      User.countDocuments({
        role: {
          $in: [
            "customer",
            "seller",
            "rider",
          ],
        },
      }),

      User.countDocuments({
        role:
          "customer",
      }),

      User.countDocuments({
        role:
          "seller",
      }),

      User.countDocuments({
        role:
          "rider",
      }),
    ]);

    return {
      total,
      customers,
      sellers,
      riders,
    };
  };

/*
 * =========================================================
 * REMITTANCE ANALYTICS
 * =========================================================
 */

const getRemittanceAnalytics =
  async ({
    startDate,
    endDate,
  }) => {
    const createdMatch =
      buildDateMatch(
        "createdAt",
        startDate,
        endDate
      );

    const verifiedMatch =
      buildDateMatch(
        "verifiedAt",
        startDate,
        endDate
      );

    const [
      statusResult,
      verifiedAmountResult,
    ] =
      await Promise.all([
        RiderRemittance.aggregate(
          [
            {
              $match:
                createdMatch,
            },

            {
              $group: {
                _id:
                  "$status",

                count: {
                  $sum: 1,
                },
              },
            },
          ]
        ),

        RiderRemittance.aggregate(
          [
            {
              $match: {
                status:
                  "verified",

                ...verifiedMatch,
              },
            },

            {
              $group: {
                _id: null,

                amount: {
                  $sum:
                    "$totalAmount",
                },

                count: {
                  $sum: 1,
                },
              },
            },
          ]
        ),
      ]);

    const statusCounts = {
      pending: 0,
      submitted: 0,
      verified: 0,
      rejected: 0,
    };

    for (
      const item of
        statusResult
    ) {
      if (
        Object.prototype.hasOwnProperty.call(
          statusCounts,
          item._id
        )
      ) {
        statusCounts[
          item._id
        ] =
          safeNumber(
            item.count
          );
      }
    }

    const verified =
      verifiedAmountResult[0] ||
      {};

    return {
      total:
        statusCounts.pending +
        statusCounts.submitted +
        statusCounts.verified +
        statusCounts.rejected,

      pending:
        statusCounts.pending,

      submitted:
        statusCounts.submitted,

      verified:
        statusCounts.verified,

      rejected:
        statusCounts.rejected,

      verifiedInPeriod:
        safeNumber(
          verified.count
        ),

      verifiedAmount:
        roundMoney(
          verified.amount
        ),

      awaitingVerification:
        statusCounts.submitted,
    };
  };

/*
 * =========================================================
 * TOP SHOPS
 * =========================================================
 *
 * Ranked by recognized product sales in the period (same
 * money the Sales section counts), not by order totals that
 * still include Rider delivery fees.
 */
const getTopShops = async (entries) => {
  const byShop = new Map();

  entries.forEach((entry) => {
    if (!entry.florist) return;
    const current = byShop.get(entry.florist) || { orders: 0, productSales: 0 };
    current.orders += 1;
    current.productSales += entry.productSales;
    byShop.set(entry.florist, current);
  });

  const ranked = [...byShop.entries()]
    .sort((a, b) => b[1].productSales - a[1].productSales || b[1].orders - a[1].orders)
    .slice(0, 10);

  if (!ranked.length) return [];

  const florists = await Florist.find({ _id: { $in: ranked.map(([id]) => id) } })
    .select("_id shopName owner verificationStatus")
    .populate("owner", "firstName lastName email")
    .lean();

  const floristMap = new Map(florists.map((florist) => [String(florist._id), florist]));

  return ranked.map(([floristId, stats], index) => {
    const florist = floristMap.get(floristId) || null;

    return {
      rank: index + 1,
      floristId,
      shopName: florist?.shopName || "Unknown Shop",
      owner: florist?.owner || null,
      verificationStatus: florist?.verificationStatus || null,
      orders: stats.orders,
      orderValue: roundMoney(stats.productSales),
    };
  });
};

/*
 * =========================================================
 * MAIN ADMIN REPORT
 * =========================================================
 */

export const getAdminReports =
  async (
    period = "today"
  ) => {
    const {
      key,
      startDate,
      endDate,
    } =
      getPeriodRange(
        period
      );

    const granularity =
      getTrendGranularity(
        key
      );

    const [
      revenue,
      orderAnalytics,
      userAnalytics,
      platformUsers,
      remittances,
    ] =
      await Promise.all([
        getRevenueSummary({
          startDate,
          endDate,
          granularity,
        }),

        getOrderAnalytics({
          startDate,
          endDate,
          granularity,
        }),

        getUserAnalytics({
          startDate,
          endDate,
          granularity,
        }),

        getTotalPlatformUsers(),

        getRemittanceAnalytics({
          startDate,
          endDate,
        }),
      ]);

    const topShops =
      await getTopShops(
        revenue.entries
      );

    /*
     * Rates use orders that reached an outcome
     * (completed or cancelled), so orders still in
     * progress do not lower the completion rate.
     */
    const finished =
      orderAnalytics.completed +
      orderAnalytics.cancelled;

    const completionRate =
      finished > 0
        ? roundMoney(
            (orderAnalytics.completed /
              finished) *
              100
          )
        : 0;

    const cancellationRate =
      finished > 0
        ? roundMoney(
            (orderAnalytics.cancelled /
              finished) *
              100
          )
        : 0;

    const commissionPercentage =
      Math.round(
        revenue.commissionRate *
          10000
      ) / 100;

    return {
      period: {
        key,
        startDate:
          startDate
            ? startDate.toISOString()
            : null,
        endDate:
          endDate.toISOString(),
        granularity,
        timezone: "Asia/Manila",
      },

      overview: {
        totalUsers:
          platformUsers.total,
        totalCustomers:
          platformUsers.customers,
        totalSellers:
          platformUsers.sellers,
        totalRiders:
          platformUsers.riders,
        totalOrders:
          orderAnalytics.total,
        completedOrders:
          orderAnalytics.completed,
        cancelledOrders:
          orderAnalytics.cancelled,
        completionRate,
        cancellationRate,
        recognizedSales:
          revenue.gross,
        productSales:
          revenue.productSales,
        commission:
          revenue.commission,
        sellerShare:
          revenue.sellerShare,
      },

      sales: {
        /*
         * total = everything customers paid
         * (products + delivery fees).
         */
        total:
          revenue.gross,
        orders:
          revenue.orders,
        online:
          revenue.online,
        cod:
          revenue.cod,
        pickup:
          revenue.pickup,
        deliveryFees:
          revenue.deliveryFees,
        productSales:
          revenue.productSales,
        commissionRate:
          revenue.commissionRate,
        commissionPercentage,
        commission:
          revenue.commission,
        sellerShare:
          revenue.sellerShare,
        trend:
          revenue.trend,
      },

      orders: {
        total:
          orderAnalytics.total,
        completed:
          orderAnalytics.completed,
        cancelled:
          orderAnalytics.cancelled,
        preOrders:
          orderAnalytics.preOrders,
        completionRate,
        cancellationRate,
        byStatus:
          orderAnalytics.byStatus,
        byFulfillment:
          orderAnalytics.byFulfillment,
        byPaymentMethod:
          orderAnalytics.byPaymentMethod,
        byPaymentStatus:
          orderAnalytics.byPaymentStatus,
        bySource:
          orderAnalytics.bySource,
        trend:
          orderAnalytics.trend,
      },

      users: {
        total:
          platformUsers.total,
        customers:
          platformUsers.customers,
        sellers:
          platformUsers.sellers,
        riders:
          platformUsers.riders,
        newUsers:
          userAnalytics.newUsers,
        newCustomers:
          userAnalytics.newCustomers,
        newSellers:
          userAnalytics.newSellers,
        newRiders:
          userAnalytics.newRiders,
        growth:
          userAnalytics.growth,
      },

      remittances,

      topShops,
    };
  };
