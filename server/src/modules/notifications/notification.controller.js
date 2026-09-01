import {
  getMyNotifications,
  getMyUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "./notification.service.js";

/*
 * =========================================================
 * GET MY NOTIFICATIONS
 * =========================================================
 *
 * GET
 * /api/v1/notifications
 * =========================================================
 */

export const getNotifications =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getMyNotifications(
          req.user.userId,
          {
            limit:
              req.query.limit,

            unreadOnly:
              req.query
                .unreadOnly,
          }
        );

      res.status(200).json({
        success:
          true,

        message:
          "Notifications retrieved successfully.",

        data:
          result,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * GET UNREAD COUNT
 * =========================================================
 *
 * GET
 * /api/v1/notifications/unread-count
 * =========================================================
 */

export const getUnreadCount =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await getMyUnreadNotificationCount(
          req.user.userId
        );

      res.status(200).json({
        success:
          true,

        message:
          "Unread notification count retrieved successfully.",

        data:
          result,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * MARK ONE AS READ
 * =========================================================
 *
 * PATCH
 * /api/v1/notifications/:notificationId/read
 * =========================================================
 */

export const markAsRead =
  async (
    req,
    res,
    next
  ) => {
    try {
      const notification =
        await markNotificationAsRead(
          req.user.userId,

          req.params
            .notificationId
        );

      res.status(200).json({
        success:
          true,

        message:
          "Notification marked as read.",

        data: {
          notification,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * MARK ALL AS READ
 * =========================================================
 *
 * PATCH
 * /api/v1/notifications/read-all
 * =========================================================
 */

export const markAllAsRead =
  async (
    req,
    res,
    next
  ) => {
    try {
      const result =
        await markAllNotificationsAsRead(
          req.user.userId
        );

      res.status(200).json({
        success:
          true,

        message:
          "All notifications marked as read.",

        data:
          result,
      });
    } catch (error) {
      next(error);
    }
  };