import User from "../auth/auth.model.js";
import Order from "../orders/order.model.js";
import Florist from "../florists/florist.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";

import {
  getPlatformCommissionRate,
} from "./admin-settings.service.js";

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

const getStartOfDay = (date) => {
  const result = new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
};

const getEndOfDay = (date) => {
  const result = new Date(date);

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
};

const getPeriodRange = (
  period = "30d"
) => {
  const normalizedPeriod =
    Object.prototype.hasOwnProperty.call(
      REPORT_PERIODS,
      period
    ) || period === "all"
      ? period
      : "30d";

  const now = new Date();

  const endDate =
    getEndOfDay(now);

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
    getStartOfDay(now);

  startDate.setDate(
    startDate.getDate() -
      (days - 1)
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

const getOnlineSalesReport =
  async ({
    startDate,
    endDate,
    granularity,
  }) => {
    const dateMatch =
      buildDateMatch(
        "paidAt",
        startDate,
        endDate
      );

    const result =
      await Order.aggregate([
        {
          $match: {
            paymentStatus:
              "paid",

            paymentMethod: {
              $ne:
                "cash_on_delivery",
            },

            orderStatus: {
              $ne:
                "cancelled",
            },

            ...dateMatch,
          },
        },

        {
          $facet: {
            total: [
              {
                $group: {
                  _id: null,

                  amount: {
                    $sum:
                      "$totalAmount",
                  },
                },
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

                      date:
                        "$paidAt",
                    },
                  },

                  amount: {
                    $sum:
                      "$totalAmount",
                  },

                  orders: {
                    $sum: 1,
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

    return {
      total:
        safeNumber(
          data.total?.[0]
            ?.amount
        ),

      trend:
        data.trend || [],
    };
  };

/*
 * =========================================================
 * VERIFIED COD SALES
 * =========================================================
 *
 * COD revenue is recognized only after
 * Admin verifies the Rider remittance.
 *
 * Revenue date:
 * verifiedAt
 * =========================================================
 */

const getVerifiedCodSalesReport =
  async ({
    startDate,
    endDate,
    granularity,
  }) => {
    const dateMatch =
      buildDateMatch(
        "verifiedAt",
        startDate,
        endDate
      );

    const result =
      await RiderRemittance.aggregate(
        [
          {
            $match: {
              status:
                "verified",

              ...dateMatch,
            },
          },

          {
            $facet: {
              total: [
                {
                  $group: {
                    _id: null,

                    amount: {
                      $sum:
                        "$totalAmount",
                    },
                  },
                },
              ],

              trend: [
                {
                  $group: {
                    _id: {
                      $dateToString:
                        {
                          format:
                            getMongoDateFormat(
                              granularity
                            ),

                          date:
                            "$verifiedAt",
                        },
                    },

                    amount: {
                      $sum:
                        "$totalAmount",
                    },

                    remittances: {
                      $sum: 1,
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
        ]
      );

    const data =
      result[0] || {};

    return {
      total:
        safeNumber(
          data.total?.[0]
            ?.amount
        ),

      trend:
        data.trend || [],
    };
  };

/*
 * =========================================================
 * MERGE SALES TRENDS
 * =========================================================
 */

const mergeSalesTrends = (
  onlineTrend,
  codTrend
) => {
  const map = new Map();

  for (
    const item of
      onlineTrend
  ) {
    const key =
      item._id;

    map.set(key, {
      period: key,

      online:
        safeNumber(
          item.amount
        ),

      cod: 0,

      total:
        safeNumber(
          item.amount
        ),
    });
  }

  for (
    const item of
      codTrend
  ) {
    const key =
      item._id;

    const existing =
      map.get(key) || {
        period: key,
        online: 0,
        cod: 0,
        total: 0,
      };

    existing.cod =
      safeNumber(
        item.amount
      );

    existing.total =
      existing.online +
      existing.cod;

    map.set(
      key,
      existing
    );
  }

  return Array.from(
    map.values()
  )
    .sort((a, b) =>
      String(
        a.period
      ).localeCompare(
        String(
          b.period
        )
      )
    )
    .map((item) => ({
      ...item,

      online:
        roundMoney(
          item.online
        ),

      cod:
        roundMoney(
          item.cod
        ),

      total:
        roundMoney(
          item.total
        ),
    }));
};

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
 * This is marketplace performance,
 * not recognized financial revenue.
 * =========================================================
 */

const getTopShops =
  async ({
    startDate,
    endDate,
  }) => {
    const dateMatch =
      buildDateMatch(
        "createdAt",
        startDate,
        endDate
      );

    const results =
      await Order.aggregate([
        {
          $match: {
            ...dateMatch,

            orderStatus: {
              $in:
                COMPLETED_ORDER_STATUSES,
            },
          },
        },

        {
          $group: {
            _id:
              "$florist",

            orders: {
              $sum: 1,
            },

            orderValue: {
              $sum:
                "$totalAmount",
            },
          },
        },

        {
          $sort: {
            orderValue: -1,
            orders: -1,
          },
        },

        {
          $limit: 10,
        },
      ]);

    if (
      results.length === 0
    ) {
      return [];
    }

    const floristIds =
      results
        .map(
          (item) =>
            item._id
        )
        .filter(Boolean);

    const florists =
      await Florist.find({
        _id: {
          $in:
            floristIds,
        },
      })
        .select(
          "_id shopName owner verificationStatus"
        )
        .populate(
          "owner",
          "firstName lastName email"
        )
        .lean();

    const floristMap =
      new Map(
        florists.map(
          (florist) => [
            String(
              florist._id
            ),
            florist,
          ]
        )
      );

    return results.map(
      (
        item,
        index
      ) => {
        const florist =
          floristMap.get(
            String(
              item._id
            )
          ) || null;

        return {
          rank:
            index + 1,

          floristId:
            item._id,

          shopName:
            florist
              ?.shopName ||
            "Unknown Shop",

          owner:
            florist
              ?.owner ||
            null,

          verificationStatus:
            florist
              ?.verificationStatus ||
            null,

          orders:
            safeNumber(
              item.orders
            ),

          orderValue:
            roundMoney(
              item.orderValue
            ),
        };
      }
    );
  };

/*
 * =========================================================
 * MAIN ADMIN REPORT
 * =========================================================
 */

export const getAdminReports =
  async (
    period = "30d"
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

    /*
     * Commission comes from Admin Settings.
     */

    const platformCommissionRate =
      await getPlatformCommissionRate();

    const [
      onlineSales,
      codSales,
      orderAnalytics,
      userAnalytics,
      platformUsers,
      remittances,
      topShops,
    ] =
      await Promise.all([
        getOnlineSalesReport({
          startDate,
          endDate,
          granularity,
        }),

        getVerifiedCodSalesReport({
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

        getTopShops({
          startDate,
          endDate,
        }),
      ]);

    /*
     * =====================================================
     * RECOGNIZED SALES
     * =====================================================
     */

    const recognizedSales =
      roundMoney(
        onlineSales.total +
          codSales.total
      );

    const totalCommission =
      roundMoney(
        recognizedSales *
          platformCommissionRate
      );

    const sellerShare =
      roundMoney(
        recognizedSales -
          totalCommission
      );

    const salesTrend =
      mergeSalesTrends(
        onlineSales.trend,
        codSales.trend
      ).map(
        (item) => {
          const commission =
            roundMoney(
              item.total *
                platformCommissionRate
            );

          return {
            ...item,

            commission,

            sellerShare:
              roundMoney(
                item.total -
                  commission
              ),
          };
        }
      );

    /*
     * =====================================================
     * ORDER RATES
     * =====================================================
     */

    const completionRate =
      orderAnalytics.total >
      0
        ? roundMoney(
            (orderAnalytics
              .completed /
              orderAnalytics
                .total) *
              100
          )
        : 0;

    const cancellationRate =
      orderAnalytics.total >
      0
        ? roundMoney(
            (orderAnalytics
              .cancelled /
              orderAnalytics
                .total) *
              100
          )
        : 0;

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

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

        recognizedSales,

        commission:
          totalCommission,

        sellerShare,
      },

      sales: {
        total:
          recognizedSales,

        online:
          roundMoney(
            onlineSales.total
          ),

        cod:
          roundMoney(
            codSales.total
          ),

        commissionRate:
          platformCommissionRate,

        commissionPercentage:
          Math.round(
            platformCommissionRate *
              10000
          ) / 100,

        commission:
          totalCommission,

        sellerShare,

        trend:
          salesTrend,
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
          orderAnalytics
            .byFulfillment,

        byPaymentMethod:
          orderAnalytics
            .byPaymentMethod,

        byPaymentStatus:
          orderAnalytics
            .byPaymentStatus,

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
          userAnalytics
            .newCustomers,

        newSellers:
          userAnalytics
            .newSellers,

        newRiders:
          userAnalytics
            .newRiders,

        growth:
          userAnalytics.growth,
      },

      remittances,

      topShops,
    };
  };