import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import {
  cancelOrderAsSeller,
  getSellerOrders,
  markPickupOrderCollected,
  updateSellerOrderStatus,
  type CustomerOrder,
  type CustomerOrderStatus,
  type OrderUser,
  type SellerUpdateOrderStatus,
} from '../../services/orders';

import {
  createSellerDeliveryRequest,
} from '../../services/delivery';

import {
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  isAwaitingOnlinePayment,
} from '../../utils/order-status';

import SellerBottomNav from '../../components/seller/seller-bottom-nav';

import { ScreenLoader } from '../../components/ui/state-views';

import { formatAddOnsLine } from '../../services/addons';

import ReportProblemLink from '../../components/ui/report-problem-link';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

/*
 * Seller order groups, in priority order:
 *
 * action           needs the Seller now
 *                  (new paid/COD order, accepted,
 *                  preparing)
 * progress         ready / with Rider
 * awaiting_payment online order not yet paid —
 *                  cannot be accepted
 * completed        delivered, completed, cancelled
 * all
 */
type OrderFilter =
  | 'action'
  | 'progress'
  | 'awaiting_payment'
  | 'completed'
  | 'all';

const ACTION_STATUSES: CustomerOrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
];

const PROGRESS_STATUSES: CustomerOrderStatus[] = [
  'ready_for_pickup',
  'ready_for_delivery',
  'out_for_delivery',
];

const needsSellerAction = (
  order: CustomerOrder
) =>
  ACTION_STATUSES.includes(
    order.orderStatus
  ) &&
  !(
    order.orderStatus ===
      'pending' &&
    isAwaitingOnlinePayment(
      order
    )
  );

const isAwaitingPaymentOrder = (
  order: CustomerOrder
) =>
  order.orderStatus ===
    'pending' &&
  isAwaitingOnlinePayment(
    order
  );

/*
 * =========================================================
 * STATUS GROUPS
 * =========================================================
 */


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
  /*
   * Opened from Dashboard "View Order":
   * show that order's details first.
   */
  const params =
    useLocalSearchParams<{
      orderId?: string;
    }>();

  const [
    focusedOrderId,
    setFocusedOrderId,
  ] =
    useState<string | null>(
      typeof params.orderId ===
        'string' &&
        params.orderId
        ? params.orderId
        : null
    );

  useEffect(() => {
    if (
      typeof params.orderId ===
        'string' &&
      params.orderId
    ) {
      setFocusedOrderId(
        params.orderId
      );
    }
  }, [params.orderId]);

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
      'action'
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
   * Seller cancel / decline dialog.
   */
  const [cancelTarget, setCancelTarget] = useState<CustomerOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

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
      () => ({
        all:
          orders.length,
        action:
          orders.filter(
            needsSellerAction
          ).length,
        progress:
          orders.filter(
            (order) =>
              PROGRESS_STATUSES.includes(
                order.orderStatus
              )
          ).length,
        awaitingPayment:
          orders.filter(
            isAwaitingPaymentOrder
          ).length,
        completed:
          orders.filter(
            (order) =>
              COMPLETED_STATUSES.includes(
                order.orderStatus
              )
          ).length,
      }),
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
        if (focusedOrderId) {
          return orders.filter(
            (order) =>
              order._id ===
              focusedOrderId
          );
        }

        switch (
          filter
        ) {
          case 'action':
            /*
             * Oldest first: the order waiting
             * longest is handled first.
             */
            return orders
              .filter(
                needsSellerAction
              )
              .sort(
                (a, b) =>
                  new Date(
                    a.createdAt
                  ).getTime() -
                  new Date(
                    b.createdAt
                  ).getTime()
              );
          case 'progress':
            return orders.filter(
              (order) =>
                PROGRESS_STATUSES.includes(
                  order.orderStatus
                )
            );
          case 'awaiting_payment':
            return orders.filter(
              isAwaitingPaymentOrder
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
        focusedOrderId,
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
                  ? { ...currentOrder, ...updatedOrder }
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
   * PICKUP HANDOVER
   * =======================================================
   */

  const handlePickedUp = (order: CustomerOrder) => {
    const cashNote =
      order.paymentMethod === 'cash_on_pickup' && order.paymentStatus !== 'paid'
        ? ` Collect ${formatCurrency(order.totalAmount ?? 0)} in cash first.`
        : '';

    Alert.alert(
      'Mark as Picked Up',
      `Confirm the customer has collected this bouquet.${cashNote}`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Picked Up',
          onPress: async () => {
            try {
              setUpdatingOrderId(order._id);
              const updated = await markPickupOrderCollected(order._id);
              setOrders(current =>
                current.map(item => (item._id === updated._id ? { ...item, ...updated } : item))
              );
            } catch (err: unknown) {
              Alert.alert('Unable to Update', err instanceof Error ? err.message : 'Please try again.');
            } finally {
              setUpdatingOrderId(null);
            }
          },
        },
      ]
    );
  };

  /*
   * =======================================================
   * SELLER CANCEL / DECLINE
   * =======================================================
   */

  const submitCancel = async () => {
    if (!cancelTarget) return;

    if (cancelReason.trim().length < 5) {
      Alert.alert('Reason needed', 'Tell the customer why (at least 5 characters).');
      return;
    }

    try {
      setCancelling(true);
      const updated = await cancelOrderAsSeller(cancelTarget._id, cancelReason);
      setOrders(current =>
        current.map(item => (item._id === updated._id ? { ...item, ...updated, delivery: null } : item))
      );
      setCancelTarget(null);
      setCancelReason('');
    } catch (err: unknown) {
      Alert.alert('Unable to Cancel', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setCancelling(false);
    }
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
      <ScreenLoader
        role="seller"
        message="Loading orders..."
      />
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
              label="Needs Action"
              value={
                counts.action
              }
            />

            <SummaryCard
              label="In Progress"
              value={
                counts.progress
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterContainer
            }
          >
            {(
              [
                ['action', 'Needs Action', counts.action],
                ['progress', 'In Progress', counts.progress],
                ['awaiting_payment', 'Awaiting Payment', counts.awaitingPayment],
                ['completed', 'Done', counts.completed],
                ['all', 'All', counts.all],
              ] as const
            ).map(
              ([key, label, count]) => (
                <FilterButton
                  key={key}
                  label={label}
                  count={count}
                  active={
                    !focusedOrderId &&
                    filter === key
                  }
                  onPress={() => {
                    setFocusedOrderId(
                      null
                    );
                    setFilter(key);
                  }}
                />
              )
            )}
          </ScrollView>

          {focusedOrderId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setFocusedOrderId(
                  null
                )
              }
              style={
                styles.errorBanner
              }
            >
              <Text
                style={
                  styles.errorBannerText
                }
              >
                Showing the selected order.
                Tap to show all orders.
              </Text>
            </Pressable>
          ) : null}

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
                {focusedOrderId
                  ? 'Order Details'
                  : filter === 'action'
                    ? 'Needs Your Action'
                    : filter === 'progress'
                      ? 'In Progress'
                      : filter ===
                          'awaiting_payment'
                        ? 'Awaiting Customer Payment'
                        : filter === 'completed'
                          ? 'Completed Orders'
                          : 'All Orders'}
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
                    onPickedUp={() =>
                      handlePickedUp(order)
                    }
                    onCancel={() => {
                      setCancelReason('');
                      setCancelTarget(order);
                    }}
                  />
                )
              )
            )}
          </View>
        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <SellerBottomNav active="orders" />

        {/* CANCEL / DECLINE DIALOG */}
        <Modal
          visible={cancelTarget !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelTarget(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {cancelTarget?.orderStatus === 'pending' ? 'Decline Order' : 'Cancel Order'}
              </Text>
              <Text style={styles.modalText}>
                The customer will see this reason.
                {cancelTarget?.paymentMethod === 'paymongo' && cancelTarget?.paymentStatus === 'paid'
                  ? ' This order was paid online, so FLOGRAM Admin will refund the customer.'
                  : ''}
              </Text>
              <TextInput
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="e.g. Flowers out of stock today"
                placeholderTextColor="#9AA59F"
                multiline
                maxLength={300}
                style={styles.modalInput}
              />
              <View style={styles.modalActions}>
                <Pressable
                  disabled={cancelling}
                  onPress={() => setCancelTarget(null)}
                  style={[styles.modalButton, styles.modalButtonGhost]}
                >
                  <Text style={[styles.modalButtonText, { color: '#5E9874' }]}>Keep Order</Text>
                </Pressable>
                <Pressable
                  disabled={cancelling}
                  onPress={() => void submitCancel()}
                  style={[styles.modalButton, styles.modalButtonDanger, cancelling && { opacity: 0.6 }]}
                >
                  {cancelling ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>
                      {cancelTarget?.orderStatus === 'pending' ? 'Decline' : 'Cancel Order'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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

  onPickedUp:
    () => void;

  onCancel:
    () => void;
};

function OrderCard({
  order,
  updating,
  releasing,
  onStatusUpdate,
  onRelease,
  onPickedUp,
  onCancel,
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

  const deliveryStatus =
    order.delivery?.status ?? null;

  const riderAssigned =
    deliveryStatus === 'accepted' ||
    deliveryStatus === 'picked_up' ||
    deliveryStatus === 'out_for_delivery';

  /*
   * The shop can cancel/decline until a rider accepts.
   */
  const canSellerCancel =
    ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'ready_for_delivery'].includes(order.orderStatus) &&
    !riderAssigned &&
    !isAwaitingOnlinePayment(order);

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
            {order.orderStatus === 'ready_for_delivery' && deliveryStatus === 'available'
              ? 'Waiting for Rider'
              : order.orderStatus === 'ready_for_delivery' && riderAssigned
                ? 'Rider Assigned'
                : getOrderStatusLabel(
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

            {order.addOns?.length ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.productMeta,
                  { color: '#B5476F', fontWeight: '600' },
                ]}
              >
                Add-ons: {formatAddOnsLine(order.addOns)} ({formatCurrency(order.addOnsTotal ?? 0)})
              </Text>
            ) : null}
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
            getPaymentMethodLabel(
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
              {getPaymentStatusLabel(
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
        'pending' &&
      isAwaitingOnlinePayment(
        order
      ) ? (
        <View
          style={
            styles.actionSection
          }
        >
          <Text
            style={
              styles.emptyText
            }
          >
            Waiting for the customer to
            complete online payment. You can
            accept this order once PayMongo
            confirms the payment.
          </Text>
        </View>
      ) : null}

      {order.orderStatus ===
        'pending' &&
      !isAwaitingOnlinePayment(
        order
      ) ? (
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

          <ActionButton
            label="Mark as Picked Up"
            loading={
              updating
            }
            disabled={
              isBusy
            }
            onPress={
              onPickedUp
            }
          />
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
          {deliveryStatus === 'available' ? (
            <>
              <View style={styles.deliveryNotice}>
                <Text style={styles.deliveryNoticeTitle}>
                  ⏳ Released – waiting for a rider
                </Text>
                <Text style={styles.deliveryNoticeText}>
                  Riders on shift can now see this delivery. You will be notified when one accepts it.
                </Text>
              </View>

              <ActionButton
                label="Released for Delivery"
                disabled
                onPress={() => undefined}
              />
            </>
          ) : riderAssigned ? (
            <View style={styles.deliveryNotice}>
              <Text style={styles.deliveryNoticeTitle}>
                🛵 Rider assigned
                {order.delivery?.rider?.firstName ? ` – ${order.delivery.rider.firstName} ${order.delivery.rider.lastName || ''}` : ''}
              </Text>
              <Text style={styles.deliveryNoticeText}>
                {order.delivery?.status === 'accepted'
                  ? 'The rider is on the way to your shop to pick up the bouquet.'
                  : 'The rider has picked up the bouquet.'}
              </Text>
            </View>
          ) : (
            <>
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
            </>
          )}
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

      {canSellerCancel ? (
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelOrderButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.cancelOrderText}>
            {order.orderStatus === 'pending' ? 'Decline Order' : 'Cancel Order'}
          </Text>
        </Pressable>
      ) : null}

      {order.orderStatus !== 'pending' ? (
        <ReportProblemLink
          orderId={order._id}
          productName={order.productName}
          color="#5E9874"
        />
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
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    cancelOrderButton: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      marginTop: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: '#E5A3A3',
      backgroundColor: '#FFF6F6',
    },

    cancelOrderText: {
      color: '#C2413B',
      fontSize: 14,
      fontWeight: '800',
    },

    modalBackdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },

    modalCard: {
      width: '100%',
      maxWidth: 420,
      padding: 20,
      borderRadius: 20,
      backgroundColor: '#FFFFFF',
    },

    modalTitle: {
      color: '#2F3A33',
      fontSize: 18,
      fontWeight: '800',
    },

    modalText: {
      marginTop: 6,
      color: '#6F7A73',
      fontSize: 13,
      lineHeight: 19,
    },

    modalInput: {
      minHeight: 90,
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E3EAE5',
      color: '#2F3A33',
      fontSize: 14,
      textAlignVertical: 'top',
    },

    modalActions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },

    modalButton: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },

    modalButtonGhost: {
      borderWidth: 1.5,
      borderColor: '#5E9874',
    },

    modalButtonDanger: {
      backgroundColor: '#C2413B',
    },

    modalButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },

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
        13,
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
      paddingHorizontal: 12,
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
        13,
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
        11,
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
        13,
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
        12,
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
        11,
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
        11,
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
        12,
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
        13,
      fontWeight:
        '800',
    },

    preorderText: {
      marginTop:
        4,
      color:
        '#8C7C55',
      fontSize:
        12,
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
        12,
    },

    detailValue: {
      flex:
        1,
      textAlign:
        'right',
      color:
        '#4A574F',
      fontSize:
        12,
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
        11,
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
        11,
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
        12,
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
        13,
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
        13,
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
        13,
      fontWeight:
        '800',
    },

    successNoticeText: {
      marginTop:
        5,
      color:
        '#718078',
      fontSize:
        12,
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
        13,
      fontWeight:
        '800',
    },

    deliveryNoticeText: {
      marginTop:
        5,
      color:
        '#68808E',
      fontSize:
        12,
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
        13,
      fontWeight:
        '800',
    },

    cancelledNoticeText: {
      marginTop:
        5,
      color:
        '#986D6D',
      fontSize:
        12,
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
        13,
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
        13,
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
        13,
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
        12,
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
        11,
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