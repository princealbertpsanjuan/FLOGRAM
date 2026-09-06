import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type FlogramNotification,
  type NotificationType,
} from "../../services/notification";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type NotificationFilter =
  | "all"
  | "unread"
  | "orders"
  | "delivery";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const now =
    new Date();

  const differenceMs =
    now.getTime() -
    date.getTime();

  const differenceMinutes =
    Math.floor(
      differenceMs /
        (1000 * 60)
    );

  const differenceHours =
    Math.floor(
      differenceMinutes /
        60
    );

  const differenceDays =
    Math.floor(
      differenceHours /
        24
    );

  if (
    differenceMinutes <
    1
  ) {
    return "Just now";
  }

  if (
    differenceMinutes <
    60
  ) {
    return `${differenceMinutes}m ago`;
  }

  if (
    differenceHours <
    24
  ) {
    return `${differenceHours}h ago`;
  }

  if (
    differenceDays <
    7
  ) {
    return `${differenceDays}d ago`;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month:
        "short",

      day:
        "numeric",

      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    }
  );
};

/*
 * =========================================================
 * NOTIFICATION PRESENTATION
 * =========================================================
 */

const getNotificationPresentation =
  (
    type:
      NotificationType
  ) => {
    switch (type) {
      /*
       * DELIVERY
       */

      case "delivery_available":
        return {
          icon:
            "bicycle-outline" as const,

          background:
            "#FFF6E8",

          foreground:
            "#A67522",
        };

      case "delivery_accepted":
        return {
          icon:
            "person-circle-outline" as const,

          background:
            "#F3EDFC",

          foreground:
            "#7652A5",
        };

      case "delivery_ready":
        return {
          icon:
            "cube-outline" as const,

          background:
            "#EAF7F3",

          foreground:
            "#378475",
        };

      case "delivery_pickup_reminder":
        return {
          icon:
            "alarm-outline" as const,

          background:
            "#FFF6E8",

          foreground:
            "#A67522",
        };

      case "delivery_picked_up":
        return {
          icon:
            "bag-check-outline" as const,

          background:
            "#EEF4FF",

          foreground:
            "#4773A8",
        };

      case "delivery_out_for_delivery":
        return {
          icon:
            "navigate-outline" as const,

          background:
            "#EDF4FF",

          foreground:
            "#4676AD",
        };

      case "delivery_completed":
        return {
          icon:
            "checkmark-circle-outline" as const,

          background:
            "#EAF7ED",

          foreground:
            "#438654",
        };

      case "delivery_cancelled":
        return {
          icon:
            "close-circle-outline" as const,

          background:
            "#FDECEE",

          foreground:
            "#B5505D",
        };

      /*
       * ORDERS
       */

      case "order_created":
        return {
          icon:
            "receipt-outline" as const,

          background:
            "#FFF0F5",

          foreground:
            "#D85D7A",
        };

      case "order_updated":
        return {
          icon:
            "refresh-circle-outline" as const,

          background:
            "#EEF4FF",

          foreground:
            "#4773A8",
        };

      case "order_cancelled":
        return {
          icon:
            "close-circle-outline" as const,

          background:
            "#FDECEE",

          foreground:
            "#B5505D",
        };

      /*
       * ACCOUNT
       */

      case "verification_approved":
        return {
          icon:
            "shield-checkmark-outline" as const,

          background:
            "#EAF7ED",

          foreground:
            "#438654",
        };

      case "verification_rejected":
        return {
          icon:
            "shield-outline" as const,

          background:
            "#FDECEE",

          foreground:
            "#B5505D",
        };

      /*
       * RATING
       */

      case "rating_received":
        return {
          icon:
            "star-outline" as const,

          background:
            "#FFF6E8",

          foreground:
            "#A67522",
        };

      /*
       * GENERAL
       */

      case "announcement":
        return {
          icon:
            "megaphone-outline" as const,

          background:
            "#F3EDFC",

          foreground:
            "#7652A5",
        };

      case "system":
        return {
          icon:
            "information-circle-outline" as const,

          background:
            "#F1EEEE",

          foreground:
            "#716967",
        };

      /*
       * RIDER / ADMIN TYPES
       *
       * These may not normally appear
       * for Customers, but presentation
       * is still defined safely.
       */

      case "remittance_submitted":
      case "remittance_verified":
      case "remittance_rejected":
        return {
          icon:
            "wallet-outline" as const,

          background:
            "#F1EEEE",

          foreground:
            "#716967",
        };

      default:
        return {
          icon:
            "notifications-outline" as const,

          background:
            "#FFF0F5",

          foreground:
            "#D85D7A",
        };
    }
  };

/*
 * =========================================================
 * TYPE CLASSIFICATION
 * =========================================================
 */

const isDeliveryNotification =
  (
    type:
      NotificationType
  ) => {
    return type.startsWith(
      "delivery_"
    );
  };

const isOrderNotification =
  (
    type:
      NotificationType
  ) => {
    return type.startsWith(
      "order_"
    );
  };

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerNotificationsScreen() {
  const [
    notifications,
    setNotifications,
  ] =
    useState<
      FlogramNotification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const [
    openingNotificationId,
    setOpeningNotificationId,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<NotificationFilter>(
      "all"
    );

  /*
   * =======================================================
   * LOAD
   * =======================================================
   */

  const loadNotifications =
    useCallback(
      async (
        showLoader =
          true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          setErrorMessage(
            null
          );

          const result =
            await getNotifications();

          setNotifications(
            Array.isArray(
              result.notifications
            )
              ? result.notifications
              : []
          );

          setUnreadCount(
            Number(
              result.unreadCount ||
                0
            )
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to load notifications:",
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load notifications."
          );
        } finally {
          if (
            showLoader
          ) {
            setLoading(
              false
            );
          }
        }
      },
      []
    );

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadNotifications(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadNotifications]
    );

  /*
   * =======================================================
   * MARK ALL READ
   * =======================================================
   */

  const handleMarkAllRead =
    useCallback(
      async () => {
        if (
          unreadCount ===
            0 ||
          markingAll
        ) {
          return;
        }

        try {
          setMarkingAll(
            true
          );

          await markAllNotificationsAsRead();

          const now =
            new Date().toISOString();

          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  notification
                ) => ({
                  ...notification,

                  isRead:
                    true,

                  readAt:
                    notification.readAt ||
                    now,
                })
              )
          );

          setUnreadCount(
            0
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to mark all notifications as read:",
            error
          );

          Alert.alert(
            "Unable to Update Notifications",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setMarkingAll(
            false
          );
        }
      },
      [
        markingAll,
        unreadCount,
      ]
    );

  /*
   * =======================================================
   * ROUTE NOTIFICATION
   * =======================================================
   */

  const navigateFromNotification =
  useCallback(
    (
      notification:
        FlogramNotification
    ) => {
      /*
       * =====================================================
       * DELIVERED
       * =====================================================
       *
       * Once delivered, the customer
       * needs to confirm receipt from
       * Order Details.
       */

      if (
        notification.type ===
          "delivery_completed" &&
        notification.orderId
      ) {
        router.push({
          pathname:
            "/(customer)/customer-order-details",

          params: {
            orderId:
              notification.orderId,
          },
        } as never);

        return;
      }

      /*
       * =====================================================
       * ACTIVE DELIVERY
       * =====================================================
       *
       * Active delivery notifications
       * should open live tracking.
       */

      if (
        notification.deliveryId
      ) {
        router.push({
          pathname:
            "/(customer)/customer-tracking",

          params: {
            deliveryId:
              notification.deliveryId,

            ...(notification.orderId
              ? {
                  orderId:
                    notification.orderId,
                }
              : {}),
          },
        } as never);

        return;
      }

      /*
       * =====================================================
       * ORDER
       * =====================================================
       */

      if (
        notification.orderId
      ) {
        router.push({
          pathname:
            "/(customer)/customer-order-details",

          params: {
            orderId:
              notification.orderId,
          },
        } as never);

        return;
      }
    },
    []
  );

  /*
   * =======================================================
   * OPEN NOTIFICATION
   * =======================================================
   */

  const handleNotificationPress =
    useCallback(
      async (
        notification:
          FlogramNotification
      ) => {
        if (
          openingNotificationId
        ) {
          return;
        }

        try {
          setOpeningNotificationId(
            notification.id
          );

          /*
           * Only call PATCH when needed.
           */

          if (
            !notification.isRead
          ) {
            const updated =
              await markNotificationAsRead(
                notification.id
              );

            setNotifications(
              (
                current
              ) =>
                current.map(
                  (
                    item
                  ) =>
                    item.id ===
                    notification.id
                      ? updated
                      : item
                )
            );

            setUnreadCount(
              (
                current
              ) =>
                Math.max(
                  0,
                  current -
                    1
                )
            );

            navigateFromNotification(
              updated
            );

            return;
          }

          navigateFromNotification(
            notification
          );
        } catch (
          error
        ) {
          console.error(
            "Unable to open notification:",
            error
          );

          /*
           * A failure to mark read
           * should not completely
           * prevent the customer
           * from reaching the order.
           */

          navigateFromNotification(
            notification
          );
        } finally {
          setOpeningNotificationId(
            null
          );
        }
      },
      [
        navigateFromNotification,
        openingNotificationId,
      ]
    );

  /*
   * =======================================================
   * FILTERS
   * =======================================================
   */

  const filteredNotifications =
    useMemo(() => {
      switch (
        selectedFilter
      ) {
        case "unread":
          return notifications.filter(
            (
              notification
            ) =>
              !notification.isRead
          );

        case "orders":
          return notifications.filter(
            (
              notification
            ) =>
              isOrderNotification(
                notification.type
              )
          );

        case "delivery":
          return notifications.filter(
            (
              notification
            ) =>
              isDeliveryNotification(
                notification.type
              )
          );

        default:
          return notifications;
      }
    }, [
      notifications,
      selectedFilter,
    ]);

  /*
   * =======================================================
   * COUNTS
   * =======================================================
   */

  const orderCount =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            isOrderNotification(
              notification.type
            )
        ).length,
      [notifications]
    );

  const deliveryCount =
    useMemo(
      () =>
        notifications.filter(
          (
            notification
          ) =>
            isDeliveryNotification(
              notification.type
            )
        ).length,
      [notifications]
    );

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <Ionicons
              name="notifications-outline"
              size={34}
              color="#D85D7A"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#D85D7A"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Notifications
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Loading your latest
            updates...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * SCREEN
   * =======================================================
   */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <View
        style={
          styles.screen
        }
      >
        {/*
         * =====================================================
         * HEADER
         * =====================================================
         */}

        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color="#35302F"
            />
          </Pressable>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Notifications
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {unreadCount >
              0
                ? `${unreadCount} unread`
                : "You're all caught up"}
            </Text>
          </View>

          <Pressable
            style={[
              styles.headerButton,

              unreadCount ===
                0 &&
                styles.headerButtonDisabled,
            ]}
            disabled={
              unreadCount ===
                0 ||
              markingAll
            }
            onPress={() =>
              void handleMarkAllRead()
            }
          >
            {markingAll ? (
              <ActivityIndicator
                size="small"
                color="#D85D7A"
              />
            ) : (
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={
                  unreadCount >
                  0
                    ? "#D85D7A"
                    : "#C9C2C0"
                }
              />
            )}
          </Pressable>
        </View>

        {/*
         * =====================================================
         * FILTERS
         * =====================================================
         */}

        <View
          style={
            styles.filtersWrapper
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filtersContainer
            }
          >
            <FilterButton
              label="All"
              count={
                notifications.length
              }
              selected={
                selectedFilter ===
                "all"
              }
              onPress={() =>
                setSelectedFilter(
                  "all"
                )
              }
            />

            <FilterButton
              label="Unread"
              count={
                unreadCount
              }
              selected={
                selectedFilter ===
                "unread"
              }
              onPress={() =>
                setSelectedFilter(
                  "unread"
                )
              }
            />

            <FilterButton
              label="Orders"
              count={
                orderCount
              }
              selected={
                selectedFilter ===
                "orders"
              }
              onPress={() =>
                setSelectedFilter(
                  "orders"
                )
              }
            />

            <FilterButton
              label="Delivery"
              count={
                deliveryCount
              }
              selected={
                selectedFilter ===
                "delivery"
              }
              onPress={() =>
                setSelectedFilter(
                  "delivery"
                )
              }
            />
          </ScrollView>
        </View>

        {/*
         * =====================================================
         * CONTENT
         * =====================================================
         */}

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor="#D85D7A"
              colors={[
                "#D85D7A",
              ]}
            />
          }
        >
          {/*
           * ===================================================
           * ERROR
           * ===================================================
           */}

          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <View
                style={
                  styles.errorIcon
                }
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={23}
                  color="#B7505D"
                />
              </View>

              <View
                style={
                  styles.errorContent
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Unable to refresh
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {
                    errorMessage
                  }
                </Text>
              </View>

              <Pressable
                style={
                  styles.errorRetryButton
                }
                onPress={() =>
                  void loadNotifications(
                    false
                  )
                }
              >
                <Ionicons
                  name="refresh"
                  size={18}
                  color="#D85D7A"
                />
              </Pressable>
            </View>
          ) : null}

          {/*
           * ===================================================
           * MARK ALL HELPER
           * ===================================================
           */}

          {unreadCount >
          0 ? (
            <View
              style={
                styles.unreadSummary
              }
            >
              <View
                style={
                  styles.unreadSummaryIcon
                }
              >
                <Ionicons
                  name="mail-unread-outline"
                  size={17}
                  color="#D85D7A"
                />
              </View>

              <Text
                style={
                  styles.unreadSummaryText
                }
              >
                You have{" "}
                <Text
                  style={
                    styles.unreadSummaryBold
                  }
                >
                  {unreadCount}
                </Text>{" "}
                unread{" "}
                {unreadCount ===
                1
                  ? "notification"
                  : "notifications"}
                .
              </Text>

              <Pressable
                onPress={() =>
                  void handleMarkAllRead()
                }
              >
                <Text
                  style={
                    styles.markAllText
                  }
                >
                  Mark all read
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/*
           * ===================================================
           * LIST
           * ===================================================
           */}

          {filteredNotifications.length >
          0 ? (
            <View
              style={
                styles.notificationList
              }
            >
              {filteredNotifications.map(
                (
                  notification
                ) => (
                  <NotificationCard
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    loading={
                      openingNotificationId ===
                      notification.id
                    }
                    onPress={() =>
                      void handleNotificationPress(
                        notification
                      )
                    }
                  />
                )
              )}
            </View>
          ) : (
            <EmptyNotifications
              filter={
                selectedFilter
              }
            />
          )}

          <View
            style={{
              height: 28,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * FILTER BUTTON
 * =========================================================
 */

function FilterButton({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;

  count: number;

  selected: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,

        selected &&
          styles.filterButtonSelected,
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.filterButtonText,

          selected &&
            styles.filterButtonTextSelected,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCount,

          selected &&
            styles.filterCountSelected,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,

            selected &&
              styles.filterCountTextSelected,
          ]}
        >
          {count >
          99
            ? "99+"
            : count}
        </Text>
      </View>
    </Pressable>
  );
}

/*
 * =========================================================
 * NOTIFICATION CARD
 * =========================================================
 */

function NotificationCard({
  notification,
  loading,
  onPress,
}: {
  notification:
    FlogramNotification;

  loading:
    boolean;

  onPress:
    () => void;
}) {
  const presentation =
    getNotificationPresentation(
      notification.type
    );

  const hasDestination =
    Boolean(
      notification.deliveryId ||
        notification.orderId
    );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.notificationCard,

        !notification.isRead &&
          styles.notificationCardUnread,

        pressed &&
          styles.notificationCardPressed,
      ]}
      onPress={
        onPress
      }
      disabled={
        loading
      }
    >
      {!notification.isRead ? (
        <View
          style={
            styles.unreadIndicator
          }
        />
      ) : null}

      <View
        style={[
          styles.notificationIcon,

          {
            backgroundColor:
              presentation.background,
          },
        ]}
      >
        <Ionicons
          name={
            presentation.icon
          }
          size={22}
          color={
            presentation.foreground
          }
        />
      </View>

      <View
        style={
          styles.notificationContent
        }
      >
        <View
          style={
            styles.notificationTitleRow
          }
        >
          <Text
            style={[
              styles.notificationTitle,

              !notification.isRead &&
                styles.notificationTitleUnread,
            ]}
            numberOfLines={
              2
            }
          >
            {
              notification.title
            }
          </Text>

          <Text
            style={
              styles.notificationTime
            }
          >
            {formatDateTime(
              notification.createdAt
            )}
          </Text>
        </View>

        <Text
          style={
            styles.notificationMessage
          }
          numberOfLines={
            3
          }
        >
          {
            notification.message
          }
        </Text>

        <View
          style={
            styles.notificationFooter
          }
        >
          <View
            style={
              styles.notificationTypeBadge
            }
          >
            <Text
              style={
                styles.notificationTypeText
              }
            >
              {isDeliveryNotification(
                notification.type
              )
                ? "Delivery"
                : isOrderNotification(
                      notification.type
                    )
                  ? "Order"
                  : "FLOGRAM"}
            </Text>
          </View>

          {hasDestination ? (
            <View
              style={
                styles.openHint
              }
            >
              <Text
                style={
                  styles.openHintText
                }
              >
                View details
              </Text>

              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#D85D7A"
                />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color="#D85D7A"
                />
              )}
            </View>
          ) : loading ? (
            <ActivityIndicator
              size="small"
              color="#D85D7A"
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/*
 * =========================================================
 * EMPTY
 * =========================================================
 */

function EmptyNotifications({
  filter,
}: {
  filter:
    NotificationFilter;
}) {
  let title =
    "No notifications yet";

  let description =
    "Updates about your orders and deliveries will appear here.";

  if (
    filter ===
    "unread"
  ) {
    title =
      "You're all caught up";

    description =
      "You don't have any unread notifications.";
  }

  if (
    filter ===
    "orders"
  ) {
    title =
      "No order updates";

    description =
      "Order confirmations, status changes, and cancellations will appear here.";
  }

  if (
    filter ===
    "delivery"
  ) {
    title =
      "No delivery updates";

    description =
      "Rider assignment and delivery progress will appear here.";
  }

  return (
    <View
      style={
        styles.emptyContainer
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name={
            filter ===
            "unread"
              ? "checkmark-done-outline"
              : "notifications-outline"
          }
          size={42}
          color="#D9859D"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        {description}
      </Text>

      <Pressable
        style={
          styles.emptyOrdersButton
        }
        onPress={() =>
          router.push(
            "/(customer)/customer-orders"
          )
        }
      >
        <Text
          style={
            styles.emptyOrdersText
          }
        >
          View My Orders
        </Text>

        <Ionicons
          name="arrow-forward"
          size={15}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",
    },

    screen: {
      flex: 1,

      backgroundColor:
        "#F9F7F7",
    },

    /*
     * HEADER
     */

    header: {
      minHeight: 68,

      paddingHorizontal:
        13,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#E8E2E0",
    },

    headerButton: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerButtonDisabled: {
      opacity: 0.6,
    },

    headerCenter: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerTitle: {
      fontSize: 18,

      fontWeight:
        "900",

      color:
        "#37312F",
    },

    headerSubtitle: {
      marginTop: 2,

      fontSize: 9,

      color:
        "#9D9593",
    },

    /*
     * FILTERS
     */

    filtersWrapper: {
      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#ECE6E4",
    },

    filtersContainer: {
      paddingHorizontal:
        15,

      paddingVertical:
        11,

      gap: 8,
    },

    filterButton: {
      minHeight: 34,

      paddingHorizontal:
        13,

      borderRadius:
        17,

      borderWidth: 1,

      borderColor:
        "#EEE8E6",

      backgroundColor:
        "#FAF8F8",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,
    },

    filterButtonSelected: {
      backgroundColor:
        "#D85D7A",

      borderColor:
        "#D85D7A",
    },

    filterButtonText: {
      fontSize: 10,

      fontWeight:
        "700",

      color:
        "#756E6C",
    },

    filterButtonTextSelected: {
      color:
        "#FFFFFF",
    },

    filterCount: {
      minWidth: 20,

      height: 20,

      paddingHorizontal:
        4,

      borderRadius:
        10,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#EFE9E7",
    },

    filterCountSelected: {
      backgroundColor:
        "rgba(255,255,255,0.22)",
    },

    filterCountText: {
      fontSize: 8,

      fontWeight:
        "800",

      color:
        "#837B79",
    },

    filterCountTextSelected: {
      color:
        "#FFFFFF",
    },

    /*
     * CONTENT
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 14,
    },

    /*
     * LOADING
     */

    loadingContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        30,

      backgroundColor:
        "#F9F7F7",
    },

    loadingIcon: {
      width: 72,

      height: 72,

      borderRadius:
        36,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom:
        18,

      backgroundColor:
        "#FFF0F4",
    },

    loadingTitle: {
      marginTop: 14,

      fontSize: 17,

      fontWeight:
        "900",

      color:
        "#3F3937",
    },

    loadingText: {
      marginTop: 5,

      fontSize: 11,

      color:
        "#938B89",
    },

    /*
     * ERROR
     */

    errorCard: {
      padding: 12,

      borderRadius:
        14,

      marginBottom:
        11,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,

      borderWidth: 1,

      borderColor:
        "#F0D8DD",

      backgroundColor:
        "#FFF2F4",
    },

    errorIcon: {
      width: 36,

      height: 36,

      borderRadius:
        18,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FDE4E8",
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      fontSize: 11,

      fontWeight:
        "800",

      color:
        "#A4505C",
    },

    errorText: {
      marginTop: 2,

      fontSize: 9,

      lineHeight: 14,

      color:
        "#9A7077",
    },

    errorRetryButton: {
      width: 34,

      height: 34,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    /*
     * UNREAD SUMMARY
     */

    unreadSummary: {
      minHeight: 46,

      paddingHorizontal:
        12,

      borderRadius:
        13,

      marginBottom:
        11,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        "#FFF0F4",
    },

    unreadSummaryIcon: {
      width: 30,

      height: 30,

      borderRadius:
        15,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFFFFF",
    },

    unreadSummaryText: {
      flex: 1,

      fontSize: 9,

      color:
        "#8E6671",
    },

    unreadSummaryBold: {
      fontWeight:
        "900",

      color:
        "#C65270",
    },

    markAllText: {
      fontSize: 9,

      fontWeight:
        "800",

      color:
        "#D85D7A",
    },

    /*
     * NOTIFICATIONS
     */

    notificationList: {
      gap: 9,
    },

    notificationCard: {
      position:
        "relative",

      padding: 13,

      borderRadius:
        17,

      borderWidth: 1,

      borderColor:
        "#ECE6E4",

      backgroundColor:
        "#FFFFFF",

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      overflow:
        "hidden",
    },

    notificationCardUnread: {
      borderColor:
        "#F0D3DB",

      backgroundColor:
        "#FFF9FB",
    },

    notificationCardPressed: {
      opacity: 0.82,
    },

    unreadIndicator: {
      position:
        "absolute",

      left: 0,

      top: 0,

      bottom: 0,

      width: 3,

      backgroundColor:
        "#D85D7A",
    },

    notificationIcon: {
      width: 45,

      height: 45,

      borderRadius:
        15,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 2,
    },

    notificationContent: {
      flex: 1,

      marginLeft: 11,
    },

    notificationTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 8,
    },

    notificationTitle: {
      flex: 1,

      fontSize: 12,

      lineHeight: 16,

      fontWeight:
        "700",

      color:
        "#514A48",
    },

    notificationTitleUnread: {
      fontWeight:
        "900",

      color:
        "#3D3634",
    },

    notificationTime: {
      fontSize: 8,

      color:
        "#AAA2A0",

      marginTop: 2,
    },

    notificationMessage: {
      marginTop: 5,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#817977",
    },

    notificationFooter: {
      marginTop: 9,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    notificationTypeBadge: {
      paddingHorizontal:
        8,

      paddingVertical:
        4,

      borderRadius:
        9,

      backgroundColor:
        "#F5F1F0",
    },

    notificationTypeText: {
      fontSize: 7,

      fontWeight:
        "800",

      color:
        "#89817F",

      textTransform:
        "uppercase",

      letterSpacing:
        0.3,
    },

    openHint: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 3,
    },

    openHintText: {
      fontSize: 8,

      fontWeight:
        "700",

      color:
        "#D85D7A",
    },

    /*
     * EMPTY
     */

    emptyContainer: {
      minHeight: 430,

      paddingHorizontal:
        30,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyIcon: {
      width: 92,

      height: 92,

      borderRadius:
        46,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    emptyTitle: {
      marginTop: 19,

      fontSize: 17,

      fontWeight:
        "900",

      color:
        "#453E3C",

      textAlign:
        "center",
    },

    emptyDescription: {
      marginTop: 7,

      maxWidth: 270,

      fontSize: 11,

      lineHeight: 17,

      color:
        "#968E8C",

      textAlign:
        "center",
    },

    emptyOrdersButton: {
      marginTop: 20,

      minHeight: 42,

      paddingHorizontal:
        16,

      borderRadius:
        13,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,

      backgroundColor:
        "#D85D7A",
    },

    emptyOrdersText: {
      fontSize: 10,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },
  });