import {
  apiRequest,
} from './api';

/*
 * =========================================================
 * FLOGRAM NOTIFICATION TYPES
 * =========================================================
 */

export type NotificationType =
  | 'delivery_available'
  | 'delivery_accepted'
  | 'delivery_ready'
  | 'delivery_pickup_reminder'
  | 'delivery_picked_up'
  | 'delivery_out_for_delivery'
  | 'delivery_completed'
  | 'delivery_cancelled'
  | 'remittance_submitted'
  | 'remittance_verified'
  | 'remittance_rejected'
  | 'order_created'
  | 'order_updated'
  | 'order_cancelled'
  | 'verification_approved'
  | 'verification_rejected'
  | 'rating_received'
  | 'system'
  | 'announcement';

export type NotificationRole =
  | 'customer'
  | 'seller'
  | 'rider'
  | 'admin';

export type FlogramNotification = {
  id: string;

  role:
    NotificationRole;

  type:
    NotificationType;

  title:
    string;

  message:
    string;

  isRead:
    boolean;

  readAt:
    string | null;

  createdAt:
    string;

  deliveryId:
    string | null;

  orderId:
    string | null;

  remittanceId:
    string | null;

  metadata:
    Record<
      string,
      unknown
    > | null;
};

export type NotificationListData = {
  notifications:
    FlogramNotification[];

  unreadCount:
    number;

  totalCount:
    number;
};

/*
 * =========================================================
 * API RESPONSES
 * =========================================================
 */

type NotificationListResponse = {
  success:
    boolean;

  message:
    string;

  data:
    NotificationListData;
};

type NotificationResponse = {
  success:
    boolean;

  message:
    string;

  data: {
    notification:
      FlogramNotification;
  };
};

type MarkAllReadResponse = {
  success:
    boolean;

  message:
    string;

  data?: {
    modifiedCount?:
      number;
  };
};

/*
 * =========================================================
 * GET MY NOTIFICATIONS
 * =========================================================
 */

export const getNotifications =
  async () => {
    const response =
      await apiRequest<NotificationListResponse>(
        '/notifications',
        {
          method:
            'GET',

          authenticated:
            true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * MARK ONE NOTIFICATION AS READ
 * =========================================================
 */

export const markNotificationAsRead =
  async (
    notificationId:
      string
  ) => {
    const response =
      await apiRequest<NotificationResponse>(
        `/notifications/${notificationId}/read`,
        {
          method:
            'PATCH',

          authenticated:
            true,
        }
      );

    return response.data
      .notification;
  };

/*
 * =========================================================
 * MARK ALL AS READ
 * =========================================================
 */

export const markAllNotificationsAsRead =
  async () => {
    const response =
      await apiRequest<MarkAllReadResponse>(
        '/notifications/read-all',
        {
          method:
            'PATCH',

          authenticated:
            true,
        }
      );

    return response.data;
  };