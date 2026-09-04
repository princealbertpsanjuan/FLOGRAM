import { Ionicons } from "@expo/vector-icons";
import {
  router,
  useLocalSearchParams,
} from "expo-router";
import {
  useCallback,
  useEffect,
  useState,
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

type Address = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  landmark?: string;
};

type Florist = {
  _id?: string;
  shopName?: string;
  shopLogo?: string | null;
  address?: Address;
};

type Order = {
  _id: string;

  florist?: Florist | string | null;

  sourceType?: string;

  flower?: string | null;

  customBouquetRequest?:
    | string
    | null;

  productName?: string;

  productDescription?:
    | string
    | null;

  inspirationImage?:
    | string
    | null;

  unitPrice?: number;

  quantity?: number;

  subtotal?: number;

  deliveryFee?: number;

  preOrderFee?: number;

  totalAmount?: number;

  fulfillmentType?: string;

  deliveryAddress?: Address;

  recipientName?: string;

  recipientPhoneNumber?:
    | string
    | null;

  requestedDeliveryDate?:
    | string
    | null;

  requestedDeliveryTimeStart?:
    | string
    | null;

  requestedDeliveryTimeEnd?:
    | string
    | null;

  isPreOrder?: boolean;

  customerNotes?:
    | string
    | null;

  occasion?: string;

  flowerTypes?: string[];

  colors?: string[];

  styles?: string[];

  wrapping?:
    | string
    | null;

  specialInstructions?:
    | string[];

  paymentMethod?: string;

  paymentProvider?:
    | string
    | null;

  paymentChannel?:
    | string
    | null;

  paymentStatus?: string;

  orderStatus?: string;

  cancellationReason?:
    | string
    | null;

  cancelledAt?:
    | string
    | null;

  confirmedAt?:
    | string
    | null;

  preparingAt?:
    | string
    | null;

  readyAt?:
    | string
    | null;

  deliveredAt?:
    | string
    | null;

  completedAt?:
    | string
    | null;

  createdAt?: string;

  updatedAt?: string;
};

type OrderResponse = {
  success: boolean;

  message?: string;

  data?: {
    order?: Order;
  };
};

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

const formatStatus = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );
};

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
      return formatStatus(value);
  }
};

const formatAddress = (
  address?: Address
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

  if (address.landmark) {
    return `${location}\nLandmark: ${address.landmark}`;
  }

  return location;
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

const getStatusColors = (
  status?: string
) => {
  switch (status) {
    case "pending":
      return {
        background: "#FFF4DC",
        foreground: "#A56E15",
        icon: "time-outline" as const,
      };

    case "confirmed":
      return {
        background: "#EAF2FF",
        foreground: "#3973B8",
        icon:
          "checkmark-circle-outline" as const,
      };

    case "preparing":
      return {
        background: "#F3EAFC",
        foreground: "#7753A4",
        icon:
          "flower-outline" as const,
      };

    case "ready_for_delivery":
      return {
        background: "#E9F7F4",
        foreground: "#368475",
        icon:
          "bicycle-outline" as const,
      };

    case "ready_for_pickup":
      return {
        background: "#E9F7F4",
        foreground: "#368475",
        icon:
          "storefront-outline" as const,
      };

    case "delivered":
    case "completed":
      return {
        background: "#EAF7EC",
        foreground: "#3D8750",
        icon:
          "checkmark-done-circle-outline" as const,
      };

    case "cancelled":
      return {
        background: "#FDEBED",
        foreground: "#B34D59",
        icon:
          "close-circle-outline" as const,
      };

    default:
      return {
        background: "#F1EEEE",
        foreground: "#696463",
        icon:
          "information-circle-outline" as const,
      };
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerOrderDetailsScreen() {
  const params =
    useLocalSearchParams<{
      orderId?: string | string[];
    }>();

  const orderId =
    Array.isArray(
      params.orderId
    )
      ? params.orderId[0]
      : params.orderId;

  const [
    order,
    setOrder,
  ] = useState<Order | null>(
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
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  /*
   * =======================================================
   * LOAD ORDER
   * =======================================================
   */

  const loadOrder = useCallback(
    async (
      showLoader = true
    ) => {
      if (!orderId) {
        setErrorMessage(
          "Order ID was not provided."
        );

        setLoading(false);

        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage("");

        const response =
          await apiRequest<OrderResponse>(
            `/orders/${orderId}`,
            {
              authenticated: true,
            }
          );

        const nextOrder =
          response.data?.order;

        if (!nextOrder) {
          throw new Error(
            response.message ||
              "Order data was not returned."
          );
        }

        setOrder(nextOrder);
      } catch (error) {
        console.error(
          "Failed to load order:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load this order."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [orderId]
  );

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await loadOrder(false);
      } finally {
        setRefreshing(false);
      }
    }, [loadOrder]);

  /*
   * =======================================================
   * CANCEL ORDER
   * =======================================================
   */

  const performCancel =
    useCallback(async () => {
      if (!orderId) {
        return;
      }

      try {
        setActionLoading(true);

        const response =
          await apiRequest<OrderResponse>(
            `/orders/${orderId}/cancel`,
            {
              method: "PATCH",

              authenticated: true,

              body: JSON.stringify({
                reason:
                  "Cancelled by customer.",
              }),
            }
          );

        if (
          response.data?.order
        ) {
          setOrder(
            response.data.order
          );
        } else {
          await loadOrder(false);
        }

        Alert.alert(
          "Order Cancelled",
          "Your order has been cancelled successfully."
        );
      } catch (error) {
        console.error(
          "Cancel order error:",
          error
        );

        Alert.alert(
          "Unable to cancel order",
          error instanceof Error
            ? error.message
            : "Please try again."
        );
      } finally {
        setActionLoading(false);
      }
    }, [
      orderId,
      loadOrder,
    ]);

  const handleCancel =
    useCallback(() => {
      Alert.alert(
        "Cancel Order?",
        "Are you sure you want to cancel this order?",
        [
          {
            text: "Keep Order",
            style: "cancel",
          },

          {
            text: "Cancel Order",
            style:
              "destructive",

            onPress: () => {
              void performCancel();
            },
          },
        ]
      );
    }, [performCancel]);

  /*
   * =======================================================
   * COMPLETE ORDER
   * =======================================================
   */

  const performComplete =
    useCallback(async () => {
      if (!orderId) {
        return;
      }

      try {
        setActionLoading(true);

        const response =
          await apiRequest<OrderResponse>(
            `/orders/${orderId}/complete`,
            {
              method: "PATCH",

              authenticated: true,
            }
          );

        if (
          response.data?.order
        ) {
          setOrder(
            response.data.order
          );
        } else {
          await loadOrder(false);
        }

        Alert.alert(
          "Order Completed",
          "The order has been marked as completed."
        );
      } catch (error) {
        console.error(
          "Complete order error:",
          error
        );

        Alert.alert(
          "Unable to complete order",
          error instanceof Error
            ? error.message
            : "Please try again."
        );
      } finally {
        setActionLoading(false);
      }
    }, [
      orderId,
      loadOrder,
    ]);

  const handleComplete =
    useCallback(() => {
      Alert.alert(
        "Confirm Order Received?",
        "Confirm that you have received your flower order.",
        [
          {
            text: "Not Yet",
            style: "cancel",
          },

          {
            text:
              "Confirm Received",

            onPress: () => {
              void performComplete();
            },
          },
        ]
      );
    }, [performComplete]);

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
            style={
              styles.loadingText
            }
          >
            Loading order...
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
    !order
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
        />

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
            {errorMessage}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              void loadOrder()
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

  if (!order) {
    return null;
  }

  /*
   * =======================================================
   * VALUES
   * =======================================================
   */

  const imageUrl =
    resolveImageUrl(
      order.inspirationImage
    );

  const statusColors =
    getStatusColors(
      order.orderStatus
    );

  const canCancel =
    ["pending", "confirmed"].includes(
      order.orderStatus || ""
    ) &&
    !(
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus ===
        "paid"
    );

  const canComplete =
    order.orderStatus ===
    "delivered";

  /*
   * =======================================================
   * UI
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

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              void loadOrder()
            }
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color="#77706E"
            />
          </Pressable>
        </View>

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
              tintColor="#D85D7A"
              colors={[
                "#D85D7A",
              ]}
            />
          }
        >
          {/*
           * ===============================================
           * STATUS
           * ===============================================
           */}

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

          {/*
           * ===============================================
           * PRODUCT
           * ===============================================
           */}

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
                      uri: imageUrl,
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
                    order.florist
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

          {/*
           * ===============================================
           * FULFILLMENT
           * ===============================================
           */}

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

          {/*
           * ===============================================
           * SCHEDULE
           * ===============================================
           */}

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
                value={`${order.requestedDeliveryTimeStart || "—"} - ${
                  order.requestedDeliveryTimeEnd ||
                  "—"
                }`}
              />
            ) : null}

            <InfoRow
              label="Order Placed"
              value={formatDateTime(
                order.createdAt
              )}
              last
            />
          </SectionCard>

          {/*
           * ===============================================
           * PAYMENT
           * ===============================================
           */}

          <SectionCard
            title="Payment"
            icon="wallet-outline"
          >
            <InfoRow
              label="Payment Method"
              value={formatPaymentMethod(
                order.paymentMethod
              )}
            />

            <InfoRow
              label="Payment Status"
              value={formatStatus(
                order.paymentStatus
              )}
              valueColor={
                order.paymentStatus ===
                "paid"
                  ? "#3F8954"
                  : undefined
              }
              last
            />
          </SectionCard>

          {/*
           * ===============================================
           * SUMMARY
           * ===============================================
           */}

          <SectionCard
            title="Order Summary"
            icon="receipt-outline"
          >
            <PriceRow
              label={`Subtotal${
                (order.quantity ||
                  1) > 1
                  ? ` (${order.quantity} items)`
                  : ""
              }`}
              value={formatMoney(
                order.subtotal
              )}
            />

            <PriceRow
              label="Delivery Fee"
              value={formatMoney(
                order.deliveryFee
              )}
            />

            {(order.preOrderFee ||
              0) > 0 ? (
              <PriceRow
                label="Pre-order Fee"
                value={formatMoney(
                  order.preOrderFee
                )}
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

          {/*
           * ===============================================
           * BOUQUET DETAILS
           * ===============================================
           */}

          {(order.occasion ||
            (order.flowerTypes &&
              order.flowerTypes
                .length > 0) ||
            (order.colors &&
              order.colors.length >
                0) ||
            order.wrapping) && (
            <SectionCard
              title="Bouquet Details"
              icon="color-palette-outline"
            >
              {order.occasion ? (
                <InfoRow
                  label="Occasion"
                  value={
                    order.occasion
                  }
                />
              ) : null}

              {order.flowerTypes &&
              order.flowerTypes.length >
                0 ? (
                <InfoRow
                  label="Flowers"
                  value={order.flowerTypes.join(
                    ", "
                  )}
                />
              ) : null}

              {order.colors &&
              order.colors.length >
                0 ? (
                <InfoRow
                  label="Colors"
                  value={order.colors.join(
                    ", "
                  )}
                />
              ) : null}

              {order.wrapping ? (
                <InfoRow
                  label="Wrapping"
                  value={
                    order.wrapping
                  }
                  last
                />
              ) : null}
            </SectionCard>
          )}

          {/*
           * ===============================================
           * NOTES
           * ===============================================
           */}

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

          {/*
           * ===============================================
           * CANCELLATION
           * ===============================================
           */}

          {order.orderStatus ===
            "cancelled" && (
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
                style={{
                  flex: 1,
                }}
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
              </View>
            </View>
          )}

          {/*
           * ===============================================
           * ACTIONS
           * ===============================================
           */}

          {canComplete ? (
            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                handleComplete
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

          {canCancel ? (
            <Pressable
              style={
                styles.cancelButton
              }
              onPress={
                handleCancel
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
    | "flower-outline"
    | "location-outline"
    | "storefront-outline"
    | "calendar-outline"
    | "wallet-outline"
    | "receipt-outline"
    | "color-palette-outline"
    | "document-text-outline";

  children: React.ReactNode;
}) {
  return (
    <View
      style={styles.sectionCard}
    >
      <View
        style={
          styles.sectionHeader
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
            styles.sectionTitle
          }
        >
          {title}
        </Text>
      </View>

      {children}
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
  valueColor,
  last = false,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
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
        style={styles.infoLabel}
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
      style={styles.priceRow}
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
        "#FAF8F7",
    },

    header: {
      minHeight: 68,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
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

    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 19,
      fontWeight: "800",
      color: "#302C2B",
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
      paddingHorizontal: 28,
      backgroundColor:
        "#FAF8F7",
    },

    loadingText: {
      marginTop: 11,
      fontSize: 13,
      color: "#8B8381",
    },

    errorIcon: {
      width: 90,
      height: 90,
      borderRadius: 45,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFF0F4",
    },

    errorTitle: {
      marginTop: 17,
      fontSize: 19,
      fontWeight: "800",
      color: "#332E2D",
    },

    errorDescription: {
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: "#8F8785",
      textAlign: "center",
    },

    retryButton: {
      marginTop: 20,
      paddingHorizontal: 22,
      paddingVertical: 12,
      borderRadius: 13,
      backgroundColor:
        "#D85D7A",
    },

    retryText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    statusCard: {
      padding: 15,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13,
    },

    statusIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent:
        "center",
    },

    statusContent: {
      flex: 1,
      marginLeft: 12,
    },

    statusTitle: {
      fontSize: 16,
      fontWeight: "900",
    },

    statusDescription: {
      marginTop: 2,
      fontSize: 11,
      color: "#817A78",
    },

    sectionCard: {
      padding: 16,
      marginBottom: 13,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#ECE6E4",
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },

    sectionIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFF0F4",
    },

    sectionTitle: {
      marginLeft: 9,
      fontSize: 15,
      fontWeight: "800",
      color: "#383231",
    },

    productRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    productImageContainer: {
      width: 90,
      height: 90,
      borderRadius: 15,
      overflow: "hidden",
      backgroundColor:
        "#F8EFF1",
    },

    productImage: {
      width: "100%",
      height: "100%",
    },

    productPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FAEDF0",
    },

    productContent: {
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
      fontSize: 15,
      lineHeight: 19,
      fontWeight: "800",
      color: "#373130",
    },

    sourceText: {
      marginTop: 4,
      fontSize: 10,
      color: "#958D8B",
    },

    priceText: {
      marginTop: 7,
      fontSize: 13,
      fontWeight: "800",
      color: "#D15471",
    },

    productDescription: {
      marginTop: 13,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        "#F0EBE9",
      fontSize: 12,
      lineHeight: 18,
      color: "#77706E",
    },

    infoRow: {
      minHeight: 39,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F1ECEA",
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems:
        "flex-start",
      gap: 20,
    },

    infoRowLast: {
      borderBottomWidth: 0,
    },

    infoLabel: {
      fontSize: 12,
      color: "#918987",
    },

    infoValue: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "700",
      color: "#4E4846",
      textAlign: "right",
    },

    addressBlock: {
      paddingTop: 12,
    },

    addressText: {
      marginTop: 5,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "600",
      color: "#504947",
    },

    priceRow: {
      paddingVertical: 6,
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
    },

    priceLabel: {
      fontSize: 12,
      color: "#807875",
    },

    priceValue: {
      fontSize: 12,
      fontWeight: "700",
      color: "#4D4745",
    },

    totalDivider: {
      height: 1,
      marginVertical: 10,
      backgroundColor:
        "#EBE5E3",
    },

    totalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    totalLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: "#373130",
    },

    totalValue: {
      fontSize: 20,
      fontWeight: "900",
      color: "#D15471",
    },

    notesText: {
      fontSize: 12,
      lineHeight: 19,
      color: "#5F5856",
    },

    cancelledCard: {
      padding: 14,
      marginBottom: 13,
      borderRadius: 15,
      backgroundColor:
        "#FFF0F2",
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 9,
    },

    cancelledTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: "#B24E5C",
    },

    cancelledReason: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 17,
      color: "#93656D",
    },

    primaryButton: {
      minHeight: 50,
      borderRadius: 15,
      backgroundColor:
        "#D85D7A",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      marginBottom: 10,
    },

    primaryButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    cancelButton: {
      minHeight: 48,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        "#E8BBC4",
      backgroundColor:
        "#FFF7F8",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    cancelButtonText: {
      fontSize: 13,
      fontWeight: "800",
      color: "#B64F62",
    },
  });