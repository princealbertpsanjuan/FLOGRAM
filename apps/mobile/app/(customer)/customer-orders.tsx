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
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { apiRequest } from "../../services/api";

/*
 * =========================================================
 * API
 * =========================================================
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "";

const API_ORIGIN = API_URL
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/+$/, "");

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "completed"
  | "cancelled"
  | string;

type PaymentStatus =
  | "unpaid"
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | string;

type Florist = {
  _id?: string;
  shopName?: string;
  shopLogo?: string | null;

  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  };
};

type Order = {
  _id: string;

  florist?: Florist | string | null;

  sourceType?:
    | "flower_listing"
    | "custom_bouquet"
    | string;

  flower?: string | null;

  customBouquetRequest?: string | null;

  productName?: string;

  productDescription?: string | null;

  inspirationImage?: string | null;

  unitPrice?: number;

  quantity?: number;

  subtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  fulfillmentType?:
    | "delivery"
    | "pickup"
    | string;

  requestedDeliveryDate?: string | null;

  requestedDeliveryTimeStart?: string | null;

  requestedDeliveryTimeEnd?: string | null;

  isPreOrder?: boolean;

  paymentMethod?: string;

  paymentStatus?: PaymentStatus;

  orderStatus?: OrderStatus;

  createdAt?: string;

  updatedAt?: string;
};

type OrdersResponse = {
  success: boolean;

  message?: string;

  data?: {
    count?: number;
    orders?: Order[];
  };
};

type FilterType =
  | "all"
  | "active"
  | "completed"
  | "cancelled";

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

  const value = String(image).trim();

  if (!value) {
    return null;
  }

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
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

const formatMoney = (
  amount?: number | null
) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "₱0.00";
  }

  return `₱${value.toLocaleString(
    "en-PH",
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
    return "Not scheduled";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Not scheduled";
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

const formatStatus = (
  status?: string | null
) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const getFloristName = (
  florist?: Florist | string | null
) => {
  if (
    florist &&
    typeof florist === "object"
  ) {
    return (
      florist.shopName ||
      "FLOGRAM Florist"
    );
  }

  return "FLOGRAM Florist";
};

const getStatusStyle = (
  status?: string
) => {
  switch (status) {
    case "pending":
      return {
        background: "#FFF3DA",
        text: "#A66D12",
      };

    case "confirmed":
      return {
        background: "#EAF2FF",
        text: "#3973B8",
      };

    case "preparing":
      return {
        background: "#F4EAFE",
        text: "#7952A8",
      };

    case "ready_for_delivery":
    case "ready_for_pickup":
      return {
        background: "#E9F6F3",
        text: "#378572",
      };

    case "delivered":
    case "completed":
      return {
        background: "#E9F7EC",
        text: "#37834A",
      };

    case "cancelled":
      return {
        background: "#FDEBEC",
        text: "#B64E59",
      };

    default:
      return {
        background: "#F0EEEE",
        text: "#6B6665",
      };
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerOrdersScreen() {
  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedFilter,
    setSelectedFilter,
  ] = useState<FilterType>("all");

  /*
   * =======================================================
   * LOAD ORDERS
   * =======================================================
   */

  const loadOrders = useCallback(
    async (
      showLoader = true
    ) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage("");

        const response =
          await apiRequest<OrdersResponse>(
            "/orders/mine",
            {
              authenticated: true,
            }
          );

        setOrders(
          response.data?.orders || []
        );
      } catch (error) {
        console.error(
          "Failed to load orders:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load your orders."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await loadOrders(false);
      } finally {
        setRefreshing(false);
      }
    }, [loadOrders]);

  /*
   * =======================================================
   * FILTER
   * =======================================================
   */

  const filteredOrders =
    useMemo(() => {
      switch (selectedFilter) {
        case "active":
          return orders.filter(
            (order) =>
              ![
                "completed",
                "cancelled",
              ].includes(
                order.orderStatus || ""
              )
          );

        case "completed":
          return orders.filter(
            (order) =>
              [
                "delivered",
                "completed",
              ].includes(
                order.orderStatus || ""
              )
          );

        case "cancelled":
          return orders.filter(
            (order) =>
              order.orderStatus ===
              "cancelled"
          );

        default:
          return orders;
      }
    }, [
      orders,
      selectedFilter,
    ]);

  /*
   * =======================================================
   * OPEN DETAILS
   * =======================================================
   */

  const openOrder = useCallback(
    (orderId: string) => {
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
        style={styles.safeArea}
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
            style={styles.loadingText}
          >
            Loading your orders...
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
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <View
        style={styles.screen}
      >
        {/*
         * HEADER
         */}

        <View
          style={styles.header}
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
              {orders.length}{" "}
              {orders.length === 1
                ? "order"
                : "orders"}
            </Text>
          </View>

          <View
            style={
              styles.headerButton
            }
          />
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
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
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
                  Unable to load
                  orders
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  void loadOrders()
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
          filteredOrders.length ===
            0 ? (
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
                {orders.length === 0
                  ? "No orders yet"
                  : "No matching orders"}
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                {orders.length === 0
                  ? "Your flower orders will appear here after checkout."
                  : "There are no orders under this category."}
              </Text>

              {orders.length ===
              0 ? (
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
          ) : (
            filteredOrders.map(
              (order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  onPress={() =>
                    openOrder(
                      order._id
                    )
                  }
                />
              )
            )
          )}

          <View
            style={{
              height: 25,
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
  active,
  onPress,
}: {
  title: string;
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
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterText,

          active &&
            styles.filterTextActive,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * ORDER CARD
 * =========================================================
 */

function OrderCard({
  order,
  onPress,
}: {
  order: Order;
  onPress: () => void;
}) {
  const imageUrl =
    resolveImageUrl(
      order.inspirationImage
    );

  const statusStyle =
    getStatusStyle(
      order.orderStatus
    );

  return (
    <Pressable
      style={styles.orderCard}
      onPress={onPress}
    >
      {/*
       * TOP
       */}

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
            ORDER
          </Text>

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
                statusStyle.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  statusStyle.text,
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

      {/*
       * PRODUCT
       */}

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
                uri: imageUrl,
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
            numberOfLines={1}
          >
            {getFloristName(
              order.florist
            )}
          </Text>

          <Text
            style={
              styles.productName
            }
            numberOfLines={2}
          >
            {order.productName ||
              "Bouquet Order"}
          </Text>

          <Text
            style={
              styles.quantity
            }
          >
            Qty:{" "}
            {order.quantity || 1}
          </Text>
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

      {/*
       * INFO
       */}

      <View
        style={
          styles.infoContainer
        }
      >
        <View
          style={styles.infoRow}
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
          style={styles.infoRow}
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

      {/*
       * PAYMENT
       */}

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
          ]}
        >
          {formatStatus(
            order.paymentStatus
          )}
        </Text>
      </View>
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

    header: {
      minHeight: 72,
      paddingHorizontal: 15,
      backgroundColor:
        "#FFFFFF",
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        "#EAE4E2",
    },

    headerButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent:
        "center",
    },

    headerCenter: {
      flex: 1,
      alignItems: "center",
    },

    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: "#2F2A29",
    },

    headerSubtitle: {
      marginTop: 1,
      fontSize: 11,
      color: "#958D8B",
    },

    filterWrapper: {
      backgroundColor:
        "#FFFFFF",
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        "#EDE8E6",
    },

    filterContainer: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      gap: 8,
    },

    filterButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor:
        "#F4F0EF",
    },

    filterButtonActive: {
      backgroundColor:
        "#D85D7A",
    },

    filterText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#726B69",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      padding: 15,
    },

    centerContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FAF8F7",
    },

    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: "#867E7C",
    },

    errorCard: {
      padding: 14,
      marginBottom: 12,
      borderRadius: 14,
      backgroundColor:
        "#FFF0F3",
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 10,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#A9495B",
    },

    errorText: {
      marginTop: 2,
      fontSize: 12,
      lineHeight: 17,
      color: "#9B6973",
    },

    emptyContainer: {
      paddingTop: 110,
      paddingHorizontal: 30,
      alignItems: "center",
    },

    emptyIcon: {
      width: 105,
      height: 105,
      borderRadius: 53,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFF0F4",
    },

    emptyTitle: {
      marginTop: 20,
      fontSize: 20,
      fontWeight: "800",
      color: "#302C2B",
    },

    emptyDescription: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: "#908886",
      textAlign: "center",
    },

    discoverButton: {
      marginTop: 22,
      minHeight: 46,
      paddingHorizontal: 20,
      borderRadius: 14,
      backgroundColor:
        "#D85D7A",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    discoverButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    orderCard: {
      marginBottom: 12,
      padding: 15,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#ECE6E4",
    },

    orderTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    orderReferenceLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: "#A39B99",
      letterSpacing: 0.7,
    },

    orderReference: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "800",
      color: "#494341",
    },

    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
    },

    statusText: {
      fontSize: 10,
      fontWeight: "800",
    },

    cardDivider: {
      height: 1,
      backgroundColor:
        "#EFEAE8",
      marginVertical: 12,
    },

    productRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    imageContainer: {
      width: 74,
      height: 74,
      borderRadius: 13,
      overflow: "hidden",
      backgroundColor:
        "#F8EFF1",
    },

    productImage: {
      width: "100%",
      height: "100%",
    },

    imagePlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FBEEF1",
    },

    productDetails: {
      flex: 1,
      marginLeft: 12,
    },

    floristName: {
      fontSize: 10,
      fontWeight: "700",
      color: "#D05A75",
    },

    productName: {
      marginTop: 3,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: "#373130",
    },

    quantity: {
      marginTop: 5,
      fontSize: 11,
      color: "#8F8684",
    },

    priceContainer: {
      alignItems:
        "flex-end",
      gap: 8,
    },

    price: {
      fontSize: 14,
      fontWeight: "900",
      color: "#D15471",
    },

    infoContainer: {
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor:
        "#F0EBE9",
      flexDirection: "row",
      gap: 18,
    },

    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    infoText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#7E7674",
    },

    paymentRow: {
      marginTop: 11,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    paymentLabel: {
      fontSize: 11,
      color: "#A09896",
    },

    paymentStatus: {
      fontSize: 11,
      fontWeight: "800",
      color: "#A8732A",
    },

    paymentPaid: {
      color: "#3D8A56",
    },
  });