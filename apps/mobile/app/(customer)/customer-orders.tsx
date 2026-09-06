import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useFocusEffect,
} from "expo-router";
import {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
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
  getMyCheckouts,
  type CheckoutOrder,
  type CustomerCheckout,
} from "../../services/checkout";

import {
  getMyOrders,
  type CustomerOrder,
} from "../../services/orders";

import {
  getOrderReview,
  type OrderReviewStatus,
} from "../../services/review";

/*
 * =========================================================
 * API IMAGE URL
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

type FilterType =
  | "all"
  | "active"
  | "completed"
  | "cancelled";

type OrderCategory =
  | "active"
  | "completed"
  | "cancelled";

type CustomerPurchaseEntry =
  | {
      type: "checkout";

      id: string;

      createdAt: string;

      category: OrderCategory;

      checkout: CustomerCheckout;
    }
  | {
      type: "order";

      id: string;

      createdAt: string;

      category: OrderCategory;

      order: CustomerOrder;
    };

/*
 * =========================================================
 * GENERAL HELPERS
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
 * DATE
 * =========================================================
 */

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "No date";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No date";
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",

      day: "numeric",

      year: "numeric",
    }
  );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "No date";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "No date";
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
 * STATUS
 * =========================================================
 */

const formatStatus = (
  value?: string | null
) => {
  if (!value) {
    return "Unknown";
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
 * CHECKOUT ORDER HELPERS
 * =========================================================
 */

const getCheckoutOrders = (
  checkout: CustomerCheckout
): CheckoutOrder[] => {
  if (
    !Array.isArray(
      checkout.orders
    )
  ) {
    return [];
  }

  return checkout.orders.filter(
    (
      order
    ): order is CheckoutOrder =>
      Boolean(
        order &&
          typeof order ===
            "object" &&
          "_id" in order
      )
  );
};

/*
 * =========================================================
 * CHECKOUT CHILD ORDER IDS
 * =========================================================
 */

const getCheckoutChildOrderIds =
  (
    checkout:
      CustomerCheckout
  ) => {
    const ids =
      new Set<string>();

    /*
     * Populated checkout.orders
     */

    if (
      Array.isArray(
        checkout.orders
      )
    ) {
      checkout.orders.forEach(
        (order) => {
          if (
            order &&
            typeof order ===
              "object" &&
            order._id
          ) {
            ids.add(
              String(
                order._id
              )
            );
          }
        }
      );
    }

    /*
     * Checkout item snapshots also
     * contain the child Order reference.
     */

    if (
      Array.isArray(
        checkout.items
      )
    ) {
      checkout.items.forEach(
        (item) => {
          const order =
            item.order;

          if (!order) {
            return;
          }

          if (
            typeof order ===
            "string"
          ) {
            ids.add(
              order
            );

            return;
          }

          if (
            typeof order ===
              "object" &&
            order._id
          ) {
            ids.add(
              String(
                order._id
              )
            );
          }
        }
      );
    }

    return ids;
  };

/*
 * =========================================================
 * CHECKOUT CATEGORY
 * =========================================================
 */

const getCheckoutCategory = (
  checkout: CustomerCheckout
): OrderCategory => {
  const orders =
    getCheckoutOrders(
      checkout
    );

  /*
   * Fallback when child Orders
   * were not populated.
   */

  if (
    orders.length ===
    0
  ) {
    if (
      checkout.checkoutStatus ===
      "cancelled"
    ) {
      return "cancelled";
    }

    if (
      checkout.checkoutStatus ===
      "completed"
    ) {
      return "completed";
    }

    return "active";
  }

  const statuses =
    orders.map(
      (order) =>
        order.orderStatus
    );

  /*
   * Entire purchase is cancelled
   * only if every child order is
   * cancelled.
   */

  const allCancelled =
    statuses.every(
      (status) =>
        status ===
        "cancelled"
    );

  if (allCancelled) {
    return "cancelled";
  }

  /*
   * A delivered Order remains Active
   * until customer confirms receipt
   * and it becomes "completed".
   *
   * Cancelled children are ignored when
   * determining whether the remaining
   * purchase has completed.
   */

  const nonCancelled =
    statuses.filter(
      (status) =>
        status !==
        "cancelled"
    );

  const allCompleted =
    nonCancelled.length >
      0 &&
    nonCancelled.every(
      (status) =>
        status ===
        "completed"
    );

  if (allCompleted) {
    return "completed";
  }

  return "active";
};

/*
 * =========================================================
 * STANDALONE ORDER CATEGORY
 * =========================================================
 */

const getStandaloneOrderCategory =
  (
    order: CustomerOrder
  ): OrderCategory => {
    if (
      order.orderStatus ===
      "cancelled"
    ) {
      return "cancelled";
    }

    if (
      order.orderStatus ===
      "completed"
    ) {
      return "completed";
    }

    /*
     * delivered intentionally stays
     * active until customer confirmation.
     */

    return "active";
  };

/*
 * =========================================================
 * CHECKOUT DISPLAY STATUS
 * =========================================================
 */

const getCheckoutDisplayStatus =
  (
    checkout:
      CustomerCheckout
  ) => {
    const orders =
      getCheckoutOrders(
        checkout
      );

    if (
      orders.length ===
      0
    ) {
      switch (
        checkout.checkoutStatus
      ) {
        case "created":
          return "Order Placed";

        case "payment_pending":
          return "Payment Pending";

        case "paid":
          return "Paid";

        case "completed":
          return "Completed";

        case "cancelled":
          return "Cancelled";

        case "failed":
          return "Payment Failed";

        default:
          return formatStatus(
            checkout.checkoutStatus
          );
      }
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

    const nonCancelled =
      statuses.filter(
        (status) =>
          status !==
          "cancelled"
      );

    if (
      nonCancelled.length >
        0 &&
      nonCancelled.every(
        (status) =>
          status ===
          "completed"
      )
    ) {
      return "Completed";
    }

    if (
      nonCancelled.length >
        0 &&
      nonCancelled.every(
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

    if (
      statuses.some(
        (status) =>
          status ===
          "pending"
      )
    ) {
      return "Pending";
    }

    return "In Progress";
  };

/*
 * =========================================================
 * STATUS STYLE
 * =========================================================
 */

const getStatusStyle = (
  category:
    | OrderCategory
    | "payment_pending"
    | "delivered"
    | "out_for_delivery"
) => {
  switch (category) {
    case "completed":
      return {
        backgroundColor:
          "#E9F7EC",

        textColor:
          "#37834A",
      };

    case "cancelled":
      return {
        backgroundColor:
          "#FDEBEC",

        textColor:
          "#B64E59",
      };

    case "payment_pending":
      return {
        backgroundColor:
          "#FFF3DA",

        textColor:
          "#A66D12",
      };

    case "delivered":
      return {
        backgroundColor:
          "#E9F7EC",

        textColor:
          "#37834A",
      };

    case "out_for_delivery":
      return {
        backgroundColor:
          "#E9F2FF",

        textColor:
          "#3F6FA8",
      };

    default:
      return {
        backgroundColor:
          "#F4EAFE",

        textColor:
          "#7952A8",
      };
  }
};

/*
 * =========================================================
 * CHECKOUT IMAGE
 * =========================================================
 */

const getCheckoutImage = (
  checkout: CustomerCheckout
) => {
  const firstItem =
    checkout.items?.[0];

  if (
    firstItem
      ?.inspirationImage
  ) {
    return resolveImageUrl(
      firstItem
        .inspirationImage
    );
  }

  const firstOrder =
    getCheckoutOrders(
      checkout
    )[0];

  return resolveImageUrl(
    firstOrder
      ?.inspirationImage
  );
};

/*
 * =========================================================
 * CHECKOUT SHOPS
 * =========================================================
 */

const getShopNames = (
  checkout: CustomerCheckout
) => {
  const shops =
    checkout.shopBreakdown ||
    [];

  const names =
    shops
      .map(
        (shop) =>
          shop.shopName
      )
      .filter(Boolean);

  if (
    names.length ===
    0
  ) {
    return "FLOGRAM Florist";
  }

  if (
    names.length ===
    1
  ) {
    return names[0];
  }

  return `${names[0]} +${
    names.length - 1
  } more`;
};

/*
 * =========================================================
 * CHECKOUT QUANTITY
 * =========================================================
 */

const getTotalQuantity = (
  checkout: CustomerCheckout
) => {
  if (
    !Array.isArray(
      checkout.items
    )
  ) {
    return 0;
  }

  return checkout.items.reduce(
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
};

/*
 * =========================================================
 * CHECKOUT PAYMENT LABEL
 * =========================================================
 */

const getCheckoutPaymentLabel =
  (
    checkout:
      CustomerCheckout
  ) => {
    switch (
      checkout.paymentStatus
    ) {
      case "paid":
        return "Paid";

      case "pending":
        return "Payment Pending";

      case "failed":
        return "Payment Failed";

      case "refunded":
        return "Refunded";

      case "unpaid":
        if (
          checkout.paymentMethod ===
          "cash_on_delivery"
        ) {
          return "Cash on Delivery";
        }

        if (
          checkout.paymentMethod ===
          "cash_on_pickup"
        ) {
          return "Cash on Pickup";
        }

        return "Unpaid";

      default:
        return formatStatus(
          checkout.paymentStatus
        );
    }
  };

/*
 * =========================================================
 * STANDALONE FLORIST NAME
 * =========================================================
 */

const getStandaloneFloristName =
  (
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
 * STANDALONE IMAGE
 * =========================================================
 */

const getStandaloneImage = (
  order: CustomerOrder
) => {
  if (
    order.inspirationImage
  ) {
    return resolveImageUrl(
      order.inspirationImage
    );
  }

  if (
    order.flower &&
    typeof order.flower ===
      "object" &&
    Array.isArray(
      order.flower.images
    ) &&
    order.flower.images
      .length > 0
  ) {
    return resolveImageUrl(
      order.flower.images[0]
    );
  }

  return null;
};

/*
 * =========================================================
 * STANDALONE PAYMENT LABEL
 * =========================================================
 */

const getStandalonePaymentLabel =
  (
    order: CustomerOrder
  ) => {
    switch (
      order.paymentStatus
    ) {
      case "paid":
        return "Paid";

      case "pending":
        return "Payment Pending";

      case "failed":
        return "Payment Failed";

      case "refunded":
        return "Refunded";

      case "unpaid":
        if (
          order.paymentMethod ===
          "cash_on_delivery"
        ) {
          return "Cash on Delivery";
        }

        if (
          order.paymentMethod ===
          "cash_on_pickup"
        ) {
          return "Cash on Pickup";
        }

        return "Unpaid";

      default:
        return formatStatus(
          order.paymentStatus
        );
    }
  };

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerOrdersScreen() {
  const [
    checkouts,
    setCheckouts,
  ] = useState<
    CustomerCheckout[]
  >([]);

  const [
    orders,
    setOrders,
  ] = useState<
    CustomerOrder[]
  >([]);

  const [
    reviewByOrderId,
    setReviewByOrderId,
  ] = useState<
    Record<
      string,
      OrderReviewStatus
    >
  >({});

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState(
    false
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedFilter,
    setSelectedFilter,
  ] =
    useState<FilterType>(
      "all"
    );

  /*
   * =======================================================
   * LOAD PURCHASES
   * =======================================================
   */

  const loadPurchases =
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
            ""
          );

          const [
            checkoutResult,
            orderResult,
          ] =
            await Promise.all([
              getMyCheckouts(),

              getMyOrders(),
            ]);

          const safeCheckouts =
            Array.isArray(
              checkoutResult
            )
              ? checkoutResult
              : [];

          const safeOrders =
            Array.isArray(
              orderResult
            )
              ? orderResult
              : [];

          setCheckouts(
            safeCheckouts
          );

          setOrders(
            safeOrders
          );

          const completedOrders =
            safeOrders.filter(
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
          } else {
            const reviewResults =
              await Promise.allSettled(
                completedOrders.map(
                  async (order) => {
                    const reviewStatus =
                      await getOrderReview(
                        order._id
                      );

                    return {
                      orderId:
                        order._id,
                      reviewStatus,
                    };
                  }
                )
              );

            const reviewLookup:
              Record<
                string,
                OrderReviewStatus
              > = {};

            reviewResults.forEach(
              (result) => {
                if (
                  result.status ===
                  "fulfilled"
                ) {
                  reviewLookup[
                    result.value.orderId
                  ] =
                    result.value.reviewStatus;
                }
              }
            );

            setReviewByOrderId(
              reviewLookup
            );
          }
        } catch (
          error
        ) {
          console.error(
            "Failed to load customer purchases:",
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : "Unable to load your orders."
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

  /*
   * Reload whenever the customer
   * returns to this screen.
   */

  useFocusEffect(
    useCallback(() => {
      void loadPurchases();
    }, [loadPurchases])
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

          await loadPurchases(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [loadPurchases]
    );

  /*
   * =======================================================
   * GROUPED CHILD IDS
   * =======================================================
   */

  const groupedOrderIds =
    useMemo(() => {
      const result =
        new Set<string>();

      checkouts.forEach(
        (checkout) => {
          const ids =
            getCheckoutChildOrderIds(
              checkout
            );

          ids.forEach(
            (id) => {
              result.add(
                id
              );
            }
          );
        }
      );

      return result;
    }, [checkouts]);

  /*
   * =======================================================
   * STANDALONE ORDERS
   * =======================================================
   */

  const standaloneOrders =
    useMemo(
      () =>
        orders.filter(
          (order) =>
            !groupedOrderIds.has(
              String(
                order._id
              )
            )
        ),
      [
        orders,
        groupedOrderIds,
      ]
    );

  /*
   * =======================================================
   * MERGED PURCHASE FEED
   * =======================================================
   */

  const purchases =
    useMemo<
      CustomerPurchaseEntry[]
    >(() => {
      const entries:
        CustomerPurchaseEntry[] =
        [];

      checkouts.forEach(
        (checkout) => {
          entries.push({
            type:
              "checkout",

            id:
              checkout._id,

            createdAt:
              checkout.createdAt,

            category:
              getCheckoutCategory(
                checkout
              ),

            checkout,
          });
        }
      );

      standaloneOrders.forEach(
        (order) => {
          entries.push({
            type:
              "order",

            id:
              order._id,

            createdAt:
              order.createdAt ||
              "",

            category:
              getStandaloneOrderCategory(
                order
              ),

            order,
          });
        }
      );

      return entries.sort(
        (
          a,
          b
        ) => {
          const aTime =
            new Date(
              a.createdAt
            ).getTime();

          const bTime =
            new Date(
              b.createdAt
            ).getTime();

          const safeA =
            Number.isFinite(
              aTime
            )
              ? aTime
              : 0;

          const safeB =
            Number.isFinite(
              bTime
            )
              ? bTime
              : 0;

          return (
            safeB -
            safeA
          );
        }
      );
    }, [
      checkouts,
      standaloneOrders,
    ]);

  /*
   * =======================================================
   * FILTERED PURCHASES
   * =======================================================
   */

  const filteredPurchases =
    useMemo(() => {
      if (
        selectedFilter ===
        "all"
      ) {
        return purchases;
      }

      return purchases.filter(
        (entry) =>
          entry.category ===
          selectedFilter
      );
    }, [
      purchases,
      selectedFilter,
    ]);

  /*
   * =======================================================
   * COUNTS
   * =======================================================
   */

  const filterCounts =
    useMemo(() => {
      let active = 0;

      let completed = 0;

      let cancelled = 0;

      purchases.forEach(
        (entry) => {
          if (
            entry.category ===
            "active"
          ) {
            active += 1;
          }

          if (
            entry.category ===
            "completed"
          ) {
            completed +=
              1;
          }

          if (
            entry.category ===
            "cancelled"
          ) {
            cancelled +=
              1;
          }
        }
      );

      return {
        all:
          purchases.length,

        active,

        completed,

        cancelled,
      };
    }, [purchases]);

  /*
   * =======================================================
   * OPEN GROUPED CHECKOUT
   * =======================================================
   */

  const openCheckout =
    useCallback(
      (
        checkoutId:
          string
      ) => {
        router.push({
          pathname:
            "/(customer)/customer-order-details",

          params: {
            checkoutId,
          },
        } as never);
      },
      []
    );

  /*
   * =======================================================
   * OPEN STANDALONE ORDER
   * =======================================================
   */

  const openOrder =
    useCallback(
      (
        orderId:
          string
      ) => {
        router.push({
          pathname:
            "/(customer)/customer-order-details",

          params: {
            orderId,
          },
        } as never);
      },
      []
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
            Loading your
            orders...
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
         * HEADER
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
              My Orders
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              {
                purchases.length
              }{" "}
              {purchases.length ===
              1
                ? "purchase"
                : "purchases"}
            </Text>
          </View>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              void loadPurchases()
            }
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color="#77706E"
            />
          </Pressable>
        </View>

        {/*
         * FILTERS
         */}

        <View
          style={
            styles.filterWrapper
          }
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filterContainer
            }
          >
            <FilterButton
              title="All"
              count={
                filterCounts.all
              }
              active={
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
              title="Active"
              count={
                filterCounts.active
              }
              active={
                selectedFilter ===
                "active"
              }
              onPress={() =>
                setSelectedFilter(
                  "active"
                )
              }
            />

            <FilterButton
              title="Completed"
              count={
                filterCounts.completed
              }
              active={
                selectedFilter ===
                "completed"
              }
              onPress={() =>
                setSelectedFilter(
                  "completed"
                )
              }
            />

            <FilterButton
              title="Cancelled"
              count={
                filterCounts.cancelled
              }
              active={
                selectedFilter ===
                "cancelled"
              }
              onPress={() =>
                setSelectedFilter(
                  "cancelled"
                )
              }
            />
          </ScrollView>
        </View>

        {/*
         * CONTENT
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
              colors={[
                "#D85D7A",
              ]}
              tintColor="#D85D7A"
            />
          }
        >
          {errorMessage ? (
            <View
              style={
                styles.errorCard
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color="#B85166"
              />

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
                  Unable to
                  load orders
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
                onPress={() =>
                  void loadPurchases()
                }
              >
                <Ionicons
                  name="refresh"
                  size={21}
                  color="#D85D7A"
                />
              </Pressable>
            </View>
          ) : null}

          {!errorMessage &&
          filteredPurchases.length ===
            0 ? (
            <EmptyState
              hasOrders={
                purchases.length >
                0
              }
              selectedFilter={
                selectedFilter
              }
            />
          ) : (
            filteredPurchases.map(
              (entry) => {
                if (
                  entry.type ===
                  "checkout"
                ) {
                  return (
                    <CheckoutCard
                      key={`checkout-${entry.id}`}
                      checkout={
                        entry.checkout
                      }
                      reviewByOrderId={
                        reviewByOrderId
                      }
                      onPress={() =>
                        openCheckout(
                          entry.id
                        )
                      }
                    />
                  );
                }

                return (
                  <StandaloneOrderCard
                    key={`order-${entry.id}`}
                    order={
                      entry.order
                    }
                    reviewStatus={
                      reviewByOrderId[
                        entry.id
                      ]
                    }
                    onPress={() =>
                      openOrder(
                        entry.id
                      )
                    }
                  />
                );
              }
            )
          )}

          <View
            style={{
              height: 30,
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
  title,
  count,
  active,
  onPress,
}: {
  title: string;

  count: number;

  active: boolean;

  onPress: () => void;
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
          styles.filterText,

          active &&
            styles.filterTextActive,
        ]}
      >
        {title}

        {` (${count})`}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * EMPTY STATE
 * =========================================================
 */

function EmptyState({
  hasOrders,
  selectedFilter,
}: {
  hasOrders: boolean;

  selectedFilter:
    FilterType;
}) {
  const getMessage =
    () => {
      if (!hasOrders) {
        return {
          title:
            "No orders yet",

          description:
            "Your flower purchases and custom bouquet orders will appear here.",
        };
      }

      if (
        selectedFilter ===
        "active"
      ) {
        return {
          title:
            "No active orders",

          description:
            "You currently have no orders being prepared, delivered, or waiting for confirmation.",
        };
      }

      if (
        selectedFilter ===
        "completed"
      ) {
        return {
          title:
            "No completed orders",

          description:
            "Orders you have confirmed as received will appear here.",
        };
      }

      if (
        selectedFilter ===
        "cancelled"
      ) {
        return {
          title:
            "No cancelled orders",

          description:
            "You currently have no cancelled purchases.",
        };
      }

      return {
        title:
          "No matching orders",

        description:
          "There are no purchases under this category.",
      };
    };

  const message =
    getMessage();

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
          name="receipt-outline"
          size={54}
          color="#D85D7A"
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        {message.title}
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        {
          message.description
        }
      </Text>

      {!hasOrders ? (
        <Pressable
          style={
            styles.discoverButton
          }
          onPress={() =>
            router.push(
              "/(customer)/customer-discover" as never
            )
          }
        >
          <Ionicons
            name="flower-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.discoverButtonText
            }
          >
            Discover Flowers
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * CHECKOUT CARD
 * =========================================================
 */

function CheckoutCard({
  checkout,
  reviewByOrderId,
  onPress,
}: {
  checkout:
    CustomerCheckout;

  reviewByOrderId:
    Record<
      string,
      OrderReviewStatus
    >;

  onPress:
    () => void;
}) {
  const category =
    getCheckoutCategory(
      checkout
    );

  const statusText =
    getCheckoutDisplayStatus(
      checkout
    );

  const statusStyle =
    getStatusStyle(
      checkout.paymentStatus ===
        "pending" &&
        category ===
          "active"
        ? "payment_pending"
        : statusText ===
            "Out for Delivery"
          ? "out_for_delivery"
          : statusText ===
              "Delivered"
            ? "delivered"
            : category
    );

  const imageUrl =
    getCheckoutImage(
      checkout
    );

  const shopName =
    getShopNames(
      checkout
    );

  const totalQuantity =
    getTotalQuantity(
      checkout
    );

  const itemCount =
    checkout.items
      ?.length || 0;

  const shopCount =
    checkout.shopBreakdown
      ?.length || 0;

  const paymentLabel =
    getCheckoutPaymentLabel(
      checkout
    );

  const completedOrders =
    getCheckoutOrders(
      checkout
    ).filter(
      (order) =>
        order.orderStatus ===
        "completed"
    );

  const reviewedCount =
    completedOrders.filter(
      (order) =>
        reviewByOrderId[
          String(
            order._id
          )
        ]?.reviewed ===
        true
    ).length;

  const pendingReviewCount =
    completedOrders.filter(
      (order) => {
        const reviewStatus =
          reviewByOrderId[
            String(
              order._id
            )
          ];

        return (
          reviewStatus?.canReview ===
            true &&
          reviewStatus.reviewed !==
            true
        );
      }
    ).length;

  const allCompletedReviewed =
    completedOrders.length >
      0 &&
    reviewedCount ===
      completedOrders.length;

  return (
    <Pressable
      style={
        styles.orderCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.orderTop
        }
      >
        <View>
          <Text
            style={
              styles.orderReferenceLabel
            }
          >
            PURCHASE
          </Text>

          <Text
            style={
              styles.orderReference
            }
          >
            #
            {checkout._id
              .slice(-8)
              .toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                statusStyle.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  statusStyle.textColor,
              },
            ]}
          >
            {
              statusText
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.cardDivider
        }
      />

      <View
        style={
          styles.productRow
        }
      >
        <View
          style={
            styles.imageContainer
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
                styles.imagePlaceholder
              }
            >
              <Ionicons
                name="flower-outline"
                size={29}
                color="#D89AAA"
              />
            </View>
          )}

          {itemCount >
          1 ? (
            <View
              style={
                styles.imageCountBadge
              }
            >
              <Text
                style={
                  styles.imageCountText
                }
              >
                +
                {itemCount -
                  1}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={
            styles.productDetails
          }
        >
          <Text
            style={
              styles.floristName
            }
            numberOfLines={
              1
            }
          >
            {
              shopName
            }
          </Text>

          <Text
            style={
              styles.productName
            }
            numberOfLines={
              2
            }
          >
            {itemCount ===
            1
              ? checkout
                  .items?.[0]
                  ?.productName ||
                "Flower Order"
              : `${itemCount} flower items`}
          </Text>

          <View
            style={
              styles.purchaseSummaryRow
            }
          >
            <Text
              style={
                styles.quantity
              }
            >
              Qty:{" "}
              {
                totalQuantity
              }
            </Text>

            {shopCount >
            0 ? (
              <>
                <View
                  style={
                    styles.summaryDot
                  }
                />

                <Text
                  style={
                    styles.quantity
                  }
                >
                  {
                    shopCount
                  }{" "}
                  {shopCount ===
                  1
                    ? "shop"
                    : "shops"}
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <View
          style={
            styles.priceContainer
          }
        >
          <Text
            style={
              styles.price
            }
          >
            {formatMoney(
              checkout.totalAmount
            )}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#B2AAA8"
          />
        </View>
      </View>

      <View
        style={
          styles.infoContainer
        }
      >
        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name={
              checkout.fulfillmentType ===
              "pickup"
                ? "storefront-outline"
                : "bicycle-outline"
            }
            size={16}
            color="#8C8280"
          />

          <Text
            style={
              styles.infoText
            }
          >
            {checkout.fulfillmentType ===
            "pickup"
              ? "Pickup"
              : "Delivery"}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#8C8280"
          />

          <Text
            style={
              styles.infoText
            }
          >
            {checkout.isPreOrder &&
            checkout.requestedDeliveryDate
              ? formatDate(
                  checkout.requestedDeliveryDate
                )
              : formatDate(
                  checkout.createdAt
                )}
          </Text>
        </View>
      </View>

      {checkout.isPreOrder &&
      checkout.requestedDeliveryTimeStart &&
      checkout.requestedDeliveryTimeEnd ? (
        <View
          style={
            styles.scheduleBox
          }
        >
          <Ionicons
            name="time-outline"
            size={16}
            color="#A66D12"
          />

          <Text
            style={
              styles.scheduleText
            }
          >
            Scheduled{" "}
            {formatDate(
              checkout.requestedDeliveryDate
            )}{" "}
            •{" "}
            {
              checkout.requestedDeliveryTimeStart
            }{" "}
            -{" "}
            {
              checkout.requestedDeliveryTimeEnd
            }
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.paymentRow
        }
      >
        <View>
          <Text
            style={
              styles.paymentLabel
            }
          >
            Payment
          </Text>

          {checkout.paidAt ? (
            <Text
              style={
                styles.paymentDate
              }
            >
              Paid{" "}
              {formatDateTime(
                checkout.paidAt
              )}
            </Text>
          ) : null}
        </View>

        <Text
          style={[
            styles.paymentStatus,

            checkout.paymentStatus ===
              "paid" &&
              styles.paymentPaid,

            checkout.paymentStatus ===
              "failed" &&
              styles.paymentFailed,
          ]}
        >
          {
            paymentLabel
          }
        </Text>
      </View>

      {category ===
        "completed" &&
      completedOrders.length >
        0 ? (
        <View
          style={
            allCompletedReviewed
              ? styles.reviewedNotice
              : styles.reviewNotice
          }
        >
          <Ionicons
            name={
              allCompletedReviewed
                ? "checkmark-circle"
                : "star-outline"
            }
            size={17}
            color={
              allCompletedReviewed
                ? "#3D8750"
                : "#B74964"
            }
          />

          <Text
            style={
              allCompletedReviewed
                ? styles.reviewedNoticeText
                : styles.reviewNoticeText
            }
          >
            {allCompletedReviewed
              ? completedOrders.length ===
                1
                ? "Reviewed"
                : `All ${completedOrders.length} orders reviewed`
              : pendingReviewCount >
                  0
                ? `${pendingReviewCount} ${
                    pendingReviewCount ===
                    1
                      ? "order is"
                      : "orders are"
                  } ready for review`
                : "Open purchase to view review status"}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={
              allCompletedReviewed
                ? "#3D8750"
                : "#B74964"
            }
          />
        </View>
      ) : null}
    </Pressable>
  );
}

/*
 * =========================================================
 * STANDALONE ORDER CARD
 * =========================================================
 */

function StandaloneOrderCard({
  order,
  reviewStatus,
  onPress,
}: {
  order: CustomerOrder;

  reviewStatus?:
    OrderReviewStatus;

  onPress:
    () => void;
}) {
  const category =
    getStandaloneOrderCategory(
      order
    );

  const imageUrl =
    getStandaloneImage(
      order
    );

  const paymentLabel =
    getStandalonePaymentLabel(
      order
    );

  const statusStyle =
    getStatusStyle(
      order.orderStatus ===
        "out_for_delivery"
        ? "out_for_delivery"
        : order.orderStatus ===
            "delivered"
          ? "delivered"
          : order.paymentStatus ===
                "pending" &&
              category ===
                "active"
            ? "payment_pending"
            : category
    );

  const isReviewed =
    reviewStatus?.reviewed ===
    true;

  const canReview =
    order.orderStatus ===
      "completed" &&
    reviewStatus?.canReview ===
      true &&
    !isReviewed;

  return (
    <Pressable
      style={
        styles.orderCard
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.orderTop
        }
      >
        <View>
          <View
            style={
              styles.referenceTitleRow
            }
          >
            <Text
              style={
                styles.orderReferenceLabel
              }
            >
              ORDER
            </Text>

            {order.sourceType ===
            "custom_bouquet" ? (
              <View
                style={
                  styles.customBadge
                }
              >
                <Text
                  style={
                    styles.customBadgeText
                  }
                >
                  CUSTOM
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={
              styles.orderReference
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
            styles.statusBadge,

            {
              backgroundColor:
                statusStyle.backgroundColor,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  statusStyle.textColor,
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
          styles.cardDivider
        }
      />

      <View
        style={
          styles.productRow
        }
      >
        <View
          style={
            styles.imageContainer
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
                styles.imagePlaceholder
              }
            >
              <Ionicons
                name="flower-outline"
                size={29}
                color="#D89AAA"
              />
            </View>
          )}
        </View>

        <View
          style={
            styles.productDetails
          }
        >
          <Text
            style={
              styles.floristName
            }
            numberOfLines={
              1
            }
          >
            {getStandaloneFloristName(
              order
            )}
          </Text>

          <Text
            style={
              styles.productName
            }
            numberOfLines={
              2
            }
          >
            {order.productName ||
              (order.sourceType ===
              "custom_bouquet"
                ? "Custom Bouquet"
                : "Flower Order")}
          </Text>

          <View
            style={
              styles.purchaseSummaryRow
            }
          >
            <Text
              style={
                styles.quantity
              }
            >
              Qty:{" "}
              {order.quantity ||
                1}
            </Text>

            {order.sourceType ===
            "custom_bouquet" ? (
              <>
                <View
                  style={
                    styles.summaryDot
                  }
                />

                <Text
                  style={
                    styles.quantity
                  }
                >
                  Custom Bouquet
                </Text>
              </>
            ) : null}
          </View>
        </View>

        <View
          style={
            styles.priceContainer
          }
        >
          <Text
            style={
              styles.price
            }
          >
            {formatMoney(
              order.totalAmount
            )}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={18}
            color="#B2AAA8"
          />
        </View>
      </View>

      <View
        style={
          styles.infoContainer
        }
      >
        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name={
              order.fulfillmentType ===
              "pickup"
                ? "storefront-outline"
                : "bicycle-outline"
            }
            size={16}
            color="#8C8280"
          />

          <Text
            style={
              styles.infoText
            }
          >
            {order.fulfillmentType ===
            "pickup"
              ? "Pickup"
              : "Delivery"}
          </Text>
        </View>

        <View
          style={
            styles.infoRow
          }
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#8C8280"
          />

          <Text
            style={
              styles.infoText
            }
          >
            {order.isPreOrder &&
            order.requestedDeliveryDate
              ? formatDate(
                  order.requestedDeliveryDate
                )
              : formatDate(
                  order.createdAt
                )}
          </Text>
        </View>
      </View>

      {order.orderStatus ===
      "delivered" ? (
        <View
          style={
            styles.receivedNotice
          }
        >
          <Ionicons
            name="checkmark-circle-outline"
            size={17}
            color="#3D8750"
          />

          <Text
            style={
              styles.receivedNoticeText
            }
          >
            Delivered — open
            this order to
            confirm receipt.
          </Text>
        </View>
      ) : null}

      <View
        style={
          styles.paymentRow
        }
      >
        <Text
          style={
            styles.paymentLabel
          }
        >
          Payment
        </Text>

        <Text
          style={[
            styles.paymentStatus,

            order.paymentStatus ===
              "paid" &&
              styles.paymentPaid,

            order.paymentStatus ===
              "failed" &&
              styles.paymentFailed,
          ]}
        >
          {
            paymentLabel
          }
        </Text>
      </View>

      {order.orderStatus ===
        "completed" ? (
        <View
          style={
            isReviewed
              ? styles.reviewedNotice
              : styles.reviewNotice
          }
        >
          <Ionicons
            name={
              isReviewed
                ? "checkmark-circle"
                : "star-outline"
            }
            size={17}
            color={
              isReviewed
                ? "#3D8750"
                : "#B74964"
            }
          />

          <Text
            style={
              isReviewed
                ? styles.reviewedNoticeText
                : styles.reviewNoticeText
            }
          >
            {isReviewed
              ? "Reviewed · Tap to view review"
              : canReview
                ? "Leave a Review"
                : "Open order to view review status"}
          </Text>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={
              isReviewed
                ? "#3D8750"
                : "#B74964"
            }
          />
        </View>
      ) : null}
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
        "#FFFFFF",
    },

    screen: {
      flex: 1,

      backgroundColor:
        "#FAF8F7",
    },

    /*
     * HEADER
     */

    header: {
      minHeight: 72,

      paddingHorizontal:
        15,

      backgroundColor:
        "#FFFFFF",

      flexDirection:
        "row",

      alignItems:
        "center",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EAE4E2",
    },

    headerButton: {
      width: 42,

      height: 42,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerCenter: {
      flex: 1,

      alignItems:
        "center",
    },

    headerTitle: {
      fontSize: 20,

      fontWeight:
        "800",

      color:
        "#2F2A29",
    },

    headerSubtitle: {
      marginTop: 1,

      fontSize: 11,

      color:
        "#958D8B",
    },

    /*
     * FILTER
     */

    filterWrapper: {
      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        "#EDE8E6",
    },

    filterContainer: {
      paddingHorizontal:
        16,

      paddingVertical:
        11,

      gap: 8,
    },

    filterButton: {
      paddingHorizontal:
        16,

      paddingVertical:
        8,

      borderRadius:
        20,

      backgroundColor:
        "#F4F0EF",
    },

    filterButtonActive: {
      backgroundColor:
        "#D85D7A",
    },

    filterText: {
      fontSize: 12,

      fontWeight:
        "700",

      color:
        "#726B69",
    },

    filterTextActive: {
      color:
        "#FFFFFF",
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 15,
    },

    /*
     * LOADING
     */

    centerContainer: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAF8F7",
    },

    loadingText: {
      marginTop: 12,

      fontSize: 13,

      color:
        "#8D8583",
    },

    /*
     * ERROR
     */

    errorCard: {
      marginBottom: 14,

      padding: 14,

      borderRadius:
        14,

      backgroundColor:
        "#FFF2F4",

      flexDirection:
        "row",

      alignItems:
        "flex-start",

      gap: 10,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      fontSize: 13,

      fontWeight:
        "800",

      color:
        "#B85166",
    },

    errorText: {
      marginTop: 2,

      fontSize: 10,

      lineHeight: 15,

      color:
        "#A06F78",
    },

    /*
     * EMPTY
     */

    emptyContainer: {
      paddingTop: 70,

      paddingHorizontal:
        25,

      alignItems:
        "center",
    },

    emptyIcon: {
      width: 100,

      height: 100,

      borderRadius:
        50,

      backgroundColor:
        "#FFF1F5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 20,

      fontSize: 18,

      fontWeight:
        "800",

      color:
        "#3A3432",

      textAlign:
        "center",
    },

    emptyDescription: {
      marginTop: 7,

      maxWidth: 290,

      fontSize: 12,

      lineHeight: 18,

      color:
        "#918987",

      textAlign:
        "center",
    },

    discoverButton: {
      minHeight: 45,

      marginTop: 19,

      paddingHorizontal:
        18,

      borderRadius:
        14,

      backgroundColor:
        "#D85D7A",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,
    },

    discoverButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    /*
     * ORDER CARD
     */

    orderCard: {
      marginBottom: 13,

      padding: 14,

      borderRadius:
        18,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#ECE6E4",
    },

    orderTop: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "flex-start",

      gap: 10,
    },

    orderReferenceLabel: {
      fontSize: 8,

      fontWeight:
        "800",

      letterSpacing:
        1,

      color:
        "#A49C99",
    },

    orderReference: {
      marginTop: 2,

      fontSize: 11,

      fontWeight:
        "800",

      color:
        "#59514F",
    },

    referenceTitleRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,
    },

    customBadge: {
      paddingHorizontal:
        6,

      paddingVertical:
        2,

      borderRadius:
        6,

      backgroundColor:
        "#F4E8FA",
    },

    customBadgeText: {
      fontSize: 7,

      fontWeight:
        "900",

      color:
        "#7E4E99",
    },

    statusBadge: {
      paddingHorizontal:
        9,

      paddingVertical:
        5,

      borderRadius:
        10,
    },

    statusText: {
      fontSize: 9,

      fontWeight:
        "800",
    },

    cardDivider: {
      height: 1,

      marginVertical:
        12,

      backgroundColor:
        "#F0EBE9",
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

    imageContainer: {
      width: 72,

      height: 72,

      borderRadius:
        14,

      overflow:
        "hidden",

      backgroundColor:
        "#F9F0F2",

      position:
        "relative",
    },

    productImage: {
      width:
        "100%",

      height:
        "100%",
    },

    imagePlaceholder: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FAEDF0",
    },

    imageCountBadge: {
      position:
        "absolute",

      right: 5,

      bottom: 5,

      minWidth: 25,

      height: 22,

      paddingHorizontal:
        5,

      borderRadius:
        11,

      backgroundColor:
        "rgba(45,40,39,0.78)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    imageCountText: {
      fontSize: 9,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },

    productDetails: {
      flex: 1,

      marginLeft: 11,

      marginRight: 8,
    },

    floristName: {
      fontSize: 10,

      fontWeight:
        "700",

      color:
        "#D05A75",
    },

    productName: {
      marginTop: 3,

      fontSize: 14,

      lineHeight: 18,

      fontWeight:
        "800",

      color:
        "#373130",
    },

    purchaseSummaryRow: {
      marginTop: 6,

      flexDirection:
        "row",

      alignItems:
        "center",

      flexWrap:
        "wrap",

      gap: 5,
    },

    quantity: {
      fontSize: 9,

      color:
        "#918987",
    },

    summaryDot: {
      width: 3,

      height: 3,

      borderRadius:
        2,

      backgroundColor:
        "#BAB1AF",
    },

    priceContainer: {
      alignItems:
        "flex-end",

      gap: 5,
    },

    price: {
      fontSize: 13,

      fontWeight:
        "900",

      color:
        "#D15471",
    },

    /*
     * INFO
     */

    infoContainer: {
      marginTop: 12,

      paddingHorizontal:
        10,

      paddingVertical:
        9,

      borderRadius:
        11,

      backgroundColor:
        "#FAF8F7",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      gap: 10,
    },

    infoRow: {
      flex: 1,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,
    },

    infoText: {
      flex: 1,

      fontSize: 10,

      color:
        "#7C7472",
    },

    /*
     * PREORDER
     */

    scheduleBox: {
      marginTop: 11,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      borderRadius:
        10,

      backgroundColor:
        "#FFF8E9",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    scheduleText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      fontWeight:
        "600",

      color:
        "#8E681F",
    },

    /*
     * DELIVERED NOTICE
     */

    receivedNotice: {
      marginTop: 11,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      borderRadius:
        10,

      backgroundColor:
        "#EDF8F0",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    receivedNoticeText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      fontWeight:
        "700",

      color:
        "#477C54",
    },

    /*
     * REVIEW
     */

    reviewNotice: {
      marginTop: 11,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      borderRadius:
        10,

      backgroundColor:
        "#FFF0F4",

      borderWidth: 1,

      borderColor:
        "#F3D6DE",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    reviewNoticeText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      fontWeight:
        "800",

      color:
        "#B74964",
    },

    reviewedNotice: {
      marginTop: 11,

      paddingHorizontal:
        11,

      paddingVertical:
        9,

      borderRadius:
        10,

      backgroundColor:
        "#EDF8F0",

      borderWidth: 1,

      borderColor:
        "#D1EAD7",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 7,
    },

    reviewedNoticeText: {
      flex: 1,

      fontSize: 10,

      lineHeight: 15,

      fontWeight:
        "800",

      color:
        "#3D8750",
    },

    /*
     * PAYMENT
     */

    paymentRow: {
      marginTop: 11,

      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",
    },

    paymentLabel: {
      fontSize: 11,

      color:
        "#A09896",
    },

    paymentDate: {
      marginTop: 2,

      fontSize: 9,

      color:
        "#A79E9C",
    },

    paymentStatus: {
      fontSize: 11,

      fontWeight:
        "800",

      color:
        "#A8732A",
    },

    paymentPaid: {
      color:
        "#3D8A56",
    },

    paymentFailed: {
      color:
        "#B84B5A",
    },
  });