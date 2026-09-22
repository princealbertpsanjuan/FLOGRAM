import {
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
  type OrderUser,
  type SellerUpdateOrderStatus,
} from '../../services/orders';

import {
  createSellerDeliveryRequest,
} from '../../services/delivery';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type OrderFilter =
  | 'all'
  | 'pending'
  | 'active'
  | 'completed';

/*
 * =========================================================
 * STATUS GROUPS
 * =========================================================
 */

const ACTIVE_STATUSES: CustomerOrderStatus[] = [
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'ready_for_delivery',
  'out_for_delivery',
];

const COMPLETED_STATUSES: CustomerOrderStatus[] = [
  'delivered',
  'completed',
  'cancelled',
];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatCurrency = (
  value?: number | null
) => {
  const amount =
    typeof value === 'number'
      ? value
      : 0;

  return `₱${amount.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatStatus = (
  status?: string | null
) => {
  if (!status) {
    return 'Unknown';
  }

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
};

const formatTime = (
  value?: string | null
) => {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleTimeString(
    'en-PH',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
};

const getCustomerName = (
  customer?: OrderUser | string | null
) => {
  if (!customer) {
    return 'Customer';
  }

  if (
    typeof customer ===
    'string'
  ) {
    return 'Customer';
  }

  const name = [
    customer.firstName,
    customer.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return name || 'Customer';
};

const getShortOrderId = (
  orderId: string
) => {
  if (!orderId) {
    return '—';
  }

  return orderId
    .slice(-8)
    .toUpperCase();
};

const getStatusColors = (
  status: CustomerOrderStatus
) => {
  switch (status) {
    case 'pending':
      return {
        background:
          '#FFF4D8',
        text:
          '#9A7017',
      };

    case 'confirmed':
      return {
        background:
          '#E6F0FF',
        text:
          '#4B6F9F',
      };

    case 'preparing':
      return {
        background:
          '#F2E9FF',
        text:
          '#72529A',
      };

    case 'ready_for_pickup':
    case 'ready_for_delivery':
      return {
        background:
          '#E5F4EA',
        text:
          '#4F8063',
      };

    case 'out_for_delivery':
      return {
        background:
          '#E7F2FA',
        text:
          '#49758E',
      };

    case 'delivered':
    case 'completed':
      return {
        background:
          '#E5F4EA',
        text:
          '#4F8063',
      };

    case 'cancelled':
      return {
        background:
          '#FDE8E8',
        text:
          '#A55454',
      };

    default:
      return {
        background:
          '#EEEEEE',
        text:
          '#666666',
      };
  }
};

const getPaymentColors = (
  paymentStatus?: string | null
) => {
  switch (
    paymentStatus
  ) {
    case 'paid':
      return {
        background:
          '#E5F4EA',
        text:
          '#4F8063',
      };

    case 'pending':
      return {
        background:
          '#FFF4D8',
        text:
          '#9A7017',
      };

    case 'failed':
      return {
        background:
          '#FDE8E8',
        text:
          '#A55454',
      };

    case 'refunded':
      return {
        background:
          '#E9E9F5',
        text:
          '#66618A',
      };

    default:
      return {
        background:
          '#F1F1F1',
        text:
          '#737373',
      };
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function SellerOrdersScreen() {
  const [
    orders,
    setOrders,
  ] =
    useState<CustomerOrder[]>(
      []
    );

  const [
    filter,
    setFilter,
  ] =
    useState<OrderFilter>(
      'all'
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
    useState<string | null>(
      null
    );

  const [
    updatingOrderId,
    setUpdatingOrderId,
  ] =
    useState<string | null>(
      null
    );

  const [
    releasingOrderId,
    setReleasingOrderId,
  ] =
    useState<string | null>(
      null
    );

  /*
   * =======================================================
   * LOAD ORDERS
   * =======================================================
   */

const loadOrders =
  async (
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result =
        await getSellerOrders();

      setOrders(result);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load seller orders.';

      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

useEffect(() => {
  let active = true;

  const fetchOrders =
    async () => {
      try {
        const result =
          await getSellerOrders();

        if (!active) {
          return;
        }

        setOrders(result);
        setError(null);
      } catch (err: unknown) {
        if (!active) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load seller orders.';

        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

  fetchOrders();

  return () => {
    active = false;
  };
}, []);

  /*
   * =======================================================
   * COUNTS
   * =======================================================
   */

  const counts =
    useMemo(
      () => {
        const pending =
          orders.filter(
            (order) =>
              order.orderStatus ===
              'pending'
          ).length;

        const active =
          orders.filter(
            (order) =>
              ACTIVE_STATUSES.includes(
                order.orderStatus
              )
          ).length;

        const completed =
          orders.filter(
            (order) =>
              COMPLETED_STATUSES.includes(
                order.orderStatus
              )
          ).length;

        return {
          all:
            orders.length,

          pending,

          active,

          completed,
        };
      },
      [orders]
    );

  /*
   * =======================================================
   * FILTERED ORDERS
   * =======================================================
   */

  const filteredOrders =
    useMemo(
      () => {
        switch (
          filter
        ) {
          case 'pending':
            return orders.filter(
              (order) =>
                order.orderStatus ===
                'pending'
            );

          case 'active':
            return orders.filter(
              (order) =>
                ACTIVE_STATUSES.includes(
                  order.orderStatus
                )
            );

          case 'completed':
            return orders.filter(
              (order) =>
                COMPLETED_STATUSES.includes(
                  order.orderStatus
                )
            );

          default:
            return orders;
        }
      },
      [
        filter,
        orders,
      ]
    );

  /*
   * =======================================================
   * UPDATE SELLER ORDER STATUS
   * =======================================================
   */

  const performStatusUpdate =
    async (
      order: CustomerOrder,
      nextStatus:
        SellerUpdateOrderStatus
    ) => {
      try {
        setUpdatingOrderId(
          order._id
        );

        const updatedOrder =
          await updateSellerOrderStatus(
            order._id,
            nextStatus
          );

        setOrders(
          (
            currentOrders
          ) =>
            currentOrders.map(
              (
                currentOrder
              ) =>
                currentOrder._id ===
                updatedOrder._id
                  ? updatedOrder
                  : currentOrder
            )
        );
      } catch (
        err: unknown
      ) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to update the order.';

        Alert.alert(
          'Unable to Update',
          message
        );
      } finally {
        setUpdatingOrderId(
          null
        );
      }
    };

  const confirmStatusUpdate =
    (
      order: CustomerOrder,
      nextStatus:
        SellerUpdateOrderStatus,
      title: string,
      message: string,
      confirmText: string
    ) => {
      Alert.alert(
        title,
        message,
        [
          {
            text:
              'Cancel',
            style:
              'cancel',
          },
          {
            text:
              confirmText,

            onPress:
              () =>
                performStatusUpdate(
                  order,
                  nextStatus
                ),
          },
        ]
      );
    };

  /*
   * =======================================================
   * RELEASE TO RIDERS
   * =======================================================
   */

  const performReleaseForDelivery =
    async (
      order: CustomerOrder
    ) => {
      try {
        setReleasingOrderId(
          order._id
        );

        await createSellerDeliveryRequest(
          order._id
        );

        Alert.alert(
          'Delivery Released',
          'This delivery request is now available to eligible riders.'
        );

        const refreshedOrders =
          await getSellerOrders();

        setOrders(
          refreshedOrders
        );
      } catch (
        err: unknown
      ) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to release this order for delivery.';

        Alert.alert(
          'Unable to Release',
          message
        );
      } finally {
        setReleasingOrderId(
          null
        );
      }
    };

  const handleReleaseForDelivery =
    (
      order: CustomerOrder
    ) => {
      if (
        order.orderStatus !==
        'ready_for_delivery'
      ) {
        Alert.alert(
          'Order Not Ready',
          'This order must be marked ready for delivery first.'
        );

        return;
      }

      if (
        order.fulfillmentType !==
        'delivery'
      ) {
        Alert.alert(
          'Invalid Order',
          'Only delivery orders can be released to riders.'
        );

        return;
      }

      Alert.alert(
        'Release for Delivery',
        'Release this order so an available rider can accept it?',
        [
          {
            text:
              'Cancel',
            style:
              'cancel',
          },
          {
            text:
              'Release',

            onPress:
              () =>
                performReleaseForDelivery(
                  order
                ),
          },
        ]
      );
    };

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (
    loading
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerState
          }
        >
          <ActivityIndicator
            size="large"
            color="#74A485"
          />

          <Text
            style={
              styles.stateText
            }
          >
            Loading orders...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * ERROR
   * =======================================================
   */

  if (
    error &&
    orders.length ===
      0
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerState
          }
        >
          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load
            orders
          </Text>

          <Text
            style={
              styles.stateText
            }
          >
            {error}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              loadOrders()
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
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * UI
   * =======================================================
   */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <View
        style={
          styles.screen
        }
      >
        <ScrollView
          style={
            styles.scroll
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
              onRefresh={() =>
                loadOrders(
                  true
                )
              }
              tintColor="#74A485"
            />
          }
        >
          {/* HEADER */}

          <View
            style={
              styles.header
            }
          >
            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                Orders
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage your
                customer orders
              </Text>
            </View>

            <View
              style={
                styles.headerBadge
              }
            >
              <Text
                style={
                  styles.headerBadgeText
                }
              >
                {
                  orders.length
                }
              </Text>
            </View>
          </View>

          {/* SUMMARY */}

          <View
            style={
              styles.summaryRow
            }
          >
            <SummaryCard
              label="Pending"
              value={
                counts.pending
              }
            />

            <SummaryCard
              label="Active"
              value={
                counts.active
              }
            />

            <SummaryCard
              label="Done"
              value={
                counts.completed
              }
            />
          </View>

          {/* FILTERS */}

          <View
            style={
              styles.filterContainer
            }
          >
            <FilterButton
              label="All"
              count={
                counts.all
              }
              active={
                filter ===
                'all'
              }
              onPress={() =>
                setFilter(
                  'all'
                )
              }
            />

            <FilterButton
              label="Pending"
              count={
                counts.pending
              }
              active={
                filter ===
                'pending'
              }
              onPress={() =>
                setFilter(
                  'pending'
                )
              }
            />

            <FilterButton
              label="Active"
              count={
                counts.active
              }
              active={
                filter ===
                'active'
              }
              onPress={() =>
                setFilter(
                  'active'
                )
              }
            />

            <FilterButton
              label="Done"
              count={
                counts.completed
              }
              active={
                filter ===
                'completed'
              }
              onPress={() =>
                setFilter(
                  'completed'
                )
              }
            />
          </View>

          {/* ERROR BANNER */}

          {error ? (
            <View
              style={
                styles.errorBanner
              }
            >
              <Text
                style={
                  styles.errorBannerText
                }
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* ORDERS */}

          <View
            style={
              styles.ordersSection
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {filter ===
                'all'
                  ? 'All Orders'
                  : filter ===
                      'pending'
                    ? 'Pending Orders'
                    : filter ===
                        'active'
                      ? 'Active Orders'
                      : 'Completed Orders'}
              </Text>

              <Text
                style={
                  styles.sectionCount
                }
              >
                {
                  filteredOrders.length
                }{' '}
                {
                  filteredOrders.length ===
                  1
                    ? 'order'
                    : 'orders'
                }
              </Text>
            </View>

            {filteredOrders.length ===
            0 ? (
              <View
                style={
                  styles.emptyState
                }
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  📦
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No orders
                  found
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  There are no
                  orders in this
                  section yet.
                </Text>
              </View>
            ) : (
              filteredOrders.map(
                (
                  order
                ) => (
                  <OrderCard
                    key={
                      order._id
                    }
                    order={
                      order
                    }
                    updating={
                      updatingOrderId ===
                      order._id
                    }
                    releasing={
                      releasingOrderId ===
                      order._id
                    }
                    onStatusUpdate={(
                      nextStatus,
                      title,
                      message,
                      buttonText
                    ) =>
                      confirmStatusUpdate(
                        order,
                        nextStatus,
                        title,
                        message,
                        buttonText
                      )
                    }
                    onRelease={() =>
                      handleReleaseForDelivery(
                        order
                      )
                    }
                  />
                )
              )
            )}
          </View>
        </ScrollView>

        {/* BOTTOM NAVIGATION */}

        <View
          style={
            styles.bottomNav
          }
        >
          <BottomNavItem
            icon="⌂"
            label="Dashboard"
            onPress={() =>
              router.replace(
                '/(seller)/seller-dashboard'
              )
            }
          />

          <BottomNavItem
            icon="✿"
            label="Products"
            onPress={() =>
              router.replace(
                '/(seller)/seller-products'
              )
            }
          />

          <BottomNavItem
            icon="▣"
            label="Orders"
            active
            onPress={() => {}}
          />

<BottomNavItem
  icon="▥"
  label="Reports"
  onPress={() =>
    router.replace(
      '/(seller)/seller-reports'
    )
  }
/>

          <BottomNavItem
            icon="○"
            label="Profile"
            onPress={() =>
              router.replace(
                '/(seller)/seller-profile'
              )
            }
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * ORDER CARD
 * =========================================================
 */

type OrderCardProps = {
  order:
    CustomerOrder;

  updating:
    boolean;

  releasing:
    boolean;

  onStatusUpdate: (
    nextStatus:
      SellerUpdateOrderStatus,
    title:
      string,
    message:
      string,
    buttonText:
      string
  ) => void;

  onRelease:
    () => void;
};

function OrderCard({
  order,
  updating,
  releasing,
  onStatusUpdate,
  onRelease,
}: OrderCardProps) {
  const statusColors =
    getStatusColors(
      order.orderStatus
    );

  const paymentColors =
    getPaymentColors(
      order.paymentStatus
    );

  const isBusy =
    updating ||
    releasing;

  const productName =
    order.productName ||
    'Flower Order';

  const quantity =
    order.quantity ??
    1;

  const unitPrice =
    order.unitPrice ??
    0;

  const subtotal =
    order.subtotal ??
    unitPrice *
      quantity;

  const total =
    order.totalAmount ??
    subtotal;

  const customerName =
    getCustomerName(
      order.customer
    );

  const fulfillment =
    order.fulfillmentType ===
    'pickup'
      ? 'Pickup'
      : 'Delivery';

  return (
    <View
      style={
        styles.orderCard
      }
    >
      {/* CARD HEADER */}

      <View
        style={
          styles.orderCardHeader
        }
      >
        <View
          style={
            styles.orderHeaderLeft
          }
        >
          <Text
            style={
              styles.orderNumber
            }
          >
            #
            {getShortOrderId(
              order._id
            )}
          </Text>

          <Text
            style={
              styles.orderDate
            }
          >
            {formatDate(
              order.createdAt
            )}

            {formatTime(
              order.createdAt
            )
              ? ` • ${formatTime(
                  order.createdAt
                )}`
              : ''}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                statusColors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              {
                color:
                  statusColors.text,
              },
            ]}
          >
            {formatStatus(
              order.orderStatus
            )}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.divider
        }
      />

      {/* CUSTOMER */}

      <View
        style={
          styles.infoRow
        }
      >
        <View
          style={
            styles.infoIcon
          }
        >
          <Text
            style={
              styles.infoIconText
            }
          >
            👤
          </Text>
        </View>

        <View
          style={
            styles.infoContent
          }
        >
          <Text
            style={
              styles.infoLabel
            }
          >
            Customer
          </Text>

          <Text
            style={
              styles.infoValue
            }
          >
            {
              customerName
            }
          </Text>
        </View>
      </View>

      {/* PRODUCT */}

      <View
        style={
          styles.productBox
        }
      >
        <View
          style={
            styles.productTopRow
          }
        >
          <View
            style={
              styles.productNameContainer
            }
          >
            <Text
              style={
                styles.productName
              }
            >
              {
                productName
              }
            </Text>

            <Text
              style={
                styles.productMeta
              }
            >
              Qty:{' '}
              {
                quantity
              }{' '}
              ×{' '}
              {formatCurrency(
                unitPrice
              )}
            </Text>
          </View>

          <Text
            style={
              styles.productSubtotal
            }
          >
            {formatCurrency(
              subtotal
            )}
          </Text>
        </View>
      </View>

      {/* PREORDER */}

      {order.isPreOrder ? (
        <View
          style={
            styles.preorderBox
          }
        >
          <Text
            style={
              styles.preorderTitle
            }
          >
            📅 Pre-order
          </Text>

          <Text
            style={
              styles.preorderText
            }
          >
            Requested:{' '}
            {formatDate(
              order.requestedDeliveryDate
            )}

            {order.requestedDeliveryTimeStart
              ? ` • ${order.requestedDeliveryTimeStart}`
              : ''}

            {order.requestedDeliveryTimeEnd
              ? ` - ${order.requestedDeliveryTimeEnd}`
              : ''}
          </Text>
        </View>
      ) : null}

      {/* DETAILS */}

      <View
        style={
          styles.detailsBox
        }
      >
        <DetailRow
          label="Fulfillment"
          value={
            fulfillment
          }
        />

        <DetailRow
          label="Payment"
          value={
            formatStatus(
              order.paymentMethod
            )
          }
        />

        <View
          style={
            styles.detailRow
          }
        >
          <Text
            style={
              styles.detailLabel
            }
          >
            Payment
            Status
          </Text>

          <View
            style={[
              styles.paymentBadge,
              {
                backgroundColor:
                  paymentColors.background,
              },
            ]}
          >
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color:
                    paymentColors.text,
                },
              ]}
            >
              {formatStatus(
                order.paymentStatus
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* CUSTOMER NOTES */}

      {order.customerNotes ? (
        <View
          style={
            styles.notesBox
          }
        >
          <Text
            style={
              styles.notesLabel
            }
          >
            Customer Notes
          </Text>

          <Text
            style={
              styles.notesText
            }
          >
            {
              order.customerNotes
            }
          </Text>
        </View>
      ) : null}

      {/* TOTAL */}

      <View
        style={
          styles.totalRow
        }
      >
        <Text
          style={
            styles.totalLabel
          }
        >
          Total
        </Text>

        <Text
          style={
            styles.totalValue
          }
        >
          {formatCurrency(
            total
          )}
        </Text>
      </View>

      {/* ===================================================
          SELLER ACTIONS
          =================================================== */}

      {order.orderStatus ===
      'pending' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <ActionButton
            label="Accept Order"
            loading={
              updating
            }
            disabled={
              isBusy
            }
            onPress={() =>
              onStatusUpdate(
                'confirmed',
                'Accept Order',
                'Are you sure you want to accept this order?',
                'Accept'
              )
            }
          />
        </View>
      ) : null}

      {order.orderStatus ===
      'confirmed' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <ActionButton
            label="Start Preparing"
            loading={
              updating
            }
            disabled={
              isBusy
            }
            onPress={() =>
              onStatusUpdate(
                'preparing',
                'Start Preparing',
                'Start preparing this bouquet?',
                'Start'
              )
            }
          />
        </View>
      ) : null}

      {order.orderStatus ===
      'preparing' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <ActionButton
            label={
              order.fulfillmentType ===
              'pickup'
                ? 'Mark Ready for Pickup'
                : 'Mark Ready for Delivery'
            }
            loading={
              updating
            }
            disabled={
              isBusy
            }
            onPress={() => {
              if (
                order.fulfillmentType ===
                'pickup'
              ) {
                onStatusUpdate(
                  'ready_for_pickup',
                  'Ready for Pickup',
                  'Mark this bouquet as ready for customer pickup?',
                  'Mark Ready'
                );
              } else {
                onStatusUpdate(
                  'ready_for_delivery',
                  'Ready for Delivery',
                  'Mark this bouquet as ready for rider delivery?',
                  'Mark Ready'
                );
              }
            }}
          />
        </View>
      ) : null}

      {/* READY FOR PICKUP */}

      {order.orderStatus ===
        'ready_for_pickup' &&
      order.fulfillmentType ===
        'pickup' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.successNotice
            }
          >
            <Text
              style={
                styles.successNoticeTitle
              }
            >
              ✓ Ready for
              customer pickup
            </Text>

            <Text
              style={
                styles.successNoticeText
              }
            >
              The bouquet is
              ready. The customer
              can now collect the
              order from your
              shop.
            </Text>
          </View>
        </View>
      ) : null}

      {/* READY FOR DELIVERY */}

      {order.orderStatus ===
        'ready_for_delivery' &&
      order.fulfillmentType ===
        'delivery' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.successNotice
            }
          >
            <Text
              style={
                styles.successNoticeTitle
              }
            >
              ✓ Ready for rider
              delivery
            </Text>

            <Text
              style={
                styles.successNoticeText
              }
            >
              The bouquet is
              prepared. Release
              this order so an
              available rider can
              accept the delivery.
            </Text>
          </View>

          <ActionButton
            label="Release for Delivery"
            loading={
              releasing
            }
            disabled={
              isBusy
            }
            onPress={
              onRelease
            }
          />
        </View>
      ) : null}

      {/* OUT FOR DELIVERY */}

      {order.orderStatus ===
      'out_for_delivery' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.deliveryNotice
            }
          >
            <Text
              style={
                styles.deliveryNoticeTitle
              }
            >
              🛵 Out for
              Delivery
            </Text>

            <Text
              style={
                styles.deliveryNoticeText
              }
            >
              A rider is
              currently delivering
              this order.
            </Text>
          </View>
        </View>
      ) : null}

      {/* DELIVERED */}

      {order.orderStatus ===
      'delivered' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.successNotice
            }
          >
            <Text
              style={
                styles.successNoticeTitle
              }
            >
              ✓ Delivered
            </Text>

            <Text
              style={
                styles.successNoticeText
              }
            >
              The rider has
              delivered this order
              to the customer.
            </Text>
          </View>
        </View>
      ) : null}

      {/* COMPLETED */}

      {order.orderStatus ===
      'completed' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.successNotice
            }
          >
            <Text
              style={
                styles.successNoticeTitle
              }
            >
              ✓ Order Completed
            </Text>

            <Text
              style={
                styles.successNoticeText
              }
            >
              This order has been
              completed.
            </Text>
          </View>
        </View>
      ) : null}

      {/* CANCELLED */}

      {order.orderStatus ===
      'cancelled' ? (
        <View
          style={
            styles.actionSection
          }
        >
          <View
            style={
              styles.cancelledNotice
            }
          >
            <Text
              style={
                styles.cancelledNoticeTitle
              }
            >
              Order Cancelled
            </Text>

            <Text
              style={
                styles.cancelledNoticeText
              }
            >
              This order is no
              longer active.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * ACTION BUTTON
 * =========================================================
 */

type ActionButtonProps = {
  label:
    string;

  loading?:
    boolean;

  disabled?:
    boolean;

  onPress:
    () => void;
};

function ActionButton({
  label,
  loading = false,
  disabled = false,
  onPress,
}: ActionButtonProps) {
  return (
    <Pressable
      style={[
        styles.primaryActionButton,

        disabled &&
          styles.disabledActionButton,
      ]}
      disabled={
        disabled
      }
      onPress={
        onPress
      }
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color="#FFFFFF"
        />
      ) : (
        <Text
          style={
            styles.primaryActionButtonText
          }
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/*
 * =========================================================
 * SUMMARY CARD
 * =========================================================
 */

function SummaryCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
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
  active,
  onPress,
}: {
  label:
    string;

  count:
    number;

  active:
    boolean;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      style={[
        styles.filterButton,

        active &&
          styles.filterButtonActive,
      ]}
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.filterButtonText,

          active &&
            styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCount,

          active &&
            styles.filterCountActive,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,

            active &&
              styles.filterCountTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

/*
 * =========================================================
 * DETAIL ROW
 * =========================================================
 */

function DetailRow({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <View
      style={
        styles.detailRow
      }
    >
      <Text
        style={
          styles.detailLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * BOTTOM NAV ITEM
 * =========================================================
 */

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon:
    string;

  label:
    string;

  active?:
    boolean;

  onPress:
    () => void;
}) {
  return (
    <Pressable
      style={
        styles.navItem
      }
      onPress={
        onPress
      }
    >
      <Text
        style={[
          styles.navIcon,

          active &&
            styles.navIconActive,
        ]}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.navLabel,

          active &&
            styles.navLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
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
        '#F5F6F5',
    },

    screen: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        18,
      paddingTop:
        18,
      paddingBottom:
        120,
    },

    /*
     * HEADER
     */

    header: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      marginBottom:
        20,
    },

    headerTitle: {
      fontSize:
        27,
      fontWeight:
        '800',
      color:
        '#26332C',
    },

    headerSubtitle: {
      marginTop:
        4,
      fontSize:
        13,
      color:
        '#7B867F',
    },

    headerBadge: {
      minWidth:
        42,
      height:
        42,
      paddingHorizontal:
        10,
      borderRadius:
        21,
      backgroundColor:
        '#E3EFE7',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerBadgeText: {
      color:
        '#5E8C70',
      fontWeight:
        '800',
      fontSize:
        15,
    },

    /*
     * SUMMARY
     */

    summaryRow: {
      flexDirection:
        'row',
      gap:
        10,
      marginBottom:
        18,
    },

    summaryCard: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      borderRadius:
        14,
      paddingVertical:
        14,
      paddingHorizontal:
        10,
      alignItems:
        'center',

      shadowColor:
        '#000000',
      shadowOpacity:
        0.04,
      shadowRadius:
        8,
      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation:
        1,
    },

    summaryValue: {
      color:
        '#4F8063',
      fontSize:
        20,
      fontWeight:
        '800',
    },

    summaryLabel: {
      marginTop:
        3,
      color:
        '#7C8780',
      fontSize:
        11,
      fontWeight:
        '600',
    },

    /*
     * FILTERS
     */

    filterContainer: {
      flexDirection:
        'row',
      backgroundColor:
        '#EBEEEC',
      borderRadius:
        13,
      padding:
        4,
      marginBottom:
        20,
    },

    filterButton: {
      flex: 1,
      minHeight:
        39,
      borderRadius:
        10,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      gap:
        4,
    },

    filterButtonActive: {
      backgroundColor:
        '#FFFFFF',
    },

    filterButtonText: {
      fontSize:
        11,
      fontWeight:
        '600',
      color:
        '#7A837D',
    },

    filterButtonTextActive: {
      color:
        '#4F8063',
      fontWeight:
        '800',
    },

    filterCount: {
      minWidth:
        18,
      height:
        18,
      paddingHorizontal:
        4,
      borderRadius:
        9,
      backgroundColor:
        '#DDE2DF',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    filterCountActive: {
      backgroundColor:
        '#E3EFE7',
    },

    filterCountText: {
      color:
        '#7B827E',
      fontSize:
        9,
      fontWeight:
        '700',
    },

    filterCountTextActive: {
      color:
        '#4F8063',
    },

    /*
     * SECTION
     */

    ordersSection: {
      gap:
        12,
    },

    sectionHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom:
        2,
    },

    sectionTitle: {
      color:
        '#34443A',
      fontSize:
        17,
      fontWeight:
        '800',
    },

    sectionCount: {
      color:
        '#909891',
      fontSize:
        11,
    },

    /*
     * ORDER CARD
     */

    orderCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius:
        17,
      padding:
        16,
      marginBottom:
        2,

      shadowColor:
        '#000000',
      shadowOpacity:
        0.04,
      shadowRadius:
        10,
      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation:
        2,
    },

    orderCardHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      gap:
        12,
    },

    orderHeaderLeft: {
      flex:
        1,
    },

    orderNumber: {
      color:
        '#33423A',
      fontSize:
        14,
      fontWeight:
        '800',
    },

    orderDate: {
      marginTop:
        4,
      color:
        '#969D98',
      fontSize:
        10,
    },

    statusBadge: {
      borderRadius:
        20,
      paddingHorizontal:
        10,
      paddingVertical:
        6,
    },

    statusBadgeText: {
      fontSize:
        9,
      fontWeight:
        '800',
    },

    divider: {
      height:
        1,
      backgroundColor:
        '#F0F1F0',
      marginVertical:
        14,
    },

    /*
     * INFO
     */

    infoRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom:
        14,
    },

    infoIcon: {
      width:
        36,
      height:
        36,
      borderRadius:
        18,
      backgroundColor:
        '#EDF4EF',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight:
        10,
    },

    infoIconText: {
      fontSize:
        15,
    },

    infoContent: {
      flex:
        1,
    },

    infoLabel: {
      color:
        '#A0A6A2',
      fontSize:
        9,
      textTransform:
        'uppercase',
      fontWeight:
        '700',
      letterSpacing:
        0.4,
    },

    infoValue: {
      marginTop:
        2,
      color:
        '#3D4B43',
      fontSize:
        13,
      fontWeight:
        '700',
    },

    /*
     * PRODUCT
     */

    productBox: {
      backgroundColor:
        '#F7F9F7',
      borderRadius:
        12,
      padding:
        12,
      marginBottom:
        12,
    },

    productTopRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap:
        12,
    },

    productNameContainer: {
      flex:
        1,
    },

    productName: {
      color:
        '#3C4A42',
      fontSize:
        13,
      fontWeight:
        '700',
    },

    productMeta: {
      marginTop:
        4,
      color:
        '#8A948E',
      fontSize:
        10,
    },

    productSubtotal: {
      color:
        '#4F8063',
      fontSize:
        13,
      fontWeight:
        '800',
    },

    /*
     * PREORDER
     */

    preorderBox: {
      backgroundColor:
        '#FFF8E8',
      borderRadius:
        11,
      padding:
        11,
      marginBottom:
        12,
    },

    preorderTitle: {
      color:
        '#8B6D29',
      fontSize:
        11,
      fontWeight:
        '800',
    },

    preorderText: {
      marginTop:
        4,
      color:
        '#8C7C55',
      fontSize:
        10,
      lineHeight:
        15,
    },

    /*
     * DETAILS
     */

    detailsBox: {
      gap:
        9,
      marginBottom:
        12,
    },

    detailRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      gap:
        12,
    },

    detailLabel: {
      color:
        '#929A95',
      fontSize:
        10,
    },

    detailValue: {
      flex:
        1,
      textAlign:
        'right',
      color:
        '#4A574F',
      fontSize:
        10,
      fontWeight:
        '700',
    },

    paymentBadge: {
      borderRadius:
        15,
      paddingHorizontal:
        8,
      paddingVertical:
        4,
    },

    paymentBadgeText: {
      fontSize:
        9,
      fontWeight:
        '800',
    },

    /*
     * NOTES
     */

    notesBox: {
      backgroundColor:
        '#FAFAFA',
      borderRadius:
        10,
      padding:
        11,
      marginBottom:
        12,
    },

    notesLabel: {
      color:
        '#7E8882',
      fontSize:
        9,
      fontWeight:
        '800',
      textTransform:
        'uppercase',
    },

    notesText: {
      marginTop:
        5,
      color:
        '#5B665F',
      fontSize:
        10,
      lineHeight:
        15,
    },

    /*
     * TOTAL
     */

    totalRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      borderTopWidth:
        1,
      borderTopColor:
        '#F0F1F0',
      paddingTop:
        13,
    },

    totalLabel: {
      color:
        '#5F6B64',
      fontSize:
        12,
      fontWeight:
        '700',
    },

    totalValue: {
      color:
        '#4F8063',
      fontSize:
        17,
      fontWeight:
        '900',
    },

    /*
     * ACTIONS
     */

    actionSection: {
      marginTop:
        14,
    },

    primaryActionButton: {
      minHeight:
        48,
      borderRadius:
        12,
      backgroundColor:
        '#74A485',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        16,
    },

    primaryActionButtonText: {
      color:
        '#FFFFFF',
      fontSize:
        12,
      fontWeight:
        '800',
    },

    disabledActionButton: {
      opacity:
        0.55,
    },

    successNotice: {
      backgroundColor:
        '#EAF5EE',
      borderRadius:
        12,
      padding:
        13,
      marginBottom:
        10,
    },

    successNoticeTitle: {
      color:
        '#4F8063',
      fontSize:
        11,
      fontWeight:
        '800',
    },

    successNoticeText: {
      marginTop:
        5,
      color:
        '#718078',
      fontSize:
        10,
      lineHeight:
        15,
    },

    deliveryNotice: {
      backgroundColor:
        '#EAF3F8',
      borderRadius:
        12,
      padding:
        13,
    },

    deliveryNoticeTitle: {
      color:
        '#49758E',
      fontSize:
        11,
      fontWeight:
        '800',
    },

    deliveryNoticeText: {
      marginTop:
        5,
      color:
        '#68808E',
      fontSize:
        10,
      lineHeight:
        15,
    },

    cancelledNotice: {
      backgroundColor:
        '#FDEEEE',
      borderRadius:
        12,
      padding:
        13,
    },

    cancelledNoticeTitle: {
      color:
        '#A55454',
      fontSize:
        11,
      fontWeight:
        '800',
    },

    cancelledNoticeText: {
      marginTop:
        5,
      color:
        '#986D6D',
      fontSize:
        10,
      lineHeight:
        15,
    },

    /*
     * EMPTY / ERROR
     */

    emptyState: {
      backgroundColor:
        '#FFFFFF',
      borderRadius:
        16,
      alignItems:
        'center',
      paddingVertical:
        42,
      paddingHorizontal:
        20,
    },

    emptyIcon: {
      fontSize:
        30,
    },

    emptyTitle: {
      marginTop:
        10,
      color:
        '#46544C',
      fontSize:
        14,
      fontWeight:
        '800',
    },

    emptyText: {
      marginTop:
        5,
      color:
        '#929B95',
      fontSize:
        11,
      textAlign:
        'center',
    },

    centerState: {
      flex:
        1,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        30,
    },

    stateText: {
      marginTop:
        12,
      color:
        '#7F8983',
      fontSize:
        12,
      textAlign:
        'center',
    },

    errorTitle: {
      color:
        '#A55454',
      fontSize:
        17,
      fontWeight:
        '800',
    },

    retryButton: {
      marginTop:
        18,
      backgroundColor:
        '#74A485',
      borderRadius:
        11,
      paddingHorizontal:
        22,
      paddingVertical:
        12,
    },

    retryButtonText: {
      color:
        '#FFFFFF',
      fontWeight:
        '800',
      fontSize:
        12,
    },

    errorBanner: {
      backgroundColor:
        '#FDEEEE',
      borderRadius:
        10,
      padding:
        10,
      marginBottom:
        14,
    },

    errorBannerText: {
      color:
        '#A55454',
      fontSize:
        10,
    },

    /*
     * BOTTOM NAV
     */

    bottomNav: {
      position:
        'absolute',
      left:
        0,
      right:
        0,
      bottom:
        0,
      height:
        74,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth:
        1,
      borderTopColor:
        '#ECEFEC',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-around',
      paddingBottom:
        6,

      shadowColor:
        '#000000',
      shadowOpacity:
        0.04,
      shadowRadius:
        10,
      shadowOffset: {
        width: 0,
        height: -2,
      },

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
      gap:
        3,
    },

    navIcon: {
      color:
        '#A1AAA4',
      fontSize:
        19,
    },

    navIconActive: {
      color:
        '#74A485',
    },

    navLabel: {
      color:
        '#A1AAA4',
      fontSize:
        9,
      fontWeight:
        '600',
    },

    navLabelActive: {
      color:
        '#74A485',
      fontWeight:
        '800',
    },
  });