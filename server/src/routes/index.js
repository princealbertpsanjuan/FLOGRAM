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

apiRouter.use(
  "/cart",
  cartRouter
);

apiRouter.use(
  "/checkout",
  checkoutRouter
);

export default apiRouter;