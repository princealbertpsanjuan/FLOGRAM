import User from "../auth/auth.model.js";
import Order from "../orders/order.model.js";
import Florist from "../florists/florist.model.js";
import Rider from "../riders/rider.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";

import {
  getPlatformCommissionRate,
} from "./admin-settings.service.js";

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const ACTIVE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "ready_for_delivery",
  "out_for_delivery",
];

const COMPLETED_ORDER_STATUSES = [
  "delivered",
  "completed",
];

/*
 * =========================================================
 * DATE HELPERS
 * =========================================================
 */

const getStartOfToday = () => {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
};

const getStartOfTomorrow = () => {
  const start = getStartOfToday();

  const tomorrow = new Date(start);

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  return tomorrow;
};

/*
 * =========================================================
 * ONLINE PAYMENT SALES
 * =========================================================
 *
 * COD orders are intentionally excluded here.
 *
 * COD money is only recognized after:
 *
 * 1. Rider collects the COD payment
 * 2. Rider submits the remittance
 * 3. Admin verifies the remittance
 *
 * This prevents COD money that is still
 * with the rider from being counted as
 * recognized platform sales.
 * =========================================================
 */

const getOnlinePaymentSales = async (
  additionalMatch = {}
) => {
  const result = await Order.aggregate([
    {
      $match: {
        paymentStatus: "paid",

        paymentMethod: {
          $ne: "cash_on_delivery",
        },

        orderStatus: {
          $ne: "cancelled",
        },

        ...additionalMatch,
      },
    },

    {
      $group: {
        _id: null,

        total: {
          $sum: "$totalAmount",
        },
      },
    },
  ]);

  return result[0]?.total || 0;
};

/*
 * =========================================================
 * VERIFIED COD SALES
 * =========================================================
 *
 * A COD transaction becomes recognized only
 * after the Admin verifies the rider remittance.
 *
 * RiderRemittance.totalAmount is used because
 * this is the actual amount submitted and
 * verified through the COD remittance process.
 * =========================================================
 */

const getVerifiedCodSales = async (
  additionalMatch = {}
) => {
  const result =
    await RiderRemittance.aggregate([
      {
        $match: {
          status: "verified",

          ...additionalMatch,
        },
      },

      {
        $group: {
          _id: null,

          total: {
            $sum: "$totalAmount",
          },
        },
      },
    ]);

  return result[0]?.total || 0;
};

/*
 * =========================================================
 * RECENT ORDER ACTIVITY
 * =========================================================
 */

const getRecentOrders = async () => {
  const orders = await Order.find({})
    .sort({
      updatedAt: -1,
    })
    .limit(5)
    .select(
      "_id productName totalAmount orderStatus paymentStatus paymentMethod createdAt updatedAt"
    )
    .populate(
      "customer",
      "firstName lastName email"
    )
    .populate(
      "seller",
      "firstName lastName email"
    )
    .populate(
      "florist",
      "shopName"
    )
    .lean();

  return orders.map((order) => ({
    type: "order",

    id: order._id,

    title:
      order.productName ||
      "Order",

    orderStatus:
      order.orderStatus,

    paymentStatus:
      order.paymentStatus,

    paymentMethod:
      order.paymentMethod,

    totalAmount:
      order.totalAmount || 0,

    customer:
      order.customer || null,

    seller:
      order.seller || null,

    florist:
      order.florist || null,

    createdAt:
      order.createdAt,

    updatedAt:
      order.updatedAt,
  }));
};

/*
 * =========================================================
 * RECENT SELLER APPLICATIONS
 * =========================================================
 */

const getRecentSellerApplications =
  async () => {
    const florists =
      await Florist.find({
        verificationStatus:
          "pending",
      })
        .sort({
          createdAt: -1,
        })
        .limit(3)
        .populate(
          "owner",
          "firstName lastName email phoneNumber role verificationStatus"
        )
        .select(
          "_id owner shopName verificationStatus createdAt updatedAt"
        )
        .lean();

    return florists.map(
      (florist) => ({
        type:
          "seller_verification",

        id:
          florist._id,

        title:
          florist.shopName,

        verificationStatus:
          florist.verificationStatus,

        owner:
          florist.owner || null,

        createdAt:
          florist.createdAt,

        updatedAt:
          florist.updatedAt,
      })
    );
  };

/*
 * =========================================================
 * RECENT RIDER APPLICATIONS
 * =========================================================
 */

const getRecentRiderApplications =
  async () => {
    const riders =
      await Rider.find({
        verificationStatus:
          "pending",
      })
        .sort({
          createdAt: -1,
        })
        .limit(3)
        .populate(
          "owner",
          "firstName lastName email phoneNumber role verificationStatus"
        )
        .select(
          "_id owner vehicleType vehiclePlateNumber verificationStatus createdAt updatedAt"
        )
        .lean();

    return riders.map(
      (rider) => ({
        type:
          "rider_verification",

        id:
          rider._id,

        title:
          rider.vehicleType
            ? `${rider.vehicleType} rider`
            : "Rider application",

        verificationStatus:
          rider.verificationStatus,

        owner:
          rider.owner || null,

        vehicleType:
          rider.vehicleType,

        vehiclePlateNumber:
          rider.vehiclePlateNumber,

        createdAt:
          rider.createdAt,

        updatedAt:
          rider.updatedAt,
      })
    );
  };

/*
 * =========================================================
 * RECENT COD REMITTANCES
 * =========================================================
 */

const getRecentRemittances =
  async () => {
    const remittances =
      await RiderRemittance.find({
        status: "submitted",
      })
        .sort({
          submittedAt: -1,
        })
        .limit(3)
        .populate(
          "riderUser",
          "firstName lastName email phoneNumber"
        )
        .select(
          "_id rider riderUser shiftDate totalAmount status referenceNumber submittedAt createdAt updatedAt"
        )
        .lean();

    return remittances.map(
      (remittance) => ({
        type:
          "remittance",

        id:
          remittance._id,

        title:
          "COD Remittance",

        totalAmount:
          remittance.totalAmount ||
          0,

        status:
          remittance.status,

        referenceNumber:
          remittance.referenceNumber,

        riderUser:
          remittance.riderUser ||
          null,

        shiftDate:
          remittance.shiftDate,

        submittedAt:
          remittance.submittedAt,

        createdAt:
          remittance.createdAt,

        updatedAt:
          remittance.updatedAt,
      })
    );
  };

/*
 * =========================================================
 * ADMIN DASHBOARD
 * =========================================================
 */

export const getAdminDashboard =
  async () => {
    const startOfToday =
      getStartOfToday();

    const startOfTomorrow =
      getStartOfTomorrow();

    /*
     * =====================================================
     * LOAD DASHBOARD DATA
     * =====================================================
     *
     * The platform commission rate is loaded from the
     * Admin Settings collection so Dashboard, Reports,
     * and Settings can use the same source of truth.
     * =====================================================
     */

    const [
      platformCommissionRate,

      totalUsers,
      totalCustomers,
      totalSellers,
      totalRiders,

      totalOrders,
      activeOrders,
      completedOrders,
      cancelledOrders,

      totalOnlineSales,
      todayOnlineSales,

      totalVerifiedCodSales,
      todayVerifiedCodSales,

      pendingSellers,
      pendingRiders,

      pendingRemittances,
      submittedRemittances,
      verifiedRemittances,

      recentOrders,
      recentSellerApplications,
      recentRiderApplications,
      recentRemittances,
    ] = await Promise.all([
      getPlatformCommissionRate(),

      /*
       * USERS
       */

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
        role: "customer",
      }),

      User.countDocuments({
        role: "seller",
      }),

      User.countDocuments({
        role: "rider",
      }),

      /*
       * ORDERS
       */

      Order.countDocuments(),

      Order.countDocuments({
        orderStatus: {
          $in:
            ACTIVE_ORDER_STATUSES,
        },
      }),

      Order.countDocuments({
        orderStatus: {
          $in:
            COMPLETED_ORDER_STATUSES,
        },
      }),

      Order.countDocuments({
        orderStatus:
          "cancelled",
      }),

      /*
       * ONLINE SALES
       *
       * COD is excluded.
       */

      getOnlinePaymentSales(),

      getOnlinePaymentSales({
        paidAt: {
          $gte:
            startOfToday,

          $lt:
            startOfTomorrow,
        },
      }),

      /*
       * VERIFIED COD SALES
       */

      getVerifiedCodSales(),

      getVerifiedCodSales({
        verifiedAt: {
          $gte:
            startOfToday,

          $lt:
            startOfTomorrow,
        },
      }),

      /*
       * VERIFICATIONS
       */

      Florist.countDocuments({
        verificationStatus:
          "pending",
      }),

      Rider.countDocuments({
        verificationStatus:
          "pending",
      }),

      /*
       * COD REMITTANCES
       */

      RiderRemittance.countDocuments({
        status: "pending",
      }),

      RiderRemittance.countDocuments({
        status: "submitted",
      }),

      RiderRemittance.countDocuments({
        status: "verified",
      }),

      /*
       * RECENT ACTIVITY
       */

      getRecentOrders(),

      getRecentSellerApplications(),

      getRecentRiderApplications(),

      getRecentRemittances(),
    ]);

    /*
     * =====================================================
     * RECOGNIZED SALES
     * =====================================================
     *
     * Online:
     * Count when successfully paid.
     *
     * COD:
     * Count only when the rider remittance
     * has been verified by the Admin.
     * =====================================================
     */

    const totalSales =
      totalOnlineSales +
      totalVerifiedCodSales;

    const todaySales =
      todayOnlineSales +
      todayVerifiedCodSales;

    /*
     * =====================================================
     * FLOGRAM COMMISSION
     * =====================================================
     *
     * The commission rate is now loaded from
     * Admin Settings instead of being hardcoded.
     * =====================================================
     */

    const totalCommission =
      totalSales *
      platformCommissionRate;

    const todayCommission =
      todaySales *
      platformCommissionRate;

    /*
     * =====================================================
     * SELLER SHARE
     * =====================================================
     *
     * Amount remaining after FLOGRAM's
     * configured platform commission.
     * =====================================================
     */

    const totalSellerShare =
      totalSales -
      totalCommission;

    const todaySellerShare =
      todaySales -
      todayCommission;

    /*
     * =====================================================
     * RECENT ACTIVITY
     * =====================================================
     */

    const recentActivity = [
      ...recentOrders,
      ...recentSellerApplications,
      ...recentRiderApplications,
      ...recentRemittances,
    ]
      .sort((a, b) => {
        const dateA =
          new Date(
            a.updatedAt ||
              a.submittedAt ||
              a.createdAt ||
              0
          ).getTime();

        const dateB =
          new Date(
            b.updatedAt ||
              b.submittedAt ||
              b.createdAt ||
              0
          ).getTime();

        return dateB - dateA;
      })
      .slice(0, 8);

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return {
      users: {
        total:
          totalUsers,

        customers:
          totalCustomers,

        sellers:
          totalSellers,

        riders:
          totalRiders,
      },

      orders: {
        total:
          totalOrders,

        active:
          activeOrders,

        completed:
          completedOrders,

        cancelled:
          cancelledOrders,
      },

      /*
       * Keep "revenue.total" and
       * "revenue.today" for compatibility
       * with the current Admin Dashboard.
       *
       * They represent recognized sales:
       *
       * online paid sales
       * +
       * Admin-verified COD remittances
       */

      revenue: {
        total:
          totalSales,

        today:
          todaySales,

        online: {
          total:
            totalOnlineSales,

          today:
            todayOnlineSales,
        },

        cod: {
          total:
            totalVerifiedCodSales,

          today:
            todayVerifiedCodSales,
        },

        commission: {
          rate:
            platformCommissionRate,

          percentage:
            Math.round(
              platformCommissionRate *
                10000
            ) / 100,

          total:
            totalCommission,

          today:
            todayCommission,
        },

        sellerShare: {
          total:
            totalSellerShare,

          today:
            todaySellerShare,
        },
      },

      verifications: {
        pendingSellers:
          pendingSellers,

        pendingRiders:
          pendingRiders,

        totalPending:
          pendingSellers +
          pendingRiders,
      },

      remittances: {
        pending:
          pendingRemittances,

        submitted:
          submittedRemittances,

        verified:
          verifiedRemittances,

        awaitingVerification:
          submittedRemittances,
      },

      recentActivity,
    };
  };