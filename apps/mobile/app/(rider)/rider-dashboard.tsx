import { useCallback, useMemo, useState } from 'react';

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
  acceptDelivery,
  getAvailableDeliveries,
  getRiderDashboard,
  getRiderDeliveries,
  updateRiderAvailability,
} from '../../services/delivery';

import {
  getTodayDeliveryCount,
} from '../../services/delivery';

import type {
  Delivery,
  DeliveryCustomer,
  DeliveryFlorist,
  DeliveryOrder,
  RiderDashboardData,
  RiderShift,
} from '../../services/delivery';

import {
  formatPhTime,
  formatShiftWindow,
} from '../../utils/rider-format';

import RiderBottomNav, {
  useRiderBottomNavSpace,
} from '../../components/rider/rider-bottom-nav';

import { ScreenLoader } from '../../components/ui/state-views';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const isActiveDelivery = (delivery: Delivery) =>
  ACTIVE_STATUSES.includes(
    delivery.status as (typeof ACTIVE_STATUSES)[number]
  );

const formatCurrency = (amount?: number | null) => {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount)
  ) {
    return '₱0';
  }

  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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
    typeof delivery.order === 'object'
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
    typeof delivery.florist === 'object'
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
    typeof delivery.customer === 'object'
  ) {
    return delivery.customer;
  }

  return null;
};

const getProductName = (delivery: Delivery) =>
  getOrder(delivery)?.productName || 'Flower Order';

const getFloristName = (delivery: Delivery) =>
  getFlorist(delivery)?.shopName || 'Flower Shop';

const getRecipientName = (delivery: Delivery) => {
  if (delivery.recipientName?.trim()) {
    return delivery.recipientName;
  }

  const customer = getCustomer(delivery);

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

const getErrorMessage = (error: unknown) => {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

export default function RiderDashboardScreen() {
  const [
    dashboardData,
    setDashboardData,
  ] = useState<RiderDashboardData | null>(null);

  const [
    riderDeliveries,
    setRiderDeliveries,
  ] = useState<Delivery[]>([]);

  const [
    availableDeliveries,
    setAvailableDeliveries,
  ] = useState<Delivery[]>([]);

  const [loading, setLoading] = useState(true);

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
  ] = useState<string | null>(null);

  const activeDelivery = useMemo(() => {
    return (
      riderDeliveries.find(isActiveDelivery) || null
    );
  }, [riderDeliveries]);

  const isAvailable =
    dashboardData?.rider.isAvailable ?? false;

  const firstName =
    dashboardData?.rider.firstName?.trim() ||
    'Rider';

  /*
   * Header cards: Today's Deliveries,
   * Today's Delivery Fees, Rating.
   *
   * Rider income = Order.deliveryFee only.
   */

  const todayDeliveryCount =
    dashboardData
      ? getTodayDeliveryCount(
          dashboardData
        )
      : 0;

  const todayDeliveryFees =
    dashboardData?.deliveryFees?.today ?? 0;

  const monthDeliveryFees =
    dashboardData?.deliveryFees?.thisMonth ?? 0;

  const completedDeliveryCount =
    dashboardData?.deliveries.completed ?? 0;

  /*
   * Work shift: Online/Offline follows the
   * Rider's approved Admin shift.
   */

  const workShift =
    dashboardData?.workShift ?? null;

  const canGoOnline =
    workShift?.canGoOnline === true;

  /*
   * The saved status is only effective while
   * an approved shift is active.
   */

  const isEffectivelyOnline =
    isAvailable && canGoOnline;

  const bottomSpace =
    useRiderBottomNavSpace();

  const rating =
    typeof dashboardData?.rating.average ===
    'number'
      ? dashboardData.rating.average.toFixed(1)
      : '--';

  const loadAvailableRequests = useCallback(
    async (shouldLoad: boolean) => {
      if (!shouldLoad) {
        setAvailableDeliveries([]);
        return;
      }

      try {
        const result =
          await getAvailableDeliveries();

        setAvailableDeliveries(
          result.deliveries || []
        );
      } catch (error) {
        console.log(
          'Available deliveries error:',
          error
        );

        setAvailableDeliveries([]);
      }
    },
    []
  );

  const loadDashboard = useCallback(async () => {
    try {
      const [
        dashboard,
        riderDeliveryResult,
      ] = await Promise.all([
        getRiderDashboard(),
        getRiderDeliveries(),
      ]);

      setDashboardData(dashboard);

      const deliveries =
        riderDeliveryResult.deliveries || [];

      setRiderDeliveries(deliveries);

      const active =
        deliveries.find(isActiveDelivery);

      await loadAvailableRequests(
        dashboard.rider.isAvailable === true &&
          dashboard.workShift?.canGoOnline ===
            true &&
          !active
      );
    } catch (error) {
      console.log(
        'Rider dashboard error:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, [loadAvailableRequests]);

  /*
   * Using useFocusEffect here replaces the previous
   * useEffect + loadStoredUser pattern that triggered
   * react-hooks/set-state-in-effect.
   */
  useFocusEffect(
    useCallback(() => {
      void loadDashboard();

      return undefined;
    }, [loadDashboard])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboard]);

  const handleAvailabilityChange = useCallback(
    async (nextValue: boolean) => {
      if (availabilitySaving) {
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

      setAvailabilitySaving(true);

      try {
        const result =
          await updateRiderAvailability(
            nextValue
          );

        setDashboardData(previous => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,

            rider: {
              ...previous.rider,
              isAvailable: result.isAvailable,
            },
          };
        });

        if (result.isAvailable) {
          await loadAvailableRequests(true);
        } else {
          setAvailableDeliveries([]);
        }
      } catch (error) {
        console.log(
          'Availability error:',
          error
        );

        Alert.alert(
          'Rider Availability',
          getErrorMessage(error)
        );

        await loadDashboard();
      } finally {
        setAvailabilitySaving(false);
      }
    },
    [
      activeDelivery,
      availabilitySaving,
      loadAvailableRequests,
      loadDashboard,
    ]
  );

  const handleAcceptDelivery = useCallback(
    async (delivery: Delivery) => {
      if (acceptingDeliveryId) {
        return;
      }

      if (!isEffectivelyOnline) {
        Alert.alert(
          'Rider Offline',
          'Turn your availability on before accepting a delivery request.'
        );

        return;
      }

      setAcceptingDeliveryId(delivery._id);

      try {
        const accepted =
          await acceptDelivery(delivery._id);

        setDashboardData(previous => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,

            rider: {
              ...previous.rider,
              isAvailable: false,
            },
          };
        });

        setAvailableDeliveries([]);

        setRiderDeliveries(previous => [
          accepted,

          ...previous.filter(
            item => item._id !== accepted._id
          ),
        ]);

        router.push({
          pathname:
            '/(rider)/rider-delivery',

          params: {
            deliveryId: accepted._id,
          },
        });
      } catch (error) {
        console.log(
          'Accept delivery error:',
          error
        );

        Alert.alert(
          'Unable to Accept',
          getErrorMessage(error)
        );

        await loadDashboard();
      } finally {
        setAcceptingDeliveryId(null);
      }
    },
    [
      acceptingDeliveryId,
      isEffectivelyOnline,
      loadDashboard,
    ]
  );

  const openActiveDelivery =
    useCallback(() => {
      if (!activeDelivery) {
        return;
      }

      router.push({
        pathname:
          '/(rider)/rider-delivery',

        params: {
          deliveryId: activeDelivery._id,
        },
      });
    }, [activeDelivery]);

  const goDashboard = useCallback(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const goShifts = useCallback(() => {
    router.push(
      '/(rider)/rider-shifts'
    );
  }, []);

  const goProfile = useCallback(() => {
    router.push(
      '/(rider)/rider-profile'
    );
  }, []);

  if (
    loading &&
    !dashboardData
  ) {
    return (
      <ScreenLoader
        role="rider"
        message="Loading dashboard..."
      />
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={GOLD}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCircle} />

        <View style={styles.headerTop}>
          <View>
            <Text style={styles.todayText}>
              Today
            </Text>

            <Text style={styles.welcomeText}>
              Welcome back,
            </Text>

            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                Hey, {firstName}!
              </Text>

              <Text style={styles.flowerEmoji}>
                🌸
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open rider profile"
            style={({ pressed }) => [
              styles.profileButton,
              pressed &&
                styles.profileButtonPressed,
            ]}
            onPress={goProfile}
          >
            <Ionicons
              name="person-circle-outline"
              size={31}
              color={WHITE}
            />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {todayDeliveryCount}
            </Text>

            <Text style={styles.statLabel}>
              Today&apos;s Deliveries
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={styles.statNumber}
            >
              {formatCurrency(
                todayDeliveryFees
              )}
            </Text>

            <Text style={styles.statLabel}>
              Today&apos;s Delivery Fees
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {rating}
            </Text>

            <Text style={styles.statLabel}>
              Rating
            </Text>
          </View>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              bottomSpace,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GOLD}
            colors={[GOLD]}
          />
        }
      >
        {/* RIDER STATUS */}
        <View style={styles.statusCard}>
          <View style={styles.statusLeft}>
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
                style={styles.statusTitle}
              >
                Status
              </Text>

              <View
                style={styles.statusSubRow}
              >
                <View
                  style={[
                    styles.statusDot,

                    {
                      backgroundColor:
                        activeDelivery ||
                        !isEffectivelyOnline
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
                        !isEffectivelyOnline
                          ? MUTED
                          : GREEN,
                    },
                  ]}
                >
                  {activeDelivery
                    ? 'Busy — Active delivery'
                    : isEffectivelyOnline
                      ? 'Online — Accepting deliveries'
                      : canGoOnline
                        ? 'Offline — Not accepting deliveries'
                        : 'Offline — No active shift'}
                </Text>
              </View>
            </View>
          </View>

          {availabilitySaving ? (
            <View
              style={
                styles.statusControl
              }
            >
              <ActivityIndicator
                size="small"
                color={GOLD}
              />
            </View>
          ) : (
            <Switch
              value={isEffectivelyOnline}
              onValueChange={
                handleAvailabilityChange
              }
              /*
               * Going Online requires an active
               * approved shift. Going Offline is
               * always allowed.
               */
              disabled={
                Boolean(activeDelivery) ||
                (!isEffectivelyOnline &&
                  !canGoOnline)
              }
              trackColor={{
                false: '#D9D9D9',
                true: GOLD,
              }}
              thumbColor={WHITE}
              ios_backgroundColor="#D9D9D9"
            />
          )}
        </View>

        {/* WORK SHIFT */}
        <WorkShiftCard
          activeShift={
            workShift?.activeShift ?? null
          }
          nextShift={
            workShift?.nextShift ?? null
          }
          onPress={goShifts}
        />

        {/* ACTIVE DELIVERY */}
        {activeDelivery ? (
          <>
            <View
              style={
                styles.sectionTitleRow
              }
            >
              <Text
                style={styles.sectionTitle}
              >
                Active Delivery
              </Text>

              <View
                style={styles.countBadge}
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
              style={({ pressed }) => [
                styles.activeCard,

                pressed && {
                  opacity: 0.92,
                },
              ]}
              onPress={
                openActiveDelivery
              }
            >
              <View
                style={styles.activeTopRow}
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
                  style={styles.activeInfo}
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
                  style={styles.activeBadge}
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
                style={styles.activeRoute}
              >
                <View
                  style={styles.routeRow}
                >
                  <Ionicons
                    name="storefront-outline"
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
                  style={styles.routeRow}
                >
                  <Ionicons
                    name="location-outline"
                    size={20}
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
                style={styles.activeBottom}
              >
                <View
                  style={
                    styles.recipientArea
                  }
                >
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
                    size={17}
                    color={WHITE}
                  />
                </View>
              </View>
            </Pressable>
          </>
        ) : (
          <>
            {/* AVAILABLE DELIVERIES */}
            <View
              style={
                styles.sectionTitleRow
              }
            >
              <Text
                style={styles.sectionTitle}
              >
                Available Deliveries
              </Text>

              <View
                style={styles.countBadge}
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {isEffectivelyOnline
                    ? availableDeliveries.length
                    : 0}
                </Text>
              </View>
            </View>

            {/* OFFLINE */}
            {!isEffectivelyOnline ? (
              <View
                style={
                  styles.emptyDeliveryCard
                }
              >
                <View
                  style={styles.flowerCircle}
                >
                  <Text
                    style={styles.largeFlower}
                  >
                    🌸
                  </Text>
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  {canGoOnline
                    ? 'You are offline'
                    : 'No active shift'}
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  {canGoOnline
                    ? 'Turn your status on when you are ready to receive new delivery requests.'
                    : 'You can go Online and accept new deliveries only during an approved work shift. Request a shift to get started.'}
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.refreshGoldButton,

                    pressed && {
                      opacity: 0.85,
                    },

                    availabilitySaving &&
                      styles.buttonDisabled,
                  ]}
                  onPress={() => {
                    if (!canGoOnline) {
                      goShifts();
                      return;
                    }

                    void handleAvailabilityChange(
                      true
                    );
                  }}
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
                      {canGoOnline
                        ? 'Go Online'
                        : 'View Work Shifts'}
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* ONLINE WITHOUT REQUESTS */}
            {isEffectivelyOnline &&
            availableDeliveries.length ===
              0 ? (
              <View
                style={
                  styles.emptyDeliveryCard
                }
              >
                <View
                  style={styles.flowerCircle}
                >
                  <Text
                    style={styles.largeFlower}
                  >
                    🌸
                  </Text>
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  No delivery requests
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  New delivery requests will
                  appear here when sellers
                  release orders for rider
                  pickup.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.refreshGoldButton,

                    pressed && {
                      opacity: 0.85,
                    },
                  ]}
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

            {/* DELIVERY REQUESTS */}
            {isEffectivelyOnline &&
              availableDeliveries.map(
                delivery => {
                  const order =
                    getOrder(delivery);

                  const accepting =
                    acceptingDeliveryId ===
                    delivery._id;

                  return (
                    <View
                      key={delivery._id}
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
                          accessibilityLabel="Delivery fee"
                        >
                          {formatCurrency(
                            order?.deliveryFee
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
                              Pickup
                            </Text>

                            <Text
                              numberOfLines={2}
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
                            size={20}
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
                              numberOfLines={2}
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
                        <View
                          style={
                            styles.recipientArea
                          }
                        >
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
                          style={({
                            pressed,
                          }) => [
                            styles.acceptButton,

                            pressed &&
                              !accepting && {
                                opacity: 0.85,
                              },

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
                                size={17}
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

        {/* DELIVERY SUMMARY */}
        <View
          style={styles.summarySection}
        >
          <Text
            style={styles.sectionTitle}
          >
            Earnings Summary
          </Text>

          <View style={styles.summaryRow}>
            <View
              style={styles.summaryCard}
            >
              <View
                style={
                  styles.summaryIconCircle
                }
              >
                <Ionicons
                  name="cash-outline"
                  size={21}
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
                  monthDeliveryFees
                )}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Fees This Month
              </Text>
            </View>

            <View
              style={styles.summaryCard}
            >
              <View
                style={
                  styles.summaryIconCircle
                }
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={21}
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
                {completedDeliveryCount}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Completed Deliveries
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

      {/* BOTTOM NAVIGATION */}
      <RiderBottomNav
        active="dashboard"
        onReselect={goDashboard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND,
  },

  loadingText: {
    marginTop: 12,
    color: MUTED,
    fontSize: 14,
  },

  header: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: GOLD,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 4,
  },

  todayText: {
    color:
      'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginBottom: 5,
  },

  welcomeText: {
    color:
      'rgba(255,255,255,0.9)',
    fontSize: 13,
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

  profileButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginRight: 2,
    borderRadius: 23,
  },

  profileButtonPressed: {
    opacity: 0.65,
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },

  statCard: {
    flex: 1,
    height: 68,
    backgroundColor:
      'rgba(255,255,255,0.18)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  statNumber: {
    color: WHITE,
    fontSize:
      SCREEN_WIDTH <= 360 ? 15 : 17,
    fontWeight: '800',
  },

  statLabel: {
    color:
      'rgba(255,255,255,0.9)',
    fontSize:
      SCREEN_WIDTH <= 360 ? 11 : 12,
    marginTop: 5,
    textAlign: 'center',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 14,
  },

  statusCard: {
    minHeight: 72,
    backgroundColor: WHITE,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  statusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },

  motorcycleCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8DD',
    alignItems: 'center',
    justifyContent: 'center',
  },

  motorcycleEmoji: {
    fontSize: 22,
  },

  statusTextArea: {
    flex: 1,
    marginLeft: 10,
  },

  statusTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },

  statusSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  statusSubtitle: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 15,
  },

  statusControl: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitleRow: {
    marginTop: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },

  countBadge: {
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },

  countBadgeText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyDeliveryCard: {
    minHeight: 190,
    backgroundColor: WHITE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 22,
  },

  flowerCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  largeFlower: {
    fontSize: 32,
  },

  emptyTitle: {
    marginTop: 7,
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },

  emptyDescription: {
    marginTop: 6,
    color: '#8F8F8F',
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    maxWidth: 290,
  },

  refreshGoldButton: {
    minWidth: 82,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },

  refreshGoldText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  activeCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 15,
  },

  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GOLD_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeInfo: {
    flex: 1,
    marginLeft: 10,
  },

  activeProduct: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },

  activeFlorist: {
    color: MUTED,
    fontSize: 13,
    marginTop: 2,
  },

  activeBadge: {
    backgroundColor: GOLD_LIGHT,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  activeBadgeText: {
    color: GOLD_DARK,
    fontSize: 12,
    fontWeight: '700',
  },

  activeRoute: {
    marginTop: 15,
    gap: 12,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  routeTextArea: {
    flex: 1,
    marginLeft: 8,
  },

  routeSmallLabel: {
    color: MUTED,
    fontSize: 12,
  },

  routeAddress: {
    marginTop: 2,
    color: '#555555',
    fontSize: 13,
    lineHeight: 16,
  },

  activeBottom: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  recipientArea: {
    flex: 1,
  },

  recipientLabel: {
    color: MUTED,
    fontSize: 12,
  },

  recipientName: {
    marginTop: 2,
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
  },

  continueButton: {
    minWidth: 94,
    height: 36,
    backgroundColor: GOLD,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  continueButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
  },

  deliveryRequestCard: {
    backgroundColor: WHITE,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  requestFlowerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7DE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  requestFlower: {
    fontSize: 22,
  },

  requestHeading: {
    flex: 1,
    marginLeft: 10,
  },

  requestProduct: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
  },

  requestFlorist: {
    marginTop: 2,
    color: MUTED,
    fontSize: 13,
  },

  requestAmount: {
    color: GOLD_DARK,
    fontSize: 13,
    fontWeight: '800',
  },

  requestRouteSection: {
    marginTop: 14,
    gap: 10,
  },

  requestBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F1F1',
    paddingTop: 12,
    marginTop: 12,
    gap: 12,
  },

  acceptButton: {
    minWidth: 88,
    height: 36,
    backgroundColor: GOLD,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  acceptButtonDisabled: {
    opacity: 0.55,
  },

  acceptButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '800',
  },

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
    minHeight: 110,
    backgroundColor: WHITE,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 13,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: GOLD_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  summaryAmount: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
    maxWidth: '100%',
  },

  summaryLabel: {
    color: MUTED,
    fontSize: 13,
    marginTop: 3,
  },

  scrollBottomSpace: {
    height: 105,
  },

  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: WHITE,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  activeNavCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF8E4',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavText: {
    color: GOLD_DARK,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
  },

  navText: {
    color: '#999999',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
/*
 * =========================================================
 * WORK SHIFT CARD
 * =========================================================
 *
 * Shows whether the Rider is inside an approved shift,
 * has an upcoming approved shift, or has none. Tapping
 * opens the Work Shifts screen where Riders request
 * Admin-posted shifts.
 * =========================================================
 */

function WorkShiftCard({
  activeShift,
  nextShift,
  onPress,
}: {
  activeShift: RiderShift | null;
  nextShift: RiderShift | null;
  onPress: () => void;
}) {
  const state = activeShift
    ? 'active'
    : nextShift
      ? 'upcoming'
      : 'none';

  const title =
    state === 'active'
      ? 'On shift now'
      : state === 'upcoming'
        ? 'Next approved shift'
        : 'No approved shift';

  const detail =
    state === 'active' && activeShift
      ? `Ends ${formatPhTime(activeShift.endAt)} · ${formatShiftWindow(
          activeShift.startAt,
          activeShift.endAt
        )}`
      : state === 'upcoming' && nextShift
        ? formatShiftWindow(nextShift.startAt, nextShift.endAt)
        : 'Request an Admin-posted shift to go Online.';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open work shifts"
      onPress={onPress}
      style={({ pressed }) => [
        shiftStyles.card,
        state === 'active' && shiftStyles.cardActive,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View
        style={[
          shiftStyles.iconCircle,
          state === 'active' && shiftStyles.iconCircleActive,
        ]}
      >
        <Ionicons
          name={state === 'active' ? 'time' : 'time-outline'}
          size={22}
          color={state === 'active' ? WHITE : GOLD_DARK}
        />
      </View>

      <View style={shiftStyles.textArea}>
        <Text style={shiftStyles.title}>{title}</Text>
        <Text style={shiftStyles.detail}>{detail}</Text>
      </View>

      <View style={shiftStyles.linkRow}>
        <Text style={shiftStyles.linkText}>Shifts</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={GOLD_DARK}
        />
      </View>
    </Pressable>
  );
}

const shiftStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: '#F0E6C8',
  },
  cardActive: {
    backgroundColor: GOLD_LIGHT,
    borderColor: GOLD,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD_LIGHT,
  },
  iconCircleActive: {
    backgroundColor: GOLD,
  },
  textArea: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  detail: {
    marginTop: 3,
    color: '#6B6B6B',
    fontSize: 13,
    lineHeight: 18,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  linkText: {
    color: GOLD_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
});
