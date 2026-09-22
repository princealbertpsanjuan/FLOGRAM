import {
  useCallback,
  useEffect,
  useMemo,
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

import { router } from 'expo-router';

import {
  getSellerOrders,
  updateSellerOrderStatus,
  type CustomerOrder,
  type CustomerOrderStatus,
} from '../../services/orders';

import {
  getMyFloristProfile,
  type FloristProfile,
} from '../../services/florist';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type DashboardData = {
  florist: FloristProfile;
  orders: CustomerOrder[];
};

type StatusCardProps = {
  value: number;
  label: string;
  background: string;
  textColor: string;
};

type OrderBadgeType =
  | 'pending'
  | 'active'
  | 'ready'
  | 'done'
  | 'cancelled';

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatCurrency = (
  value: number
) => {
  return `₱${Number(
    value || 0
  ).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const getStartOfDay = (
  date: Date
) => {
  const result =
    new Date(date);

  result.setHours(
    0,
    0,
    0,
    0
  );

  return result;
};

const getStartOfWeek = (
  date: Date
) => {
  const result =
    getStartOfDay(date);

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  return result;
};

const isSameDay = (
  firstDate: Date,
  secondDate: Date
) => {
  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
};

const getCustomerName = (
  order: CustomerOrder
) => {
  if (
    typeof order.customer ===
    'string'
  ) {
    return 'Customer';
  }

  const firstName =
    order.customer.firstName?.trim();

  const lastName =
    order.customer.lastName?.trim();

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    fullName ||
    'Customer'
  );
};

const getShortCustomerName = (
  order: CustomerOrder
) => {
  if (
    typeof order.customer ===
    'string'
  ) {
    return 'Customer';
  }

  const firstName =
    order.customer.firstName?.trim();

  const lastName =
    order.customer.lastName?.trim();

  if (
    firstName &&
    lastName
  ) {
    return `${firstName} ${lastName.charAt(
      0
    )}.`;
  }

  return (
    firstName ||
    lastName ||
    'Customer'
  );
};

const getOrderNumber = (
  order: CustomerOrder
) => {
  const id =
    String(order._id);

  return `#FLG-${id
    .slice(-6)
    .toUpperCase()}`;
};

const getOrderBadgeType = (
  status: CustomerOrderStatus
): OrderBadgeType => {
  if (
    status === 'pending'
  ) {
    return 'pending';
  }

  if (
    status === 'confirmed' ||
    status === 'preparing' ||
    status ===
      'out_for_delivery'
  ) {
    return 'active';
  }

  if (
    status ===
      'ready_for_pickup' ||
    status ===
      'ready_for_delivery'
  ) {
    return 'ready';
  }

  if (
    status === 'delivered' ||
    status === 'completed'
  ) {
    return 'done';
  }

  return 'cancelled';
};

const getOrderBadgeLabel = (
  status: CustomerOrderStatus
) => {
  switch (status) {
    case 'pending':
      return 'Pending';

    case 'confirmed':
      return 'Confirmed';

    case 'preparing':
      return 'Preparing';

    case 'ready_for_pickup':
      return 'Ready';

    case 'ready_for_delivery':
      return 'Ready';

    case 'out_for_delivery':
      return 'Delivery';

    case 'delivered':
      return 'Delivered';

    case 'completed':
      return 'Completed';

    case 'cancelled':
      return 'Cancelled';

    default:
      return status;
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function SellerDashboardScreen() {
  const [
    data,
    setData,
  ] =
    useState<DashboardData | null>(
      null
    );

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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    acceptingOrderId,
    setAcceptingOrderId,
  ] =
    useState<
      string | null
    >(null);

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    let active = true;

    Promise.all([
      getMyFloristProfile(),
      getSellerOrders(),
    ])
      .then(
        ([
          florist,
          orders,
        ]) => {
          if (!active) {
            return;
          }

          setData({
            florist,
            orders,
          });

          setError(null);
        }
      )
      .catch(
        (
          err: unknown
        ) => {
          if (!active) {
            return;
          }

          const message =
            err instanceof Error
              ? err.message
              : 'Unable to load seller dashboard.';

          setError(
            message
          );
        }
      )
      .finally(() => {
        if (active) {
          setLoading(
            false
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

          const [
            florist,
            orders,
          ] =
            await Promise.all(
              [
                getMyFloristProfile(),
                getSellerOrders(),
              ]
            );

          setData({
            florist,
            orders,
          });

          setError(null);
        } catch (
          err: unknown
        ) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unable to refresh dashboard.';

          setError(
            message
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      []
    );

  /*
   * =======================================================
   * ACCEPT NEW ORDER
   * =======================================================
   */

  const handleAcceptOrder =
    useCallback(
      (
        order: CustomerOrder
      ) => {
        Alert.alert(
          'Accept Order',
          `Accept ${getOrderNumber(
            order
          )} from ${getCustomerName(
            order
          )}?`,
          [
            {
              text: 'Cancel',
              style:
                'cancel',
            },
            {
              text: 'Accept',

              onPress:
                async () => {
                  try {
                    setAcceptingOrderId(
                      order._id
                    );

                    setError(
                      null
                    );

                    const updatedOrder =
                      await updateSellerOrderStatus(
                        order._id,
                        'confirmed'
                      );

                    setData(
                      currentData => {
                        if (
                          !currentData
                        ) {
                          return currentData;
                        }

                        return {
                          ...currentData,

                          orders:
                            currentData.orders.map(
                              currentOrder =>
                                currentOrder._id ===
                                updatedOrder._id
                                  ? updatedOrder
                                  : currentOrder
                            ),
                        };
                      }
                    );

                    Alert.alert(
                      'Order Accepted',
                      `${getOrderNumber(
                        order
                      )} has been confirmed.`
                    );
                  } catch (
                    err: unknown
                  ) {
                    const message =
                      err instanceof Error
                        ? err.message
                        : 'Unable to accept the order.';

                    Alert.alert(
                      'Unable to Accept Order',
                      message
                    );
                  } finally {
                    setAcceptingOrderId(
                      null
                    );
                  }
                },
            },
          ]
        );
      },
      []
    );

  /*
   * =======================================================
   * DASHBOARD ANALYTICS
   * =======================================================
   */

  const analytics =
    useMemo(() => {
      const orders =
        data?.orders ??
        [];

      const now =
        new Date();

      const startOfToday =
        getStartOfDay(
          now
        );

      const startOfWeek =
        getStartOfWeek(
          now
        );

      /*
       * TODAY'S SALES
       */

      const todaysPaidOrders =
        orders.filter(
          order => {
            if (
              order.paymentStatus !==
              'paid'
            ) {
              return false;
            }

            const revenueDate =
              order.paidAt
                ? new Date(
                    order.paidAt
                  )
                : new Date(
                    order.updatedAt
                  );

            return (
              revenueDate >=
                startOfToday &&
              isSameDay(
                revenueDate,
                now
              )
            );
          }
        );

      const todaysSales =
        todaysPaidOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.totalAmount ||
                0
            ),
          0
        );

      /*
       * ORDER COUNTS
       */

      const pendingCount =
        orders.filter(
          order =>
            order.orderStatus ===
            'pending'
        ).length;

      const activeCount =
        orders.filter(
          order =>
            [
              'confirmed',
              'preparing',
              'out_for_delivery',
            ].includes(
              order.orderStatus
            )
        ).length;

      const readyCount =
        orders.filter(
          order =>
            [
              'ready_for_pickup',
              'ready_for_delivery',
            ].includes(
              order.orderStatus
            )
        ).length;

      const doneCount =
        orders.filter(
          order =>
            [
              'delivered',
              'completed',
            ].includes(
              order.orderStatus
            )
        ).length;

      /*
       * WEEKLY REVENUE
       */

      const weeklyValues =
        Array.from(
          {
            length: 7,
          },
          (
            _,
            index
          ) => {
            const date =
              new Date(
                startOfWeek
              );

            date.setDate(
              startOfWeek.getDate() +
                index
            );

            const amount =
              orders
                .filter(
                  order => {
                    if (
                      order.paymentStatus !==
                      'paid'
                    ) {
                      return false;
                    }

                    const revenueDate =
                      order.paidAt
                        ? new Date(
                            order.paidAt
                          )
                        : new Date(
                            order.updatedAt
                          );

                    return isSameDay(
                      revenueDate,
                      date
                    );
                  }
                )
                .reduce(
                  (
                    total,
                    order
                  ) =>
                    total +
                    Number(
                      order.totalAmount ||
                        0
                    ),
                  0
                );

            return {
              day: [
                'Mon',
                'Tue',
                'Wed',
                'Thu',
                'Fri',
                'Sat',
                'Sun',
              ][index],

              amount,
            };
          }
        );

      const weeklyRevenue =
        weeklyValues.reduce(
          (
            total,
            item
          ) =>
            total +
            item.amount,
          0
        );

      const highestDailyRevenue =
        Math.max(
          ...weeklyValues.map(
            item =>
              item.amount
          ),
          1
        );

      /*
       * RECENT ORDERS
       */

      const recentOrders =
        [...orders]
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.createdAt
              ).getTime() -
              new Date(
                first.createdAt
              ).getTime()
          )
          .slice(
            0,
            3
          );

      /*
       * NEW PENDING ORDERS
       */

      const pendingOrders =
        orders
          .filter(
            order =>
              order.orderStatus ===
              'pending'
          )
          .sort(
            (
              first,
              second
            ) =>
              new Date(
                second.createdAt
              ).getTime() -
              new Date(
                first.createdAt
              ).getTime()
          );

      return {
        todaysSales,
        pendingCount,
        activeCount,
        readyCount,
        doneCount,
        weeklyValues,
        weeklyRevenue,
        highestDailyRevenue,
        recentOrders,
        pendingOrders,
      };
    }, [
      data,
    ]);

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#74A485"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading
          dashboard...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * INITIAL ERROR
   * =======================================================
   */

  if (
    !data &&
    error
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Unable to load
          dashboard
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>

        <Pressable
          style={
            styles.retryButton
          }
          onPress={
            handleRefresh
          }
        >
          <Text
            style={
              styles.retryText
            }
          >
            Try Again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const shopName =
    data?.florist
      .shopName ||
    'Seller';

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
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerCircleOne
            }
          />

          <View
            style={
              styles.headerCircleTwo
            }
          />

          <View
            style={
              styles.headerTopRow
            }
          >
            <View>
              <Text
                style={
                  styles.greetingLabel
                }
              >
                Good morning
              </Text>

              <Text
                style={
                  styles.shopName
                }
              >
                {shopName}{' '}
                🌸
              </Text>
            </View>

            <Pressable
              style={
                styles.headerMenuButton
              }
              onPress={() =>
                router.push(
                  '/(seller)/seller-profile'
                )
              }
            >
              <Text
                style={
                  styles.headerMenuText
                }
              >
                •••
              </Text>
            </Pressable>
          </View>

          {/* SUMMARY */}

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
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Today&apos;s
                Sales
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatCurrency(
                  analytics.todaysSales
                )}
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                Paid orders
                today
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Pending
                Orders
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  analytics.pendingCount
                }
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                Need attention
              </Text>
            </View>
          </View>
        </View>

        {/* CONTENT */}

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
              tintColor="#74A485"
            />
          }
        >
          {error ? (
            <View
              style={
                styles.inlineError
              }
            >
              <Text
                style={
                  styles.inlineErrorText
                }
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* STATUS CARDS */}

          <View
            style={
              styles.statusRow
            }
          >
            <StatusCard
              value={
                analytics.activeCount
              }
              label="Active"
              background="#EEF8F1"
              textColor="#5C9D73"
            />

            <StatusCard
              value={
                analytics.readyCount
              }
              label="Ready"
              background="#FFF5DC"
              textColor="#D2A23F"
            />

            <StatusCard
              value={
                analytics.pendingCount
              }
              label="Pending"
              background="#FFF0F5"
              textColor="#DB7298"
            />

            <StatusCard
              value={
                analytics.doneCount
              }
              label="Done"
              background="#F0F1FF"
              textColor="#6E73D7"
            />
          </View>

          {/* NEW ORDERS */}

          {analytics
            .pendingOrders
            .length >
          0 ? (
            <View
              style={
                styles.newOrdersSection
              }
            >
              <View
                style={
                  styles.newOrdersHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.newOrdersTitle
                    }
                  >
                    New Orders
                  </Text>

                  <Text
                    style={
                      styles.newOrdersSubtitle
                    }
                  >
                    Waiting for
                    your
                    confirmation
                  </Text>
                </View>

                <View
                  style={
                    styles.newOrdersCount
                  }
                >
                  <Text
                    style={
                      styles.newOrdersCountText
                    }
                  >
                    {
                      analytics
                        .pendingOrders
                        .length
                    }
                  </Text>
                </View>
              </View>

              {analytics.pendingOrders.map(
                order => {
                  const accepting =
                    acceptingOrderId ===
                    order._id;

                  return (
                    <View
                      key={
                        order._id
                      }
                      style={
                        styles.newOrderCard
                      }
                    >
                      <View
                        style={
                          styles.newOrderTopRow
                        }
                      >
                        <View
                          style={
                            styles.newOrderIcon
                          }
                        >
                          <Text
                            style={
                              styles.newOrderIconText
                            }
                          >
                            🌸
                          </Text>
                        </View>

                        <View
                          style={
                            styles.newOrderHeading
                          }
                        >
                          <Text
                            style={
                              styles.newOrderNumber
                            }
                          >
                            {getOrderNumber(
                              order
                            )}
                          </Text>

                          <Text
                            style={
                              styles.newOrderCustomer
                            }
                          >
                            {getCustomerName(
                              order
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.newBadge
                          }
                        >
                          <Text
                            style={
                              styles.newBadgeText
                            }
                          >
                            NEW
                          </Text>
                        </View>
                      </View>

                      {/* PRODUCT */}

                      <View
                        style={
                          styles.newOrderProductBox
                        }
                      >
                        <View
                          style={
                            styles.newOrderProductInfo
                          }
                        >
                          <Text
                            numberOfLines={
                              2
                            }
                            style={
                              styles.newOrderProductName
                            }
                          >
                            {
                              order.productName
                            }
                          </Text>

                          <Text
                            style={
                              styles.newOrderProductMeta
                            }
                          >
                            Qty:{' '}
                            {
                              order.quantity
                            }{' '}
                            •{' '}
                            {order.fulfillmentType ===
                            'pickup'
                              ? 'Pickup'
                              : 'Delivery'}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.newOrderAmount
                          }
                        >
                          {formatCurrency(
                            order.totalAmount
                          )}
                        </Text>
                      </View>

                      {/* DETAILS */}

                      <View
                        style={
                          styles.newOrderDetails
                        }
                      >
                        <View
                          style={
                            styles.newOrderDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.newOrderDetailLabel
                            }
                          >
                            Payment
                          </Text>

                          <Text
                            style={
                              styles.newOrderDetailValue
                            }
                          >
                            {order.paymentStatus
                              .replace(
                                /_/g,
                                ' '
                              )
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.newOrderDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.newOrderDetailLabel
                            }
                          >
                            Fulfillment
                          </Text>

                          <Text
                            style={
                              styles.newOrderDetailValue
                            }
                          >
                            {order.fulfillmentType ===
                            'pickup'
                              ? 'Pickup'
                              : 'Delivery'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.newOrderDetailRow
                          }
                        >
                          <Text
                            style={
                              styles.newOrderDetailLabel
                            }
                          >
                            Order Type
                          </Text>

                          <Text
                            style={
                              styles.newOrderDetailValue
                            }
                          >
                            {order.isPreOrder
                              ? 'Pre-order'
                              : 'Regular Order'}
                          </Text>
                        </View>

                        {order.customerNotes ? (
                          <View
                            style={
                              styles.customerNote
                            }
                          >
                            <Text
                              style={
                                styles.customerNoteLabel
                              }
                            >
                              Customer
                              Note
                            </Text>

                            <Text
                              style={
                                styles.customerNoteText
                              }
                            >
                              {
                                order.customerNotes
                              }
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* ACTIONS */}

                      <View
                        style={
                          styles.newOrderActions
                        }
                      >
                        <Pressable
                          disabled={
                            accepting
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.viewOrderButton,

                            pressed &&
                              styles.pressed,
                          ]}
                          onPress={() =>
                            router.replace(
                              '/(seller)/seller-orders'
                            )
                          }
                        >
                          <Text
                            style={
                              styles.viewOrderButtonText
                            }
                          >
                            View Order
                          </Text>
                        </Pressable>

                        <Pressable
                          disabled={
                            accepting
                          }
                          style={({
                            pressed,
                          }) => [
                            styles.acceptOrderButton,

                            pressed &&
                              styles.pressed,

                            accepting &&
                              styles.disabledButton,
                          ]}
                          onPress={() =>
                            handleAcceptOrder(
                              order
                            )
                          }
                        >
                          {accepting ? (
                            <ActivityIndicator
                              size="small"
                              color="#FFFFFF"
                            />
                          ) : (
                            <Text
                              style={
                                styles.acceptOrderButtonText
                              }
                            >
                              Accept
                              Order
                            </Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                }
              )}
            </View>
          ) : null}

          {/* WEEKLY REVENUE */}

          <View
            style={
              styles.revenueCard
            }
          >
            <View
              style={
                styles.revenueHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Weekly Revenue
              </Text>

              <Text
                style={
                  styles.revenueTotal
                }
              >
                {formatCurrency(
                  analytics.weeklyRevenue
                )}{' '}
                total
              </Text>
            </View>

            <View
              style={
                styles.chart
              }
            >
              {analytics.weeklyValues.map(
                item => {
                  const percentage =
                    item.amount /
                    analytics.highestDailyRevenue;

                  const barHeight =
                    item.amount ===
                    0
                      ? 4
                      : Math.max(
                          percentage *
                            72,
                          8
                        );

                  return (
                    <View
                      key={
                        item.day
                      }
                      style={
                        styles.chartColumn
                      }
                    >
                      <View
                        style={[
                          styles.chartBar,

                          {
                            height:
                              barHeight,
                          },
                        ]}
                      />

                      <Text
                        style={
                          styles.chartLabel
                        }
                      >
                        {
                          item.day
                        }
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          </View>

          {/* RECENT ORDERS */}

          <View
            style={
              styles.ordersCard
            }
          >
            <View
              style={
                styles.ordersHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Recent Orders
              </Text>

              <Pressable
                onPress={() =>
                  router.replace(
                    '/(seller)/seller-orders'
                  )
                }
              >
                <Text
                  style={
                    styles.viewAllText
                  }
                >
                  View All
                </Text>
              </Pressable>
            </View>

            {analytics
              .recentOrders
              .length ===
            0 ? (
              <View
                style={
                  styles.emptyOrders
                }
              >
                <Text
                  style={
                    styles.emptyOrdersTitle
                  }
                >
                  No orders yet
                </Text>

                <Text
                  style={
                    styles.emptyOrdersText
                  }
                >
                  New customer
                  orders will
                  appear here.
                </Text>
              </View>
            ) : (
              analytics.recentOrders.map(
                order => (
                  <OrderRow
                    key={
                      order._id
                    }
                    order={
                      order
                    }
                  />
                )
              )
            )}
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* BOTTOM NAVIGATION */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <Pressable
            style={
              styles.navItem
            }
          >
            <View
              style={
                styles.activeNavIcon
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
            onPress={() =>
              router.replace(
                '/(seller)/seller-products'
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ◈
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Products
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(seller)/seller-orders'
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              🛒
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Orders
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(seller)/seller-reports'
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ▥
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(seller)/seller-profile'
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ♙
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Profile
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STATUS CARD
 * =========================================================
 */

function StatusCard({
  value,
  label,
  background,
  textColor,
}: StatusCardProps) {
  return (
    <View
      style={[
        styles.statusCard,

        {
          backgroundColor:
            background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusValue,

          {
            color:
              textColor,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statusLabel,

          {
            color:
              textColor,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * ORDER ROW
 * =========================================================
 */

function OrderRow({
  order,
}: {
  order: CustomerOrder;
}) {
  const badgeType =
    getOrderBadgeType(
      order.orderStatus
    );

  return (
    <Pressable
      style={({
        pressed,
      }) => [
        styles.orderRow,

        pressed &&
          styles.pressed,
      ]}
      onPress={() =>
        router.replace(
          '/(seller)/seller-orders'
        )
      }
    >
      <View
        style={
          styles.orderIcon
        }
      >
        <Text
          style={
            styles.orderIconText
          }
        >
          ◈
        </Text>
      </View>

      <View
        style={
          styles.orderInfo
        }
      >
        <Text
          style={
            styles.orderId
          }
        >
          {getOrderNumber(
            order
          )}
        </Text>

        <Text
          style={
            styles.orderDescription
          }
          numberOfLines={
            1
          }
        >
          {order.productName}{' '}
          ×{order.quantity}{' '}
          •{' '}
          {getShortCustomerName(
            order
          )}
        </Text>
      </View>

      <OrderStatusBadge
        type={
          badgeType
        }
        label={getOrderBadgeLabel(
          order.orderStatus
        )}
      />
    </Pressable>
  );
}

/*
 * =========================================================
 * ORDER STATUS BADGE
 * =========================================================
 */

function OrderStatusBadge({
  type,
  label,
}: {
  type: OrderBadgeType;
  label: string;
}) {
  let backgroundColor =
    '#FFF4DD';

  let color =
    '#C99B35';

  if (
    type === 'active'
  ) {
    backgroundColor =
      '#EDF8EF';

    color =
      '#65A879';
  }

  if (
    type === 'pending'
  ) {
    backgroundColor =
      '#FFF0F5';

    color =
      '#D96D94';
  }

  if (
    type === 'done'
  ) {
    backgroundColor =
      '#EFF0FF';

    color =
      '#7276CF';
  }

  if (
    type === 'cancelled'
  ) {
    backgroundColor =
      '#F2F2F2';

    color =
      '#8A8A8A';
  }

  return (
    <View
      style={[
        styles.statusBadge,

        {
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,

          {
            color,
          },
        ]}
      >
        {label}
      </Text>
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
    container: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
    },

    screen: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        30,
    },

    loadingText: {
      marginTop: 12,
      color: '#777',
      fontSize: 13,
    },

    errorTitle: {
      fontSize: 17,
      fontWeight:
        '800',
      color: '#3E3E3E',
      textAlign:
        'center',
    },

    errorText: {
      fontSize: 12,
      color: '#888',
      textAlign:
        'center',
      marginTop: 8,
      lineHeight: 18,
    },

    retryButton: {
      backgroundColor:
        '#74A485',
      paddingHorizontal:
        24,
      paddingVertical:
        11,
      borderRadius: 12,
      marginTop: 18,
    },

    retryText: {
      color: '#FFFFFF',
      fontWeight:
        '700',
      fontSize: 12,
    },

    header: {
      backgroundColor:
        '#74A485',
      paddingTop: 22,
      paddingHorizontal:
        20,
      paddingBottom: 19,
      overflow:
        'hidden',
    },

    headerCircleOne: {
      position:
        'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor:
        'rgba(255,255,255,0.06)',
      top: -90,
      right: -35,
    },

    headerCircleTwo: {
      position:
        'absolute',
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor:
        'rgba(255,255,255,0.05)',
      bottom: -75,
      left: -20,
    },

    headerTopRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    greetingLabel: {
      color:
        'rgba(255,255,255,0.82)',
      fontSize: 10,
    },

    shopName: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight:
        '800',
      marginTop: 3,
    },

    headerMenuButton: {
      width: 40,
      height: 40,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerMenuText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight:
        '800',
    },

    summaryRow: {
      flexDirection:
        'row',
      gap: 10,
      marginTop: 18,
    },

    summaryCard: {
      flex: 1,
      minHeight: 78,
      backgroundColor:
        'rgba(255,255,255,0.17)',
      borderRadius: 14,
      paddingHorizontal:
        13,
      paddingVertical:
        12,
    },

    summaryLabel: {
      color:
        'rgba(255,255,255,0.88)',
      fontSize: 9,
      fontWeight:
        '600',
    },

    summaryValue: {
      color: '#FFFFFF',
      fontSize: 20,
      fontWeight:
        '800',
      marginTop: 4,
    },

    summaryMeta: {
      color:
        'rgba(255,255,255,0.75)',
      fontSize: 8,
      marginTop: 4,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        17,
      paddingTop: 14,
    },

    inlineError: {
      backgroundColor:
        '#FFF0F0',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },

    inlineErrorText: {
      color: '#B65A5A',
      fontSize: 10,
      textAlign:
        'center',
    },

    statusRow: {
      flexDirection:
        'row',
      gap: 8,
    },

    statusCard: {
      flex: 1,
      height: 63,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    statusValue: {
      fontSize: 17,
      fontWeight:
        '800',
    },

    statusLabel: {
      fontSize: 8,
      marginTop: 4,
    },

    /*
     * NEW ORDERS
     */

    newOrdersSection: {
      marginTop: 14,
    },

    newOrdersHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 9,
      paddingHorizontal:
        2,
    },

    newOrdersTitle: {
      color: '#37373A',
      fontSize: 13,
      fontWeight:
        '800',
    },

    newOrdersSubtitle: {
      color: '#99999C',
      fontSize: 8,
      marginTop: 2,
    },

    newOrdersCount: {
      minWidth: 25,
      height: 25,
      paddingHorizontal:
        7,
      borderRadius: 13,
      backgroundColor:
        '#FFF0F5',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    newOrdersCountText: {
      color: '#D96D94',
      fontSize: 9,
      fontWeight:
        '800',
    },

    newOrderCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      elevation: 2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 1,
      },

      shadowOpacity:
        0.05,

      shadowRadius: 4,

      borderWidth: 1,

      borderColor:
        '#EDF3EF',
    },

    newOrderTopRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    newOrderIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        '#EEF7F1',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    newOrderIconText: {
      fontSize: 17,
    },

    newOrderHeading: {
      flex: 1,
      marginLeft: 10,
    },

    newOrderNumber: {
      color: '#414144',
      fontSize: 10,
      fontWeight:
        '800',
    },

    newOrderCustomer: {
      color: '#969699',
      fontSize: 8,
      marginTop: 3,
    },

    newBadge: {
      backgroundColor:
        '#FFF0F5',
      paddingHorizontal:
        8,
      paddingVertical:
        5,
      borderRadius: 9,
    },

    newBadgeText: {
      color: '#D96D94',
      fontSize: 7,
      fontWeight:
        '800',
    },

    newOrderProductBox: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#F8FAF8',
      borderRadius: 12,
      padding: 11,
      marginTop: 12,
    },

    newOrderProductInfo: {
      flex: 1,
      paddingRight: 8,
    },

    newOrderProductName: {
      color: '#414144',
      fontSize: 10,
      fontWeight:
        '700',
    },

    newOrderProductMeta: {
      color: '#969699',
      fontSize: 8,
      marginTop: 4,
    },

    newOrderAmount: {
      color: '#5F9472',
      fontSize: 12,
      fontWeight:
        '800',
    },

    newOrderDetails: {
      marginTop: 10,
    },

    newOrderDetailRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      paddingVertical: 3,
    },

    newOrderDetailLabel: {
      color: '#A0A0A2',
      fontSize: 8,
    },

    newOrderDetailValue: {
      color: '#555558',
      fontSize: 8,
      fontWeight:
        '700',
    },

    customerNote: {
      backgroundColor:
        '#FFF9EC',
      borderRadius: 10,
      padding: 9,
      marginTop: 8,
    },

    customerNoteLabel: {
      color: '#B18B3E',
      fontSize: 7,
      fontWeight:
        '800',
    },

    customerNoteText: {
      color: '#777064',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    newOrderActions: {
      flexDirection:
        'row',
      gap: 8,
      marginTop: 12,
    },

    viewOrderButton: {
      flex: 1,
      height: 38,
      borderRadius: 11,
      borderWidth: 1,
      borderColor:
        '#74A485',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    viewOrderButtonText: {
      color: '#6A9D7A',
      fontSize: 9,
      fontWeight:
        '800',
    },

    acceptOrderButton: {
      flex: 1,
      height: 38,
      borderRadius: 11,
      backgroundColor:
        '#74A485',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    acceptOrderButtonText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight:
        '800',
    },

    disabledButton: {
      opacity: 0.6,
    },

    /*
     * REVENUE
     */

    revenueCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      padding: 15,
      marginTop: 14,
      elevation: 2,
    },

    revenueHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    sectionTitle: {
      color: '#37373A',
      fontSize: 12,
      fontWeight:
        '800',
    },

    revenueTotal: {
      color: '#6EA382',
      fontSize: 9,
      fontWeight:
        '700',
    },

    chart: {
      height: 105,
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      justifyContent:
        'space-between',
      marginTop: 16,
      paddingHorizontal:
        4,
    },

    chartColumn: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'flex-end',
    },

    chartBar: {
      width: 20,
      minHeight: 4,
      backgroundColor:
        '#83AF90',
      borderRadius: 4,
    },

    chartLabel: {
      color: '#A4A4A6',
      fontSize: 7,
      marginTop: 5,
    },

    /*
     * RECENT ORDERS
     */

    ordersCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 16,
      paddingHorizontal:
        14,
      paddingVertical:
        14,
      marginTop: 14,
      elevation: 2,
    },

    ordersHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom: 5,
    },

    viewAllText: {
      color: '#6EA382',
      fontSize: 9,
      fontWeight:
        '700',
    },

    emptyOrders: {
      alignItems:
        'center',
      paddingVertical:
        26,
    },

    emptyOrdersTitle: {
      color: '#555',
      fontSize: 11,
      fontWeight:
        '700',
    },

    emptyOrdersText: {
      color: '#999',
      fontSize: 9,
      marginTop: 4,
    },

    orderRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical:
        11,
      borderBottomWidth:
        1,
      borderBottomColor:
        '#F1F1F2',
    },

    orderIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        '#F4F7F5',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    orderIconText: {
      color: '#8FA29A',
      fontSize: 13,
    },

    orderInfo: {
      flex: 1,
      paddingRight: 6,
    },

    orderId: {
      color: '#444246',
      fontSize: 10,
      fontWeight:
        '800',
    },

    orderDescription: {
      color: '#9A979A',
      fontSize: 8,
      marginTop: 3,
    },

    statusBadge: {
      paddingHorizontal:
        8,
      paddingVertical: 5,
      borderRadius: 10,
    },

    statusBadgeText: {
      fontSize: 7,
      fontWeight:
        '700',
    },

    pressed: {
      opacity: 0.75,
    },

    bottomSpacer: {
      height: 20,
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNavigation: {
      height: 72,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor:
        '#ECEEEC',
      flexDirection:
        'row',
      justifyContent:
        'space-around',
      alignItems:
        'center',
      paddingBottom: 4,
    },

    navItem: {
      flex: 1,
      height: '100%',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    activeNavIcon: {
      width: 34,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        '#EAF4ED',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    navIcon: {
      color: '#9BA19D',
      fontSize: 16,
    },

    activeNavText: {
      color: '#6EA382',
      fontSize: 8,
      fontWeight:
        '700',
      marginTop: 3,
    },

    navText: {
      color: '#A4A5A6',
      fontSize: 8,
      marginTop: 4,
    },
  });