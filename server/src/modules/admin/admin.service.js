import User from "../auth/auth.model.js";
import Order from "../orders/order.model.js";
import Florist from "../florists/florist.model.js";
import Rider from "../riders/rider.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";
import { getRevenueSummary, startOfManilaDay } from "./revenue.service.js";
import RiderShift from "../riders/rider-shift.model.js";
import RiderPayout from "../riders/rider-payout.model.js";
import SellerPayout from "../sellerPayouts/seller-payout.model.js";
import Dispute from "../disputes/dispute.model.js";
import PolicyViolation from "../violations/violation.model.js";
import Review from "../reviews/review.model.js";
import Flower from "../flowers/flower.model.js";
import CustomBouquetRequest from "../bloomboard/customBouquet/customBouquetRequest.model.js";

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
 * OTHER PLATFORM EVENTS
 * =========================================================
 *
 * Accounts, disputes, shift requests, payouts, reviews,
 * penalties, custom requests and new products, so System
 * Activity shows everything happening on FLOGRAM, not only
 * orders.
 */

const fullName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(" ") || person?.email || "";

const peso = (value) => `₱${Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;

const getRecentPlatformEvents = async () => {
  const LIMIT = 5;

  const [users, disputes, shifts, riderPayouts, sellerPayouts, reviews, violations, customRequests, flowers] =
    await Promise.all([
      User.find({ role: { $ne: "admin" } })
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .select("firstName lastName email role createdAt")
        .lean(),
      Dispute.find({})
        .sort({ updatedAt: -1 })
        .limit(LIMIT)
        .select("reason status filedByRole filedBy createdAt updatedAt")
        .populate("filedBy", "firstName lastName")
        .lean(),
      RiderShift.find({ "reservations.0": { $exists: true } })
        .sort({ updatedAt: -1 })
        .limit(LIMIT)
        .select("startAt reservations updatedAt")
        .populate("reservations.riderUser", "firstName lastName")
        .lean(),
      RiderPayout.find({})
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("status totalAmount riderUser createdAt updatedAt")
        .populate("riderUser", "firstName lastName")
        .lean(),
      SellerPayout.find({})
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("status totalAmount florist createdAt updatedAt")
        .populate("florist", "shopName")
        .lean(),
      Review.find({})
        .sort({ createdAt: -1 })
        .limit(LIMIT)
        .select("overallRating sentimentLabel florist customer createdAt")
        .populate("florist", "shopName")
        .populate("customer", "firstName lastName")
        .lean(),
      PolicyViolation.find({})
        .sort({ updatedAt: -1 })
        .limit(3)
        .select("penalty status user createdAt updatedAt")
        .populate("user", "firstName lastName")
        .lean(),
      CustomBouquetRequest.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select("occasion budget status customer createdAt")
        .populate("customer", "firstName lastName")
        .lean(),
      Flower.find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .select("name price florist createdAt")
        .populate("florist", "shopName")
        .lean(),
    ]);

  const events = [];

  users.forEach((user) =>
    events.push({
      type: "account",
      id: user._id,
      heading: `New ${user.role} account`,
      description: `${fullName(user)} signed up`,
      createdAt: user.createdAt,
    })
  );

  disputes.forEach((dispute) =>
    events.push({
      type: "dispute",
      id: dispute._id,
      heading: dispute.status === "open" ? "Dispute filed" : `Dispute ${dispute.status.replace("_", " ")}`,
      description: `${fullName(dispute.filedBy) || "A user"} (${dispute.filedByRole}) · ${String(dispute.reason).replaceAll("_", " ")}`,
      createdAt: dispute.updatedAt || dispute.createdAt,
    })
  );

  shifts.forEach((shift) => {
    const latest = [...(shift.reservations || [])].sort(
      (a, b) => new Date(b.reviewedAt || b.requestedAt) - new Date(a.reviewedAt || a.requestedAt)
    )[0];

    if (latest) {
      events.push({
        type: "shift_request",
        id: `${shift._id}-${latest._id}`,
        heading: latest.status === "pending" ? "Shift requested" : `Shift request ${latest.status}`,
        description: `${fullName(latest.riderUser) || "Rider"} · ${new Date(shift.startAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`,
        createdAt: latest.reviewedAt || latest.requestedAt || shift.updatedAt,
      });
    }
  });

  riderPayouts.forEach((payout) =>
    events.push({
      type: "payout",
      id: payout._id,
      heading: payout.status === "paid" ? "Rider payout sent" : `Rider payout ${payout.status}`,
      description: `${fullName(payout.riderUser) || "Rider"} · ${peso(payout.totalAmount)}`,
      createdAt: payout.updatedAt,
    })
  );

  sellerPayouts.forEach((payout) =>
    events.push({
      type: "payout",
      id: payout._id,
      heading: payout.status === "paid" ? "Seller payout sent" : `Seller payout ${payout.status}`,
      description: `${payout.florist?.shopName || "Shop"} · ${peso(payout.totalAmount)}`,
      createdAt: payout.updatedAt,
    })
  );

  reviews.forEach((review) =>
    events.push({
      type: "review",
      id: review._id,
      heading: `New ${review.overallRating}★ review`,
      description: `${fullName(review.customer) || "Customer"} → ${review.florist?.shopName || "shop"}${review.sentimentLabel ? ` · ${review.sentimentLabel}` : ""}`,
      createdAt: review.createdAt,
    })
  );

  violations.forEach((violation) =>
    events.push({
      type: "violation",
      id: violation._id,
      heading: violation.status === "lifted" ? "Penalty lifted" : `Penalty: ${violation.penalty}`,
      description: fullName(violation.user) || "User",
      createdAt: violation.updatedAt || violation.createdAt,
    })
  );

  customRequests.forEach((request) =>
    events.push({
      type: "custom_request",
      id: request._id,
      heading: "Custom bouquet request",
      description: `${fullName(request.customer) || "Customer"}${request.occasion ? ` · ${request.occasion}` : ""}${request.budget ? ` · ${peso(request.budget)}` : ""}`,
      createdAt: request.createdAt,
    })
  );

  flowers.forEach((flower) =>
    events.push({
      type: "product",
      id: flower._id,
      heading: "New product listed",
      description: `${flower.name} · ${flower.florist?.shopName || "shop"} · ${peso(flower.price)}`,
      createdAt: flower.createdAt,
    })
  );

  return events;
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

      allRevenue,
      todayRevenue,

      pendingSellers,
      pendingRiders,

      pendingRemittances,
      submittedRemittances,
      verifiedRemittances,

      recentOrders,
      recentSellerApplications,
      recentRiderApplications,
      recentRemittances,
      recentPlatformEvents,
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

      /*
       * RECOGNIZED REVENUE (same rules as Reports)
       */

      getRevenueSummary(),

      getRevenueSummary({
        startDate:
          startOfManilaDay(),
        endDate:
          new Date(),
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

      getRecentPlatformEvents(),
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

    /*
     * Gross = what customers paid. Commission applies to
     * product sales only (delivery fees go to Riders).
     */
    const totalSales =
      allRevenue.gross;

    const todaySales =
      todayRevenue.gross;

    const totalOnlineSales =
      allRevenue.online + allRevenue.pickup;

    const todayOnlineSales =
      todayRevenue.online + todayRevenue.pickup;

    const totalVerifiedCodSales =
      allRevenue.cod;

    const todayVerifiedCodSales =
      todayRevenue.cod;

    const totalCommission =
      allRevenue.commission;

    const todayCommission =
      todayRevenue.commission;

    const totalSellerShare =
      allRevenue.sellerShare;

    const todaySellerShare =
      todayRevenue.sellerShare;

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
      ...recentPlatformEvents,
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
      .slice(0, 20);

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