import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  AdminOrder,
  getAdminOrderById,
} from "../../services/admin";

import { ScreenLoader } from '../../components/ui/state-views';

import { formatAddOnsLine } from '../../services/addons';

const COLORS = {
  purple: "#312E81",
  purpleAccent: "#5B4FCF",
  purpleLight: "#EEEAFE",
  background: "#F7F7FA",
  card: "#FFFFFF",
  text: "#18181B",
  secondaryText: "#777783",
  mutedText: "#A1A1AA",
  border: "#ECECF1",

  green: "#4E9A72",
  greenBackground: "#EAF7EF",

  red: "#D75C73",
  redBackground: "#FDECEF",

  yellow: "#B9892D",
  yellowBackground: "#FFF5D9",

  blue: "#4C7DC0",
  blueBackground: "#EAF2FC",
};

function formatCurrency(value?: number) {
  return `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPersonName(
  person: AdminOrder["customer"] | AdminOrder["seller"]
) {
  if (!person || typeof person === "string") {
    return "Not available";
  }

  return (
    `${person.firstName || ""} ${person.lastName || ""}`.trim() ||
    person.email ||
    "Not available"
  );
}

function getPersonEmail(
  person: AdminOrder["customer"] | AdminOrder["seller"]
) {
  if (!person || typeof person === "string") {
    return "Not available";
  }

  return person.email || "Not available";
}

function getShopName(order: AdminOrder) {
  if (!order.florist || typeof order.florist === "string") {
    return getPersonName(order.seller);
  }

  return order.florist.shopName || getPersonName(order.seller);
}

function getAddress(order: AdminOrder) {
  const address = order.deliveryAddress;

  if (!address) {
    return "Not available";
  }

  const value = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(", ");

  return value || "Not available";
}

function getStatusColors(value?: string | null) {
  switch (value) {
    case "completed":
    case "delivered":
    case "paid":
      return {
        background: COLORS.greenBackground,
        text: COLORS.green,
      };

    case "cancelled":
    case "failed":
      return {
        background: COLORS.redBackground,
        text: COLORS.red,
      };

    case "preparing":
    case "pending":
      return {
        background: COLORS.yellowBackground,
        text: COLORS.yellow,
      };

    case "out_for_delivery":
      return {
        background: COLORS.blueBackground,
        text: COLORS.blue,
      };

    default:
      return {
        background: COLORS.purpleLight,
        text: COLORS.purpleAccent,
      };
  }
}

function DetailRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string | number | null | undefined;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.detailRow,
        !isLast && styles.detailRowBorder,
      ]}
    >
      <Text style={styles.detailLabel}>{label}</Text>

      <Text style={styles.detailValue}>
        {value ?? "Not available"}
      </Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={17}
          color={COLORS.purpleAccent}
        />
      </View>

      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function AdminOrderDetailsScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    orderId?: string;
  }>();

  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [headerRefreshing, setHeaderRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(
    async (showLoader = true) => {
      if (!orderId) {
        setError("Order ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const data = await getAdminOrderById(orderId);

        setOrder(data);
      } catch (err) {
        console.error("Failed to load admin order:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load order details."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [orderId]
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const fetchOrder = async () => {
        if (!orderId) {
          if (active) {
            setError("Order ID is missing.");
            setLoading(false);
          }

          return;
        }

        try {
          if (active) {
            setLoading(true);
            setError(null);
          }

          const data = await getAdminOrderById(orderId);

          if (active) {
            setOrder(data);
          }
        } catch (err) {
          console.error("Failed to load admin order:", err);

          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Unable to load order details."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void fetchOrder();

      return () => {
        active = false;
      };
    }, [orderId])
  );

  const handleHeaderRefresh = useCallback(async () => {
    if (!orderId || headerRefreshing) {
      return;
    }

    setHeaderRefreshing(true);

    try {
      setError(null);

      const data = await getAdminOrderById(orderId);

      setOrder(data);
    } catch (err) {
      console.error("Failed to refresh admin order:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load order details."
      );
    } finally {
      setHeaderRefreshing(false);
    }
  }, [headerRefreshing, orderId]);

  if (loading) {
    return (
      <ScreenLoader
        role="admin"
        message="Loading order..."
      />
    );
  }

  if (error || !order) {
    return (
      <View style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={COLORS.red}
          />
        </View>

        <Text style={styles.errorTitle}>
          Unable to load order
        </Text>

        <Text style={styles.errorText}>
          {error || "Order was not found."}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => void loadOrder()}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>

        <Pressable
          style={styles.backErrorButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={16}
            color={COLORS.purpleAccent}
          />

          <Text style={styles.backLink}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  const displayId =
    order.id ||
    order._id ||
    orderId ||
    "";

  const statusColors = getStatusColors(order.orderStatus);
  const paymentColors = getStatusColors(order.paymentStatus);

  const isDelivery = order.fulfillmentType === "delivery";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={[
                styles.refreshButton,
                headerRefreshing &&
                  styles.refreshButtonDisabled,
              ]}
              onPress={handleHeaderRefresh}
              disabled={headerRefreshing}
            >
              {headerRefreshing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name="refresh"
                  size={19}
                  color="#FFFFFF"
                />
              )}
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>
            ORDER DETAILS
          </Text>

          <Text style={styles.title}>
            Order
          </Text>

          <Text style={styles.orderId}>
            #{displayId.slice(-10).toUpperCase()}
          </Text>

          <View style={styles.headerSummary}>
            <View style={styles.headerSummaryIcon}>
              <Ionicons
                name="receipt-outline"
                size={23}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.headerSummaryContent}>
              <Text style={styles.headerSummaryLabel}>
                Transaction Overview
              </Text>

              <Text style={styles.headerSummaryDescription}>
                Monitor order status and payment
              </Text>
            </View>

            <Text style={styles.headerTotal}>
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.statusCard}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusIcon,
                  {
                    backgroundColor: statusColors.background,
                  },
                ]}
              >
                <Ionicons
                  name="bag-check-outline"
                  size={21}
                  color={statusColors.text}
                />
              </View>

              <View style={styles.statusContent}>
                <Text style={styles.statusLabel}>
                  Order Status
                </Text>

                <Text
                  style={[
                    styles.statusValue,
                    {
                      color: statusColors.text,
                    },
                  ]}
                >
                  {formatStatus(order.orderStatus)}
                </Text>
              </View>
            </View>

            <View style={styles.totalArea}>
              <Text style={styles.totalLabel}>
                Total
              </Text>

              <Text style={styles.totalValue}>
                {formatCurrency(order.totalAmount)}
              </Text>
            </View>
          </View>

          <SectionHeader
            icon="bag-handle-outline"
            title="Order Information"
          />

<View style={styles.card}>
  <DetailRow
    label="Product"
    value={order.productName}
  />

  <DetailRow
    label="Order Source"
    value={formatStatus(order.sourceType)}
  />

  <DetailRow
    label="Quantity"
    value={order.quantity ?? 0}
  />

  {order.addOns?.length ? (
    <DetailRow
      label="Gift Add-ons"
      value={formatAddOnsLine(order.addOns)}
    />
  ) : null}

  <DetailRow
    label="Fulfillment Method"
    value={formatStatus(order.fulfillmentType)}
  />

  <DetailRow
    label="Order Type"
    value={order.isPreOrder ? "Pre-order" : "Regular Order"}
  />

  <DetailRow
    label="Order Date"
    value={formatDate(order.createdAt)}
    isLast
  />
</View>

          <SectionHeader
            icon="person-outline"
            title="Customer"
          />

          <View style={styles.card}>
            <DetailRow
              label="Name"
              value={getPersonName(order.customer)}
            />

            <DetailRow
              label="Email"
              value={getPersonEmail(order.customer)}
            />

            <DetailRow
              label="Recipient"
              value={order.recipientName}
            />

            <DetailRow
              label="Recipient Phone"
              value={order.recipientPhoneNumber}
              isLast
            />
          </View>

          <SectionHeader
            icon="storefront-outline"
            title="Seller"
          />

          <View style={styles.card}>
            <DetailRow
              label="Shop"
              value={getShopName(order)}
            />

            <DetailRow
              label="Seller"
              value={getPersonName(order.seller)}
            />

            <DetailRow
              label="Seller Email"
              value={getPersonEmail(order.seller)}
              isLast
            />
          </View>

          {isDelivery && (
            <>
              <SectionHeader
                icon="bicycle-outline"
                title="Delivery"
              />

              <View style={styles.card}>
                <View style={styles.addressBox}>
                  <View style={styles.addressIcon}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={COLORS.purpleAccent}
                    />
                  </View>

                  <View style={styles.addressContent}>
                    <Text style={styles.addressLabel}>
                      Delivery Address
                    </Text>

                    <Text style={styles.addressText}>
                      {getAddress(order)}
                    </Text>
                  </View>
                </View>

                {order.deliveryAddress?.landmark ? (
                  <DetailRow
                    label="Landmark"
                    value={order.deliveryAddress.landmark}
                  />
                ) : null}

                <DetailRow
                  label="Requested Date"
                  value={formatDate(
                    order.requestedDeliveryDate
                  )}
                />

                <DetailRow
                  label="Time Window"
                  value={
                    order.requestedDeliveryTimeStart &&
                    order.requestedDeliveryTimeEnd
                      ? `${order.requestedDeliveryTimeStart} - ${order.requestedDeliveryTimeEnd}`
                      : "Not available"
                  }
                  isLast
                />
              </View>
            </>
          )}

          <SectionHeader
            icon="card-outline"
            title="Payment"
          />

          <View style={styles.card}>
            <DetailRow
              label="Method"
              value={formatStatus(order.paymentMethod)}
            />

            <View
              style={[
                styles.detailRow,
                styles.detailRowBorder,
              ]}
            >
              <Text style={styles.detailLabel}>
                Status
              </Text>

              <View
                style={[
                  styles.paymentBadge,
                  {
                    backgroundColor: paymentColors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentBadgeText,
                    {
                      color: paymentColors.text,
                    },
                  ]}
                >
                  {formatStatus(order.paymentStatus)}
                </Text>
              </View>
            </View>

            <DetailRow
              label="Provider"
              value={formatStatus(order.paymentProvider)}
            />

            <DetailRow
              label="Channel"
              value={
                order.paymentChannel ||
                "Not available"
              }
            />

            <DetailRow
              label="Paid At"
              value={formatDate(order.paidAt)}
              isLast
            />
          </View>

          <SectionHeader
            icon="cash-outline"
            title="Amount Breakdown"
          />

          <View style={styles.card}>
            <DetailRow
              label="Unit Price"
              value={formatCurrency(order.unitPrice)}
            />

            <DetailRow
              label="Subtotal"
              value={formatCurrency(order.subtotal)}
            />

            <DetailRow
              label="Delivery Fee"
              value={formatCurrency(order.deliveryFee)}
            />

            <DetailRow
              label="Pre-order Fee"
              value={formatCurrency(order.preOrderFee)}
              isLast
            />

            <View style={styles.totalDivider} />

            <View style={styles.grandTotalRow}>
              <View>
                <Text style={styles.grandTotalLabel}>
                  Total Amount
                </Text>

                <Text style={styles.grandTotalSubtext}>
                  Final order value
                </Text>
              </View>

              <Text style={styles.grandTotalValue}>
                {formatCurrency(order.totalAmount)}
              </Text>
            </View>
          </View>

          <SectionHeader
            icon="time-outline"
            title="Order Timeline"
          />

          <View style={styles.card}>
            <TimelineRow
              label="Order Placed"
              value={formatDate(order.createdAt)}
              complete={Boolean(order.createdAt)}
            />

            <TimelineRow
              label="Order Confirmed"
              value={formatDate(order.confirmedAt)}
              complete={Boolean(order.confirmedAt)}
            />

            <TimelineRow
              label="Preparing Order"
              value={formatDate(order.preparingAt)}
              complete={Boolean(order.preparingAt)}
            />

            <TimelineRow
              label={
                isDelivery
                  ? "Ready for Delivery"
                  : "Ready for Pickup"
              }
              value={formatDate(order.readyAt)}
              complete={Boolean(order.readyAt)}
            />

            {isDelivery ? (
              <TimelineRow
                label="Delivered"
                value={formatDate(order.deliveredAt)}
                complete={Boolean(order.deliveredAt)}
              />
            ) : null}

            <TimelineRow
              label="Order Completed"
              value={formatDate(order.completedAt)}
              complete={Boolean(order.completedAt)}
              isLast={!order.cancelledAt}
            />

            {order.cancelledAt ? (
              <>
                <TimelineRow
                  label="Order Cancelled"
                  value={formatDate(order.cancelledAt)}
                  complete
                  danger
                />

                <View style={styles.cancellationBox}>
                  <Text style={styles.cancellationLabel}>
                    Cancellation Reason
                  </Text>

                  <Text style={styles.cancellationText}>
                    {order.cancellationReason ||
                      "Not provided"}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {order.customerNotes || order.sellerNotes ? (
            <>
              <SectionHeader
                icon="document-text-outline"
                title="Notes"
              />

              <View style={styles.card}>
                {order.customerNotes ? (
                  <View style={styles.noteBox}>
                    <View style={styles.noteHeader}>
                      <View style={styles.noteIcon}>
                        <Ionicons
                          name="person-outline"
                          size={15}
                          color={COLORS.purpleAccent}
                        />
                      </View>

                      <Text style={styles.noteTitle}>
                        Customer Notes
                      </Text>
                    </View>

                    <Text style={styles.noteText}>
                      {order.customerNotes}
                    </Text>
                  </View>
                ) : null}

                {order.sellerNotes ? (
                  <View
                    style={[
                      styles.noteBox,
                      order.customerNotes &&
                        styles.noteBoxSpacing,
                    ]}
                  >
                    <View style={styles.noteHeader}>
                      <View style={styles.noteIcon}>
                        <Ionicons
                          name="storefront-outline"
                          size={15}
                          color={COLORS.purpleAccent}
                        />
                      </View>

                      <Text style={styles.noteTitle}>
                        Seller Notes
                      </Text>
                    </View>

                    <Text style={styles.noteText}>
                      {order.sellerNotes}
                    </Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}

          <View style={styles.monitorNotice}>
            <View style={styles.monitorIcon}>
              <Ionicons
                name="shield-outline"
                size={20}
                color={COLORS.purpleAccent}
              />
            </View>

            <View style={styles.monitorContent}>
              <Text style={styles.monitorTitle}>
                Admin Monitoring
              </Text>

              <Text style={styles.monitorText}>
                Admin access to this page is for transaction
                monitoring. Fulfillment status remains controlled
                by the appropriate seller, customer, and delivery
                workflow.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TimelineRow({
  label,
  value,
  complete,
  danger = false,
  isLast = false,
}: {
  label: string;
  value: string;
  complete: boolean;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineIndicator}>
        <View
          style={[
            styles.timelineDot,
            complete && styles.timelineDotComplete,
            danger && styles.timelineDotDanger,
          ]}
        >
          {complete ? (
            <Ionicons
              name={danger ? "close" : "checkmark"}
              size={10}
              color="#FFFFFF"
            />
          ) : null}
        </View>

        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              complete && styles.timelineLineComplete,
              danger && styles.timelineLineDanger,
            ]}
          />
        ) : null}
      </View>

      <View
        style={[
          styles.timelineContent,
          !isLast && styles.timelineContentBorder,
        ]}
      >
        <Text
          style={[
            styles.timelineLabel,
            danger && styles.timelineDangerText,
          ]}
        >
          {label}
        </Text>

        <Text style={styles.timelineValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  content: {
    paddingBottom: 70,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  loadingTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  loadingText: {
    color: COLORS.secondaryText,
    fontSize: 11,
    marginTop: 5,
  },

  errorIcon: {
    width: 65,
    height: 65,
    borderRadius: 21,
    backgroundColor: COLORS.redBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  errorTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },

  errorText: {
    color: COLORS.secondaryText,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 17,
    marginTop: 7,
    maxWidth: 280,
  },

  retryButton: {
    backgroundColor: COLORS.purpleAccent,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 11,
    marginTop: 16,
  },

  retryText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  backErrorButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 15,
  },

  backLink: {
    color: COLORS.purpleAccent,
    fontSize: 11,
    fontWeight: "700",
  },

  header: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 18,
    paddingTop: 52,
    paddingBottom: 20,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  refreshButtonDisabled: {
    opacity: 0.8,
  },

  eyebrow: {
    color: "#C8C5F2",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
  },

  orderId: {
    color: "#C8C5F2",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },

  headerSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 17,
    padding: 13,
    marginTop: 17,
  },

  headerSummaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  headerSummaryContent: {
    flex: 1,
  },

  headerSummaryLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  headerSummaryDescription: {
    color: "#C8C5F2",
    fontSize: 8,
    marginTop: 3,
  },

  headerTotal: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  body: {
    paddingHorizontal: 17,
    paddingTop: 17,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 20,
  },

  statusLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  statusIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  statusContent: {
    flex: 1,
  },

  statusLabel: {
    color: COLORS.secondaryText,
    fontSize: 9,
  },

  statusValue: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },

  totalArea: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  totalLabel: {
    color: COLORS.secondaryText,
    fontSize: 8,
  },

  totalValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    marginTop: 3,
  },

  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },

  card: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 19,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    paddingVertical: 11,
  },

  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  detailLabel: {
    color: COLORS.secondaryText,
    fontSize: 10,
    flex: 0.4,
  },

  detailValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    flex: 0.6,
    textAlign: "right",
    lineHeight: 15,
  },

  addressBox: {
    flexDirection: "row",
    backgroundColor: COLORS.purpleLight,
    borderRadius: 13,
    padding: 12,
    marginVertical: 9,
  },

  addressIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  addressContent: {
    flex: 1,
  },

  addressLabel: {
    color: COLORS.purpleAccent,
    fontSize: 9,
    fontWeight: "800",
  },

  addressText: {
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
    fontWeight: "600",
  },

  paymentBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: "60%",
  },

  paymentBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textAlign: "right",
  },

  totalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 5,
  },

  grandTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },

  grandTotalLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
  },

  grandTotalSubtext: {
    color: COLORS.mutedText,
    fontSize: 8,
    marginTop: 2,
  },

  grandTotalValue: {
    color: COLORS.purpleAccent,
    fontSize: 17,
    fontWeight: "800",
  },

  timelineRow: {
    flexDirection: "row",
    minHeight: 56,
  },

  timelineIndicator: {
    width: 27,
    alignItems: "center",
  },

  timelineDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    zIndex: 2,
  },

  timelineDotComplete: {
    backgroundColor: COLORS.green,
  },

  timelineDotDanger: {
    backgroundColor: COLORS.red,
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E5EA",
    marginTop: -1,
  },

  timelineLineComplete: {
    backgroundColor: "#CDE7D8",
  },

  timelineLineDanger: {
    backgroundColor: "#F4CAD2",
  },

  timelineContent: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 7,
  },

  timelineContentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  timelineLabel: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },

  timelineValue: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  timelineDangerText: {
    color: COLORS.red,
  },

  cancellationBox: {
    backgroundColor: COLORS.redBackground,
    borderRadius: 12,
    padding: 11,
    marginTop: 5,
    marginBottom: 8,
  },

  cancellationLabel: {
    color: COLORS.red,
    fontSize: 9,
    fontWeight: "800",
  },

  cancellationText: {
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  noteBox: {
    backgroundColor: "#FAFAFC",
    borderRadius: 13,
    padding: 12,
    marginVertical: 8,
  },

  noteBoxSpacing: {
    marginTop: 0,
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  noteIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  noteTitle: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
  },

  noteText: {
    color: COLORS.secondaryText,
    fontSize: 10,
    lineHeight: 16,
  },

  monitorNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.purpleLight,
    borderRadius: 15,
    padding: 13,
    marginTop: 1,
  },

  monitorIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  monitorContent: {
    flex: 1,
  },

  monitorTitle: {
    color: COLORS.purpleAccent,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 3,
  },

  monitorText: {
    color: COLORS.secondaryText,
    fontSize: 9,
    lineHeight: 14,
  },
});