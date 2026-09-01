import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate.js";

import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
} from "./notification.controller.js";

import {
  notificationIdValidation,
  validateNotificationRequest,
} from "./notification.validation.js";

const notificationRouter =
  Router();

/*
 * =========================================================
 * NOTIFICATION ROUTES
 * =========================================================
 *
 * These routes are authenticated but intentionally
 * not restricted to "rider".
 *
 * The same notification system can later be used by:
 *
 * - customer
 * - seller
 * - rider
 * - admin
 *
 * Every service operation scopes records using
 * req.user.userId, so users cannot read another
 * user's notifications.
 * =========================================================
 */

/*
 * =========================================================
 * GET MY NOTIFICATIONS
 *
 * GET
 * /api/v1/notifications
 *
 * OPTIONAL QUERY:
 *
 * ?limit=50
 * ?unreadOnly=true
 * =========================================================
 */

notificationRouter.get(
  "/",
  authenticate,
  getNotifications
);

/*
 * =========================================================
 * GET UNREAD COUNT
 *
 * GET
 * /api/v1/notifications/unread-count
 *
 * IMPORTANT:
 *
 * Keep this static route above /:notificationId/read
 * for clear route organization.
 * =========================================================
 */

notificationRouter.get(
  "/unread-count",
  authenticate,
  getUnreadCount
);

/*
 * =========================================================
 * MARK ALL AS READ
 *
 * PATCH
 * /api/v1/notifications/read-all
 * =========================================================
 */

notificationRouter.patch(
  "/read-all",
  authenticate,
  markAllAsRead
);

/*
 * =========================================================
 * MARK ONE AS READ
 *
 * PATCH
 * /api/v1/notifications/:notificationId/read
 * =========================================================
 */

notificationRouter.patch(
  "/:notificationId/read",
  authenticate,
  notificationIdValidation,
  validateNotificationRequest,
  markAsRead
);

export default notificationRouter;