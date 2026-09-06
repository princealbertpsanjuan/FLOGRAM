import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  getCheckoutById,
  type CheckoutAddress,
  type CustomerCheckout,
} from "../../services/checkout";

import {
  cancelOrder,
  completeOrder,
  getOrderById,
  type CustomerOrder,
} from "../../services/orders";

import {
  getCustomerDeliveries,
  type Delivery,
} from "../../services/delivery";

import {
  getOrderReview,
  type OrderReviewStatus,
} from "../../services/review";

/*
 * =========================================================
 * API
 * =========================================================
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "";

const API_ORIGIN =
  API_URL
    .replace(
      /\/api\/v1\/?$/i,
      ""
    )
    .replace(
      /\/+$/,
      ""
    );

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type DetailedCheckout =
  Omit<
    CustomerCheckout,
    "orders"
  > & {
    orders: CustomerOrder[];
  };

type ScreenMode =
  | "checkout"
  | "order";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const resolveImageUrl = (
  image?: string | null
) => {
  if (!image) {
    return null;
  }

  const value =
    String(image).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    )
  ) {
    return value;
  }

  if (!API_ORIGIN) {
    return value;
  }

  return `${API_ORIGIN}/${value.replace(
    /^\/+/,
    ""
  )}`;
};

/*
 * =========================================================
 * MONEY
 * =========================================================
 */

const formatMoney = (
  amount?: number | null
) => {
  const value =
    Number(amount);

  if (
    !Number.isFinite(
      value
    )
  ) {
    return "₱0.00";
  }

  return `₱${value.toLocaleString(
    "en-PH",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )}`;
};

/*
 * =========================================================
 * STATUS
 * =========================================================
 */

const formatStatus = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

/*
 * =========================================================
 * DATE
 * =========================================================
 */

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "Not scheduled";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not scheduled";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "long",

      day: "numeric",

      year: "numeric",
    }
  );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Not available";
  }

  return date.toLocaleString(
    "en-PH",
    {
      month: "short",

      day: "numeric",

      year: "numeric",

      hour: "numeric",

      minute: "2-digit",
    }
  );
};

/*
 * =========================================================
 * PAYMENT
 * =========================================================
 */

const formatPaymentMethod = (
  value?: string | null
) => {
  switch (value) {
    case "cash_on_delivery":
      return "Cash on Delivery";

    case "cash_on_pickup":
      return "Cash on Pickup";

    case "paymongo":
      return "Online Payment";

    default:
      return formatStatus(
        value
      );
  }
};

/*
 * =========================================================
 * ADDRESS
 * =========================================================
 */

const formatAddress = (
  address?:
    | CheckoutAddress
    | CustomerOrder[
        "deliveryAddress"
      ]
) => {
  if (!address) {
    return "No delivery address.";
  }

  const location = [
    address.street,

    address.barangay,

    address.city,

    address.province,

    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  if (!location) {
    return "No delivery address.";
  }

  if (
    address.landmark
  ) {
    return `${location}\nLandmark: ${address.landmark}`;
  }

  return location;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

const getFloristName = (
  order: CustomerOrder
) => {
  const florist =
    order.florist;

  if (
    florist &&
    typeof florist ===
      "object"
  ) {
    return (
      florist.shopName ||
      "FLOGRAM Florist"
    );
  }

  return "FLOGRAM Florist";
};

/*
 * =========================================================
 * DELIVERY LOOKUP
 * =========================================================
 */

const getDeliveryOrderId = (
  delivery: Delivery
) => {
  if (
    typeof delivery.order ===
    "string"
  ) {
    return delivery.order;
  }

  return (
    delivery.order?._id ||
    ""
  );
};

const canTrackDelivery = (
  order: CustomerOrder,
  delivery?: Delivery
) => {
  return Boolean(
    order.fulfillmentType ===
      "delivery" &&
      delivery &&
      delivery.status !==
        "cancelled"
  );
};

const openDeliveryTracking = (
  orderId: string,
  deliveryId: string
) => {
  router.push({
    pathname:
      "/(customer)/customer-tracking",

    params: {
      orderId,
      deliveryId,
    },
  } as never);
};

const openOrderReview = (
  orderId: string
) => {
  router.push({
    pathname:
      "/(customer)/customer-review",

    params: {
      orderId,
    },
  } as never);
};

/*
 * =========================================================
 * ORDER STATUS COLORS
 * =========================================================
 */

const getStatusColors = (
  status?: string | null
) => {
  switch (status) {
    case "pending":
      return {
        background:
          "#FFF4DC",

        foreground:
          "#A56E15",

        icon:
          "time-outline" as const,
      };

    case "confirmed":
      return {
        background:
          "#EAF2FF",

        foreground:
          "#3973B8",

        icon:
          "checkmark-circle-outline" as const,
      };

    case "preparing":
      return {
        background:
          "#F3EAFC",

        foreground:
          "#7753A4",

        icon:
          "flower-outline" as const,
      };

    case "ready_for_delivery":
      return {
        background:
          "#E9F7F4",

        foreground:
          "#368475",

        icon:
          "bicycle-outline" as const,
      };

    case "ready_for_pickup":
      return {
        background:
          "#E9F7F4",

        foreground:
          "#368475",

        icon:
          "storefront-outline" as const,
      };

    case "out_for_delivery":
      return {
        background:
          "#E9F2FF",

        foreground:
          "#3F6FA8",

        icon:
          "navigate-outline" as const,
      };

    case "delivered":
    case "completed":
      return {
        background:
          "#EAF7EC",

        foreground:
          "#3D8750",

        icon:
          "checkmark-done-circle-outline" as const,
      };

    case "cancelled":
      return {
        background:
          "#FDEBED",

        foreground:
          "#B34D59",

        icon:
          "close-circle-outline" as const,
      };

    default:
      return {
        background:
          "#F1EEEE",

        foreground:
          "#696463",

        icon:
          "information-circle-outline" as const,
      };
  }
};

/*
 * =========================================================
 * CHECKOUT STATUS
 * =========================================================
 */

const getCheckoutDisplayStatus = (
  checkout: DetailedCheckout
) => {
  const orders =
    checkout.orders || [];

  if (
    orders.length ===
    0
  ) {
    return formatStatus(
      checkout.checkoutStatus
    );
  }

  const statuses =
    orders.map(
      (order) =>
        order.orderStatus
    );

  if (
    statuses.every(
      (status) =>
        status ===
        "cancelled"
    )
  ) {
    return "Cancelled";
  }

  if (
    statuses.every(
      (status) =>
        status ===
        "completed"
    )
  ) {
    return "Completed";
  }

  if (
    statuses.every(
      (status) =>
        status ===
          "delivered" ||
        status ===
          "completed"
    )
  ) {
    return "Delivered";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "out_for_delivery"
    )
  ) {
    return "Out for Delivery";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "ready_for_delivery"
    )
  ) {
    return "Ready for Delivery";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "ready_for_pickup"
    )
  ) {
    return "Ready for Pickup";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "preparing"
    )
  ) {
    return "Preparing";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "confirmed"
    )
  ) {
    return "Confirmed";
  }

  return "Pending";
};

const getCheckoutStatusColors =
  (
    checkout:
      DetailedCheckout
  ) => {
    const orders =
      checkout.orders || [];

    if (
      orders.length ===
      0
    ) {
      if (
        checkout.checkoutStatus ===
        "cancelled"
      ) {
        return getStatusColors(
          "cancelled"
        );
      }

      if (
        checkout.checkoutStatus ===
        "completed"
      ) {
        return getStatusColors(
          "completed"
        );
      }

      return getStatusColors(
        "pending"
      );
    }

    if (
      orders.some(
        (order) =>
          order.orderStatus ===
          "out_for_delivery"
      )
    ) {
      return getStatusColors(
        "out_for_delivery"
      );
    }

    if (
      orders.some(
        (order) =>
          order.orderStatus ===
          "ready_for_delivery"
      )
    ) {
      return getStatusColors(
        "ready_for_delivery"
      );
    }

    if (
      orders.some(
        (order) =>
          order.orderStatus ===
          "ready_for_pickup"
      )
    ) {
      return getStatusColors(
        "ready_for_pickup"
      );
    }

    if (
      orders.some(
        (order) =>
          order.orderStatus ===
          "preparing"
      )
    ) {
      return getStatusColors(
        "preparing"
      );
    }

    if (
      orders.some(
        (order) =>
          order.orderStatus ===
          "confirmed"
      )
    ) {
      return getStatusColors(
        "confirmed"
      );
    }

    if (
      orders.every(
        (order) =>
          order.orderStatus ===
          "cancelled"
      )
    ) {
      return getStatusColors(
        "cancelled"
      );
    }

    if (
      orders.every(
        (order) =>
          order.orderStatus ===
            "completed" ||
          order.orderStatus ===
            "delivered"
      )
    ) {
      return getStatusColors(
        "completed"
      );
    }

    return getStatusColors(
      "pending"
    );
  };

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerOrderDetailsScreen() {
  const params =
    useLocalSearchParams<{
      checkoutId?:
        | string
        | string[];

      orderId?:
        | string
        | string[];
    }>();

  const checkoutId =
    Array.isArray(
      params.checkoutId
    )
      ? params.checkoutId[0]
      : params.checkoutId;

  const orderId =
    Array.isArray(
      params.orderId
    )
      ? params.orderId[0]
      : params.orderId;

  const mode:
    ScreenMode =
    checkoutId
      ? "checkout"
      : "order";

  const [
    checkout,
    setCheckout,
  ] =
    useState<DetailedCheckout | null>(
      null
    );

  const [
    singleOrder,
    setSingleOrder,
  ] =
    useState<CustomerOrder | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionOrderId,
    setActionOrderId,
  ] = useState<
    string | null
  >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    deliveryByOrderId,
    setDeliveryByOrderId,
  ] = useState<
    Record<string, Delivery>
  >({});

  const [
    reviewByOrderId,
    setReviewByOrderId,
  ] = useState<
    Record<
      string,
      OrderReviewStatus
    >
  >({});

  const loadReviewStatuses =
    useCallback(
      async (
        targetOrders:
          CustomerOrder[]
      ) => {
        const completedOrders =
          targetOrders.filter(
            (order) =>
              order.orderStatus ===
              "completed"
          );

        if (
          completedOrders.length ===
          0
        ) {
          setReviewByOrderId(
            {}
          );

          return;
        }

        const results =
          await Promise.allSettled(
            completedOrders.map(
              async (order) => {
                const status =
                  await getOrderReview(
                    order._id
                  );

                return {
                  orderId:
                    order._id,

                  status,
                };
              }
            )
          );

        const lookup:
          Record<
            string,
            OrderReviewStatus
          > = {};

        results.forEach(
          (result) => {
            if (
              result.status ===
              "fulfilled"
            ) {
              lookup[
                result.value.orderId
              ] =
                result.value.status;
            }
          }
        );

        setReviewByOrderId(
          lookup
        );
      },
      []
    );

  /*
   * =======================================================
   * LOAD DATA
   * =======================================================
   */

  const loadDetails =
    useCallback(
      async (
        showLoader =
          true
      ) => {
        if (
          !checkoutId &&
          !orderId
        ) {
          setErrorMessage(
            "Order information was not provided."
          );

          setLoading(
            false
          );

          return;
        }

        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          setErrorMessage(
            ""
          );

          try {
            const deliveryResult =
              await getCustomerDeliveries();

            const deliveries =
              Array.isArray(
                deliveryResult.deliveries
              )
                ? deliveryResult.deliveries
                : [];

            const lookup:
              Record<
                string,
                Delivery
              > = {};

            deliveries.forEach(
              (delivery) => {
                const linkedOrderId =
                  getDeliveryOrderId(
                    delivery
                  );

                if (
                  !linkedOrderId
                ) {
                  return;
                }

                const existing =
                  lookup[
                    linkedOrderId
                  ];

                if (
                  !existing ||
                  existing.status ===
                    "cancelled"
                ) {
                  lookup[
                    linkedOrderId
                  ] =
                    delivery;
                }
              }
            );

            setDeliveryByOrderId(
              lookup
            );
          } catch (
            deliveryError
          ) {
            console.warn(
              "Unable to load customer deliveries:",
              deliveryError
            );

            setDeliveryByOrderId(
              {}
            );
          }

          if (
            checkoutId
          ) {
            const result =
              await getCheckoutById(
                checkoutId
              );

            const detailedCheckout =
              result as unknown as DetailedCheckout;

            setCheckout(
              detailedCheckout
            );

            setSingleOrder(
              null
            );

            await loadReviewStatuses(
              detailedCheckout.orders ||
                []
            );
          } else if (
            orderId
          ) {
            const result =
              await getOrderById(
                orderId
              );

            setSingleOrder(
              result
            );

            setCheckout(
              null
            );

            await loadReviewStatuses(
              [
                result,
              ]
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Failed to load order details:",
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load order details."
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
      [
        checkoutId,
        orderId,
        loadReviewStatuses,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      void loadDetails();
    }, [loadDetails])
  );

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

          await loadDetails(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadDetails]
    );

  /*
   * =======================================================
   * CANCEL
   * =======================================================
   */

  const performCancel =
    useCallback(
      async (
        targetOrderId:
          string
      ) => {
        try {
          setActionOrderId(
            targetOrderId
          );

          await cancelOrder(
            targetOrderId,
            "Cancelled by customer."
          );

          await loadDetails(
            false
          );

          Alert.alert(
            "Order Cancelled",
            "The order has been cancelled successfully."
          );
        } catch (
          error
        ) {
          console.error(
            "Cancel order error:",
            error
          );

          Alert.alert(
            "Unable to cancel order",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setActionOrderId(
            null
          );
        }
      },
      [loadDetails]
    );

  const handleCancel =
    useCallback(
      (
        targetOrderId:
          string
      ) => {
        Alert.alert(
          "Cancel Order?",
          "Are you sure you want to cancel this order?",
          [
            {
              text:
                "Keep Order",

              style:
                "cancel",
            },

            {
              text:
                "Cancel Order",

              style:
                "destructive",

              onPress:
                () => {
                  void performCancel(
                    targetOrderId
                  );
                },
            },
          ]
        );
      },
      [performCancel]
    );

  /*
   * =======================================================
   * COMPLETE
   * =======================================================
   */

  const performComplete =
    useCallback(
      async (
        targetOrderId:
          string
      ) => {
        try {
          setActionOrderId(
            targetOrderId
          );

          await completeOrder(
            targetOrderId
          );

          await loadDetails(
            false
          );

          Alert.alert(
            "Order Completed",
            "Thank you for confirming that you received your order. Would you like to review your FLOGRAM experience?",
            [
              {
                text:
                  "Maybe Later",

                style:
                  "cancel",
              },

              {
                text:
                  "Review Now",

                onPress:
                  () => {
                    openOrderReview(
                      targetOrderId
                    );
                  },
              },
            ]
          );
        } catch (
          error
        ) {
          console.error(
            "Complete order error:",
            error
          );

          Alert.alert(
            "Unable to complete order",
            error instanceof
              Error
              ? error.message
              : "Please try again."
          );
        } finally {
          setActionOrderId(
            null
          );
        }
      },
      [loadDetails]
    );

  const handleComplete =
    useCallback(
      (
        targetOrderId:
          string
      ) => {
        Alert.alert(
          "Confirm Order Received?",
          "Confirm that you have received this flower order.",
          [
            {
              text:
                "Not Yet",

              style:
                "cancel",
            },

            {
              text:
                "Confirm Received",

              onPress:
                () => {
                  void performComplete(
                    targetOrderId
                  );
                },
            },
          ]
        );
      },
      [performComplete]
    );

  /*
   * =======================================================
   * ORDERS
   * =======================================================
   */

  const orders =
    useMemo<
      CustomerOrder[]
    >(() => {
      if (
        mode ===
          "checkout" &&
        checkout
      ) {
        return (
          checkout.orders ||
          []
        );
      }

      if (
        singleOrder
      ) {
        return [
          singleOrder,
        ];
      }

      return [];
    }, [
      mode,
      checkout,
      singleOrder,
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
          styles.safeArea
        }
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

        <View
          style={
            styles.centerContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#D85D7A"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading order
            details...
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
    errorMessage &&
    !checkout &&
    !singleOrder
  ) {
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
              color="#33302F"
            />
          </Pressable>

          <Text
            style={
              styles.headerTitle
            }
          >
            Order Details
          </Text>

          <View
            style={
              styles.headerButton
            }
          />
        </View>

        <View
          style={
            styles.centerContainer
          }
        >
          <View
            style={
              styles.errorIcon
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={45}
              color="#D85D7A"
            />
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to load
            order
          </Text>

          <Text
            style={
              styles.errorDescription
            }
          >
            {
              errorMessage
            }
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              void loadDetails()
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
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * GROUPED CHECKOUT
   * =======================================================
   */

  if (
    mode ===
      "checkout" &&
    checkout
  ) {
    return (
      <CheckoutDetails
        checkout={
          checkout
        }
        refreshing={
          refreshing
        }
        onRefresh={
          handleRefresh
        }
        actionOrderId={
          actionOrderId
        }
        onCancel={
          handleCancel
        }
        onComplete={
          handleComplete
        }
        deliveryByOrderId={
          deliveryByOrderId
        }
        reviewByOrderId={
          reviewByOrderId
        }
      />
    );
  }

  /*
   * =======================================================
   * STANDALONE ORDER
   * =======================================================
   */

  if (
    singleOrder
  ) {
    return (
      <StandaloneOrderDetails
        order={
          singleOrder
        }
        refreshing={
          refreshing
        }
        onRefresh={
          handleRefresh
        }
        actionLoading={
          actionOrderId ===
          singleOrder._id
        }
        onCancel={() =>
          handleCancel(
            singleOrder._id
          )
        }
        onComplete={() =>
          handleComplete(
            singleOrder._id
          )
        }
        delivery={
          deliveryByOrderId[
            singleOrder._id
          ]
        }
        reviewStatus={
          reviewByOrderId[
            singleOrder._id
          ]
        }
      />
    );
  }

  if (
    orders.length ===
    0
  ) {
    return null;
  }

  return null;
}

/*
 * =========================================================
 * GROUPED CHECKOUT DETAILS
 * =========================================================
 */

function CheckoutDetails({
  checkout,
  refreshing,
  onRefresh,
  actionOrderId,
  onCancel,
  onComplete,
  deliveryByOrderId,
  reviewByOrderId,
}: {
  checkout:
    DetailedCheckout;

  refreshing:
    boolean;

  onRefresh:
    () => void;

  actionOrderId:
    string | null;

  onCancel:
    (
      orderId: string
    ) => void;

  onComplete:
    (
      orderId: string
    ) => void;

  deliveryByOrderId:
    Record<
      string,
      Delivery
    >;

  reviewByOrderId:
    Record<
      string,
      OrderReviewStatus
    >;
}) {
  const status =
    getCheckoutDisplayStatus(
      checkout
    );

  const statusColors =
    getCheckoutStatusColors(
      checkout
    );

  const totalQuantity =
    checkout.items.reduce(
      (
        total,
        item
      ) =>
        total +
        Number(
          item.quantity ||
            0
        ),
      0
    );

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
        <ScreenHeader
          title="Order Details"
          onRefresh={
            onRefresh
          }
        />

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
                onRefresh
              }
              tintColor="#D85D7A"
              colors={[
                "#D85D7A",
              ]}
            />
          }
        >
          <View
            style={[
              styles.statusCard,

              {
                backgroundColor:
                  statusColors.background,
              },
            ]}
          >
            <View
              style={[
                styles.statusIcon,

                {
                  backgroundColor:
                    `${statusColors.foreground}18`,
                },
              ]}
            >
              <Ionicons
                name={
                  statusColors.icon
                }
                size={27}
                color={
                  statusColors.foreground
                }
              />
            </View>

            <View
              style={
                styles.statusContent
              }
            >
              <Text
                style={[
                  styles.statusTitle,

                  {
                    color:
                      statusColors.foreground,
                  },
                ]}
              >
                {status}
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                Purchase #
                {checkout._id
                  .slice(-8)
                  .toUpperCase()}
              </Text>
            </View>
          </View>

          <SectionCard
            title="Purchase"
            icon="bag-handle-outline"
          >
            <InfoRow
              label="Order Count"
              value={`${checkout.orders.length}`}
            />

            <InfoRow
              label="Flower Items"
              value={`${checkout.items.length}`}
            />

            <InfoRow
              label="Total Quantity"
              value={`${totalQuantity}`}
            />

            <InfoRow
              label="Florists"
              value={`${checkout.shopBreakdown.length}`}
            />

            <InfoRow
              label="Order Placed"
              value={
                formatDateTime(
                  checkout.createdAt
                )
              }
              last
            />
          </SectionCard>

          <SectionTitle
            title="Orders in this Purchase"
            subtitle={
              checkout.orders.length ===
              1
                ? "1 flower order"
                : `${checkout.orders.length} flower orders`
            }
          />

          {checkout.orders.map(
            (
              order,
              index
            ) => (
              <ChildOrderCard
                key={
                  order._id
                }
                order={
                  order
                }
                number={
                  index + 1
                }
                loading={
                  actionOrderId ===
                  order._id
                }
                onCancel={() =>
                  onCancel(
                    order._id
                  )
                }
                onComplete={() =>
                  onComplete(
                    order._id
                  )
                }
                delivery={
                  deliveryByOrderId[
                    order._id
                  ]
                }
                reviewStatus={
                  reviewByOrderId[
                    order._id
                  ]
                }
              />
            )
          )}

          <SectionCard
            title={
              checkout.fulfillmentType ===
              "pickup"
                ? "Pickup Details"
                : "Delivery Details"
            }
            icon={
              checkout.fulfillmentType ===
              "pickup"
                ? "storefront-outline"
                : "location-outline"
            }
          >
            <InfoRow
              label="Method"
              value={
                checkout.fulfillmentType ===
                "pickup"
                  ? "Pickup"
                  : "Delivery"
              }
            />

            <InfoRow
              label="Recipient"
              value={
                checkout.recipientName ||
                "Not provided"
              }
            />

            <InfoRow
              label="Contact Number"
              value={
                checkout.recipientPhoneNumber ||
                "Not provided"
              }
              last={
                checkout.fulfillmentType ===
                "pickup"
              }
            />

            {checkout.fulfillmentType ===
            "delivery" ? (
              <View
                style={
                  styles.addressBlock
                }
              >
                <Text
                  style={
                    styles.infoLabel
                  }
                >
                  Address
                </Text>

                <Text
                  style={
                    styles.addressText
                  }
                >
                  {formatAddress(
                    checkout.deliveryAddress
                  )}
                </Text>
              </View>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Schedule"
            icon="calendar-outline"
          >
            <InfoRow
              label="Order Type"
              value={
                checkout.isPreOrder
                  ? "Pre-order"
                  : "Regular Order"
              }
            />

            <InfoRow
              label="Requested Date"
              value={
                checkout.requestedDeliveryDate
                  ? formatDate(
                      checkout.requestedDeliveryDate
                    )
                  : "As soon as possible"
              }
            />

            {checkout.requestedDeliveryTimeStart ||
            checkout.requestedDeliveryTimeEnd ? (
              <InfoRow
                label="Time"
                value={`${
                  checkout.requestedDeliveryTimeStart ||
                  "—"
                } - ${
                  checkout.requestedDeliveryTimeEnd ||
                  "—"
                }`}
              />
            ) : null}

            <InfoRow
              label="Pre-order Fee"
              value={
                formatMoney(
                  checkout.preOrderFee
                )
              }
              last
            />
          </SectionCard>

          <SectionCard
            title="Payment"
            icon="wallet-outline"
          >
            <InfoRow
              label="Payment Method"
              value={
                formatPaymentMethod(
                  checkout.paymentMethod
                )
              }
            />

            <InfoRow
              label="Payment Status"
              value={
                formatStatus(
                  checkout.paymentStatus
                )
              }
              valueColor={
                checkout.paymentStatus ===
                "paid"
                  ? "#3F8954"
                  : checkout.paymentStatus ===
                      "failed"
                    ? "#B34D59"
                    : undefined
              }
            />

            {checkout.paidAt ? (
              <InfoRow
                label="Paid At"
                value={
                  formatDateTime(
                    checkout.paidAt
                  )
                }
                last
              />
            ) : (
              <InfoRow
                label="Checkout Status"
                value={
                  formatStatus(
                    checkout.checkoutStatus
                  )
                }
                last
              />
            )}
          </SectionCard>

          <SectionCard
            title="Payment Summary"
            icon="receipt-outline"
          >
            <PriceRow
              label="Products Subtotal"
              value={
                formatMoney(
                  checkout.productsSubtotal
                )
              }
            />

            <PriceRow
              label="Delivery Fee"
              value={
                formatMoney(
                  checkout.deliveryFee
                )
              }
            />

            {checkout.preOrderFee >
            0 ? (
              <PriceRow
                label="Pre-order Fee"
                value={
                  formatMoney(
                    checkout.preOrderFee
                  )
                }
              />
            ) : null}

            <View
              style={
                styles.totalDivider
              }
            />

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
                {formatMoney(
                  checkout.totalAmount
                )}
              </Text>
            </View>
          </SectionCard>

          {checkout.shopBreakdown.length >
          0 ? (
            <SectionCard
              title="Shop Breakdown"
              icon="storefront-outline"
            >
              {checkout.shopBreakdown.map(
                (
                  shop,
                  index
                ) => (
                  <View
                    key={`${String(
                      typeof shop.florist ===
                        "object"
                        ? shop.florist._id
                        : shop.florist
                    )}-${index}`}
                    style={[
                      styles.shopRow,

                      index ===
                        checkout.shopBreakdown.length -
                          1 &&
                        styles.shopRowLast,
                    ]}
                  >
                    <View
                      style={
                        styles.shopLeft
                      }
                    >
                      <View
                        style={
                          styles.shopIcon
                        }
                      >
                        <Ionicons
                          name="storefront-outline"
                          size={17}
                          color="#D45B77"
                        />
                      </View>

                      <View
                        style={
                          styles.shopTextContainer
                        }
                      >
                        <Text
                          style={
                            styles.shopName
                          }
                        >
                          {
                            shop.shopName
                          }
                        </Text>

                        <Text
                          style={
                            styles.shopMeta
                          }
                        >
                          {shop.itemCount}{" "}
                          {shop.itemCount ===
                          1
                            ? "item"
                            : "items"}{" "}
                          • Qty{" "}
                          {
                            shop.totalQuantity
                          }
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={
                        styles.shopTotal
                      }
                    >
                      {formatMoney(
                        shop.totalAmount
                      )}
                    </Text>
                  </View>
                )
              )}
            </SectionCard>
          ) : null}

          {checkout.customerNotes ? (
            <SectionCard
              title="Notes"
              icon="document-text-outline"
            >
              <Text
                style={
                  styles.notesText
                }
              >
                {
                  checkout.customerNotes
                }
              </Text>
            </SectionCard>
          ) : null}

          <View
            style={{
              height: 35,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * STANDALONE ORDER DETAILS
 * =========================================================
 */

function StandaloneOrderDetails({
  order,
  refreshing,
  onRefresh,
  actionLoading,
  onCancel,
  onComplete,
  delivery,
  reviewStatus,
}: {
  order: CustomerOrder;

  refreshing: boolean;

  onRefresh: () => void;

  actionLoading: boolean;

  onCancel: () => void;

  onComplete: () => void;

  delivery?: Delivery;

  reviewStatus?:
    OrderReviewStatus;
}) {
  const colors =
    getStatusColors(
      order.orderStatus
    );

  const imageUrl =
    resolveImageUrl(
      order.inspirationImage
    );

  const canCancel =
    [
      "pending",
      "confirmed",
    ].includes(
      order.orderStatus
    ) &&
    !(
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus ===
        "paid"
    );

  const canComplete =
    order.orderStatus ===
      "delivered" &&
    order.paymentStatus ===
      "paid";

  const canTrack =
    canTrackDelivery(
      order,
      delivery
    );

  const isCompleted =
    order.orderStatus ===
    "completed";

  const isReviewed =
    reviewStatus?.reviewed ===
    true;

  const canReview =
    isCompleted &&
    reviewStatus?.canReview ===
      true &&
    !isReviewed;

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
        <ScreenHeader
          title="Order Details"
          onRefresh={
            onRefresh
          }
        />

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
                onRefresh
              }
              tintColor="#D85D7A"
              colors={[
                "#D85D7A",
              ]}
            />
          }
        >
          <View
            style={[
              styles.statusCard,

              {
                backgroundColor:
                  colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.statusIcon,

                {
                  backgroundColor:
                    `${colors.foreground}18`,
                },
              ]}
            >
              <Ionicons
                name={
                  colors.icon
                }
                size={27}
                color={
                  colors.foreground
                }
              />
            </View>

            <View
              style={
                styles.statusContent
              }
            >
              <Text
                style={[
                  styles.statusTitle,

                  {
                    color:
                      colors.foreground,
                  },
                ]}
              >
                {formatStatus(
                  order.orderStatus
                )}
              </Text>

              <Text
                style={
                  styles.statusDescription
                }
              >
                Order #
                {order._id
                  .slice(-8)
                  .toUpperCase()}
              </Text>
            </View>
          </View>

          <SectionCard
            title="Your Bouquet"
            icon="flower-outline"
          >
            <View
              style={
                styles.productRow
              }
            >
              <View
                style={
                  styles.productImageContainer
                }
              >
                {imageUrl ? (
                  <Image
                    source={{
                      uri:
                        imageUrl,
                    }}
                    style={
                      styles.productImage
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.productPlaceholder
                    }
                  >
                    <Ionicons
                      name="flower-outline"
                      size={35}
                      color="#D89AAA"
                    />
                  </View>
                )}
              </View>

              <View
                style={
                  styles.productContent
                }
              >
                <Text
                  style={
                    styles.floristName
                  }
                >
                  {getFloristName(
                    order
                  )}
                </Text>

                <Text
                  style={
                    styles.productName
                  }
                >
                  {order.productName ||
                    "Bouquet Order"}
                </Text>

                <Text
                  style={
                    styles.sourceText
                  }
                >
                  {order.sourceType ===
                  "custom_bouquet"
                    ? "Custom Bouquet"
                    : "Flower Listing"}
                </Text>

                <Text
                  style={
                    styles.priceText
                  }
                >
                  {formatMoney(
                    order.unitPrice
                  )}{" "}
                  ×{" "}
                  {order.quantity ||
                    1}
                </Text>
              </View>
            </View>

            {order.productDescription ? (
              <Text
                style={
                  styles.productDescription
                }
              >
                {
                  order.productDescription
                }
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard
            title={
              order.fulfillmentType ===
              "pickup"
                ? "Pickup Details"
                : "Delivery Details"
            }
            icon={
              order.fulfillmentType ===
              "pickup"
                ? "storefront-outline"
                : "location-outline"
            }
          >
            <InfoRow
              label="Method"
              value={
                order.fulfillmentType ===
                "pickup"
                  ? "Pickup"
                  : "Delivery"
              }
            />

            {order.fulfillmentType !==
            "pickup" ? (
              <>
                <InfoRow
                  label="Recipient"
                  value={
                    order.recipientName ||
                    "Not provided"
                  }
                />

                <InfoRow
                  label="Contact Number"
                  value={
                    order.recipientPhoneNumber ||
                    "Not provided"
                  }
                />

                <View
                  style={
                    styles.addressBlock
                  }
                >
                  <Text
                    style={
                      styles.infoLabel
                    }
                  >
                    Address
                  </Text>

                  <Text
                    style={
                      styles.addressText
                    }
                  >
                    {formatAddress(
                      order.deliveryAddress
                    )}
                  </Text>
                </View>
              </>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Schedule"
            icon="calendar-outline"
          >
            <InfoRow
              label="Order Type"
              value={
                order.isPreOrder
                  ? "Pre-order"
                  : "Regular Order"
              }
            />

            <InfoRow
              label="Requested Date"
              value={
                order.requestedDeliveryDate
                  ? formatDate(
                      order.requestedDeliveryDate
                    )
                  : "As soon as possible"
              }
            />

            {order.requestedDeliveryTimeStart ||
            order.requestedDeliveryTimeEnd ? (
              <InfoRow
                label="Time"
                value={`${
                  order.requestedDeliveryTimeStart ||
                  "—"
                } - ${
                  order.requestedDeliveryTimeEnd ||
                  "—"
                }`}
              />
            ) : null}

            <InfoRow
              label="Order Placed"
              value={
                formatDateTime(
                  order.createdAt
                )
              }
              last
            />
          </SectionCard>

          <SectionCard
            title="Payment"
            icon="wallet-outline"
          >
            <InfoRow
              label="Payment Method"
              value={
                formatPaymentMethod(
                  order.paymentMethod
                )
              }
            />

            <InfoRow
              label="Payment Status"
              value={
                formatStatus(
                  order.paymentStatus
                )
              }
              valueColor={
                order.paymentStatus ===
                "paid"
                  ? "#3F8954"
                  : undefined
              }
              last
            />
          </SectionCard>

          <SectionCard
            title="Order Summary"
            icon="receipt-outline"
          >
            <PriceRow
              label="Subtotal"
              value={
                formatMoney(
                  order.subtotal
                )
              }
            />

            <PriceRow
              label="Delivery Fee"
              value={
                formatMoney(
                  order.deliveryFee
                )
              }
            />

            {(order.preOrderFee ||
              0) >
            0 ? (
              <PriceRow
                label="Pre-order Fee"
                value={
                  formatMoney(
                    order.preOrderFee
                  )
                }
              />
            ) : null}

            <View
              style={
                styles.totalDivider
              }
            />

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
                {formatMoney(
                  order.totalAmount
                )}
              </Text>
            </View>
          </SectionCard>

          {order.customerNotes ? (
            <SectionCard
              title="Notes"
              icon="document-text-outline"
            >
              <Text
                style={
                  styles.notesText
                }
              >
                {
                  order.customerNotes
                }
              </Text>
            </SectionCard>
          ) : null}

          {order.orderStatus ===
          "cancelled" ? (
            <CancelledCard
              order={
                order
              }
            />
          ) : null}

          {canTrack &&
          delivery ? (
            <Pressable
              style={
                styles.trackButton
              }
              onPress={() =>
                openDeliveryTracking(
                  order._id,
                  delivery._id
                )
              }
            >
              <Ionicons
                name="navigate-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.trackButtonText
                }
              >
                Track Delivery
              </Text>
            </Pressable>
          ) : null}

          {canComplete ? (
            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                onComplete
              }
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Confirm Order
                    Received
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {isCompleted &&
          isReviewed ? (
            <Pressable
              style={
                styles.reviewedButton
              }
              onPress={() =>
                openOrderReview(
                  order._id
                )
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#3F8954"
              />

              <Text
                style={
                  styles.reviewedButtonText
                }
              >
                Reviewed · View Review
              </Text>
            </Pressable>
          ) : null}

          {canReview ? (
            <Pressable
              style={
                styles.reviewButton
              }
              onPress={() =>
                openOrderReview(
                  order._id
                )
              }
            >
              <Ionicons
                name="star-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.reviewButtonText
                }
              >
                Leave a Review
              </Text>
            </Pressable>
          ) : null}

          {canCancel ? (
            <Pressable
              style={
                styles.cancelButton
              }
              onPress={
                onCancel
              }
              disabled={
                actionLoading
              }
            >
              {actionLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#B64F62"
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={19}
                    color="#B64F62"
                  />

                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel Order
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          <View
            style={{
              height: 35,
            }}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * CHILD ORDER CARD
 * =========================================================
 */

function ChildOrderCard({
  order,
  number,
  loading,
  onCancel,
  onComplete,
  delivery,
  reviewStatus,
}: {
  order: CustomerOrder;

  number: number;

  loading: boolean;

  onCancel: () => void;

  onComplete: () => void;

  delivery?: Delivery;

  reviewStatus?:
    OrderReviewStatus;
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(
    false
  );

  const imageUrl =
    resolveImageUrl(
      order.inspirationImage
    );

  const colors =
    getStatusColors(
      order.orderStatus
    );

  const canCancel =
    [
      "pending",
      "confirmed",
    ].includes(
      order.orderStatus
    ) &&
    !(
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus ===
        "paid"
    );

  const canComplete =
    order.orderStatus ===
      "delivered" &&
    order.paymentStatus ===
      "paid";

  const canTrack =
    canTrackDelivery(
      order,
      delivery
    );

  const isCompleted =
    order.orderStatus ===
    "completed";

  const isReviewed =
    reviewStatus?.reviewed ===
    true;

  const canReview =
    isCompleted &&
    reviewStatus?.canReview ===
      true &&
    !isReviewed;

  return (
    <View
      style={
        styles.childOrderCard
      }
    >
      <View
        style={
          styles.childOrderHeader
        }
      >
        <View>
          <Text
            style={
              styles.childOrderNumber
            }
          >
            ORDER{" "}
            {number}
          </Text>

          <Text
            style={
              styles.childOrderReference
            }
          >
            #
            {order._id
              .slice(-8)
              .toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.smallStatusBadge,

            {
              backgroundColor:
                colors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.smallStatusText,

              {
                color:
                  colors.foreground,
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
          styles.childDivider
        }
      />

      <View
        style={
          styles.childProductRow
        }
      >
        <View
          style={
            styles.childImageContainer
          }
        >
          {imageUrl ? (
            <Image
              source={{
                uri:
                  imageUrl,
              }}
              style={
                styles.productImage
              }
            />
          ) : (
            <View
              style={
                styles.productPlaceholder
              }
            >
              <Ionicons
                name="flower-outline"
                size={26}
                color="#D89AAA"
              />
            </View>
          )}
        </View>

        <View
          style={
            styles.childProductContent
          }
        >
          <Text
            style={
              styles.floristName
            }
          >
            {getFloristName(
              order
            )}
          </Text>

          <Text
            style={
              styles.childProductName
            }
            numberOfLines={
              2
            }
          >
            {order.productName ||
              "Bouquet Order"}
          </Text>

          <Text
            style={
              styles.childQuantity
            }
          >
            Qty:{" "}
            {order.quantity ||
              1}
          </Text>
        </View>

        <Text
          style={
            styles.childPrice
          }
        >
          {formatMoney(
            order.totalAmount
          )}
        </Text>
      </View>

      <View
        style={
          styles.childPaymentRow
        }
      >
        <View
          style={
            styles.childPaymentItem
          }
        >
          <Ionicons
            name="wallet-outline"
            size={15}
            color="#8D8583"
          />

          <Text
            style={
              styles.childPaymentText
            }
          >
            {formatStatus(
              order.paymentStatus
            )}
          </Text>
        </View>

        <Pressable
          style={
            styles.expandButton
          }
          onPress={() =>
            setExpanded(
              (
                current
              ) =>
                !current
            )
          }
        >
          <Text
            style={
              styles.expandButtonText
            }
          >
            {expanded
              ? "Hide Details"
              : "View Details"}
          </Text>

          <Ionicons
            name={
              expanded
                ? "chevron-up"
                : "chevron-down"
            }
            size={16}
            color="#D25A76"
          />
        </Pressable>
      </View>

      {expanded ? (
        <View
          style={
            styles.expandedContent
          }
        >
          <InfoRow
            label="Subtotal"
            value={
              formatMoney(
                order.subtotal
              )
            }
          />

          <InfoRow
            label="Delivery Fee"
            value={
              formatMoney(
                order.deliveryFee
              )
            }
          />

          <InfoRow
            label="Pre-order Fee"
            value={
              formatMoney(
                order.preOrderFee
              )
            }
          />

          <InfoRow
            label="Payment"
            value={
              formatPaymentMethod(
                order.paymentMethod
              )
            }
          />

          {order.isPreOrder ? (
            <InfoRow
              label="Delivery Date"
              value={
                formatDate(
                  order.requestedDeliveryDate
                )
              }
            />
          ) : null}

          <InfoRow
            label="Current Status"
            value={
              formatStatus(
                order.orderStatus
              )
            }
            last
          />

          {order.orderStatus ===
          "cancelled" ? (
            <CancelledCard
              order={
                order
              }
            />
          ) : null}

          {canTrack &&
          delivery ? (
            <Pressable
              style={
                styles.smallTrackButton
              }
              onPress={() =>
                openDeliveryTracking(
                  order._id,
                  delivery._id
                )
              }
            >
              <Ionicons
                name="navigate-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.smallTrackButtonText
                }
              >
                Track Delivery
              </Text>
            </Pressable>
          ) : null}

          {canComplete ? (
            <Pressable
              style={
                styles.smallPrimaryButton
              }
              onPress={
                onComplete
              }
              disabled={
                loading
              }
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.smallPrimaryButtonText
                    }
                  >
                    Confirm Received
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {isCompleted &&
          isReviewed ? (
            <Pressable
              style={
                styles.smallReviewedButton
              }
              onPress={() =>
                openOrderReview(
                  order._id
                )
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#3F8954"
              />

              <Text
                style={
                  styles.smallReviewedButtonText
                }
              >
                Reviewed · View Review
              </Text>
            </Pressable>
          ) : null}

          {canReview ? (
            <Pressable
              style={
                styles.smallReviewButton
              }
              onPress={() =>
                openOrderReview(
                  order._id
                )
              }
            >
              <Ionicons
                name="star-outline"
                size={18}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.smallReviewButtonText
                }
              >
                Leave a Review
              </Text>
            </Pressable>
          ) : null}

          {canCancel ? (
            <Pressable
              style={
                styles.smallCancelButton
              }
              onPress={
                onCancel
              }
              disabled={
                loading
              }
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#B64F62"
                />
              ) : (
                <>
                  <Ionicons
                    name="close-circle-outline"
                    size={17}
                    color="#B64F62"
                  />

                  <Text
                    style={
                      styles.smallCancelButtonText
                    }
                  >
                    Cancel Order
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * CANCELLED CARD
 * =========================================================
 */

function CancelledCard({
  order,
}: {
  order: CustomerOrder;
}) {
  return (
    <View
      style={
        styles.cancelledCard
      }
    >
      <Ionicons
        name="close-circle-outline"
        size={21}
        color="#B24E5C"
      />

      <View
        style={
          styles.cancelledContent
        }
      >
        <Text
          style={
            styles.cancelledTitle
          }
        >
          Order Cancelled
        </Text>

        {order.cancellationReason ? (
          <Text
            style={
              styles.cancelledReason
            }
          >
            {
              order.cancellationReason
            }
          </Text>
        ) : null}

        {order.cancelledAt ? (
          <Text
            style={
              styles.cancelledDate
            }
          >
            {formatDateTime(
              order.cancelledAt
            )}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/*
 * =========================================================
 * HEADER
 * =========================================================
 */

function ScreenHeader({
  title,
  onRefresh,
}: {
  title: string;

  onRefresh:
    () => void;
}) {
  return (
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
          color="#33302F"
        />
      </Pressable>

      <Text
        style={
          styles.headerTitle
        }
      >
        {title}
      </Text>

      <Pressable
        style={
          styles.headerButton
        }
        onPress={
          onRefresh
        }
      >
        <Ionicons
          name="refresh-outline"
          size={21}
          color="#77706E"
        />
      </Pressable>
    </View>
  );
}

/*
 * =========================================================
 * SECTION TITLE
 * =========================================================
 */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;

  subtitle?:
    string;
}) {
  return (
    <View
      style={
        styles.sectionTitleContainer
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * SECTION CARD
 * =========================================================
 */

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;

  icon:
    React.ComponentProps<
      typeof Ionicons
    >["name"];

  children:
    ReactNode;
}) {
  return (
    <View
      style={
        styles.sectionCard
      }
    >
      <View
        style={
          styles.sectionCardHeader
        }
      >
        <View
          style={
            styles.sectionIcon
          }
        >
          <Ionicons
            name={icon}
            size={18}
            color="#D25A76"
          />
        </View>

        <Text
          style={
            styles.sectionCardTitle
          }
        >
          {title}
        </Text>
      </View>

      <View
        style={
          styles.sectionCardContent
        }
      >
        {children}
      </View>
    </View>
  );
}

/*
 * =========================================================
 * INFO ROW
 * =========================================================
 */

function InfoRow({
  label,
  value,
  last,
  valueColor,
}: {
  label: string;

  value: string;

  last?: boolean;

  valueColor?:
    string;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        last &&
          styles.infoRowLast,
      ]}
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,

          valueColor
            ? {
                color:
                  valueColor,
              }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * PRICE ROW
 * =========================================================
 */

function PriceRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.priceRow
      }
    >
      <Text
        style={
          styles.priceLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.priceValue
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
    safeArea: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",
    },

    screen: {
      flex: 1,

      backgroundColor:
        "#F8F6F5",
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding:
        16,

      paddingBottom:
        40,
    },

    centerContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal:
        28,

      backgroundColor:
        "#F8F6F5",
    },

    /*
     * HEADER
     */

    header: {
      minHeight: 64,

      paddingHorizontal:
        12,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#E7E1DF",
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

    headerTitle: {
      flex: 1,

      textAlign:
        "center",

      fontSize: 18,

      fontWeight:
        "800",

      color:
        "#332E2D",
    },

    /*
     * LOADING / ERROR
     */

    loadingText: {
      marginTop:
        13,

      fontSize:
        13,

      color:
        "#827A78",
    },

    errorIcon: {
      width:
        90,

      height:
        90,

      borderRadius:
        45,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    errorTitle: {
      marginTop:
        16,

      fontSize:
        20,

      fontWeight:
        "800",

      color:
        "#3B3533",
    },

    errorDescription: {
      marginTop:
        8,

      textAlign:
        "center",

      fontSize:
        12,

      lineHeight:
        18,

      color:
        "#8C8482",
    },

    retryButton: {
      marginTop:
        20,

      minHeight:
        44,

      paddingHorizontal:
        20,

      borderRadius:
        13,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#D85D7A",
    },

    retryText: {
      fontSize:
        12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    /*
     * STATUS
     */

    statusCard: {
      padding:
        16,

      borderRadius:
        18,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom:
        14,
    },

    statusIcon: {
      width:
        48,

      height:
        48,

      borderRadius:
        24,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    statusContent: {
      flex: 1,

      marginLeft:
        12,
    },

    statusTitle: {
      fontSize:
        16,

      fontWeight:
        "900",
    },

    statusDescription: {
      marginTop:
        3,

      fontSize:
        10,

      color:
        "#857D7B",
    },

    /*
     * SECTION
     */

    sectionTitleContainer: {
      marginTop:
        6,

      marginBottom:
        9,

      paddingHorizontal:
        2,
    },

    sectionTitle: {
      fontSize:
        16,

      fontWeight:
        "900",

      color:
        "#332E2D",
    },

    sectionSubtitle: {
      marginTop:
        2,

      fontSize:
        10,

      color:
        "#918987",
    },

    sectionCard: {
      marginBottom:
        13,

      borderRadius:
        18,

      borderWidth:
        1,

      borderColor:
        "#E9E3E1",

      overflow:
        "hidden",

      backgroundColor:
        "#FFFFFF",
    },

    sectionCardHeader: {
      minHeight:
        52,

      paddingHorizontal:
        14,

      flexDirection:
        "row",

      alignItems:
        "center",

      borderBottomWidth:
        1,

      borderBottomColor:
        "#F0EBE9",
    },

    sectionIcon: {
      width:
        33,

      height:
        33,

      borderRadius:
        11,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F4",
    },

    sectionCardTitle: {
      marginLeft:
        10,

      fontSize:
        13,

      fontWeight:
        "800",

      color:
        "#433C3A",
    },

    sectionCardContent: {
      paddingHorizontal:
        14,

      paddingVertical:
        8,
    },

    /*
     * INFO
     */

    infoRow: {
      minHeight:
        44,

      paddingVertical:
        9,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EDE7E5",

      gap:
        12,
    },

    infoRowLast: {
      borderBottomWidth:
        0,
    },

    infoLabel: {
      flex:
        1,

      fontSize:
        11,

      color:
        "#8B8381",
    },

    infoValue: {
      flex:
        1.45,

      fontSize:
        11,

      lineHeight:
        16,

      fontWeight:
        "700",

      color:
        "#4F4846",

      textAlign:
        "right",
    },

    addressBlock: {
      paddingVertical:
        12,
    },

    addressText: {
      marginTop:
        5,

      fontSize:
        11,

      lineHeight:
        17,

      fontWeight:
        "600",

      color:
        "#554E4C",
    },

    /*
     * CHILD ORDER CARD
     */

    childOrderCard: {
      marginBottom:
        13,

      padding:
        14,

      borderRadius:
        18,

      borderWidth:
        1,

      borderColor:
        "#E9E3E1",

      backgroundColor:
        "#FFFFFF",
    },

    childOrderHeader: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },

    childOrderNumber: {
      fontSize:
        9,

      fontWeight:
        "900",

      letterSpacing:
        0.7,

      color:
        "#A19794",
    },

    childOrderReference: {
      marginTop:
        2,

      fontSize:
        11,

      fontWeight:
        "800",

      color:
        "#554E4B",
    },

    smallStatusBadge: {
      paddingHorizontal:
        9,

      paddingVertical:
        5,

      borderRadius:
        10,
    },

    smallStatusText: {
      fontSize:
        9,

      fontWeight:
        "800",
    },

    childDivider: {
      height:
        1,

      marginVertical:
        12,

      backgroundColor:
        "#F0EAE8",
    },

    childProductRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    childImageContainer: {
      width:
        66,

      height:
        66,

      borderRadius:
        13,

      overflow:
        "hidden",

      backgroundColor:
        "#FAEDF0",
    },

    childProductContent: {
      flex:
        1,

      marginLeft:
        10,

      marginRight:
        8,
    },

    childProductName: {
      marginTop:
        2,

      fontSize:
        13,

      lineHeight:
        17,

      fontWeight:
        "800",

      color:
        "#373130",
    },

    childQuantity: {
      marginTop:
        5,

      fontSize:
        9,

      color:
        "#928A87",
    },

    childPrice: {
      fontSize:
        12,

      fontWeight:
        "900",

      color:
        "#D15471",
    },

    childPaymentRow: {
      marginTop:
        12,

      paddingTop:
        10,

      borderTopWidth:
        1,

      borderTopColor:
        "#F0EAE8",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    childPaymentItem: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    childPaymentText: {
      fontSize:
        10,

      color:
        "#7D7573",
    },

    expandButton: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 3,

      paddingVertical:
        5,
    },

    expandButtonText: {
      fontSize:
        10,

      fontWeight:
        "800",

      color:
        "#D25A76",
    },

    expandedContent: {
      marginTop:
        12,

      paddingTop:
        5,

      borderTopWidth:
        1,

      borderTopColor:
        "#F0EAE8",
    },

    smallTrackButton: {
      minHeight:
        45,

      marginTop:
        12,

      borderRadius:
        13,

      backgroundColor:
        "#5274A3",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    smallTrackButtonText: {
      fontSize:
        12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    smallPrimaryButton: {
      minHeight:
        45,

      marginTop:
        12,

      borderRadius:
        13,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    smallPrimaryButtonText: {
      fontSize:
        12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    smallReviewButton: {
      minHeight: 45,

      marginTop: 9,

      borderRadius:
        13,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    smallReviewButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    smallReviewedButton: {
      minHeight: 45,

      marginTop: 9,

      borderRadius:
        13,

      borderWidth: 1,

      borderColor:
        "#CFE8D6",

      backgroundColor:
        "#EDF8F0",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    smallReviewedButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#3F8954",
    },

    smallCancelButton: {
      minHeight: 45,

      marginTop: 9,

      borderRadius:
        13,

      borderWidth: 1,

      borderColor:
        "#E8BBC4",

      backgroundColor:
        "#FFF7F8",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    smallCancelButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#B64F62",
    },

    /*
     * PRODUCT
     */

    productRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    productImageContainer: {
      width: 90,

      height: 90,

      borderRadius:
        15,

      overflow:
        "hidden",

      backgroundColor:
        "#F8EFF1",
    },

    productImage: {
      width:
        "100%",

      height:
        "100%",
    },

    productPlaceholder: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAEDF0",
    },

    productContent: {
      flex: 1,

      marginLeft:
        12,
    },

    floristName: {
      fontSize:
        10,

      fontWeight:
        "700",

      color:
        "#D05A75",
    },

    productName: {
      marginTop:
        3,

      fontSize:
        15,

      lineHeight:
        19,

      fontWeight:
        "800",

      color:
        "#373130",
    },

    sourceText: {
      marginTop:
        4,

      fontSize:
        10,

      color:
        "#958D8B",
    },

    priceText: {
      marginTop:
        7,

      fontSize:
        13,

      fontWeight:
        "800",

      color:
        "#D15471",
    },

    productDescription: {
      marginTop:
        13,

      paddingTop:
        12,

      borderTopWidth:
        1,

      borderTopColor:
        "#F0EBE9",

      fontSize:
        12,

      lineHeight:
        18,

      color:
        "#77706E",
    },

    /*
     * PRICE
     */

    priceRow: {
      paddingVertical:
        6,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },

    priceLabel: {
      fontSize:
        12,

      color:
        "#807875",
    },

    priceValue: {
      fontSize:
        12,

      fontWeight:
        "700",

      color:
        "#4D4745",
    },

    totalDivider: {
      height:
        1,

      marginVertical:
        10,

      backgroundColor:
        "#EBE5E3",
    },

    totalRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    totalLabel: {
      fontSize:
        15,

      fontWeight:
        "800",

      color:
        "#373130",
    },

    totalValue: {
      fontSize:
        20,

      fontWeight:
        "900",

      color:
        "#D15471",
    },

    /*
     * SHOP
     */

    shopRow: {
      paddingVertical:
        11,

      borderBottomWidth:
        1,

      borderBottomColor:
        "#F1ECEA",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    shopRowLast: {
      borderBottomWidth:
        0,
    },

    shopLeft: {
      flex:
        1,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    shopIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        12,

      backgroundColor:
        "#FFF0F4",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    shopTextContainer: {
      flex:
        1,

      marginLeft:
        10,

      marginRight:
        8,
    },

    shopName: {
      fontSize:
        12,

      fontWeight:
        "800",

      color:
        "#463F3D",
    },

    shopMeta: {
      marginTop:
        2,

      fontSize:
        10,

      color:
        "#948C8A",
    },

    shopTotal: {
      fontSize:
        12,

      fontWeight:
        "800",

      color:
        "#D15471",
    },

    notesText: {
      fontSize:
        12,

      lineHeight:
        19,

      color:
        "#5F5856",
    },

    /*
     * CANCELLED
     */

    cancelledCard: {
      padding:
        14,

      marginTop:
        12,

      borderRadius:
        15,

      backgroundColor:
        "#FFF0F2",

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 9,
    },

    cancelledContent: {
      flex: 1,
    },

    cancelledTitle: {
      fontSize:
        13,

      fontWeight:
        "800",

      color:
        "#B24E5C",
    },

    cancelledReason: {
      marginTop:
        3,

      fontSize:
        11,

      lineHeight:
        17,

      color:
        "#93656D",
    },

    cancelledDate: {
      marginTop:
        4,

      fontSize:
        9,

      color:
        "#A87A81",
    },

    /*
     * ACTIONS
     */

    trackButton: {
      minHeight:
        50,

      borderRadius:
        15,

      backgroundColor:
        "#5274A3",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginBottom:
        10,
    },

    trackButtonText: {
      fontSize:
        14,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    primaryButton: {
      minHeight:
        50,

      borderRadius:
        15,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginBottom:
        10,
    },

    primaryButtonText: {
      fontSize:
        14,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    reviewButton: {
      minHeight: 50,

      borderRadius:
        15,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginBottom:
        10,
    },

    reviewButtonText: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    reviewedButton: {
      minHeight: 50,

      borderRadius:
        15,

      borderWidth: 1,

      borderColor:
        "#CFE8D6",

      backgroundColor:
        "#EDF8F0",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      marginBottom:
        10,
    },

    reviewedButtonText: {
      fontSize: 14,

      fontWeight:
        "800",

      color:
        "#3F8954",
    },

    cancelButton: {
      minHeight:
        48,

      borderRadius:
        15,

      borderWidth:
        1,

      borderColor:
        "#E8BBC4",

      backgroundColor:
        "#FFF7F8",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap:
        7,
    },

    cancelButtonText: {
      fontSize:
        13,

      fontWeight:
        "800",

      color:
        "#B64F62",
    },
  });