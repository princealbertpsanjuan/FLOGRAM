import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  getStoredUser,
  logout,
} from '../../services/auth';

import {
  acceptDelivery,
  getAvailableDeliveries,
  getRiderDashboard,
  getRiderDeliveries,
  updateRiderAvailability,
} from '../../services/delivery';

import type {
  Delivery,
  DeliveryCustomer,
  DeliveryFlorist,
  DeliveryOrder,
  RiderDashboardData,
} from '../../services/delivery';

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const { width: SCREEN_WIDTH } =
  Dimensions.get('window');

const GOLD = '#D2A329';
const GOLD_DARK = '#C49317';
const GOLD_LIGHT = '#F8EECF';

const BACKGROUND = '#F8F7FA';
const WHITE = '#FFFFFF';

const TEXT = '#171717';
const MUTED = '#999999';

const GREEN = '#39B56A';

const ACTIVE_STATUSES = [
  'accepted',
  'picked_up',
  'out_for_delivery',
] as const;

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const isActiveDelivery = (
  delivery: Delivery
) =>
  ACTIVE_STATUSES.includes(
    delivery.status as
      (typeof ACTIVE_STATUSES)[number]
  );

const formatCurrency = (
  amount?: number | null
) => {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount)
  ) {
    return '₱0';
  }

  return `₱${amount.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }
  )}`;
};

const formatAddress = (
  address?:
    | {
        street?: string;
        barangay?: string;
        city?: string;
        province?: string;
        postalCode?: string;
        landmark?: string;
      }
    | null
) => {
  if (!address) {
    return 'Address unavailable';
  }

  return [
    address.street,
    address.barangay,
    address.city,
    address.province,
  ]
    .filter(Boolean)
    .join(', ');
};

const getOrder = (
  delivery: Delivery
): DeliveryOrder | null => {
  if (
    delivery.order &&
    typeof delivery.order ===
      'object'
  ) {
    return delivery.order;
  }

  return null;
};

const getFlorist = (
  delivery: Delivery
): DeliveryFlorist | null => {
  if (
    delivery.florist &&
    typeof delivery.florist ===
      'object'
  ) {
    return delivery.florist;
  }

  return null;
};

const getCustomer = (
  delivery: Delivery
): DeliveryCustomer | null => {
  if (
    delivery.customer &&
    typeof delivery.customer ===
      'object'
  ) {
    return delivery.customer;
  }

  return null;
};

const getProductName = (
  delivery: Delivery
) => {
  return (
    getOrder(delivery)
      ?.productName ||
    'Flower Order'
  );
};

const getFloristName = (
  delivery: Delivery
) => {
  return (
    getFlorist(delivery)
      ?.shopName ||
    'Flower Shop'
  );
};

const getRecipientName = (
  delivery: Delivery
) => {
  if (
    delivery.recipientName?.trim()
  ) {
    return delivery.recipientName;
  }

  const customer =
    getCustomer(delivery);

  if (!customer) {
    return 'Customer';
  }

  const fullName = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || 'Customer';
};

const getStatusLabel = (
  status: Delivery['status']
) => {
  switch (status) {
    case 'accepted':
      return 'Accepted';

    case 'picked_up':
      return 'Picked Up';

    case 'out_for_delivery':
      return 'Out for Delivery';

    case 'delivered':
      return 'Delivered';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
};

const getErrorMessage = (
  error: unknown
) => {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function RiderDashboardScreen() {
  /*
   * ---------------------------------------------------------
   * USER
   * ---------------------------------------------------------
   */

  const [
    localFirstName,
    setLocalFirstName,
  ] = useState('');

  /*
   * ---------------------------------------------------------
   * DASHBOARD
   * ---------------------------------------------------------
   */

  const [
    dashboardData,
    setDashboardData,
  ] =
    useState<RiderDashboardData | null>(
      null
    );

  /*
   * ---------------------------------------------------------
   * DELIVERIES
   * ---------------------------------------------------------
   */

  const [
    riderDeliveries,
    setRiderDeliveries,
  ] =
    useState<Delivery[]>([]);

  const [
    availableDeliveries,
    setAvailableDeliveries,
  ] =
    useState<Delivery[]>([]);

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    availabilitySaving,
    setAvailabilitySaving,
  ] = useState(false);

  const [
    acceptingDeliveryId,
    setAcceptingDeliveryId,
  ] =
    useState<string | null>(
      null
    );
  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  /*
   * =========================================================
   * DERIVED DATA
   * =========================================================
   */

  const activeDelivery =
    useMemo(() => {
      return (
        riderDeliveries.find(
          isActiveDelivery
        ) || null
      );
    }, [riderDeliveries]);

  const isAvailable =
    dashboardData?.rider
      .isAvailable ?? false;

  const firstName =
    dashboardData?.rider
      .firstName?.trim() ||
    localFirstName.trim() ||
    'Rider';

  const deliveryCount =
    dashboardData?.deliveries
      .completed ??
    riderDeliveries.filter(
      delivery =>
        delivery.status ===
        'delivered'
    ).length;

  const totalDeliveryValue =
    dashboardData?.deliveryValue
      .total ?? 0;

  const todayDeliveryValue =
    dashboardData?.deliveryValue
      .today ?? 0;

  const monthDeliveryValue =
    dashboardData?.deliveryValue
      .thisMonth ?? 0;

  const rating =
    typeof dashboardData?.rating
      .average === 'number'
      ? dashboardData.rating
          .average
          .toFixed(1)
      : '--';

  /*
   * =========================================================
   * STORED USER
   * =========================================================
   */

  const loadStoredUser =
    useCallback(async () => {
      try {
        const user =
          await getStoredUser();

        if (user?.firstName) {
          setLocalFirstName(
            user.firstName
          );
        }
      } catch (error) {
        console.log(
          'Failed to load stored rider user:',
          error
        );
      }
    }, []);

  /*
   * =========================================================
   * AVAILABLE DELIVERIES
   * =========================================================
   */

  const loadAvailableRequests =
    useCallback(
      async (
        shouldLoad: boolean
      ) => {
        if (!shouldLoad) {
          setAvailableDeliveries(
            []
          );

          return;
        }

        try {
          const result =
            await getAvailableDeliveries();

          setAvailableDeliveries(
            result.deliveries ||
              []
          );
        } catch (error) {
          console.log(
            'Available deliveries error:',
            error
          );

          setAvailableDeliveries(
            []
          );
        }
      },
      []
    );

  /*
   * =========================================================
   * DASHBOARD LOAD
   * =========================================================
   */

  const loadDashboard =
    useCallback(
      async (
        showLoader = false
      ) => {
        if (showLoader) {
          setLoading(true);
        }

        try {
          const [
            dashboard,
            riderDeliveryResult,
          ] =
            await Promise.all([
              getRiderDashboard(),
              getRiderDeliveries(),
            ]);

          setDashboardData(
            dashboard
          );

          const deliveries =
            riderDeliveryResult
              .deliveries || [];

          setRiderDeliveries(
            deliveries
          );

          const active =
            deliveries.find(
              isActiveDelivery
            );

          await loadAvailableRequests(
            dashboard.rider
                .isAvailable ===
              true &&
              !active
          );
        } catch (error) {
          console.log(
            'Rider dashboard error:',
            error
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        loadAvailableRequests,
      ]
    );

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  useEffect(() => {
    loadStoredUser();

    loadDashboard(true);
  }, [
    loadDashboard,
    loadStoredUser,
  ]);

  /*
   * =========================================================
   * REFRESH WHEN SCREEN GAINS FOCUS
   * =========================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadDashboard();

      return undefined;
    }, [loadDashboard])
  );

  /*
   * =========================================================
   * PULL TO REFRESH
   * =========================================================
   */

  const handleRefresh =
    useCallback(async () => {
      setRefreshing(true);

      try {
        await loadDashboard();
      } finally {
        setRefreshing(false);
      }
    }, [loadDashboard]);

  /*
   * =========================================================
   * AVAILABILITY
   * =========================================================
   */

  const handleAvailabilityChange =
    useCallback(
      async (
        nextValue: boolean
      ) => {
        if (
          availabilitySaving
        ) {
          return;
        }

        if (
          nextValue &&
          activeDelivery
        ) {
          Alert.alert(
            'Active Delivery',
            'Complete your current delivery before going online for new delivery requests.'
          );

          return;
        }

        setAvailabilitySaving(
          true
        );

        try {
          const result =
            await updateRiderAvailability(
              nextValue
            );

          setDashboardData(
            previous => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                rider: {
                  ...previous.rider,

                  isAvailable:
                    result.isAvailable,
                },
              };
            }
          );

          if (
            result.isAvailable
          ) {
            await loadAvailableRequests(
              true
            );
          } else {
            setAvailableDeliveries(
              []
            );
          }
        } catch (error) {
          console.log(
            'Availability error:',
            error
          );

          Alert.alert(
            'Rider Availability',
            getErrorMessage(
              error
            )
          );

          await loadDashboard();
        } finally {
          setAvailabilitySaving(
            false
          );
        }
      },
      [
        activeDelivery,
        availabilitySaving,
        loadAvailableRequests,
        loadDashboard,
      ]
    );

  /*
   * =========================================================
   * ACCEPT DELIVERY
   * =========================================================
   */

  const handleAcceptDelivery =
    useCallback(
      async (
        delivery: Delivery
      ) => {
        if (
          acceptingDeliveryId
        ) {
          return;
        }

        if (!isAvailable) {
          Alert.alert(
            'Rider Offline',
            'Turn your availability on before accepting a delivery request.'
          );

          return;
        }

        setAcceptingDeliveryId(
          delivery._id
        );

        try {
          const accepted =
            await acceptDelivery(
              delivery._id
            );

          setDashboardData(
            previous => {
              if (!previous) {
                return previous;
              }

              return {
                ...previous,

                rider: {
                  ...previous.rider,

                  isAvailable:
                    false,
                },
              };
            }
          );

          setAvailableDeliveries(
            []
          );

          setRiderDeliveries(
            previous => [
              accepted,

              ...previous.filter(
                item =>
                  item._id !==
                  accepted._id
              ),
            ]
          );

          router.push({
            pathname:
              '/(rider)/rider-delivery',

            params: {
              deliveryId:
                accepted._id,
            },
          });
        } catch (error) {
          console.log(
            'Accept delivery error:',
            error
          );

          Alert.alert(
            'Unable to Accept',
            getErrorMessage(
              error
            )
          );

          await loadDashboard();
        } finally {
          setAcceptingDeliveryId(
            null
          );
        }
      },
      [
        acceptingDeliveryId,
        isAvailable,
        loadDashboard,
      ]
    );

  /*
   * =========================================================
   * NAVIGATION
   * =========================================================
   */

  const openActiveDelivery =
    useCallback(() => {
      if (!activeDelivery) {
        return;
      }

      router.push({
        pathname:
          '/(rider)/rider-delivery',

        params: {
          deliveryId:
            activeDelivery._id,
        },
      });
    }, [activeDelivery]);

  const goDashboard =
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard]);

  const goDeliveries =
    useCallback(() => {
      router.push(
        '/(rider)/rider-deliveries'
      );
    }, []);

  const goWallet =
    useCallback(() => {
      router.push(
        '/(rider)/rider-wallet'
      );
    }, []);

  const goAlerts =
    useCallback(() => {
      router.push(
        '/(rider)/rider-alerts'
      );
    }, []);

  const goStats =
    useCallback(() => {
      router.push(
        '/(rider)/rider-stats'
      );
    }, []);
  /*
 * =========================================================
 * RIDER LOGOUT
 * =========================================================
 */

const handleLogout =
  useCallback(() => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your Rider account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Log Out',
          style: 'destructive',

          onPress:
            async () => {
              try {
                setLoggingOut(
                  true
                );

                /*
                 * auth.logout() calls the backend
                 * and removes both:
                 *
                 * - flogram_access_token
                 * - flogram_user
                 *
                 * from Expo SecureStore.
                 */
                await logout();
              } catch (error) {
                /*
                 * logout() removes the local
                 * session inside its finally block,
                 * so the Rider should still be sent
                 * to the login screen.
                 */
                console.log(
                  'Rider logout error:',
                  error
                );
              } finally {
                /*
                 * replace() prevents the Rider from
                 * pressing Back and returning to an
                 * authenticated Rider screen.
                 */
                router.replace(
                  '/(auth)/login'
                );

                setLoggingOut(
                  false
                );
              }
            },
        },
      ]
    );
  }, [
    loggingOut,
  ]);

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (
    loading &&
    !dashboardData
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={GOLD}
        />

        <ActivityIndicator
          size="large"
          color={GOLD}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading dashboard...
        </Text>
      </View>
    );
  }

  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  return (
    <View
      style={styles.screen}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={GOLD}
      />

      {/*
       * =====================================================
       * HEADER
       * =====================================================
       */}

      <View
        style={styles.header}
      >
        <View
          style={
            styles.headerCircle
          }
        />

        <View
          style={
            styles.headerTop
          }
        >
          <View>
            <Text
              style={
                styles.todayText
              }
            >
              Today
            </Text>

            <Text
              style={
                styles.welcomeText
              }
            >
              Welcome back,
            </Text>

            <View
              style={
                styles.nameRow
              }
            >
              <Text
                style={
                  styles.nameText
                }
              >
                Hey, {firstName}!
              </Text>

              <Text
                style={
                  styles.flowerEmoji
                }
              >
                🌸
              </Text>
            </View>
          </View>

          <Pressable
  disabled={
    loggingOut
  }
  style={({
    pressed,
  }) => [
    styles.moreButton,

    pressed &&
      !loggingOut && {
        opacity: 0.65,
      },

    loggingOut && {
      opacity: 0.7,
    },
  ]}
  onPress={
    handleLogout
  }
>
  {loggingOut ? (
    <ActivityIndicator
      size="small"
      color={WHITE}
    />
  ) : (
    <Ionicons
      name="log-out-outline"
      size={25}
      color={WHITE}
    />
  )}
</Pressable>
        </View>

        {/*
         * ---------------------------------------------------
         * HEADER STATS
         * ---------------------------------------------------
         */}

        <View
          style={
            styles.statsRow
          }
        >
          <View
            style={
              styles.statCard
            }
          >
            <Text
              style={
                styles.statNumber
              }
            >
              {deliveryCount}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              Deliveries
            </Text>
          </View>

          <View
            style={
              styles.statCard
            }
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={
                styles.statNumber
              }
            >
              {formatCurrency(
                totalDeliveryValue
              )}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              Delivery Value
            </Text>
          </View>

          <View
            style={
              styles.statCard
            }
          >
            <Text
              style={
                styles.statNumber
              }
            >
              {rating}
            </Text>

            <Text
              style={
                styles.statLabel
              }
            >
              Rating
            </Text>
          </View>
        </View>
      </View>

      {/*
       * =====================================================
       * SCROLLABLE CONTENT
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
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        {/*
         * ===================================================
         * STATUS CARD
         * ===================================================
         */}

        <View
          style={
            styles.statusCard
          }
        >
          <View
            style={
              styles.statusLeft
            }
          >
            <View
              style={
                styles.motorcycleCircle
              }
            >
              <Text
                style={
                  styles.motorcycleEmoji
                }
              >
                🛵
              </Text>
            </View>

            <View
              style={
                styles.statusTextArea
              }
            >
              <Text
                style={
                  styles.statusTitle
                }
              >
                Status
              </Text>

              <View
                style={
                  styles.statusSubRow
                }
              >
                <View
                  style={[
                    styles.statusDot,

                    {
                      backgroundColor:
                        activeDelivery ||
                        !isAvailable
                          ? '#A5A5A5'
                          : GREEN,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.statusSubtitle,

                    {
                      color:
                        activeDelivery ||
                        !isAvailable
                          ? MUTED
                          : GREEN,
                    },
                  ]}
                >
                  {activeDelivery
                    ? 'Busy — Active delivery'
                    : isAvailable
                      ? 'Online — Accepting deliveries'
                      : 'Offline — Not accepting deliveries'}
                </Text>
              </View>
            </View>
          </View>

          {availabilitySaving ? (
            <ActivityIndicator
              size="small"
              color={GOLD}
            />
          ) : (
            <Switch
              value={
                isAvailable
              }
              onValueChange={
                handleAvailabilityChange
              }
              disabled={
                availabilitySaving ||
                Boolean(
                  activeDelivery
                )
              }
              trackColor={{
                false:
                  '#D9D9D9',

                true: GOLD,
              }}
              thumbColor={
                WHITE
              }
              ios_backgroundColor="#D9D9D9"
            />
          )}
        </View>

        {/*
         * ===================================================
         * ACTIVE DELIVERY
         * ===================================================
         */}

        {activeDelivery ? (
          <>
            <View
              style={
                styles.sectionTitleRow
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Active Delivery
              </Text>

              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  1
                </Text>
              </View>
            </View>

            <Pressable
              style={
                styles.activeCard
              }
              onPress={
                openActiveDelivery
              }
            >
              <View
                style={
                  styles.activeTopRow
                }
              >
                <View
                  style={
                    styles.activeIconCircle
                  }
                >
                  <MaterialCommunityIcons
                    name="truck-delivery-outline"
                    size={25}
                    color={GOLD_DARK}
                  />
                </View>

                <View
                  style={
                    styles.activeInfo
                  }
                >
                  <Text
                    style={
                      styles.activeProduct
                    }
                  >
                    {getProductName(
                      activeDelivery
                    )}
                  </Text>

                  <Text
                    style={
                      styles.activeFlorist
                    }
                  >
                    {getFloristName(
                      activeDelivery
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.activeBadge
                  }
                >
                  <Text
                    style={
                      styles.activeBadgeText
                    }
                  >
                    {getStatusLabel(
                      activeDelivery.status
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.activeRoute
                }
              >
                <View
                  style={
                    styles.routeRow
                  }
                >
                  <Ionicons
                    name="storefront-outline"
                    size={18}
                    color={GOLD_DARK}
                  />

                  <View
                    style={
                      styles.routeTextArea
                    }
                  >
                    <Text
                      style={
                        styles.routeSmallLabel
                      }
                    >
                      Pickup
                    </Text>

                    <Text
                      style={
                        styles.routeAddress
                      }
                    >
                      {formatAddress(
                        activeDelivery
                          .pickupAddress
                      )}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.routeRow
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={19}
                    color={GOLD_DARK}
                  />

                  <View
                    style={
                      styles.routeTextArea
                    }
                  >
                    <Text
                      style={
                        styles.routeSmallLabel
                      }
                    >
                      Deliver to
                    </Text>

                    <Text
                      style={
                        styles.routeAddress
                      }
                    >
                      {formatAddress(
                        activeDelivery
                          .deliveryAddress
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={
                  styles.activeBottom
                }
              >
                <View>
                  <Text
                    style={
                      styles.recipientLabel
                    }
                  >
                    Recipient
                  </Text>

                  <Text
                    style={
                      styles.recipientName
                    }
                  >
                    {getRecipientName(
                      activeDelivery
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.continueButton
                  }
                >
                  <Text
                    style={
                      styles.continueButtonText
                    }
                  >
                    Continue
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={WHITE}
                  />
                </View>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            {/*
             * =================================================
             * AVAILABLE DELIVERIES
             * =================================================
             */}

            <View
              style={
                styles.sectionTitleRow
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Available Deliveries
              </Text>

              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {isAvailable
                    ? availableDeliveries.length
                    : 0}
                </Text>
              </View>
            </View>

            {/*
             * =================================================
             * OFFLINE
             * =================================================
             */}

            {!isAvailable ? (
              <View
                style={
                  styles.emptyDeliveryCard
                }
              >
                <View
                  style={
                    styles.flowerCircle
                  }
                >
                  <Text
                    style={
                      styles.largeFlower
                    }
                  >
                    🌸
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  You are offline
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  Turn your status on
                  when you are ready to
                  receive new delivery
                  requests.
                </Text>

                <Pressable
                  style={
                    styles.refreshGoldButton
                  }
                  onPress={() =>
                    handleAvailabilityChange(
                      true
                    )
                  }
                  disabled={
                    availabilitySaving
                  }
                >
                  {availabilitySaving ? (
                    <ActivityIndicator
                      size="small"
                      color={WHITE}
                    />
                  ) : (
                    <Text
                      style={
                        styles.refreshGoldText
                      }
                    >
                      Go Online
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/*
             * =================================================
             * ONLINE / NO REQUEST
             * =================================================
             */}

            {isAvailable &&
            availableDeliveries.length ===
              0 ? (
              <View
                style={
                  styles.emptyDeliveryCard
                }
              >
                <View
                  style={
                    styles.flowerCircle
                  }
                >
                  <Text
                    style={
                      styles.largeFlower
                    }
                  >
                    🌸
                  </Text>
                </View>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No delivery requests
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  New delivery requests
                  will appear here when
                  sellers release orders
                  for rider pickup.
                </Text>

                <Pressable
                  style={
                    styles.refreshGoldButton
                  }
                  onPress={() =>
                    loadAvailableRequests(
                      true
                    )
                  }
                >
                  <Text
                    style={
                      styles.refreshGoldText
                    }
                  >
                    Refresh
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/*
             * =================================================
             * AVAILABLE DELIVERY CARDS
             * =================================================
             */}

            {isAvailable &&
              availableDeliveries.map(
                delivery => {
                  const order =
                    getOrder(
                      delivery
                    );

                  const accepting =
                    acceptingDeliveryId ===
                    delivery._id;

                  return (
                    <View
                      key={
                        delivery._id
                      }
                      style={
                        styles.deliveryRequestCard
                      }
                    >
                      <View
                        style={
                          styles.requestHeader
                        }
                      >
                        <View
                          style={
                            styles.requestFlowerCircle
                          }
                        >
                          <Text
                            style={
                              styles.requestFlower
                            }
                          >
                            🌸
                          </Text>
                        </View>

                        <View
                          style={
                            styles.requestHeading
                          }
                        >
                          <Text
                            style={
                              styles.requestProduct
                            }
                          >
                            {getProductName(
                              delivery
                            )}
                          </Text>

                          <Text
                            style={
                              styles.requestFlorist
                            }
                          >
                            {getFloristName(
                              delivery
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.requestAmount
                          }
                        >
                          {formatCurrency(
                            order?.totalAmount
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.requestRouteSection
                        }
                      >
                        <View
                          style={
                            styles.routeRow
                          }
                        >
                          <Ionicons
                            name="storefront-outline"
                            size={18}
                            color={GOLD_DARK}
                          />

                          <View
                            style={
                              styles.routeTextArea
                            }
                          >
                            <Text
                              style={
                                styles.routeSmallLabel
                              }
                            >
                              Pickup
                            </Text>

                            <Text
                              numberOfLines={
                                2
                              }
                              style={
                                styles.routeAddress
                              }
                            >
                              {formatAddress(
                                delivery.pickupAddress
                              )}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.routeRow
                          }
                        >
                          <Ionicons
                            name="location-outline"
                            size={19}
                            color={GOLD_DARK}
                          />

                          <View
                            style={
                              styles.routeTextArea
                            }
                          >
                            <Text
                              style={
                                styles.routeSmallLabel
                              }
                            >
                              Deliver to
                            </Text>

                            <Text
                              numberOfLines={
                                2
                              }
                              style={
                                styles.routeAddress
                              }
                            >
                              {formatAddress(
                                delivery.deliveryAddress
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={
                          styles.requestBottom
                        }
                      >
                        <View>
                          <Text
                            style={
                              styles.recipientLabel
                            }
                          >
                            Recipient
                          </Text>

                          <Text
                            style={
                              styles.recipientName
                            }
                          >
                            {getRecipientName(
                              delivery
                            )}
                          </Text>
                        </View>

                        <Pressable
                          style={[
                            styles.acceptButton,

                            accepting &&
                              styles.acceptButtonDisabled,
                          ]}
                          disabled={
                            accepting ||
                            Boolean(
                              acceptingDeliveryId
                            )
                          }
                          onPress={() =>
                            handleAcceptDelivery(
                              delivery
                            )
                          }
                        >
                          {accepting ? (
                            <ActivityIndicator
                              size="small"
                              color={WHITE}
                            />
                          ) : (
                            <>
                              <Text
                                style={
                                  styles.acceptButtonText
                                }
                              >
                                Accept
                              </Text>

                              <Ionicons
                                name="arrow-forward"
                                size={16}
                                color={WHITE}
                              />
                            </>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                }
              )}
          </>
        )}

        {/*
         * ===================================================
         * DELIVERY SUMMARY
         * ===================================================
         */}

        <View
          style={
            styles.summarySection
          }
        >
          <Text
            style={
              styles.sectionTitle
            }
          >
            Delivery Summary
          </Text>

          <View
            style={
              styles.summaryRow
            }
          >
            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryIconCircle
                }
              >
                <Ionicons
                  name="today-outline"
                  size={20}
                  color={GOLD_DARK}
                />
              </View>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={
                  styles.summaryAmount
                }
              >
                {formatCurrency(
                  todayDeliveryValue
                )}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Today&apos;s Value
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryIconCircle
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={GOLD_DARK}
                />
              </View>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={
                  styles.summaryAmount
                }
              >
                {formatCurrency(
                  monthDeliveryValue
                )}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                This Month
              </Text>
            </View>
          </View>
        </View>

        <View
          style={
            styles.scrollBottomSpace
          }
        />
      </ScrollView>

      {/*
       * =====================================================
       * BOTTOM NAVIGATION
       * =====================================================
       */}

      <View
        style={
          styles.bottomNav
        }
      >
        <Pressable
          style={
            styles.navItem
          }
          onPress={
            goDashboard
          }
        >
          <View
            style={
              styles.activeNavCircle
            }
          >
            <Ionicons
              name="home-outline"
              size={18}
              color={GOLD_DARK}
            />
          </View>

          <Text
            style={
              styles.activeNavText
            }
          >
            Dashboard
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={
            goDeliveries
          }
        >
          <Text
            style={
              styles.navEmoji
            }
          >
            🛵
          </Text>

          <Text
            style={
              styles.navText
            }
          >
            Deliveries
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={
            goWallet
          }
        >
          <Ionicons
            name="flag-outline"
            size={20}
            color="#AFAFAF"
          />

          <Text
            style={
              styles.navText
            }
          >
            Wallet
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={
            goAlerts
          }
        >
          <Ionicons
            name="flower-outline"
            size={20}
            color="#AFAFAF"
          />

          <Text
            style={
              styles.navText
            }
          >
            Alerts
          </Text>
        </Pressable>

        <Pressable
          style={
            styles.navItem
          }
          onPress={
            goStats
          }
        >
          <Ionicons
            name="flask-outline"
            size={20}
            color="#AFAFAF"
          />

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
  );
}


/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        BACKGROUND,
    },

    /*
     * -------------------------------------------------------
     * LOADING
     * -------------------------------------------------------
     */

    loadingScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        BACKGROUND,
    },

    loadingText: {
      marginTop: 12,
      color: MUTED,
      fontSize: 13,
    },

    /*
     * -------------------------------------------------------
     * HEADER
     * -------------------------------------------------------
     */

    header: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor:
        GOLD,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 18,
    },

    headerCircle: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor:
        'rgba(255,255,255,0.035)',
      right: -50,
      top: -70,
    },

headerTop: {
  flexDirection:
    'row',

  justifyContent:
    'space-between',

  alignItems:
    'flex-start',

  paddingTop:
    4,
},

    todayText: {
      color:
        'rgba(255,255,255,0.88)',
      fontSize: 10,
      marginBottom: 5,
    },

    welcomeText: {
      color:
        'rgba(255,255,255,0.9)',
      fontSize: 11,
    },

    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },

    nameText: {
      color: WHITE,
      fontSize: 20,
      fontWeight: '800',
    },

    flowerEmoji: {
      marginLeft: 5,
      fontSize: 22,
    },

moreButton: {
  width: 46,
  height: 46,

  alignItems:
    'center',

  justifyContent:
    'center',

  marginTop:
    12,

  marginRight:
    2,

  borderRadius:
    23,
},

    /*
     * -------------------------------------------------------
     * STAT CARDS
     * -------------------------------------------------------
     */

    statsRow: {
      flexDirection: 'row',
      marginTop: 18,
      gap: 10,
    },

    statCard: {
      flex: 1,
      height: 66,
      backgroundColor:
        'rgba(255,255,255,0.18)',
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 5,
    },

    statNumber: {
      color: WHITE,
      fontSize:
        SCREEN_WIDTH <= 360
          ? 15
          : 17,
      fontWeight: '800',
    },

    statLabel: {
      color:
        'rgba(255,255,255,0.88)',
      fontSize:
        SCREEN_WIDTH <= 360
          ? 7.5
          : 8.5,
      marginTop: 5,
      textAlign: 'center',
    },

    /*
     * -------------------------------------------------------
     * SCROLL
     * -------------------------------------------------------
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 17,
      paddingTop: 14,
    },

    /*
     * -------------------------------------------------------
     * STATUS
     * -------------------------------------------------------
     */

    statusCard: {
      minHeight: 64,
      backgroundColor:
        WHITE,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },

    statusLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 10,
    },

    motorcycleCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#FFF8DD',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    motorcycleEmoji: {
      fontSize: 21,
    },

    statusTextArea: {
      flex: 1,
      marginLeft: 9,
    },

    statusTitle: {
      color: TEXT,
      fontSize: 12,
      fontWeight: '800',
    },

    statusSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 3,
    },

    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      marginRight: 5,
    },

    statusSubtitle: {
      flexShrink: 1,
      fontSize: 8.5,
      lineHeight: 12,
    },

    /*
     * -------------------------------------------------------
     * SECTION
     * -------------------------------------------------------
     */

    sectionTitleRow: {
      marginTop: 20,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    sectionTitle: {
      color: TEXT,
      fontSize: 13,
      fontWeight: '800',
    },

    countBadge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor:
        GOLD,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 6,
    },

    countBadgeText: {
      color: WHITE,
      fontSize: 9,
      fontWeight: '800',
    },

    /*
     * -------------------------------------------------------
     * EMPTY REQUESTS
     * -------------------------------------------------------
     */

    emptyDeliveryCard: {
      minHeight: 183,
      backgroundColor:
        WHITE,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 28,
      paddingVertical: 22,
    },

    flowerCircle: {
      alignItems: 'center',
      justifyContent:
        'center',
    },

    largeFlower: {
      fontSize: 31,
    },

    emptyTitle: {
      marginTop: 6,
      color: TEXT,
      fontSize: 12,
      fontWeight: '800',
    },

    emptyDescription: {
      marginTop: 5,
      color: '#AAAAAA',
      fontSize: 8.5,
      lineHeight: 14,
      textAlign: 'center',
      maxWidth: 290,
    },

    refreshGoldButton: {
      minWidth: 66,
      height: 26,
      borderRadius: 13,
      backgroundColor:
        GOLD,
      alignItems: 'center',
      justifyContent:
        'center',
      paddingHorizontal: 14,
      marginTop: 10,
    },

    refreshGoldText: {
      color: WHITE,
      fontSize: 8.5,
      fontWeight: '700',
    },

    /*
     * -------------------------------------------------------
     * ACTIVE DELIVERY
     * -------------------------------------------------------
     */

    activeCard: {
      backgroundColor:
        WHITE,
      borderRadius: 14,
      padding: 15,
    },

    activeTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    activeIconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        GOLD_LIGHT,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    activeInfo: {
      flex: 1,
      marginLeft: 10,
    },

    activeProduct: {
      color: TEXT,
      fontSize: 12,
      fontWeight: '800',
    },

    activeFlorist: {
      color: MUTED,
      fontSize: 9,
      marginTop: 2,
    },

    activeBadge: {
      backgroundColor:
        GOLD_LIGHT,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 10,
    },

    activeBadgeText: {
      color: GOLD_DARK,
      fontSize: 8,
      fontWeight: '700',
    },

    activeRoute: {
      marginTop: 15,
      gap: 12,
    },

    routeRow: {
      flexDirection: 'row',
      alignItems:
        'flex-start',
    },

    routeTextArea: {
      flex: 1,
      marginLeft: 8,
    },

    routeSmallLabel: {
      color: MUTED,
      fontSize: 8,
    },

    routeAddress: {
      marginTop: 2,
      color: '#555555',
      fontSize: 9,
      lineHeight: 13,
    },

    activeBottom: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        '#F0F0F0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    recipientLabel: {
      color: MUTED,
      fontSize: 8,
    },

    recipientName: {
      marginTop: 2,
      color: TEXT,
      fontSize: 10,
      fontWeight: '700',
    },

    continueButton: {
      minWidth: 88,
      height: 32,
      backgroundColor:
        GOLD,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 4,
    },

    continueButtonText: {
      color: WHITE,
      fontSize: 9,
      fontWeight: '700',
    },

    /*
     * -------------------------------------------------------
     * AVAILABLE REQUEST CARDS
     * -------------------------------------------------------
     */

    deliveryRequestCard: {
      backgroundColor:
        WHITE,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
    },

    requestHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    requestFlowerCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#FFF7DE',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    requestFlower: {
      fontSize: 21,
    },

    requestHeading: {
      flex: 1,
      marginLeft: 10,
    },

    requestProduct: {
      color: TEXT,
      fontSize: 11,
      fontWeight: '800',
    },

    requestFlorist: {
      marginTop: 2,
      color: MUTED,
      fontSize: 8.5,
    },

    requestAmount: {
      color: GOLD_DARK,
      fontSize: 11,
      fontWeight: '800',
    },

    requestRouteSection: {
      marginTop: 14,
      gap: 10,
    },

    requestBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      borderTopWidth: 1,
      borderTopColor:
        '#F1F1F1',
      paddingTop: 12,
      marginTop: 12,
    },

    acceptButton: {
      minWidth: 82,
      height: 32,
      backgroundColor:
        GOLD,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 4,
    },

    acceptButtonDisabled: {
      opacity: 0.55,
    },

    acceptButtonText: {
      color: WHITE,
      fontSize: 9,
      fontWeight: '800',
    },

    /*
     * -------------------------------------------------------
     * DELIVERY SUMMARY
     * -------------------------------------------------------
     */

    summarySection: {
      marginTop: 20,
    },

    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },

    summaryCard: {
      flex: 1,
      minHeight: 105,
      backgroundColor:
        WHITE,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 13,
      alignItems:
        'flex-start',
      justifyContent:
        'center',
    },

    summaryIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        GOLD_LIGHT,
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 8,
    },

    summaryAmount: {
      color: TEXT,
      fontSize: 15,
      fontWeight: '800',
      maxWidth: '100%',
    },

    summaryLabel: {
      color: MUTED,
      fontSize: 8.5,
      marginTop: 3,
    },

    scrollBottomSpace: {
      height: 105,
    },

    /*
     * -------------------------------------------------------
     * BOTTOM NAV
     * -------------------------------------------------------
     */

    bottomNav: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 68,
      backgroundColor:
        WHITE,
      borderTopWidth: 1,
      borderTopColor:
        '#F0F0F0',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-around',
      paddingBottom: 4,
    },

    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      height: '100%',
    },

    activeNavCircle: {
      width: 31,
      height: 31,
      borderRadius: 16,
      backgroundColor:
        '#FFF8E4',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    activeNavText: {
      color: GOLD_DARK,
      fontSize: 7.5,
      marginTop: 2,
      fontWeight: '600',
    },

    navEmoji: {
      fontSize: 18,
    },

    navText: {
      color: '#B1B1B1',
      fontSize: 7.5,
      marginTop: 3,
    },
  });