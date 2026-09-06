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
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiRequest } from "../../services/api";

import {
  getStoredUser,
  type AuthUser,
} from "../../services/auth";

import {
  getNotifications,
} from "../../services/notification";

import {
  getMyCheckouts,
  type CustomerCheckout,
} from "../../services/checkout";

import {
  getMyOrders,
  type CustomerOrder,
} from "../../services/orders";

import {
  getCustomerDeliveries,
  type Delivery,
} from "../../services/delivery";

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type FloristAddress = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type FlowerFlorist = {
  _id: string;
  shopName: string;
  address?: FloristAddress;
};

type FlowerListing = {
  _id: string;

  seller: string;

  florist:
    | FlowerFlorist
    | null;

  name: string;

  description: string;

  price: number;

  category: string;

  occasion: string[];

  flowerTypes: string[];

  colors: string[];

  images: string[];

  isAvailable: boolean;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
};

type PublicFlowersResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    flowers:
      FlowerListing[];
  };
};

type PurchaseEntry =
  | {
      kind:
        "checkout";

      id: string;

      createdAt:
        string;

      checkout:
        CustomerCheckout;
    }
  | {
      kind:
        "order";

      id: string;

      createdAt:
        string;

      order:
        CustomerOrder;
    };

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const API_URL =
  process.env
    .EXPO_PUBLIC_API_URL ??
  "";

const DEFAULT_PRODUCT_LIMIT =
  4;

/*
 * =========================================================
 * SERVER URL
 * =========================================================
 */

const getServerUrl = () => {
  return API_URL.replace(
    /\/api\/v1\/?$/,
    ""
  );
};

/*
 * =========================================================
 * IMAGE
 * =========================================================
 */

const getImageUrl = (
  imagePath?:
    | string
    | null
) => {
  if (!imagePath) {
    return null;
  }

  if (
    imagePath.startsWith(
      "http://"
    ) ||
    imagePath.startsWith(
      "https://"
    )
  ) {
    return imagePath;
  }

  const serverUrl =
    getServerUrl();

  const normalizedPath =
    imagePath.startsWith("/")
      ? imagePath
      : `/${imagePath}`;

  return `${serverUrl}${normalizedPath}`;
};

/*
 * =========================================================
 * MONEY
 * =========================================================
 */

const formatPrice = (
  price: number
) => {
  return `₱${Number(
    price || 0
  ).toLocaleString(
    "en-PH",
    {
      minimumFractionDigits:
        0,

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
  status?:
    | string
    | null
) => {
  if (!status) {
    return "Pending";
  }

  return status
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

const getOrderStatusMeta = (
  status?:
    | string
    | null
) => {
  switch (status) {
    case "pending":
      return {
        label:
          "Pending",

        icon:
          "time-outline" as const,

        background:
          "#FFF5DD",

        foreground:
          "#A67118",
      };

    case "confirmed":
      return {
        label:
          "Confirmed",

        icon:
          "checkmark-circle-outline" as const,

        background:
          "#EDF4FF",

        foreground:
          "#4676AD",
      };

    case "preparing":
      return {
        label:
          "Preparing",

        icon:
          "flower-outline" as const,

        background:
          "#F3EDFC",

        foreground:
          "#7955A5",
      };

    case "ready_for_delivery":
      return {
        label:
          "Ready for Delivery",

        icon:
          "bicycle-outline" as const,

        background:
          "#EAF7F3",

        foreground:
          "#398474",
      };

    case "ready_for_pickup":
      return {
        label:
          "Ready for Pickup",

        icon:
          "storefront-outline" as const,

        background:
          "#EAF7F3",

        foreground:
          "#398474",
      };

    case "out_for_delivery":
      return {
        label:
          "Out for Delivery",

        icon:
          "navigate-outline" as const,

        background:
          "#EAF2FF",

        foreground:
          "#4473A8",
      };

    case "delivered":
      return {
        label:
          "Delivered",

        icon:
          "checkmark-circle-outline" as const,

        background:
          "#EBF7ED",

        foreground:
          "#438351",
      };

    case "completed":
      return {
        label:
          "Completed",

        icon:
          "checkmark-done-circle-outline" as const,

        background:
          "#EBF7ED",

        foreground:
          "#438351",
      };

    case "cancelled":
      return {
        label:
          "Cancelled",

        icon:
          "close-circle-outline" as const,

        background:
          "#FDECEE",

        foreground:
          "#B7515E",
      };

    default:
      return {
        label:
          formatStatus(
            status
          ),

        icon:
          "information-circle-outline" as const,

        background:
          "#F2EEEE",

        foreground:
          "#706867",
      };
  }
};

/*
 * =========================================================
 * GREETING
 * =========================================================
 */

const getGreeting = () => {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
};

/*
 * =========================================================
 * OCCASION
 * =========================================================
 */

const getOccasionIcon = (
  occasion: string
): keyof typeof Ionicons.glyphMap => {
  const value =
    occasion.toLowerCase();

  if (
    value.includes(
      "birthday"
    )
  ) {
    return "gift-outline";
  }

  if (
    value.includes(
      "valentine"
    ) ||
    value.includes(
      "anniversary"
    ) ||
    value.includes(
      "romance"
    )
  ) {
    return "heart-outline";
  }

  if (
    value.includes(
      "wedding"
    )
  ) {
    return "flower-outline";
  }

  if (
    value.includes(
      "sympathy"
    )
  ) {
    return "leaf-outline";
  }

  if (
    value.includes(
      "congratulation"
    )
  ) {
    return "ribbon-outline";
  }

  return "flower-outline";
};

const pluralizeFlowerType = (
  value: string
) => {
  if (
    value
      .toLowerCase()
      .endsWith("s")
  ) {
    return value;
  }

  return `${value}s`;
};

/*
 * =========================================================
 * PURCHASE HELPERS
 * =========================================================
 */

const getCheckoutOrderId = (
  order:
    | unknown
    | string
) => {
  if (
    typeof order ===
    "string"
  ) {
    return order;
  }

  if (
    order &&
    typeof order ===
      "object" &&
    "_id" in order
  ) {
    const value =
      (
        order as {
          _id?: unknown;
        }
      )._id;

    return typeof value ===
      "string"
      ? value
      : "";
  }

  return "";
};

const getCheckoutOrderStatus = (
  order:
    | unknown
    | string
) => {
  if (
    !order ||
    typeof order !==
      "object" ||
    !(
      "orderStatus" in
      order
    )
  ) {
    return "";
  }

  const value =
    (
      order as {
        orderStatus?:
          unknown;
      }
    ).orderStatus;

  return typeof value ===
    "string"
      ? value
      : "";
};

const getCheckoutCategory = (
  checkout:
    CustomerCheckout
) => {
  const statuses =
    (
      checkout.orders ||
      []
    )
      .map(
        getCheckoutOrderStatus
      )
      .filter(Boolean);

  if (
    statuses.length ===
    0
  ) {
    if (
      checkout.checkoutStatus ===
        "cancelled" ||
      checkout.checkoutStatus ===
        "failed"
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

  const allCancelled =
    statuses.every(
      (status) =>
        status ===
        "cancelled"
    );

  if (allCancelled) {
    return "cancelled";
  }

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

const getCheckoutDisplayStatus = (
  checkout:
    CustomerCheckout
) => {
  const statuses =
    (
      checkout.orders ||
      []
    )
      .map(
        getCheckoutOrderStatus
      )
      .filter(Boolean);

  if (
    statuses.length ===
    0
  ) {
    return formatStatus(
      checkout.checkoutStatus
    );
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

  if (
    statuses.some(
      (status) =>
        status ===
        "delivered"
    )
  ) {
    return "Delivered";
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
        "cancelled"
    )
  ) {
    return "Cancelled";
  }

  return "Active";
};

const getCheckoutPrimaryOrderStatus =
  (
    checkout:
      CustomerCheckout
  ) => {
    const statuses =
      (
        checkout.orders ||
        []
      )
        .map(
          getCheckoutOrderStatus
        )
        .filter(Boolean);

    const priority = [
      "out_for_delivery",

      "ready_for_delivery",

      "ready_for_pickup",

      "preparing",

      "confirmed",

      "pending",

      "delivered",

      "completed",

      "cancelled",
    ];

    for (
      const status of
        priority
    ) {
      if (
        statuses.includes(
          status
        )
      ) {
        return status;
      }
    }

    return checkout.checkoutStatus;
  };

const getOrderCategory = (
  order: CustomerOrder
) => {
  if (
    order.orderStatus ===
    "cancelled"
  ) {
    return "cancelled";
  }

  /*
   * Delivered deliberately remains active
   * until the customer confirms receipt and
   * the Order becomes completed.
   */
  if (
    order.orderStatus ===
    "completed"
  ) {
    return "completed";
  }

  return "active";
};

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

/*
 * =========================================================
 * CUSTOMER DASHBOARD
 * =========================================================
 */

export default function CustomerDashboardScreen() {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
      null
    );

  const [
    flowers,
    setFlowers,
  ] =
    useState<FlowerListing[]>(
      []
    );

  const [
    marketplaceFlowers,
    setMarketplaceFlowers,
  ] =
    useState<FlowerListing[]>(
      []
    );

  const [
    checkouts,
    setCheckouts,
  ] =
    useState<
      CustomerCheckout[]
    >([]);

  const [
    customerOrders,
    setCustomerOrders,
  ] =
    useState<
      CustomerOrder[]
    >([]);

  const [
    deliveryByOrderId,
    setDeliveryByOrderId,
  ] =
    useState<
      Record<
        string,
        Delivery
      >
    >({});

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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    selectedFlowerType,
    setSelectedFlowerType,
  ] =
    useState("All");

  const [
    selectedOccasion,
    setSelectedOccasion,
  ] =
    useState<
      string | null
    >(null);

  /*
   * =======================================================
   * FETCH FLOWERS
   * =======================================================
   */

  const fetchFlowers =
    useCallback(
      async (
        options?: {
          search?:
            string;

          flowerType?:
            string;

          occasion?:
            string;
        }
      ) => {
        const params =
          new URLSearchParams();

        if (
          options?.search
            ?.trim()
        ) {
          params.append(
            "search",
            options.search.trim()
          );
        }

        if (
          options
            ?.flowerType &&
          options.flowerType !==
            "All"
        ) {
          params.append(
            "flowerType",
            options.flowerType
          );
        }

        if (
          options
            ?.occasion
        ) {
          params.append(
            "occasion",
            options.occasion
          );
        }

        const query =
          params.toString();

        const response =
          await apiRequest<PublicFlowersResponse>(
            query
              ? `/flowers?${query}`
              : "/flowers",
            {
              method:
                "GET",
            }
          );

        return response
          .data
          .flowers;
      },
      []
    );

  /*
   * =======================================================
   * LOAD PURCHASES
   * =======================================================
   */

  const loadPurchases =
    useCallback(
      async () => {
        /*
         * Orders are important to Home,
         * but they must not prevent flowers
         * from loading if one endpoint fails.
         */

        try {
          const [
            checkoutData,
            orderData,
          ] =
            await Promise.all(
              [
                getMyCheckouts(),

                getMyOrders(),
              ]
            );

          setCheckouts(
            Array.isArray(
              checkoutData
            )
              ? checkoutData
              : []
          );

          setCustomerOrders(
            Array.isArray(
              orderData
            )
              ? orderData
              : []
          );
        } catch (
          purchaseError
        ) {
          console.warn(
            "Unable to load current orders:",
            purchaseError
          );

          setCheckouts(
            []
          );

          setCustomerOrders(
            []
          );
        }

        /*
         * Delivery lookup is separate so
         * an unavailable delivery endpoint
         * never breaks the dashboard.
         */

        try {
          const result =
            await getCustomerDeliveries();

          const deliveries =
            Array.isArray(
              result.deliveries
            )
              ? result.deliveries
              : [];

          const lookup:
            Record<
              string,
              Delivery
            > = {};

          deliveries.forEach(
            (
              delivery
            ) => {
              const orderId =
                getDeliveryOrderId(
                  delivery
                );

              if (
                !orderId
              ) {
                return;
              }

              const existing =
                lookup[
                  orderId
                ];

              if (
                !existing ||
                existing.status ===
                  "cancelled"
              ) {
                lookup[
                  orderId
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
      },
      []
    );

  /*
   * =======================================================
   * LOAD HOME DATA
   * =======================================================
   */

  const loadHomeData =
    useCallback(
      async (
        isRefresh =
          false
      ) => {
        try {
          if (
            isRefresh
          ) {
            setRefreshing(
              true
            );
          } else {
            setLoading(
              true
            );
          }

          setError(
            null
          );

          /*
           * CUSTOMER
           */

          const storedUser =
            await getStoredUser();

          setUser(
            storedUser
          );

          /*
           * FLOWERS
           */

          const flowerData =
            await fetchFlowers();

          setFlowers(
            flowerData
          );

          setMarketplaceFlowers(
            flowerData
          );

          /*
           * CURRENT PURCHASE
           */

          await loadPurchases();

          /*
           * NOTIFICATIONS
           */

          try {
            const notificationData =
              await getNotifications();

            setUnreadCount(
              notificationData
                .unreadCount
            );
          } catch (
            notificationError
          ) {
            console.warn(
              "Unable to load notification count:",
              notificationError
            );

            setUnreadCount(
              0
            );
          }
        } catch (
          loadError
        ) {
          console.error(
            "Customer Home Error:",
            loadError
          );

          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Unable to load flowers right now."
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      [
        fetchFlowers,
        loadPurchases,
      ]
    );

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  /*
   * =======================================================
   * PURCHASE DEDUPLICATION
   * =======================================================
   */

  const groupedOrderIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      checkouts.forEach(
        (
          checkout
        ) => {
          (
            checkout.orders ||
            []
          ).forEach(
            (order) => {
              const id =
                getCheckoutOrderId(
                  order
                );

              if (id) {
                ids.add(
                  id
                );
              }
            }
          );

          (
            checkout.items ||
            []
          ).forEach(
            (item) => {
              const id =
                getCheckoutOrderId(
                  item.order
                );

              if (id) {
                ids.add(
                  id
                );
              }
            }
          );
        }
      );

      return ids;
    }, [
      checkouts,
    ]);

  /*
   * =======================================================
   * CURRENT PURCHASE
   * =======================================================
   */

  const currentPurchase =
    useMemo<
      PurchaseEntry | null
    >(() => {
      const entries:
        PurchaseEntry[] =
        [];

      checkouts.forEach(
        (
          checkout
        ) => {
          if (
            getCheckoutCategory(
              checkout
            ) !==
            "active"
          ) {
            return;
          }

          entries.push({
            kind:
              "checkout",

            id:
              checkout._id,

            createdAt:
              checkout.createdAt ||
              "",

            checkout,
          });
        }
      );

      customerOrders.forEach(
        (
          order
        ) => {
          if (
            groupedOrderIds.has(
              order._id
            )
          ) {
            return;
          }

          if (
            getOrderCategory(
              order
            ) !==
            "active"
          ) {
            return;
          }

          entries.push({
            kind:
              "order",

            id:
              order._id,

            createdAt:
              order.createdAt ||
              "",

            order,
          });
        }
      );

      entries.sort(
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

      return (
        entries[0] ||
        null
      );
    }, [
      checkouts,
      customerOrders,
      groupedOrderIds,
    ]);

  /*
   * =======================================================
   * CURRENT PURCHASE DELIVERY
   * =======================================================
   */

  const currentPurchaseDelivery =
    useMemo<
      Delivery | null
    >(() => {
      if (
        !currentPurchase
      ) {
        return null;
      }

      if (
        currentPurchase.kind ===
        "order"
      ) {
        return (
          deliveryByOrderId[
            currentPurchase
              .order._id
          ] ||
          null
        );
      }

      const linkedDeliveries =
        (
          currentPurchase
            .checkout
            .orders ||
          []
        )
          .map(
            (order) => {
              const id =
                getCheckoutOrderId(
                  order
                );

              return id
                ? deliveryByOrderId[
                    id
                  ]
                : undefined;
            }
          )
          .filter(
            (
              delivery
            ): delivery is Delivery =>
              Boolean(
                delivery &&
                  delivery.status !==
                    "cancelled"
              )
          );

      /*
       * Direct Track Delivery from the
       * dashboard is only used when one
       * child delivery is unambiguous.
       *
       * Multiple child deliveries must
       * be chosen from Order Details.
       */

      if (
        linkedDeliveries.length ===
        1
      ) {
        return linkedDeliveries[0];
      }

      return null;
    }, [
      currentPurchase,
      deliveryByOrderId,
    ]);

  /*
   * =======================================================
   * FLOWER TYPES
   * =======================================================
   */

  const flowerTypes =
    useMemo(() => {
      const values =
        marketplaceFlowers
          .flatMap(
            (flower) =>
              flower
                .flowerTypes ??
              []
          )
          .map(
            (type) =>
              type.trim()
          )
          .filter(
            Boolean
          );

      const unique =
        Array.from(
          new Set(
            values
          )
        );

      return [
        "All",
        ...unique.slice(
          0,
          5
        ),
      ];
    }, [
      marketplaceFlowers,
    ]);

  /*
   * =======================================================
   * OCCASIONS
   * =======================================================
   */

  const occasions =
    useMemo(() => {
      const values =
        marketplaceFlowers
          .flatMap(
            (flower) =>
              flower
                .occasion ??
              []
          )
          .map(
            (occasion) =>
              occasion.trim()
          )
          .filter(
            Boolean
          );

      const unique =
        Array.from(
          new Set(
            values
          )
        );

      return unique.slice(
        0,
        4
      );
    }, [
      marketplaceFlowers,
    ]);

  /*
   * =======================================================
   * DISPLAY DATA
   * =======================================================
   */

  const displayedFlowers =
    flowers.slice(
      0,
      DEFAULT_PRODUCT_LIMIT
    );

  const firstName =
    user?.firstName ||
    "Customer";

  const greeting =
    getGreeting();

  /*
   * =======================================================
   * SEARCH
   * =======================================================
   */

  const handleSearch =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchFlowers({
              search,

              flowerType:
                selectedFlowerType,

              occasion:
                selectedOccasion ??
                undefined,
            });

          setFlowers(
            result
          );
        } catch (
          searchError
        ) {
          setError(
            searchError instanceof
              Error
              ? searchError.message
              : "Unable to search flowers."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        fetchFlowers,
        search,
        selectedFlowerType,
        selectedOccasion,
      ]
    );

  /*
   * =======================================================
   * CLEAR SEARCH
   * =======================================================
   */

  const handleClearSearch =
    useCallback(
      async () => {
        try {
          setSearch(
            ""
          );

          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchFlowers({
              flowerType:
                selectedFlowerType,

              occasion:
                selectedOccasion ??
                undefined,
            });

          setFlowers(
            result
          );
        } catch (
          clearError
        ) {
          setError(
            clearError instanceof
              Error
              ? clearError.message
              : "Unable to reset the search."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        fetchFlowers,
        selectedFlowerType,
        selectedOccasion,
      ]
    );

  /*
   * =======================================================
   * FLOWER TYPE FILTER
   * =======================================================
   */

  const handleFlowerType =
    useCallback(
      async (
        flowerType:
          string
      ) => {
        try {
          setSelectedFlowerType(
            flowerType
          );

          setSelectedOccasion(
            null
          );

          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchFlowers({
              search,

              flowerType,
            });

          setFlowers(
            result
          );
        } catch (
          filterError
        ) {
          setError(
            filterError instanceof
              Error
              ? filterError.message
              : "Unable to filter flowers."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        fetchFlowers,
        search,
      ]
    );

  /*
   * =======================================================
   * OCCASION FILTER
   * =======================================================
   */

  const handleOccasion =
    useCallback(
      async (
        occasion:
          string
      ) => {
        try {
          /*
           * Pressing the selected occasion
           * again resets that occasion.
           */

          if (
            selectedOccasion ===
            occasion
          ) {
            setSelectedOccasion(
              null
            );

            setSelectedFlowerType(
              "All"
            );

            setLoading(
              true
            );

            const resetResult =
              await fetchFlowers({
                search,
              });

            setFlowers(
              resetResult
            );

            return;
          }

          setSelectedOccasion(
            occasion
          );

          setSelectedFlowerType(
            "All"
          );

          setLoading(
            true
          );

          setError(
            null
          );

          const result =
            await fetchFlowers({
              search,

              occasion,
            });

          setFlowers(
            result
          );
        } catch (
          filterError
        ) {
          setError(
            filterError instanceof
              Error
              ? filterError.message
              : "Unable to filter flowers."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        fetchFlowers,
        search,
        selectedOccasion,
      ]
    );

  /*
   * =======================================================
   * NAVIGATION
   * =======================================================
   */

  const handleViewAll =
    useCallback(() => {
      router.push(
        "/(customer)/customer-discover"
      );
    }, []);

const handleImageSearch =
  useCallback(() => {
    router.push(
      "/(customer)/customer-discover?action=image-search"
    );
  }, []);

const handleAdvancedFilters =
  useCallback(() => {
    router.push(
      "/(customer)/customer-discover?action=filter"
    );
  }, []);

const handleOrdersPress =
  useCallback(() => {
    router.push(
      "/(customer)/customer-orders"
    );
  }, []);

  /*
   * =======================================================
   * CURRENT PURCHASE NAVIGATION
   * =======================================================
   */

  const handleCurrentPurchasePress =
    useCallback(() => {
      if (
        !currentPurchase
      ) {
        handleOrdersPress();

        return;
      }

      if (
        currentPurchase.kind ===
        "checkout"
      ) {
        router.push({
          pathname:
            "/(customer)/customer-order-details",

          params: {
            checkoutId:
              currentPurchase
                .checkout._id,
          },
        } as never);

        return;
      }

      router.push({
        pathname:
          "/(customer)/customer-order-details",

        params: {
          orderId:
            currentPurchase
              .order._id,
        },
      } as never);
    }, [
      currentPurchase,
      handleOrdersPress,
    ]);

  const handleTrackCurrentPurchase =
    useCallback(() => {
      if (
        !currentPurchase ||
        !currentPurchaseDelivery
      ) {
        handleCurrentPurchasePress();

        return;
      }

      let linkedOrderId =
        "";

      if (
        currentPurchase.kind ===
        "order"
      ) {
        linkedOrderId =
          currentPurchase
            .order._id;
      } else {
        linkedOrderId =
          getDeliveryOrderId(
            currentPurchaseDelivery
          );
      }

      router.push({
        pathname:
          "/(customer)/customer-tracking",

        params: {
          deliveryId:
            currentPurchaseDelivery._id,

          ...(linkedOrderId
            ? {
                orderId:
                  linkedOrderId,
              }
            : {}),
        },
      } as never);
    }, [
      currentPurchase,
      currentPurchaseDelivery,
      handleCurrentPurchasePress,
    ]);

  /*
   * =======================================================
   * PRODUCT DETAILS
   * =======================================================
   */

  const handleFlowerPress =
    useCallback(
      (
        flower:
          FlowerListing
      ) => {
        router.push({
          pathname:
            "/(customer)/customer-product-details",

          params: {
            flowerId:
              flower._id,
          },
        });
      },
      []
    );

  /*
   * =======================================================
   * CURRENT PURCHASE PRESENTATION
   * =======================================================
   */

  const currentPurchasePresentation =
    useMemo(() => {
      if (
        !currentPurchase
      ) {
        return null;
      }

      if (
        currentPurchase.kind ===
        "order"
      ) {
        const order =
          currentPurchase.order;

        const status =
          getOrderStatusMeta(
            order.orderStatus
          );

        const floristName =
          order.florist &&
          typeof order.florist ===
            "object"
            ? order.florist
                .shopName ||
              "FLOGRAM Florist"
            : "FLOGRAM Florist";

        return {
          title:
            order.productName ||
            "Flower Order",

          subtitle:
            floristName,

          reference:
            `#${order._id
              .slice(-8)
              .toUpperCase()}`,

          status:
            status.label,

          statusIcon:
            status.icon,

          statusBackground:
            status.background,

          statusForeground:
            status.foreground,

          total:
            Number(
              order.totalAmount ||
                0
            ),

          itemCount:
            1,

          orderCount:
            1,

          isGrouped:
            false,

          isDelivered:
            order.orderStatus ===
            "delivered",
        };
      }

      const checkout =
        currentPurchase.checkout;

      const primaryStatus =
        getCheckoutPrimaryOrderStatus(
          checkout
        );

      const status =
        getOrderStatusMeta(
          primaryStatus
        );

      const firstItem =
        checkout.items?.[0];

      const title =
        checkout.items.length >
        1
          ? `${firstItem?.productName || "Flower Order"} + ${
              checkout.items.length -
              1
            } more`
          : firstItem
              ?.productName ||
            "Flower Purchase";

      return {
        title,

        subtitle:
          checkout.shopBreakdown
            ?.length ===
          1
            ? checkout
                .shopBreakdown[0]
                ?.shopName ||
              "FLOGRAM Florist"
            : `${checkout.shopBreakdown?.length || 0} florists`,

        reference:
          `#${checkout._id
            .slice(-8)
            .toUpperCase()}`,

        status:
          getCheckoutDisplayStatus(
            checkout
          ),

        statusIcon:
          status.icon,

        statusBackground:
          status.background,

        statusForeground:
          status.foreground,

        total:
          Number(
            checkout.totalAmount ||
              0
          ),

        itemCount:
          checkout.items
            ?.length ||
          0,

        orderCount:
          checkout.orders
            ?.length ||
          0,

        isGrouped:
          true,

        isDelivered:
          primaryStatus ===
          "delivered",
      };
    }, [
      currentPurchase,
    ]);

  /*
   * =======================================================
   * INITIAL LOADING
   * =======================================================
   */

  if (
    loading &&
    marketplaceFlowers.length ===
      0 &&
    !error
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#E55B8E"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading flowers...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * RENDER
   * =======================================================
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                void loadHomeData(
                  true
                )
              }
              tintColor="#E55B8E"
              colors={[
                "#E55B8E",
              ]}
            />
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
            <View
              style={
                styles.headerTop
              }
            >
              <View
                style={
                  styles.greetingContainer
                }
              >
                <Text
                  style={
                    styles.greetingText
                  }
                >
                  {greeting} 🌸
                </Text>

                <Text
                  style={
                    styles.userName
                  }
                  numberOfLines={
                    1
                  }
                >
                  {
                    firstName
                  }
                </Text>
              </View>

              <View
                style={
                  styles.headerActions
                }
              >
                <Pressable
                  style={
                    styles.headerIconButton
                  }
                  onPress={
                    handleOrdersPress
                  }
                >
                  <Ionicons
                    name="receipt-outline"
                    size={20}
                    color="#DF628F"
                  />
                </Pressable>

                <Pressable
                  style={
                    styles.headerIconButton
                  }
                  onPress={() =>
                    router.push(
                      "/(customer)/customer-notifications"
                    )
                  }
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color="#DF628F"
                  />

                  {unreadCount >
                  0 ? (
                    <View
                      style={
                        styles.notificationBadge
                      }
                    >
                      <Text
                        style={
                          styles.notificationBadgeText
                        }
                      >
                        {unreadCount >
                        99
                          ? "99+"
                          : unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/*
             * ===================================================
             * SEARCH
             * ===================================================
             */}

            <View
              style={
                styles.searchRow
              }
            >
              <View
                style={
                  styles.searchContainer
                }
              >
                <Ionicons
                  name="search-outline"
                  size={19}
                  color="#B7B1B5"
                />

                <TextInput
                  style={
                    styles.searchInput
                  }
                  placeholder="Search flowers, bouquets..."
                  placeholderTextColor="#B6AFB3"
                  value={
                    search
                  }
                  onChangeText={
                    setSearch
                  }
                  returnKeyType="search"
                  onSubmitEditing={() =>
                    void handleSearch()
                  }
                />

                {search.length >
                0 ? (
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      void handleClearSearch()
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color="#C8C1C5"
                    />
                  </Pressable>
                ) : null}

                <Pressable
                  style={
                    styles.cameraButton
                  }
                  hitSlop={8}
                  onPress={
                    handleImageSearch
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={20}
                    color="#DC648F"
                  />
                </Pressable>
              </View>

              <Pressable
                style={
                  styles.filterButton
                }
                onPress={
                  handleAdvancedFilters
                }
              >
                <Ionicons
                  name="options-outline"
                  size={20}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </View>

          {/*
           * =====================================================
           * HERO
           * =====================================================
           */}

          <View
            style={
              styles.banner
            }
          >
            <View
              style={
                styles.bannerCircleOne
              }
            />

            <View
              style={
                styles.bannerCircleTwo
              }
            />

            <View
              style={
                styles.bannerContent
              }
            >
              <Text
                style={
                  styles.offerText
                }
              >
                FLOWERS FOR EVERY
                MOMENT
              </Text>

              <Text
                style={
                  styles.bannerTitle
                }
              >
                Say it with
                {"\n"}
                Fresh Flowers
              </Text>

              <Pressable
                style={
                  styles.shopButton
                }
                onPress={
                  handleViewAll
                }
              >
                <Text
                  style={
                    styles.shopButtonText
                  }
                >
                  Explore Flowers
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={13}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>

            <View
              style={
                styles.bannerIconContainer
              }
            >
              <Ionicons
                name="flower-outline"
                size={78}
                color="rgba(255,255,255,0.55)"
              />
            </View>
          </View>

          {/*
           * =====================================================
           * CURRENT ORDER
           * =====================================================
           */}

          <View
            style={
              styles.currentSectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.currentSectionTitle
                }
              >
                Current Order
              </Text>

              <Text
                style={
                  styles.currentSectionSubtitle
                }
              >
                Your latest active
                purchase
              </Text>
            </View>

            <Pressable
              hitSlop={8}
              onPress={
                handleOrdersPress
              }
            >
              <Text
                style={
                  styles.viewAllText
                }
              >
                My Orders
              </Text>
            </Pressable>
          </View>

          {currentPurchase &&
          currentPurchasePresentation ? (
            <View
              style={
                styles.currentOrderCard
              }
            >
              <Pressable
                style={
                  styles.currentOrderMain
                }
                onPress={
                  handleCurrentPurchasePress
                }
              >
                <View
                  style={
                    styles.currentOrderTop
                  }
                >
                  <View
                    style={
                      styles.currentOrderIcon
                    }
                  >
                    <Ionicons
                      name="bag-handle-outline"
                      size={22}
                      color="#DF5D8D"
                    />
                  </View>

                  <View
                    style={
                      styles.currentOrderHeading
                    }
                  >
                    <Text
                      style={
                        styles.currentOrderReference
                      }
                    >
                      {
                        currentPurchasePresentation.reference
                      }
                    </Text>

                    <Text
                      style={
                        styles.currentOrderTitle
                      }
                      numberOfLines={
                        2
                      }
                    >
                      {
                        currentPurchasePresentation.title
                      }
                    </Text>

                    <Text
                      style={
                        styles.currentOrderShop
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {
                        currentPurchasePresentation.subtitle
                      }
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#BFB6BA"
                  />
                </View>

                <View
                  style={
                    styles.currentOrderDivider
                  }
                />

                <View
                  style={
                    styles.currentOrderMetaRow
                  }
                >
                  <View
                    style={[
                      styles.currentStatusBadge,

                      {
                        backgroundColor:
                          currentPurchasePresentation.statusBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        currentPurchasePresentation.statusIcon
                      }
                      size={14}
                      color={
                        currentPurchasePresentation.statusForeground
                      }
                    />

                    <Text
                      style={[
                        styles.currentStatusText,

                        {
                          color:
                            currentPurchasePresentation.statusForeground,
                        },
                      ]}
                    >
                      {
                        currentPurchasePresentation.status
                      }
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.currentOrderTotal
                    }
                  >
                    {formatPrice(
                      currentPurchasePresentation.total
                    )}
                  </Text>
                </View>

                {currentPurchasePresentation
                  .isDelivered ? (
                  <View
                    style={
                      styles.deliveredHint
                    }
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={15}
                      color="#4E8A59"
                    />

                    <Text
                      style={
                        styles.deliveredHintText
                      }
                    >
                      Delivered — open
                      the order to
                      confirm receipt.
                    </Text>
                  </View>
                ) : null}
              </Pressable>

              <View
                style={
                  styles.currentOrderActions
                }
              >
                {currentPurchaseDelivery &&
                currentPurchaseDelivery.status !==
                  "cancelled" ? (
                  <Pressable
                    style={
                      styles.trackCurrentButton
                    }
                    onPress={
                      handleTrackCurrentPurchase
                    }
                  >
                    <Ionicons
                      name="navigate-outline"
                      size={16}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.trackCurrentButtonText
                      }
                    >
                      Track Delivery
                    </Text>
                  </Pressable>
                ) : null}

                <Pressable
                  style={[
                    styles.viewOrderButton,

                    currentPurchaseDelivery &&
                      currentPurchaseDelivery.status !==
                        "cancelled" &&
                      styles.viewOrderButtonSecondary,
                  ]}
                  onPress={
                    handleCurrentPurchasePress
                  }
                >
                  <Text
                    style={[
                      styles.viewOrderButtonText,

                      currentPurchaseDelivery &&
                        currentPurchaseDelivery.status !==
                          "cancelled" &&
                        styles.viewOrderButtonTextSecondary,
                    ]}
                  >
                    View Order
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color={
                      currentPurchaseDelivery &&
                      currentPurchaseDelivery.status !==
                        "cancelled"
                        ? "#D75C7A"
                        : "#FFFFFF"
                    }
                  />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={
                styles.noCurrentOrderCard
              }
              onPress={
                handleViewAll
              }
            >
              <View
                style={
                  styles.noCurrentOrderIcon
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={25}
                  color="#DC648F"
                />
              </View>

              <View
                style={
                  styles.noCurrentOrderContent
                }
              >
                <Text
                  style={
                    styles.noCurrentOrderTitle
                  }
                >
                  No active orders
                </Text>

                <Text
                  style={
                    styles.noCurrentOrderText
                  }
                >
                  Explore fresh
                  bouquets from
                  FLOGRAM florists.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#C8BEC2"
              />
            </Pressable>
          )}

          {/*
           * =====================================================
           * FLOWER TYPES
           * =====================================================
           */}

          {flowerTypes.length >
          1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              style={
                styles.categoryScroll
              }
              contentContainerStyle={
                styles.categoryContainer
              }
            >
              {flowerTypes.map(
                (
                  flowerType
                ) => {
                  const selected =
                    selectedFlowerType ===
                      flowerType &&
                    !selectedOccasion;

                  return (
                    <Pressable
                      key={
                        flowerType
                      }
                      style={[
                        styles.categoryButton,

                        selected &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() =>
                        void handleFlowerType(
                          flowerType
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.categoryText,

                          selected &&
                            styles.categoryTextActive,
                        ]}
                      >
                        {flowerType ===
                        "All"
                          ? "All"
                          : pluralizeFlowerType(
                              flowerType
                            )}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          ) : null}

          {/*
           * =====================================================
           * OCCASIONS
           * =====================================================
           */}

          {occasions.length >
          0 ? (
            <>
              <View
                style={
                  styles.smallSectionHeader
                }
              >
                <Text
                  style={
                    styles.smallSectionTitle
                  }
                >
                  Shop by Occasion
                </Text>
              </View>

              <View
                style={
                  styles.occasionRow
                }
              >
                {occasions.map(
                  (
                    occasion
                  ) => {
                    const selected =
                      selectedOccasion ===
                      occasion;

                    return (
                      <Pressable
                        key={
                          occasion
                        }
                        style={[
                          styles.occasionCard,

                          selected &&
                            styles.occasionCardActive,
                        ]}
                        onPress={() =>
                          void handleOccasion(
                            occasion
                          )
                        }
                      >
                        <View
                          style={[
                            styles.occasionIconContainer,

                            selected &&
                              styles.occasionIconContainerActive,
                          ]}
                        >
                          <Ionicons
                            name={getOccasionIcon(
                              occasion
                            )}
                            size={21}
                            color={
                              selected
                                ? "#FFFFFF"
                                : "#DF628F"
                            }
                          />
                        </View>

                        <Text
                          numberOfLines={
                            1
                          }
                          style={[
                            styles.occasionLabel,

                            selected &&
                              styles.occasionLabelActive,
                          ]}
                        >
                          {
                            occasion
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>
            </>
          ) : null}

          {/*
           * =====================================================
           * PRODUCTS
           * =====================================================
           */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionTitle
                }
              >
                {selectedOccasion
                  ? `${selectedOccasion} Flowers`
                  : selectedFlowerType !==
                      "All"
                    ? `${pluralizeFlowerType(
                        selectedFlowerType
                      )} for You`
                    : search.trim()
                      ? "Search Results"
                      : "Explore Bouquets"}
              </Text>

              {!search.trim() &&
              !selectedOccasion &&
              selectedFlowerType ===
                "All" ? (
                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Fresh listings
                  from FLOGRAM
                  florists
                </Text>
              ) : null}
            </View>

            <Pressable
              onPress={
                handleViewAll
              }
              hitSlop={8}
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

          {loading &&
          marketplaceFlowers.length >
            0 ? (
            <View
              style={
                styles.inlineLoading
              }
            >
              <ActivityIndicator
                size="small"
                color="#E55B8E"
              />

              <Text
                style={
                  styles.inlineLoadingText
                }
              >
                Updating flowers...
              </Text>
            </View>
          ) : null}

          {!loading &&
          error ? (
            <View
              style={
                styles.messageCard
              }
            >
              <View
                style={
                  styles.messageIconContainer
                }
              >
                <Ionicons
                  name="cloud-offline-outline"
                  size={27}
                  color="#DF628F"
                />
              </View>

              <Text
                style={
                  styles.messageTitle
                }
              >
                Unable to load
                flowers
              </Text>

              <Text
                style={
                  styles.messageDescription
                }
              >
                {error}
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={() =>
                  void loadHomeData()
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
          ) : null}

          {!loading &&
          !error &&
          displayedFlowers.length ===
            0 ? (
            <View
              style={
                styles.messageCard
              }
            >
              <View
                style={
                  styles.messageIconContainer
                }
              >
                <Ionicons
                  name="flower-outline"
                  size={28}
                  color="#DF628F"
                />
              </View>

              <Text
                style={
                  styles.messageTitle
                }
              >
                No flowers found
              </Text>

              <Text
                style={
                  styles.messageDescription
                }
              >
                Try another flower
                type, occasion, or
                search term.
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={
                  handleViewAll
                }
              >
                <Text
                  style={
                    styles.retryButtonText
                  }
                >
                  Browse All Flowers
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!error &&
          displayedFlowers.length >
            0 ? (
            <View
              style={
                styles.productGrid
              }
            >
              {displayedFlowers.map(
                (
                  flower
                ) => {
                  const imageUrl =
                    getImageUrl(
                      flower
                        .images?.[0]
                    );

                  return (
                    <Pressable
                      key={
                        flower._id
                      }
                      style={
                        styles.productCard
                      }
                      onPress={() =>
                        handleFlowerPress(
                          flower
                        )
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
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={
                              styles.productImageFallback
                            }
                          >
                            <Ionicons
                              name="flower-outline"
                              size={46}
                              color="#DF8BA9"
                            />

                            <Text
                              style={
                                styles.noImageText
                              }
                            >
                              No image
                            </Text>
                          </View>
                        )}

                        {flower.isAvailable ? (
                          <View
                            style={
                              styles.availabilityBadge
                            }
                          >
                            <View
                              style={
                                styles.availabilityDot
                              }
                            />

                            <Text
                              style={
                                styles.availabilityText
                              }
                            >
                              Available
                            </Text>
                          </View>
                        ) : (
                          <View
                            style={
                              styles.unavailableBadge
                            }
                          >
                            <Text
                              style={
                                styles.unavailableText
                              }
                            >
                              Unavailable
                            </Text>
                          </View>
                        )}
                      </View>

                      <View
                        style={
                          styles.productInfo
                        }
                      >
                        <Text
                          style={
                            styles.shopName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {flower
                            .florist
                            ?.shopName ??
                            "FLOGRAM Florist"}
                        </Text>

                        <Text
                          style={
                            styles.productName
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            flower.name
                          }
                        </Text>

                        <View
                          style={
                            styles.productFooter
                          }
                        >
                          <Text
                            style={
                              styles.productPrice
                            }
                          >
                            {formatPrice(
                              flower.price
                            )}
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color="#C5BCC1"
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>
          ) : null}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/*
         * =======================================================
         * BOTTOM NAVIGATION
         * =======================================================
         */}

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
              <Ionicons
                name="home"
                size={19}
                color="#DF5D8D"
              />
            </View>

            <Text
              style={
                styles.activeNavText
              }
            >
              Home
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(customer)/customer-discover"
              )
            }
          >
            <Ionicons
              name="search-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Discover
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(customer)/customer-bloomboard"
              )
            }
          >
            <Ionicons
              name="flower-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Bloom
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(customer)/customer-cart"
              )
            }
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Cart
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(customer)/customer-ai"
              )
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              AI
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(customer)/customer-profile"
              )
            }
          >
            <Ionicons
              name="person-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Me
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
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
        "#FFFFFF",
    },

    screen: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        17,

      paddingTop: 18,
    },

    /*
     * LOADING
     */

    loadingContainer: {
      flex: 1,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 12,
    },

    loadingText: {
      color:
        "#8C8489",

      fontSize: 13,
    },

    inlineLoading: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 8,

      paddingVertical:
        15,
    },

    inlineLoadingText: {
      color:
        "#989095",

      fontSize: 11,
    },

    /*
     * HEADER
     */

    header: {
      marginBottom: 16,
    },

    headerTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    greetingContainer: {
      flex: 1,

      paddingRight: 15,
    },

    greetingText: {
      color:
        "#A59CA2",

      fontSize: 12,

      marginBottom: 2,
    },

    userName: {
      color:
        "#40383F",

      fontSize: 25,

      fontWeight:
        "800",
    },

    headerActions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    headerIconButton: {
      width: 42,

      height: 42,

      borderRadius: 21,

      backgroundColor:
        "#FFF0F5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    notificationBadge: {
      position:
        "absolute",

      top: -4,

      right: -3,

      minWidth: 18,

      height: 18,

      paddingHorizontal: 4,

      borderRadius: 9,

      backgroundColor:
        "#DE5A8B",

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 2,

      borderColor:
        "#FFFFFF",
    },

    notificationBadgeText: {
      color:
        "#FFFFFF",

      fontSize: 8,

      fontWeight:
        "800",
    },

    /*
     * SEARCH
     */

    searchRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 18,

      gap: 9,
    },

    searchContainer: {
      flex: 1,

      height: 50,

      borderRadius: 16,

      backgroundColor:
        "#FAF8F9",

      borderWidth: 1,

      borderColor:
        "#F3EFF1",

      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal: 14,
    },

    searchInput: {
      flex: 1,

      color:
        "#494249",

      fontSize: 12,

      marginLeft: 9,

      paddingVertical: 0,
    },

    cameraButton: {
      marginLeft: 8,

      width: 28,

      height: 32,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    filterButton: {
      width: 46,

      height: 46,

      borderRadius: 23,

      backgroundColor:
        "#DE6692",

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        "#DE6692",

      shadowOpacity:
        0.18,

      shadowRadius: 6,

      shadowOffset: {
        width: 0,

        height: 3,
      },

      elevation: 3,
    },

    /*
     * HERO
     */

    banner: {
      height: 156,

      borderRadius: 21,

      overflow:
        "hidden",

      backgroundColor:
        "#F5E5E9",

      padding: 18,

      marginBottom: 2,
    },

    bannerCircleOne: {
      position:
        "absolute",

      width: 175,

      height: 175,

      borderRadius: 90,

      backgroundColor:
        "#8B545E",

      right: -50,

      bottom: -52,

      opacity: 0.88,
    },

    bannerCircleTwo: {
      position:
        "absolute",

      width: 110,

      height: 110,

      borderRadius: 60,

      backgroundColor:
        "#FFFFFF",

      right: 52,

      bottom: -64,

      opacity: 0.22,
    },

    bannerContent: {
      zIndex: 2,

      width:
        "70%",
    },

    offerText: {
      color:
        "#D55E86",

      fontSize: 8,

      fontWeight:
        "800",

      letterSpacing:
        0.7,
    },

    bannerTitle: {
      color:
        "#48353B",

      fontSize: 21,

      lineHeight: 24,

      fontWeight:
        "800",

      marginTop: 6,
    },

    shopButton: {
      alignSelf:
        "flex-start",

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#E35E8E",

      paddingHorizontal:
        15,

      height: 32,

      borderRadius: 17,

      marginTop: 11,

      gap: 6,
    },

    shopButtonText: {
      color:
        "#FFFFFF",

      fontSize: 9,

      fontWeight:
        "700",
    },

    bannerIconContainer: {
      position:
        "absolute",

      right: 20,

      bottom: 21,

      transform: [
        {
          rotate:
            "-12deg",
        },
      ],
    },

    /*
     * CURRENT ORDER
     */

    currentSectionHeader: {
      marginTop: 20,

      marginBottom: 10,

      flexDirection:
        "row",

      alignItems:
        "flex-end",

      justifyContent:
        "space-between",
    },

    currentSectionTitle: {
      color:
        "#403A40",

      fontSize: 15,

      fontWeight:
        "800",
    },

    currentSectionSubtitle: {
      marginTop: 3,

      color:
        "#A39CA0",

      fontSize: 9,
    },

    currentOrderCard: {
      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        "#F0E7EA",

      backgroundColor:
        "#FFFFFF",

      overflow:
        "hidden",

      shadowColor:
        "#000000",

      shadowOpacity:
        0.035,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,

        height: 3,
      },

      elevation: 2,
    },

    currentOrderMain: {
      padding: 14,
    },

    currentOrderTop: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    currentOrderIcon: {
      width: 45,

      height: 45,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",

      backgroundColor:
        "#FFF0F5",
    },

    currentOrderHeading: {
      flex: 1,

      marginLeft: 11,

      marginRight: 8,
    },

    currentOrderReference: {
      color:
        "#AAA1A6",

      fontSize: 8,

      fontWeight:
        "700",
    },

    currentOrderTitle: {
      marginTop: 2,

      color:
        "#433C41",

      fontSize: 13,

      lineHeight: 17,

      fontWeight:
        "800",
    },

    currentOrderShop: {
      marginTop: 3,

      color:
        "#9F979C",

      fontSize: 9,
    },

    currentOrderDivider: {
      height: 1,

      backgroundColor:
        "#F2ECEE",

      marginVertical: 12,
    },

    currentOrderMetaRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    currentStatusBadge: {
      minHeight: 28,

      paddingHorizontal:
        9,

      borderRadius: 14,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    currentStatusText: {
      fontSize: 9,

      fontWeight:
        "800",
    },

    currentOrderTotal: {
      color:
        "#D85884",

      fontSize: 14,

      fontWeight:
        "900",
    },

    deliveredHint: {
      marginTop: 11,

      paddingHorizontal:
        9,

      paddingVertical:
        8,

      borderRadius: 10,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,

      backgroundColor:
        "#EEF8F0",
    },

    deliveredHintText: {
      flex: 1,

      fontSize: 9,

      lineHeight: 13,

      color:
        "#618069",
    },

    currentOrderActions: {
      borderTopWidth: 1,

      borderTopColor:
        "#F1EBED",

      padding: 11,

      flexDirection:
        "row",

      gap: 8,

      backgroundColor:
        "#FCFAFB",
    },

    trackCurrentButton: {
      flex: 1,

      minHeight: 40,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      backgroundColor:
        "#D75C7A",
    },

    trackCurrentButtonText: {
      color:
        "#FFFFFF",

      fontSize: 10,

      fontWeight:
        "800",
    },

    viewOrderButton: {
      flex: 1,

      minHeight: 40,

      borderRadius: 13,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      backgroundColor:
        "#D75C7A",
    },

    viewOrderButtonSecondary: {
      borderWidth: 1,

      borderColor:
        "#F0CBD4",

      backgroundColor:
        "#FFFFFF",
    },

    viewOrderButtonText: {
      color:
        "#FFFFFF",

      fontSize: 10,

      fontWeight:
        "800",
    },

    viewOrderButtonTextSecondary: {
      color:
        "#D75C7A",
    },

    noCurrentOrderCard: {
      minHeight: 88,

      padding: 14,

      borderRadius: 18,

      borderWidth: 1,

      borderColor:
        "#F0E9EB",

      backgroundColor:
        "#FCFAFB",

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    noCurrentOrderIcon: {
      width: 46,

      height: 46,

      borderRadius: 15,

      backgroundColor:
        "#FFF0F5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    noCurrentOrderContent: {
      flex: 1,

      marginLeft: 11,

      marginRight: 8,
    },

    noCurrentOrderTitle: {
      color:
        "#4B4449",

      fontSize: 12,

      fontWeight:
        "800",
    },

    noCurrentOrderText: {
      marginTop: 3,

      color:
        "#9C9499",

      fontSize: 9,

      lineHeight: 13,
    },

    /*
     * CATEGORIES
     */

    categoryScroll: {
      marginHorizontal:
        -17,
    },

    categoryContainer: {
      gap: 8,

      paddingVertical: 14,

      paddingHorizontal: 17,
    },

    categoryButton: {
      height: 33,

      paddingHorizontal: 17,

      borderRadius: 17,

      backgroundColor:
        "#F8F6F7",

      alignItems:
        "center",

      justifyContent:
        "center",

      borderWidth: 1,

      borderColor:
        "#F3EFF1",
    },

    categoryButtonActive: {
      backgroundColor:
        "#E55E90",

      borderColor:
        "#E55E90",
    },

    categoryText: {
      color:
        "#827B80",

      fontSize: 10,

      fontWeight:
        "600",
    },

    categoryTextActive: {
      color:
        "#FFFFFF",

      fontWeight:
        "700",
    },

    /*
     * OCCASIONS
     */

    smallSectionHeader: {
      marginTop: 3,

      marginBottom: 10,
    },

    smallSectionTitle: {
      color:
        "#403A40",

      fontSize: 13,

      fontWeight:
        "800",
    },

    occasionRow: {
      flexDirection:
        "row",

      gap: 8,
    },

    occasionCard: {
      flex: 1,

      minWidth: 0,

      height: 80,

      borderRadius: 15,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#F0EBEE",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 4,

      shadowColor:
        "#000000",

      shadowOpacity:
        0.025,

      shadowRadius: 5,

      shadowOffset: {
        width: 0,

        height: 2,
      },

      elevation: 1,
    },

    occasionCardActive: {
      backgroundColor:
        "#FFF5F8",

      borderColor:
        "#EFA9C1",
    },

    occasionIconContainer: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#FFF1F5",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    occasionIconContainerActive:
      {
        backgroundColor:
          "#E55E90",
      },

    occasionLabel: {
      color:
        "#777077",

      fontSize: 8,

      marginTop: 6,

      maxWidth:
        "100%",
    },

    occasionLabelActive: {
      color:
        "#D95887",

      fontWeight:
        "700",
    },

    /*
     * PRODUCTS
     */

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "flex-end",

      justifyContent:
        "space-between",

      marginTop: 21,

      marginBottom: 11,
    },

    sectionTitle: {
      color:
        "#403A40",

      fontSize: 15,

      fontWeight:
        "800",
    },

    sectionSubtitle: {
      color:
        "#A39CA0",

      fontSize: 9,

      marginTop: 3,
    },

    viewAllText: {
      color:
        "#DB5D8B",

      fontSize: 10,

      fontWeight:
        "700",
    },

    productGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      justifyContent:
        "space-between",

      rowGap: 15,
    },

    productCard: {
      width:
        "48.4%",

      backgroundColor:
        "#FFFFFF",

      borderRadius: 17,

      overflow:
        "hidden",

      borderWidth: 1,

      borderColor:
        "#F2EDF0",

      shadowColor:
        "#000000",

      shadowOpacity:
        0.035,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,

        height: 3,
      },

      elevation: 2,
    },

    productImageContainer: {
      width:
        "100%",

      aspectRatio:
        1.12,

      backgroundColor:
        "#F7E8ED",

      overflow:
        "hidden",
    },

    productImage: {
      width:
        "100%",

      height:
        "100%",
    },

    productImageFallback: {
      flex: 1,

      backgroundColor:
        "#F8E9EE",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,
    },

    noImageText: {
      color:
        "#B99DA7",

      fontSize: 8,

      fontWeight:
        "600",
    },

    availabilityBadge: {
      position:
        "absolute",

      left: 8,

      bottom: 8,

      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "rgba(255,255,255,0.94)",

      borderRadius: 10,

      paddingHorizontal: 7,

      paddingVertical: 4,

      gap: 4,
    },

    availabilityDot: {
      width: 5,

      height: 5,

      borderRadius: 3,

      backgroundColor:
        "#52A66A",
    },

    availabilityText: {
      color:
        "#607064",

      fontSize: 7,

      fontWeight:
        "700",
    },

    unavailableBadge: {
      position:
        "absolute",

      left: 8,

      bottom: 8,

      backgroundColor:
        "rgba(255,255,255,0.95)",

      borderRadius: 10,

      paddingHorizontal: 7,

      paddingVertical: 4,
    },

    unavailableText: {
      color:
        "#A85B68",

      fontSize: 7,

      fontWeight:
        "700",
    },

    productInfo: {
      paddingHorizontal: 10,

      paddingTop: 9,

      paddingBottom: 11,
    },

    shopName: {
      color:
        "#A69DA3",

      fontSize: 8,

      marginBottom: 3,
    },

    productName: {
      color:
        "#494147",

      fontSize: 11,

      lineHeight: 14,

      fontWeight:
        "700",

      minHeight: 28,
    },

    productFooter: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginTop: 5,
    },

    productPrice: {
      color:
        "#DE5D8B",

      fontSize: 11,

      fontWeight:
        "800",
    },

    /*
     * ERROR / EMPTY
     */

    messageCard: {
      minHeight: 215,

      borderRadius: 18,

      backgroundColor:
        "#FCF9FA",

      borderWidth: 1,

      borderColor:
        "#F1EBEE",

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingHorizontal: 25,

      paddingVertical: 25,
    },

    messageIconContainer: {
      width: 52,

      height: 52,

      borderRadius: 26,

      backgroundColor:
        "#FFF0F5",

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 11,
    },

    messageTitle: {
      color:
        "#4A4247",

      fontSize: 14,

      fontWeight:
        "800",

      textAlign:
        "center",
    },

    messageDescription: {
      color:
        "#938A90",

      fontSize: 10,

      lineHeight: 15,

      textAlign:
        "center",

      marginTop: 6,

      maxWidth: 260,
    },

    retryButton: {
      backgroundColor:
        "#E25F8E",

      borderRadius: 16,

      paddingHorizontal: 17,

      paddingVertical: 9,

      marginTop: 14,
    },

    retryButtonText: {
      color:
        "#FFFFFF",

      fontSize: 9,

      fontWeight:
        "700",
    },

    bottomSpacer: {
      height: 25,
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNavigation: {
      height: 72,

      backgroundColor:
        "#FFFFFF",

      borderTopWidth: 1,

      borderTopColor:
        "#F0EDEF",

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-around",

      paddingBottom: 3,

      shadowColor:
        "#000000",

      shadowOpacity:
        0.035,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,

        height: -2,
      },

      elevation: 5,
    },

    navItem: {
      flex: 1,

      height:
        "100%",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    activeNavIcon: {
      width: 37,

      height: 30,

      borderRadius: 16,

      backgroundColor:
        "#FFE8F0",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    activeNavText: {
      color:
        "#DF5D8D",

      fontSize: 8,

      fontWeight:
        "700",

      marginTop: 3,
    },

    navText: {
      color:
        "#A7A1A5",

      fontSize: 8,

      marginTop: 4,
    },
  });