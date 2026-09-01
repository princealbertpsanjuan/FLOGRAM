import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type FlogramNotification,
  type NotificationType,
} from '../../services/notification';

/*
 * =========================================================
 * RIDER ALERTS
 * =========================================================
 *
 * Real FLOGRAM notification screen.
 *
 * Data comes from:
 *
 * GET /api/v1/notifications
 *
 * Supported Rider notification examples:
 *
 * - delivery_available
 * - delivery_accepted
 * - delivery_pickup_reminder
 * - delivery_picked_up
 * - delivery_out_for_delivery
 * - delivery_completed
 * - delivery_cancelled
 *
 * - remittance_submitted
 * - remittance_verified
 * - remittance_rejected
 *
 * - system
 * - announcement
 *
 * IMPORTANT:
 *
 * Rider earnings are NOT shown here because Riders
 * do not earn per delivery.
 *
 * Rider salary/payroll is a separate future feature.
 *
 * rating_received is supported by the notification
 * schema but should only be generated once the real
 * Review/Rating module exists.
 * =========================================================
 */

export default function RiderAlertsScreen() {
  const [
    notifications,
    setNotifications,
  ] = useState<
    FlogramNotification[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    readingNotificationId,
    setReadingNotificationId,
  ] = useState<
    string | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<
    string | null
  >(null);

  /*
   * =========================================================
   * LOAD NOTIFICATIONS
   * =========================================================
   */

  const loadNotifications =
    useCallback(
      async ({
        silent = false,
      }: {
        silent?: boolean;
      } = {}) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage(
            null
          );

          const data =
            await getNotifications();

          const receivedNotifications =
            Array.isArray(
              data.notifications
            )
              ? data.notifications
              : [];

          setNotifications(
            receivedNotifications
          );

          setUnreadCount(
            Number(
              data.unreadCount
            ) || 0
          );
        } catch (error) {
          console.error(
            'Unable to load Rider notifications:',
            error
          );

          setErrorMessage(
            getErrorMessage(
              error
            )
          );
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      []
    );

  /*
   * =========================================================
   * REFRESH EVERY TIME SCREEN IS OPENED
   * =========================================================
   *
   * Example:
   *
   * Rider marks delivery as picked up
   *      ↓
   * backend creates notification
   *      ↓
   * Rider opens Alerts
   *      ↓
   * newest notification is loaded
   * =========================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadNotifications();

      return () => {};
    }, [
      loadNotifications,
    ])
  );

  /*
   * =========================================================
   * PULL TO REFRESH
   * =========================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadNotifications({
            silent: true,
          });
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        loadNotifications,
      ]
    );

  /*
   * =========================================================
   * MARK ALL AS READ
   * =========================================================
   */

  const handleMarkAllAsRead =
    useCallback(
      async () => {
        if (
          markingAll ||
          unreadCount === 0
        ) {
          return;
        }

        try {
          setMarkingAll(
            true
          );

          await markAllNotificationsAsRead();

          const now =
            new Date()
              .toISOString();

          setNotifications(
            (
              currentNotifications
            ) =>
              currentNotifications.map(
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
        } catch (error) {
          Alert.alert(
            'Unable to Update Alerts',
            getErrorMessage(
              error
            )
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
   * =========================================================
   * MARK ONE AS READ
   * =========================================================
   */

  const markOneAsRead =
    useCallback(
      async (
        notification:
          FlogramNotification
      ) => {
        /*
         * Already read.
         */
        if (
          notification.isRead
        ) {
          return;
        }

        try {
          setReadingNotificationId(
            notification.id
          );

          await markNotificationAsRead(
            notification.id
          );

          const now =
            new Date()
              .toISOString();

          setNotifications(
            (
              currentNotifications
            ) =>
              currentNotifications.map(
                (
                  currentNotification
                ) =>
                  currentNotification.id ===
                  notification.id
                    ? {
                        ...currentNotification,

                        isRead:
                          true,

                        readAt:
                          currentNotification.readAt ||
                          now,
                      }
                    : currentNotification
              )
          );

          setUnreadCount(
            (
              current
            ) =>
              Math.max(
                0,
                current - 1
              )
          );
        } catch (error) {
          /*
           * Do not prevent navigation merely because
           * marking the notification as read failed.
           */
          console.error(
            'Unable to mark notification as read:',
            error
          );
        } finally {
          setReadingNotificationId(
            null
          );
        }
      },
      []
    );

  /*
   * =========================================================
   * OPEN RELATED SCREEN
   * =========================================================
   */

  const openNotificationDestination =
    useCallback(
      (
        notification:
          FlogramNotification
      ) => {
        /*
         * -----------------------------------------------------
         * REMITTANCE
         * -----------------------------------------------------
         */

        if (
          isRemittanceNotification(
            notification.type
          )
        ) {
          router.push(
            '/(rider)/rider-wallet'
          );

          return;
        }

        /*
         * -----------------------------------------------------
         * RATING
         * -----------------------------------------------------
         *
         * This will only become useful once the
         * real Review/Rating module is implemented.
         */

        if (
          notification.type ===
          'rating_received'
        ) {
          router.push(
            '/(rider)/rider-stats'
          );

          return;
        }

        /*
         * -----------------------------------------------------
         * AVAILABLE DELIVERY
         * -----------------------------------------------------
         *
         * Marketplace notification has no assigned Rider
         * delivery yet, so send Rider to Deliveries.
         */

        if (
          notification.type ===
          'delivery_available'
        ) {
          router.push(
            '/(rider)/rider-deliveries'
          );

          return;
        }

        /*
         * -----------------------------------------------------
         * DELIVERY WITH DELIVERY ID
         * -----------------------------------------------------
         */

        if (
          isDeliveryNotification(
            notification.type
          ) &&
          notification.deliveryId
        ) {
          router.push({
            pathname:
              '/(rider)/rider-delivery',

            params: {
              deliveryId:
                notification.deliveryId,
            },
          });

          return;
        }

        /*
         * -----------------------------------------------------
         * DELIVERY FALLBACK
         * -----------------------------------------------------
         */

        if (
          isDeliveryNotification(
            notification.type
          )
        ) {
          router.push(
            '/(rider)/rider-deliveries'
          );

          return;
        }

        /*
         * General/system/announcement notifications
         * intentionally remain on the Alerts screen.
         */
      },
      []
    );

  /*
   * =========================================================
   * HANDLE NOTIFICATION PRESS
   * =========================================================
   */

  const handleNotificationPress =
    useCallback(
      async (
        notification:
          FlogramNotification
      ) => {
        await markOneAsRead(
          notification
        );

        openNotificationDestination(
          notification
        );
      },
      [
        markOneAsRead,
        openNotificationDestination,
      ]
    );

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  return (
    <SafeAreaView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.screen
        }
      >
        {/* =====================================================
            HEADER
        ===================================================== */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerTop
            }
          >
            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                Alerts
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                {unreadCount > 0
                  ? `${unreadCount} unread ${
                      unreadCount ===
                      1
                        ? 'notification'
                        : 'notifications'
                    }`
                  : 'You are all caught up'}
              </Text>
            </View>

            <Pressable
              disabled={
                markingAll ||
                unreadCount === 0
              }
              style={({
                pressed,
              }) => [
                styles.markAllButton,

                pressed &&
                  styles.pressed,

                (
                  markingAll ||
                  unreadCount ===
                    0
                ) &&
                  styles.markAllButtonDisabled,
              ]}
              onPress={
                handleMarkAllAsRead
              }
            >
              {markingAll ? (
                <ActivityIndicator
                  size="small"
                  color="#79AF86"
                />
              ) : (
                <Text
                  style={[
                    styles.markAllText,

                    unreadCount ===
                      0 &&
                      styles.markAllTextDisabled,
                  ]}
                >
                  Mark all as read
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        {loading ? (
          <View
            style={
              styles.centerState
            }
          >
            <ActivityIndicator
              size="large"
              color="#C58E27"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading alerts...
            </Text>
          </View>
        ) : errorMessage ? (
          <View
            style={
              styles.centerState
            }
          >
            <View
              style={
                styles.stateIconCircle
              }
            >
              <Text
                style={
                  styles.stateIcon
                }
              >
                !
              </Text>
            </View>

            <Text
              style={
                styles.stateTitle
              }
            >
              Unable to Load Alerts
            </Text>

            <Text
              style={
                styles.stateMessage
              }
            >
              {
                errorMessage
              }
            </Text>

            <Pressable
              style={({
                pressed,
              }) => [
                styles.retryButton,

                pressed &&
                  styles.pressed,
              ]}
              onPress={() =>
                loadNotifications()
              }
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={
              styles.scrollView
            }
            contentContainerStyle={[
              styles.scrollContent,

              notifications.length ===
                0 &&
                styles.emptyScrollContent,
            ]}
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
              />
            }
          >
            {notifications.length >
            0 ? (
              notifications.map(
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
                      readingNotificationId ===
                      notification.id
                    }
                    onPress={() =>
                      handleNotificationPress(
                        notification
                      )
                    }
                  />
                )
              )
            ) : (
              <View
                style={
                  styles.emptyState
                }
              >
                <View
                  style={
                    styles.emptyIconCircle
                  }
                >
                  <Text
                    style={
                      styles.emptyIcon
                    }
                  >
                    ♢
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No Alerts Yet
                </Text>

                <Text
                  style={
                    styles.emptyMessage
                  }
                >
                  Delivery and remittance
                  updates will appear here.
                </Text>
              </View>
            )}

            <View
              style={
                styles.bottomSpacer
              }
            />
          </ScrollView>
        )}

        {/* =====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <View
          style={
            styles.bottomNav
          }
        >
          {/* DASHBOARD */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(rider)/rider-dashboard'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ⌂
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Dashboard
            </Text>
          </Pressable>

          {/* DELIVERIES */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-deliveries'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ▣
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Deliveries
            </Text>
          </Pressable>

          {/* WALLET */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-wallet'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ₱
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Wallet
            </Text>
          </Pressable>

          {/* ALERTS */}

          <Pressable
            style={
              styles.navItem
            }
          >
            <View
              style={[
                styles.navIconContainer,
                styles.activeNavIconContainer,
              ]}
            >
              <Text
                style={[
                  styles.navIcon,
                  styles.activeNavIcon,
                ]}
              >
                ♢
              </Text>
            </View>

            <Text
              style={[
                styles.navText,
                styles.activeNavText,
              ]}
            >
              Alerts
            </Text>
          </Pressable>

          {/* STATS */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-stats'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ♙
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Stats
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
  const appearance =
    getNotificationAppearance(
      notification.type
    );

  return (
    <Pressable
      disabled={
        loading
      }
      style={({
        pressed,
      }) => [
        styles.alertCard,

        !notification.isRead &&
          styles.unreadAlertCard,

        pressed &&
          styles.alertCardPressed,
      ]}
      onPress={
        onPress
      }
    >
      {/* ICON */}

      <View
        style={[
          styles.alertIconCircle,

          {
            backgroundColor:
              appearance.backgroundColor,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={
              appearance.color
            }
          />
        ) : (
          <Text
            style={[
              styles.alertIcon,

              {
                color:
                  appearance.color,
              },
            ]}
          >
            {
              appearance.icon
            }
          </Text>
        )}
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.alertContent
        }
      >
        <View
          style={
            styles.alertTitleRow
          }
        >
          <Text
            style={[
              styles.alertTitle,

              !notification.isRead &&
                styles.unreadAlertTitle,
            ]}
          >
            {
              notification.title
            }
          </Text>

          {!notification.isRead && (
            <View
              style={
                styles.unreadDot
              }
            />
          )}
        </View>

        <Text
          style={
            styles.alertMessage
          }
        >
          {
            notification.message
          }
        </Text>

        <Text
          style={
            styles.alertTime
          }
        >
          {formatRelativeTime(
            notification.createdAt
          )}
        </Text>
      </View>
    </Pressable>
  );
}

/*
 * =========================================================
 * DELIVERY NOTIFICATION CHECK
 * =========================================================
 */

function isDeliveryNotification(
  type:
    NotificationType
) {
  return [
    'delivery_available',
    'delivery_accepted',
    'delivery_ready',
    'delivery_pickup_reminder',
    'delivery_picked_up',
    'delivery_out_for_delivery',
    'delivery_completed',
    'delivery_cancelled',
  ].includes(
    type
  );
}

/*
 * =========================================================
 * REMITTANCE NOTIFICATION CHECK
 * =========================================================
 */

function isRemittanceNotification(
  type:
    NotificationType
) {
  return [
    'remittance_submitted',
    'remittance_verified',
    'remittance_rejected',
  ].includes(
    type
  );
}

/*
 * =========================================================
 * NOTIFICATION APPEARANCE
 * =========================================================
 */

function getNotificationAppearance(
  type:
    NotificationType
) {
  switch (type) {
    /*
     * -----------------------------------------------------
     * AVAILABLE / ACCEPTED
     * -----------------------------------------------------
     */

    case 'delivery_available':
      return {
        icon:
          '◇',

        color:
          '#D5A33D',

        backgroundColor:
          '#FFF4DA',
      };

    case 'delivery_accepted':
      return {
        icon:
          '✓',

        color:
          '#67AE7B',

        backgroundColor:
          '#EAF7EE',
      };

    /*
     * -----------------------------------------------------
     * PICKUP
     * -----------------------------------------------------
     */

    case 'delivery_ready':
    case 'delivery_pickup_reminder':
      return {
        icon:
          '♧',

        color:
          '#DA7597',

        backgroundColor:
          '#FCE8EF',
      };

    case 'delivery_picked_up':
      return {
        icon:
          '▣',

        color:
          '#747BEF',

        backgroundColor:
          '#ECEEFF',
      };

    /*
     * -----------------------------------------------------
     * DELIVERY IN PROGRESS
     * -----------------------------------------------------
     */

    case 'delivery_out_for_delivery':
      return {
        icon:
          '→',

        color:
          '#747BEF',

        backgroundColor:
          '#ECEEFF',
      };

    /*
     * -----------------------------------------------------
     * COMPLETED
     * -----------------------------------------------------
     */

    case 'delivery_completed':
      return {
        icon:
          '✓',

        color:
          '#67AE7B',

        backgroundColor:
          '#EAF7EE',
      };

    /*
     * -----------------------------------------------------
     * CANCELLED
     * -----------------------------------------------------
     */

    case 'delivery_cancelled':
      return {
        icon:
          '×',

        color:
          '#D26C6C',

        backgroundColor:
          '#FBEAEA',
      };

    /*
     * -----------------------------------------------------
     * REMITTANCE
     * -----------------------------------------------------
     */

    case 'remittance_submitted':
      return {
        icon:
          '₱',

        color:
          '#D5A33D',

        backgroundColor:
          '#FFF4DA',
      };

    case 'remittance_verified':
      return {
        icon:
          '✓',

        color:
          '#67AE7B',

        backgroundColor:
          '#EAF7EE',
      };

    case 'remittance_rejected':
      return {
        icon:
          '!',

        color:
          '#D26C6C',

        backgroundColor:
          '#FBEAEA',
      };

    /*
     * -----------------------------------------------------
     * RATING
     * -----------------------------------------------------
     */

    case 'rating_received':
      return {
        icon:
          '☆',

        color:
          '#D4A33C',

        backgroundColor:
          '#FFF5DE',
      };

    /*
     * -----------------------------------------------------
     * VERIFICATION
     * -----------------------------------------------------
     */

    case 'verification_approved':
      return {
        icon:
          '✓',

        color:
          '#67AE7B',

        backgroundColor:
          '#EAF7EE',
      };

    case 'verification_rejected':
      return {
        icon:
          '!',

        color:
          '#D26C6C',

        backgroundColor:
          '#FBEAEA',
      };

    /*
     * -----------------------------------------------------
     * ORDER
     * -----------------------------------------------------
     */

    case 'order_created':
    case 'order_updated':
      return {
        icon:
          '▣',

        color:
          '#747BEF',

        backgroundColor:
          '#ECEEFF',
      };

    case 'order_cancelled':
      return {
        icon:
          '×',

        color:
          '#D26C6C',

        backgroundColor:
          '#FBEAEA',
      };

    /*
     * -----------------------------------------------------
     * SYSTEM
     * -----------------------------------------------------
     */

    case 'announcement':
      return {
        icon:
          '♢',

        color:
          '#D5A33D',

        backgroundColor:
          '#FFF4DA',
      };

    case 'system':
    default:
      return {
        icon:
          '•',

        color:
          '#777277',

        backgroundColor:
          '#F1F1F1',
      };
  }
}

/*
 * =========================================================
 * RELATIVE TIME
 * =========================================================
 */

function formatRelativeTime(
  createdAt:
    string
) {
  const createdDate =
    new Date(
      createdAt
    );

  if (
    Number.isNaN(
      createdDate.getTime()
    )
  ) {
    return '';
  }

  const now =
    new Date();

  const difference =
    Math.max(
      0,
      now.getTime() -
        createdDate.getTime()
    );

  const seconds =
    Math.floor(
      difference /
        1000
    );

  if (
    seconds <
    60
  ) {
    return 'Just now';
  }

  const minutes =
    Math.floor(
      seconds /
        60
    );

  if (
    minutes <
    60
  ) {
    return `${minutes} ${
      minutes === 1
        ? 'min'
        : 'mins'
    } ago`;
  }

  const hours =
    Math.floor(
      minutes /
        60
    );

  if (
    hours <
    24
  ) {
    return `${hours} ${
      hours === 1
        ? 'hr'
        : 'hrs'
    } ago`;
  }

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    days === 1
  ) {
    return 'Yesterday';
  }

  if (
    days <
    7
  ) {
    return `${days} days ago`;
  }

  return createdDate
    .toLocaleDateString(
      'en-PH',
      {
        month:
          'short',

        day:
          'numeric',

        year:
          createdDate.getFullYear() !==
          now.getFullYear()
            ? 'numeric'
            : undefined,
      }
    );
}

/*
 * =========================================================
 * ERROR MESSAGE
 * =========================================================
 */

function getErrorMessage(
  error:
    unknown
) {
  if (
    error instanceof
    Error
  ) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex:
        1,

      backgroundColor:
        '#F7F7F8',
    },

    screen: {
      flex:
        1,

      backgroundColor:
        '#F7F7F8',
    },

    /*
     * =====================================================
     * HEADER
     * =====================================================
     */

    header: {
      backgroundColor:
        '#FFFFFF',

      paddingHorizontal:
        18,

      paddingTop:
        22,

      paddingBottom:
        15,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#F0EEF0',
    },

    headerTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    headerTitle: {
      color:
        '#2F2930',

      fontSize:
        21,

      fontWeight:
        '900',
    },

    headerSubtitle: {
      color:
        '#9E979C',

      fontSize:
        8,

      marginTop:
        3,

      fontWeight:
        '600',
    },

    markAllButton: {
      minWidth:
        86,

      minHeight:
        32,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        5,

      paddingVertical:
        7,
    },

    markAllButtonDisabled: {
      opacity:
        0.55,
    },

    markAllText: {
      color:
        '#79AF86',

      fontSize:
        8,

      fontWeight:
        '800',
    },

    markAllTextDisabled: {
      color:
        '#B8B3B6',
    },

    /*
     * =====================================================
     * SCROLL
     * =====================================================
     */

    scrollView: {
      flex:
        1,
    },

    scrollContent: {
      paddingHorizontal:
        15,

      paddingTop:
        14,

      flexGrow:
        1,
    },

    emptyScrollContent: {
      justifyContent:
        'center',
    },

    /*
     * =====================================================
     * ALERT CARD
     * =====================================================
     */

    alertCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        16,

      paddingHorizontal:
        12,

      paddingVertical:
        14,

      marginBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderWidth:
        1,

      borderColor:
        'transparent',

      elevation:
        2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          1,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        4,
    },

    unreadAlertCard: {
      borderColor:
        '#E8F3EB',

      backgroundColor:
        '#FCFFFD',
    },

    alertCardPressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.995,
        },
      ],
    },

    alertIconCircle: {
      width:
        40,

      height:
        40,

      borderRadius:
        20,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,
    },

    alertIcon: {
      fontSize:
        15,

      fontWeight:
        '900',
    },

    alertContent: {
      flex:
        1,

      paddingTop:
        1,
    },

    alertTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    alertTitle: {
      color:
        '#4C464B',

      fontSize:
        10,

      fontWeight:
        '700',

      flex:
        1,

      paddingRight:
        8,
    },

    unreadAlertTitle: {
      fontWeight:
        '900',

      color:
        '#383338',
    },

    unreadDot: {
      width:
        7,

      height:
        7,

      borderRadius:
        4,

      backgroundColor:
        '#72B181',
    },

    alertMessage: {
      color:
        '#837C81',

      fontSize:
        8,

      lineHeight:
        13,

      marginTop:
        4,

      paddingRight:
        6,
    },

    alertTime: {
      color:
        '#B5AFB2',

      fontSize:
        7,

      marginTop:
        5,
    },

    /*
     * =====================================================
     * LOADING / ERROR STATE
     * =====================================================
     */

    centerState: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        32,

      paddingBottom:
        70,
    },

    loadingText: {
      marginTop:
        12,

      color:
        '#8A8488',

      fontSize:
        10,

      fontWeight:
        '600',
    },

    stateIconCircle: {
      width:
        54,

      height:
        54,

      borderRadius:
        27,

      backgroundColor:
        '#FBEAEA',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        13,
    },

    stateIcon: {
      color:
        '#D26C6C',

      fontSize:
        23,

      fontWeight:
        '900',
    },

    stateTitle: {
      color:
        '#403B3F',

      fontSize:
        14,

      fontWeight:
        '900',

      textAlign:
        'center',
    },

    stateMessage: {
      color:
        '#8E888C',

      fontSize:
        9,

      lineHeight:
        14,

      textAlign:
        'center',

      marginTop:
        6,
    },

    retryButton: {
      backgroundColor:
        '#C58E27',

      paddingHorizontal:
        20,

      paddingVertical:
        10,

      borderRadius:
        12,

      marginTop:
        16,
    },

    retryButtonText: {
      color:
        '#FFFFFF',

      fontSize:
        9,

      fontWeight:
        '900',
    },

    /*
     * =====================================================
     * EMPTY STATE
     * =====================================================
     */

    emptyState: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

      paddingBottom:
        70,
    },

    emptyIconCircle: {
      width:
        60,

      height:
        60,

      borderRadius:
        30,

      backgroundColor:
        '#FFF4DA',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        14,
    },

    emptyIcon: {
      color:
        '#C58E27',

      fontSize:
        24,

      fontWeight:
        '900',
    },

    emptyTitle: {
      color:
        '#403B3F',

      fontSize:
        14,

      fontWeight:
        '900',
    },

    emptyMessage: {
      color:
        '#918A8F',

      fontSize:
        9,

      lineHeight:
        14,

      textAlign:
        'center',

      marginTop:
        6,

      maxWidth:
        230,
    },

    pressed: {
      opacity:
        0.7,
    },

    bottomSpacer: {
      height:
        26,
    },

    /*
     * =====================================================
     * BOTTOM NAVIGATION
     * =====================================================
     */

    bottomNav: {
      height:
        70,

      backgroundColor:
        '#FFFFFF',

      borderTopWidth:
        1,

      borderTopColor:
        '#ECEAEC',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-around',

      paddingHorizontal:
        3,

      elevation:
        8,
    },

    navItem: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    navIconContainer: {
      width:
        32,

      height:
        28,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    activeNavIconContainer: {
      backgroundColor:
        '#FFF1CB',
    },

    navIcon: {
      color:
        '#A5A0A3',

      fontSize:
        15,

      fontWeight:
        '700',
    },

    activeNavIcon: {
      color:
        '#C58E27',
    },

    navText: {
      color:
        '#9D979B',

      fontSize:
        7,

      fontWeight:
        '600',

      marginTop:
        3,
    },

    activeNavText: {
      color:
        '#C58E27',

      fontWeight:
        '900',
    },
  });