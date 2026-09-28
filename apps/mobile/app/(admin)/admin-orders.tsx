import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  AdminOrder,
  AdminOrderStatus,
  getAdminOrders,
} from "../../services/admin";

type FilterStatus =
  | "all"
  | AdminOrderStatus;

const FILTERS: {
  label: string;
  value: FilterStatus;
}[] = [
  {
    label: "All",
    value: "all",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Preparing",
    value: "preparing",
  },
  {
    label: "Delivery",
    value: "out_for_delivery",
  },
  {
    label: "Completed",
    value: "completed",
  },
  {
    label: "Cancelled",
    value: "cancelled",
  },
];

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

function getOrderId(
  order: AdminOrder
) {
  return (
    order.id ||
    order._id ||
    ""
  );
}

function formatCurrency(
  value?: number
) {
  return `₱${Number(
    value || 0
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value?: string
) {
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
}

function formatStatus(
  value?: string
) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getPersonName(
  person:
    | AdminOrder["customer"]
    | AdminOrder["seller"]
) {
  if (
    !person ||
    typeof person === "string"
  ) {
    return "Not available";
  }

  const name =
    `${person.firstName || ""} ${
      person.lastName || ""
    }`.trim();

  return (
    name ||
    person.email ||
    "Not available"
  );
}

function getShopName(
  order: AdminOrder
) {
  if (
    !order.florist ||
    typeof order.florist ===
      "string"
  ) {
    return getPersonName(
      order.seller
    );
  }

  return (
    order.florist.shopName ||
    getPersonName(
      order.seller
    )
  );
}

function getStatusColors(
  status?: AdminOrderStatus
) {
  switch (status) {
    case "completed":
    case "delivered":
      return {
        background:
          COLORS.greenBackground,
        text: COLORS.green,
      };

    case "cancelled":
      return {
        background:
          COLORS.redBackground,
        text: COLORS.red,
      };

    case "out_for_delivery":
      return {
        background:
          COLORS.blueBackground,
        text: COLORS.blue,
      };

    case "preparing":
      return {
        background:
          COLORS.yellowBackground,
        text: COLORS.yellow,
      };

    default:
      return {
        background:
          COLORS.purpleLight,
        text:
          COLORS.purpleAccent,
      };
  }
}

/*
 * =========================================================
 * ADMIN BOTTOM NAVIGATION
 * =========================================================
 */

type AdminNavItem = {
  label: string;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  activeIcon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  route?: string;
};

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    label: "Dashboard",
    icon: "home-outline",
    activeIcon: "home",
    route:
      "/(admin)/admin-dashboard",
  },
  {
    label: "Users",
    icon: "people-outline",
    activeIcon: "people",
    route:
      "/(admin)/admin-users",
  },
  {
    label: "Orders",
    icon: "receipt-outline",
    activeIcon: "receipt",
    route:
      "/(admin)/admin-orders",
  },
  {
    label: "Reports",
    icon: "bar-chart-outline",
    activeIcon: "bar-chart",
    route:
      "/(admin)/admin-reports",
  },
  {
    label: "Settings",
    icon: "settings-outline",
    activeIcon: "settings",
  },
];

function AdminBottomNavigation() {
  const router = useRouter();

  const handleNavigation = (
    item: AdminNavItem
  ) => {
    if (!item.route) {
      return;
    }

    if (
      item.route ===
      "/(admin)/admin-orders"
    ) {
      return;
    }

    router.replace(
      item.route as never
    );
  };

  return (
    <View
      style={
        styles.bottomNavigation
      }
    >
      {ADMIN_NAV_ITEMS.map(
        (item) => {
          const isActive =
            item.label ===
            "Orders";

          return (
            <Pressable
              key={item.label}
              style={
                styles.bottomNavItem
              }
              onPress={() =>
                handleNavigation(
                  item
                )
              }
            >
              <View
                style={[
                  styles.bottomNavIconWrap,
                  isActive &&
                    styles.bottomNavIconWrapActive,
                ]}
              >
                <Ionicons
                  name={
                    isActive
                      ? item.activeIcon
                      : item.icon
                  }
                  size={19}
                  color={
                    isActive
                      ? COLORS.purpleAccent
                      : COLORS.mutedText
                  }
                />
              </View>

              <Text
                style={[
                  styles.bottomNavLabel,
                  isActive &&
                    styles.bottomNavLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        }
      )}
    </View>
  );
}

export default function AdminOrdersScreen() {
  const router =
    useRouter();

  const [
    orders,
    setOrders,
  ] = useState<
    AdminOrder[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] =
    useState<FilterStatus>(
      "all"
    );

  const loadOrders =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(
              true
            );
          } else {
            setLoading(true);
          }

          setError(null);

          const data =
            await getAdminOrders();

          setOrders(data);
        } catch (err) {
          console.error(
            "Failed to load admin orders:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load orders."
          );
        } finally {
          setLoading(false);
          setRefreshing(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders])
  );

  const filteredOrders =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          if (
            filter !==
              "all" &&
            order.orderStatus !==
              filter
          ) {
            return false;
          }

          if (!keyword) {
            return true;
          }

          const customer =
            getPersonName(
              order.customer
            ).toLowerCase();

          const shop =
            getShopName(
              order
            ).toLowerCase();

          const product = (
            order.productName ||
            ""
          ).toLowerCase();

          const id =
            getOrderId(
              order
            ).toLowerCase();

          return (
            customer.includes(
              keyword
            ) ||
            shop.includes(
              keyword
            ) ||
            product.includes(
              keyword
            ) ||
            id.includes(
              keyword
            )
          );
        }
      );
    }, [
      orders,
      filter,
      search,
    ]);

  const activeCount =
    orders.filter(
      (order) =>
        ![
          "completed",
          "cancelled",
        ].includes(
          order.orderStatus ||
            ""
        )
    ).length;

  const completedCount =
    orders.filter(
      (order) =>
        order.orderStatus ===
        "completed"
    ).length;

  const totalSales =
    orders
      .filter(
        (order) =>
          order.paymentStatus ===
          "paid"
      )
      .reduce(
        (sum, order) =>
          sum +
          Number(
            order.totalAmount ||
              0
          ),
        0
      );

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={
          styles.content
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
              void loadOrders(
                true
              )
            }
            tintColor={
              COLORS.purpleAccent
            }
            colors={[
              COLORS.purpleAccent,
            ]}
          />
        }
      >
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
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={
                styles.refreshButton
              }
              onPress={() =>
                void loadOrders(
                  true
                )
              }
            >
              <Ionicons
                name="refresh"
                size={19}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            style={
              styles.eyebrow
            }
          >
            ORDER MONITORING
          </Text>

          <Text
            style={
              styles.title
            }
          >
            Orders
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Monitor marketplace
            transactions and
            fulfillment.
          </Text>

          <View
            style={
              styles.headerSummary
            }
          >
            <View
              style={
                styles.headerSummaryIcon
              }
            >
              <Ionicons
                name="bag-handle-outline"
                size={24}
                color="#FFFFFF"
              />
            </View>

            <View
              style={
                styles.headerSummaryText
              }
            >
              <Text
                style={
                  styles.headerSummaryLabel
                }
              >
                Total Marketplace
                Orders
              </Text>

              <Text
                style={
                  styles.headerSummarySubtext
                }
              >
                All recorded
                transactions
              </Text>
            </View>

            <Text
              style={
                styles.headerSummaryValue
              }
            >
              {orders.length}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.body
          }
        >
          <View
            style={
              styles.introCard
            }
          >
            <View
              style={
                styles.introIcon
              }
            >
              <Ionicons
                name="receipt-outline"
                size={22}
                color={
                  COLORS.purpleAccent
                }
              />
            </View>

            <View
              style={
                styles.introContent
              }
            >
              <Text
                style={
                  styles.introTitle
                }
              >
                Order Monitoring
              </Text>

              <Text
                style={
                  styles.introText
                }
              >
                Review customer
                orders, seller
                fulfillment,
                payments, and
                delivery progress
                across FLOGRAM.
              </Text>
            </View>
          </View>

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
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.purpleLight,
                  },
                ]}
              >
                <Ionicons
                  name="layers-outline"
                  size={17}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Total
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {orders.length}
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.yellowBackground,
                  },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={17}
                  color={
                    COLORS.yellow
                  }
                />
              </View>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Active
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {activeCount}
              </Text>
            </View>

            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      COLORS.greenBackground,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={17}
                  color={
                    COLORS.green
                  }
                />
              </View>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Completed
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {completedCount}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.salesCard
            }
          >
            <View
              style={
                styles.salesIcon
              }
            >
              <Ionicons
                name="cash-outline"
                size={22}
                color={
                  COLORS.green
                }
              />
            </View>

            <View
              style={
                styles.salesContent
              }
            >
              <Text
                style={
                  styles.salesLabel
                }
              >
                Paid Order Value
              </Text>

              <Text
                style={
                  styles.salesDescription
                }
              >
                Total value of paid
                marketplace orders
              </Text>
            </View>

            <Text
              style={
                styles.salesValue
              }
            >
              {formatCurrency(
                totalSales
              )}
            </Text>
          </View>

          <View
            style={
              styles.searchBox
            }
          >
            <Ionicons
              name="search"
              size={18}
              color={
                COLORS.mutedText
              }
            />

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search order, customer, shop..."
              placeholderTextColor={
                COLORS.mutedText
              }
              style={
                styles.searchInput
              }
            />

            {search.length >
            0 ? (
              <Pressable
                onPress={() =>
                  setSearch("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={
                    COLORS.mutedText
                  }
                />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.filters
            }
          >
            {FILTERS.map(
              (item) => {
                const selected =
                  filter ===
                  item.value;

                return (
                  <Pressable
                    key={
                      item.value
                    }
                    style={[
                      styles.filterButton,
                      selected &&
                        styles.filterButtonActive,
                    ]}
                    onPress={() =>
                      setFilter(
                        item.value
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.filterText,
                        selected &&
                          styles.filterTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          <View
            style={
              styles.sectionHeader
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                MARKETPLACE
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Orders
              </Text>
            </View>

            {!loading &&
            !error ? (
              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countText
                  }
                >
                  {
                    filteredOrders.length
                  }
                </Text>
              </View>
            ) : null}
          </View>

          {loading ? (
            <View
              style={
                styles.stateCard
              }
            >
              <ActivityIndicator
                size="large"
                color={
                  COLORS.purpleAccent
                }
              />

              <Text
                style={
                  styles.stateText
                }
              >
                Loading orders...
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.stateCard,
                styles.errorCard,
              ]}
            >
              <View
                style={
                  styles.errorIcon
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={29}
                  color={
                    COLORS.red
                  }
                />
              </View>

              <Text
                style={
                  styles.stateTitle
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
                {error}
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={() =>
                  void loadOrders()
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
          ) : filteredOrders.length ===
            0 ? (
            <View
              style={
                styles.stateCard
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="receipt-outline"
                  size={30}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <Text
                style={
                  styles.stateTitle
                }
              >
                No orders found
              </Text>

              <Text
                style={
                  styles.stateText
                }
              >
                No orders match
                your current
                search or selected
                filter.
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.list
              }
            >
              {filteredOrders.map(
                (order) => {
                  const id =
                    getOrderId(
                      order
                    );

                  const colors =
                    getStatusColors(
                      order.orderStatus
                    );

                  return (
                    <Pressable
                      key={id}
                      style={({
                        pressed,
                      }) => [
                        styles.orderCard,
                        pressed &&
                          styles.orderCardPressed,
                      ]}
                      onPress={() =>
                        router.push({
                          pathname:
                            "/(admin)/admin-order-details",
                          params: {
                            orderId:
                              id,
                          },
                        })
                      }
                    >
                      <View
                        style={
                          styles.cardTop
                        }
                      >
                        <View
                          style={
                            styles.orderIcon
                          }
                        >
                          <Ionicons
                            name="bag-handle-outline"
                            size={
                              20
                            }
                            color={
                              COLORS.purpleAccent
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.cardTitleBox
                          }
                        >
                          <Text
                            style={
                              styles.productName
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {order.productName ||
                              "Flower Order"}
                          </Text>

                          <Text
                            style={
                              styles.orderId
                            }
                            numberOfLines={
                              1
                            }
                          >
                            #
                            {id
                              .slice(
                                -8
                              )
                              .toUpperCase()}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor:
                                colors.background,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              {
                                color:
                                  colors.text,
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

                      <InfoRow
                        label="Customer"
                        value={getPersonName(
                          order.customer
                        )}
                      />

                      <InfoRow
                        label="Seller"
                        value={getShopName(
                          order
                        )}
                      />

                      <InfoRow
                        label="Payment"
                        value={formatStatus(
                          order.paymentStatus
                        )}
                      />

                      <View
                        style={
                          styles.cardBottom
                        }
                      >
                        <View
                          style={
                            styles.orderMeta
                          }
                        >
                          <View
                            style={
                              styles.metaLine
                            }
                          >
                            <Ionicons
                              name="calendar-outline"
                              size={
                                12
                              }
                              color={
                                COLORS.mutedText
                              }
                            />

                            <Text
                              style={
                                styles.dateText
                              }
                            >
                              {formatDate(
                                order.createdAt
                              )}
                            </Text>
                          </View>

                          <View
                            style={
                              styles.metaLine
                            }
                          >
                            <Ionicons
                              name={
                                order.fulfillmentType ===
                                "delivery"
                                  ? "bicycle-outline"
                                  : "storefront-outline"
                              }
                              size={
                                12
                              }
                              color={
                                COLORS.secondaryText
                              }
                            />

                            <Text
                              style={
                                styles.fulfillmentText
                              }
                            >
                              {formatStatus(
                                order.fulfillmentType
                              )}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.amountBox
                          }
                        >
                          <Text
                            style={
                              styles.amount
                            }
                          >
                            {formatCurrency(
                              order.totalAmount
                            )}
                          </Text>

                          <View
                            style={
                              styles.chevronBox
                            }
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={
                                15
                              }
                              color={
                                COLORS.purpleAccent
                              }
                            />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                }
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <AdminBottomNavigation />
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({
  label,
  value,
}: InfoRowProps) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
        }
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    scroll: {
      flex: 1,
    },

    content: {
      paddingBottom: 30,
    },

    header: {
      backgroundColor:
        COLORS.purple,
      paddingHorizontal: 18,
      paddingTop: 52,
      paddingBottom: 20,
      borderBottomLeftRadius:
        24,
      borderBottomRightRadius:
        24,
    },

    headerTop: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 18,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      justifyContent:
        "center",
      alignItems: "center",
    },

    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent:
        "center",
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

    subtitle: {
      color: "#D6D4F4",
      fontSize: 11,
      marginTop: 4,
      maxWidth: 260,
      lineHeight: 16,
    },

    headerSummary: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "rgba(255,255,255,0.10)",
      borderRadius: 17,
      padding: 13,
      marginTop: 17,
    },

    headerSummaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      justifyContent:
        "center",
      alignItems: "center",
      marginRight: 11,
    },

    headerSummaryText: {
      flex: 1,
    },

    headerSummaryLabel: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "800",
    },

    headerSummarySubtext: {
      color: "#C8C5F2",
      fontSize: 9,
      marginTop: 3,
    },

    headerSummaryValue: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800",
    },

    body: {
      paddingHorizontal: 17,
      paddingTop: 17,
    },

    introCard: {
      flexDirection: "row",
      backgroundColor:
        COLORS.card,
      borderRadius: 17,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      padding: 14,
      marginBottom: 13,
    },

    introIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        COLORS.purpleLight,
      justifyContent:
        "center",
      alignItems: "center",
      marginRight: 11,
    },

    introContent: {
      flex: 1,
    },

    introTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "800",
    },

    introText: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 4,
    },

    summaryRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 10,
    },

    summaryCard: {
      flex: 1,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      padding: 11,
    },

    summaryIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 9,
    },

    summaryLabel: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      marginBottom: 3,
    },

    summaryValue: {
      color: COLORS.text,
      fontSize: 20,
      fontWeight: "800",
    },

    salesCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      padding: 13,
      marginBottom: 14,
    },

    salesIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.greenBackground,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    salesContent: {
      flex: 1,
      paddingRight: 8,
    },

    salesLabel: {
      color: COLORS.text,
      fontSize: 11,
      fontWeight: "800",
    },

    salesDescription: {
      color:
        COLORS.secondaryText,
      fontSize: 8,
      marginTop: 3,
    },

    salesValue: {
      color: COLORS.green,
      fontSize: 15,
      fontWeight: "800",
    },

    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 14,
      paddingHorizontal: 13,
      height: 48,
      gap: 8,
    },

    searchInput: {
      flex: 1,
      color: COLORS.text,
      fontSize: 12,
    },

    filters: {
      gap: 7,
      paddingVertical: 13,
    },

    filterButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.purpleAccent,
      borderColor:
        COLORS.purpleAccent,
    },

    filterText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      fontWeight: "700",
    },

    filterTextActive: {
      color: "#FFFFFF",
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginTop: 3,
      marginBottom: 10,
    },

    sectionEyebrow: {
      color:
        COLORS.purpleAccent,
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 16,
      fontWeight: "800",
      marginTop: 2,
    },

    countBadge: {
      minWidth: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor:
        COLORS.purpleLight,
      justifyContent:
        "center",
      alignItems: "center",
      paddingHorizontal: 7,
    },

    countText: {
      color:
        COLORS.purpleAccent,
      fontSize: 10,
      fontWeight: "800",
    },

    stateCard: {
      minHeight: 220,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
      paddingVertical: 30,
    },

    stateTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: "800",
      marginTop: 10,
    },

    stateText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      lineHeight: 15,
      textAlign: "center",
      marginTop: 7,
    },

    errorCard: {
      backgroundColor:
        "#FFFBFC",
    },

    errorIcon: {
      width: 53,
      height: 53,
      borderRadius: 17,
      backgroundColor:
        COLORS.redBackground,
      alignItems: "center",
      justifyContent:
        "center",
    },

    errorText: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
      lineHeight: 15,
      textAlign: "center",
      marginTop: 6,
    },

    retryButton: {
      backgroundColor:
        COLORS.purpleAccent,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 11,
      marginTop: 14,
    },

    retryText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
    },

    emptyIcon: {
      width: 55,
      height: 55,
      borderRadius: 18,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent:
        "center",
    },

    list: {
      gap: 11,
    },

    orderCard: {
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 17,
      padding: 14,
    },

    orderCardPressed: {
      opacity: 0.82,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "center",
    },

    orderIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent:
        "center",
    },

    cardTitleBox: {
      flex: 1,
      marginHorizontal: 10,
    },

    productName: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "800",
    },

    orderId: {
      color:
        COLORS.mutedText,
      fontSize: 9,
      marginTop: 3,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 9,
      maxWidth: 105,
    },

    statusText: {
      fontSize: 8,
      fontWeight: "800",
      textAlign: "center",
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 12,
    },

    infoRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      gap: 15,
      marginBottom: 8,
    },

    infoLabel: {
      color:
        COLORS.secondaryText,
      fontSize: 10,
    },

    infoValue: {
      color: COLORS.text,
      fontSize: 10,
      fontWeight: "700",
      flex: 1,
      textAlign: "right",
    },

    cardBottom: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "flex-end",
      marginTop: 8,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    orderMeta: {
      flex: 1,
      gap: 5,
    },

    metaLine: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    dateText: {
      color:
        COLORS.mutedText,
      fontSize: 8,
    },

    fulfillmentText: {
      color:
        COLORS.secondaryText,
      fontSize: 9,
      fontWeight: "600",
    },

    amountBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      marginLeft: 10,
    },

    amount: {
      color: COLORS.text,
      fontSize: 15,
      fontWeight: "800",
    },

    chevronBox: {
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor:
        COLORS.purpleLight,
      justifyContent:
        "center",
      alignItems: "center",
    },

    /*
     * =====================================================
     * BOTTOM NAVIGATION
     * =====================================================
     */

    bottomNavigation: {
      minHeight: 76,
      paddingTop: 7,
      paddingBottom: 9,
      paddingHorizontal: 6,

      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-around",

      backgroundColor:
        "#FFFFFF",

      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    bottomNavItem: {
      flex: 1,
      minHeight: 57,
      alignItems: "center",
      justifyContent:
        "flex-start",
    },

    bottomNavIconWrap: {
      width: 36,
      height: 31,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
    },

    bottomNavIconWrapActive: {
      backgroundColor:
        COLORS.purpleLight,
    },

    bottomNavLabel: {
      marginTop: 2,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "500",
      color:
        COLORS.mutedText,
      textAlign: "center",
    },

    bottomNavLabelActive: {
      fontWeight: "700",
      color:
        COLORS.purpleAccent,
    },
  });