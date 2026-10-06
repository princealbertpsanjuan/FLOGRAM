import { Router } from "express";

import authRouter from "../modules/auth/auth.routes.js";
import healthRouter from "../modules/health/health.routes.js";
import userRouter from "../modules/users/user.routes.js";
import floristRouter from "../modules/florists/florist.routes.js";
import riderRouter from "../modules/riders/rider.routes.js";
import verificationRouter from "../modules/verification/verification.routes.js";
import flowerRouter from "../modules/flowers/flower.routes.js";

import bloomboardPostRouter from "../modules/bloomboard/bloomboardPost.routes.js";
import aiAssistantRouter from "../modules/bloomboard/ai/aiAssistant.routes.js";
import customBouquetRequestRouter from "../modules/bloomboard/customBouquet/customBouquetRequest.routes.js";

import orderRouter from "../modules/orders/order.routes.js";
import deliveryRouter from "../modules/deliveries/delivery.routes.js";
import paymentRouter from "../modules/payments/payment.routes.js";
import cartRouter from "../modules/cart/cart.routes.js";
import checkoutRouter from "../modules/checkout/checkout.routes.js";
import notificationRouter from "../modules/notifications/notification.routes.js";
import reviewRouter from "../modules/reviews/review.routes.js";

/*
 * =========================================================
 * ADMIN
 * =========================================================
 */

import adminRouter from "../modules/admin/admin.routes.js";
import analyticsRouter from "../modules/analytics/analytics.routes.js";
import addOnRouter from "../modules/addons/addon.routes.js";
import followRouter from "../modules/follows/follow.routes.js";
import disputeRouter from "../modules/disputes/dispute.routes.js";
import violationRouter from "../modules/violations/violation.routes.js";
import sellerPayoutRouter from "../modules/sellerPayouts/seller-payout.routes.js";
import workAssistantRouter from "../modules/assistant/work-assistant.routes.js";
import listingCommentRouter from "../modules/flowerComments/flower-comment.routes.js";

const apiRouter = Router();

/*
 * =========================================================
 * HEALTH
 * =========================================================
 */

apiRouter.use(
  "/health",
  healthRouter
);

/*
 * =========================================================
 * AUTH
 * =========================================================
 */

apiRouter.use(
  "/auth",
  authRouter
);

/*
 * =========================================================
 * USERS
 * =========================================================
 */

apiRouter.use(
  "/users",
  userRouter
);

/*
 * =========================================================
 * FLORISTS
 * =========================================================
 */

apiRouter.use(
  "/florists",
  floristRouter
);

/*
 * =========================================================
 * RIDERS
 * =========================================================
 */

apiRouter.use(
  "/riders",
  riderRouter
);

/*
 * =========================================================
 * VERIFICATION
 * =========================================================
 */

apiRouter.use(
  "/verification",
  verificationRouter
);

/*
 * =========================================================
 * FLOWERS
 * =========================================================
 */

apiRouter.use(
  "/flowers",
  flowerRouter
);

/*
 * =========================================================
 * BLOOMBOARD
 * =========================================================
 */

apiRouter.use(
  "/bloomboard",
  bloomboardPostRouter
);

/*
 * =========================================================
 * BLOOMBOARD AI ASSISTANT
 * =========================================================
 */

apiRouter.use(
  "/bloomboard/ai",
  aiAssistantRouter
);

/*
 * =========================================================
 * BLOOMBOARD CUSTOM BOUQUET REQUESTS
 * =========================================================
 */

apiRouter.use(
  "/bloomboard/custom-bouquet-requests",
  customBouquetRequestRouter
);

/*
 * =========================================================
 * ORDERS
 * =========================================================
 */

apiRouter.use(
  "/orders",
  orderRouter
);

/*
 * =========================================================
 * DELIVERIES
 * =========================================================
 */

apiRouter.use(
  "/deliveries",
  deliveryRouter
);

/*
 * =========================================================
 * PAYMENTS
 * =========================================================
 */

apiRouter.use(
  "/payments",
  paymentRouter
);

/*
 * =========================================================
 * NOTIFICATIONS
 * =========================================================
 *
 * Final endpoints:
 *
 * GET
 * /api/v1/notifications
 *
 * GET
 * /api/v1/notifications/unread-count
 *
 * PATCH
 * /api/v1/notifications/read-all
 *
 * PATCH
 * /api/v1/notifications/:notificationId/read
 *
 * This is a shared notification module.
 *
 * It can later support:
 *
 * - customer
 * - seller
 * - rider
 * - admin
 * =========================================================
 */

apiRouter.use(
  "/notifications",
  notificationRouter
);

/*
 * =========================================================
 * REVIEWS
 * =========================================================
 */

apiRouter.use(
  "/reviews",
  reviewRouter
);

/*
 * =========================================================
 * CART
 * =========================================================
 */

apiRouter.use(
  "/cart",
  cartRouter
);

/*
 * =========================================================
 * CHECKOUT
 * =========================================================
 */

apiRouter.use(
  "/checkout",
  checkoutRouter
);

/*
 * =========================================================
 * ADMIN
 * =========================================================
 *
 * Final endpoint:
 *
 * GET
 * /api/v1/admin/dashboard
 *
 * =========================================================
 */

apiRouter.use(
  "/admin",
  adminRouter
);

/*
 * =========================================================
 * ANALYTICS (AFINN sentiment, FP-Growth)
 * =========================================================
 */

apiRouter.use(
  "/analytics",
  analyticsRouter
);

/*
 * GIFT ADD-ONS
 */

apiRouter.use(
  "/addons",
  addOnRouter
);

/*
 * FOLLOW FLORIST SHOPS
 */

apiRouter.use(
  "/follows",
  followRouter
);

/*
 * DISPUTES, POLICY VIOLATIONS & PENALTIES
 */

apiRouter.use(
  "/disputes",
  disputeRouter
);

apiRouter.use(
  "/violations",
  violationRouter
);

/*
 * SELLER EARNINGS & PAYOUTS
 */

apiRouter.use(
  "/seller-payouts",
  sellerPayoutRouter
);

/*
 * AI ASSISTANT — SELLER AND RIDER MODES
 */

apiRouter.use(
  "/assistant",
  workAssistantRouter
);

/*
 * BOUQUET LISTING REVIEWS & COMMENTS
 */

apiRouter.use(
  "/listing-comments",
  listingCommentRouter
);

export default apiRouter;