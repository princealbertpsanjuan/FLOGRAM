import Notification from "./notification.model.js";
import User from "../auth/auth.model.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const createHttpError = (
  message,
  statusCode
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

/*
 * =========================================================
 * CREATE NOTIFICATION
 * =========================================================
 *
 * INTERNAL SERVICE
 *
 * Other FLOGRAM modules can import this function.
 *
 * Example:
 *
 * await createNotification({
 *   recipient: riderUserId,
 *   role: "rider",
 *   type: "delivery_completed",
 *   title: "Delivery Completed",
 *   message: "Your delivery was completed successfully.",
 *   delivery: deliveryId,
 *   order: orderId,
 * });
 * =========================================================
 */

export const createNotification =
  async ({
    recipient,
    role,
    type,
    title,
    message,

    delivery =
      null,

    order =
      null,

    remittance =
      null,

    metadata =
      {},
  }) => {
    if (!recipient) {
      throw createHttpError(
        "Notification recipient is required.",
        400
      );
    }

    if (!role) {
      throw createHttpError(
        "Notification role is required.",
        400
      );
    }

    if (!type) {
      throw createHttpError(
        "Notification type is required.",
        400
      );
    }

    const cleanTitle =
      String(
        title || ""
      ).trim();

    const cleanMessage =
      String(
        message || ""
      ).trim();

    if (!cleanTitle) {
      throw createHttpError(
        "Notification title is required.",
        400
      );
    }

    if (!cleanMessage) {
      throw createHttpError(
        "Notification message is required.",
        400
      );
    }

    /*
     * Make sure recipient still exists.
     */

    const user =
      await User.findById(
        recipient
      )
        .select(
          "_id role"
        )
        .lean();

    if (!user) {
      throw createHttpError(
        "Notification recipient was not found.",
        404
      );
    }

    /*
     * Prevent accidentally creating a notification
     * under the wrong role.
     */

    if (
      String(user.role) !==
      String(role)
    ) {
      throw createHttpError(
        "Notification role does not match the recipient account.",
        400
      );
    }

    const notification =
      await Notification.create({
        recipient,

        role,

        type,

        title:
          cleanTitle,

        message:
          cleanMessage,

        delivery,

        order,

        remittance,

        metadata:
          metadata &&
          typeof metadata ===
            "object"
            ? metadata
            : {},
      });

    return notification;
  };

/*
 * =========================================================
 * GET MY NOTIFICATIONS
 * =========================================================
 */

export const getMyNotifications =
  async (
    userId,
    options = {}
  ) => {
    /*
     * Default:
     *
     * 50 newest notifications.
     */

    const requestedLimit =
      Number(
        options.limit
      );

    const limit =
      Number.isFinite(
        requestedLimit
      ) &&
      requestedLimit > 0
        ? Math.min(
            Math.floor(
              requestedLimit
            ),
            100
          )
        : 50;

    /*
     * Optional filter:
     *
     * ?unreadOnly=true
     */

    const unreadOnly =
      options.unreadOnly ===
        true ||
      String(
        options.unreadOnly
      ).toLowerCase() ===
        "true";

    const filter = {
      recipient:
        userId,
    };

    if (unreadOnly) {
      filter.isRead =
        false;
    }

    const [
      notifications,
      unreadCount,
      totalCount,
    ] =
      await Promise.all([
        Notification.find(
          filter
        )
          .sort({
            createdAt:
              -1,
          })
          .limit(
            limit
          )
          .lean(),

        Notification.countDocuments({
          recipient:
            userId,

          isRead:
            false,
        }),

        Notification.countDocuments({
          recipient:
            userId,
        }),
      ]);

    return {
      notifications:
        notifications.map(
          (notification) =>
            formatNotification(
              notification
            )
        ),

      unreadCount,

      totalCount,
    };
  };

/*
 * =========================================================
 * GET UNREAD COUNT
 * =========================================================
 *
 * Useful later for:
 *
 * Alerts badge:
 *
 * Alerts (3)
 * =========================================================
 */

export const getMyUnreadNotificationCount =
  async (
    userId
  ) => {
    const unreadCount =
      await Notification.countDocuments({
        recipient:
          userId,

        isRead:
          false,
      });

    return {
      unreadCount,
    };
  };

/*
 * =========================================================
 * MARK ONE NOTIFICATION AS READ
 * =========================================================
 */

export const markNotificationAsRead =
  async (
    userId,
    notificationId
  ) => {
    const notification =
      await Notification.findOne({
        _id:
          notificationId,

        recipient:
          userId,
      });

    if (!notification) {
      throw createHttpError(
        "Notification was not found.",
        404
      );
    }

    /*
     * Idempotent.
     *
     * Tapping an already-read notification should
     * not produce an error.
     */

    if (
      notification.isRead !==
      true
    ) {
      notification.isRead =
        true;

      notification.readAt =
        new Date();

      await notification.save();
    }

    return formatNotification(
      notification
    );
  };

/*
 * =========================================================
 * MARK ALL AS READ
 * =========================================================
 */

export const markAllNotificationsAsRead =
  async (
    userId
  ) => {
    const now =
      new Date();

    const result =
      await Notification.updateMany(
        {
          recipient:
            userId,

          isRead:
            false,
        },
        {
          $set: {
            isRead:
              true,

            readAt:
              now,
          },
        }
      );

    return {
      modifiedCount:
        result.modifiedCount ||
        0,

      unreadCount:
        0,
    };
  };

/*
 * =========================================================
 * FORMAT NOTIFICATION
 * =========================================================
 *
 * Keeps Mongo/Mongoose implementation details away
 * from the mobile application.
 * =========================================================
 */

const formatNotification = (
  notification
) => {
  if (!notification) {
    return null;
  }

  const raw =
    typeof notification.toObject ===
    "function"
      ? notification.toObject()
      : notification;

  return {
    id:
      String(
        raw._id
      ),

    role:
      raw.role,

    type:
      raw.type,

    title:
      raw.title,

    message:
      raw.message,

    isRead:
      raw.isRead ===
      true,

    readAt:
      raw.readAt ||
      null,

    createdAt:
      raw.createdAt ||
      null,

    deliveryId:
      raw.delivery
        ? String(
            raw.delivery
          )
        : null,

    orderId:
      raw.order
        ? String(
            raw.order
          )
        : null,

    remittanceId:
      raw.remittance
        ? String(
            raw.remittance
          )
        : null,

    metadata:
      raw.metadata &&
      typeof raw.metadata ===
        "object"
        ? raw.metadata
        : {},
  };
};