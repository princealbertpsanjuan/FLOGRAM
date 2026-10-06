import { useCallback, useState } from "react";

import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import {
  router,
  useFocusEffect,
} from "expo-router";

import {
  getStoredUser,
  type AuthUser,
} from "../../services/auth";

import {
  getAdminDashboard,
  type AdminDashboardData,
  type AdminRecentActivity,
} from "../../services/admin";

import AdminBottomNav from '../../components/admin/admin-bottom-nav';

import { ScreenLoader } from '../../components/ui/state-views';
import InboxBell from '../../components/ui/inbox-bell';

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const COLORS = {
  background: "#F5F5F8",
  card: "#FFFFFF",
  purple: "#24245D",
  purpleAccent: "#5552B9",
  purpleLight: "#ECECFF",
  text: "#3B3940",
  secondaryText: "#77737B",
  mutedText: "#AAA7AC",
  border: "#ECECF0",
  green: "#6AA880",
  greenLight: "#EAF7EF",
  yellow: "#D49B35",
  yellowLight: "#FFF2D8",
  pink: "#DF6E94",
  pinkLight: "#FFE7EF",
  red: "#D95C83",
  redLight: "#FFF0F3",
};



/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatCurrency = (
  amount: number = 0
) => {
  return `₱${Number(
    amount || 0
  ).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatNumber = (
  value: number = 0
) => {
  return Number(
    value || 0
  ).toLocaleString("en-PH");
};

const getFullName = (
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null
) => {
  if (!user) {
    return "";
  }

  const name = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user.email || "";
};

const formatOrderStatus = (
  value?: string
) => {
  if (!value) {
    return "Pending";
  }

  return value
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
};

const formatTimeAgo = (
  value?: string
) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d`;
  }

  return date.toLocaleDateString(
    "en-PH",
    {
      month: "short",
      day: "numeric",
    }
  );
};

const getActivityDate = (
  item: AdminRecentActivity
) => {
  return (
    item.submittedAt ||
    item.updatedAt ||
    item.createdAt
  );
};

const getActivityColor = (
  type: AdminRecentActivity["type"]
) => {
  switch (type) {
    case "seller_verification":
      return "#70B889";

    case "rider_verification":
      return "#D9A536";

    case "remittance":
      return "#5552B9";

    case "order":
      return "#E56391";

    case "account":
      return "#4C8DD6";

    case "dispute":
    case "violation":
      return "#D04A5F";

    case "shift_request":
      return "#C49317";

    case "payout":
      return "#3E9B62";

    case "review":
      return "#E0A31A";

    case "custom_request":
    case "product":
      return "#DF628F";

    default:
      return "#777777";
  }
};

const getActivityIcon = (
  type: AdminRecentActivity["type"]
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "seller_verification":
      return "storefront-outline";

    case "rider_verification":
      return "bicycle-outline";

    case "remittance":
      return "cash-outline";

    case "order":
      return "receipt-outline";

    case "account":
      return "person-add-outline";

    case "dispute":
      return "flag-outline";

    case "violation":
      return "warning-outline";

    case "shift_request":
      return "calendar-outline";

    case "payout":
      return "wallet-outline";

    case "review":
      return "star-outline";

    case "custom_request":
      return "color-wand-outline";

    case "product":
      return "flower-outline";

    default:
      return "ellipse-outline";
  }
};

const getActivityTitle = (
  item: AdminRecentActivity
) => {
  switch (item.type) {
    case "seller_verification":
      return "Seller verification submitted";

    case "rider_verification":
      return "Rider verification submitted";

    case "remittance":
      return "COD remittance submitted";

    case "order":
      return "Order activity";

    default:
      return item.heading || "System activity";
  }
};

const getActivitySubtitle = (
  item: AdminRecentActivity
) => {
  switch (item.type) {
    case "seller_verification": {
      const owner = getFullName(
        item.owner
      );

      return (
        item.title ||
        owner ||
        "Seller application"
      );
    }

    case "rider_verification": {
      const owner = getFullName(
        item.owner
      );

      return (
        owner ||
        "Rider application"
      );
    }

    case "remittance": {
      const rider = getFullName(
        item.riderUser
      );

      return `${rider || "Rider"} • ${formatCurrency(
        item.totalAmount || 0
      )}`;
    }

    case "order":
      return `${
        item.title || "Order"
      } • ${formatOrderStatus(
        item.orderStatus
      )}`;

    default:
      return item.description || "";
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function AdminDashboardScreen() {
  const [user, setUser] =
    useState<AuthUser | null>(
      null
    );

  const [
    dashboard,
    setDashboard,
  ] =
    useState<AdminDashboardData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  /*
   * =======================================================
   * LOAD DASHBOARD
   * =======================================================
   */

  const loadDashboard =
    useCallback(
      async (
        refresh = false
      ) => {
        try {
          if (refresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const [
            storedUser,
            dashboardData,
          ] = await Promise.all([
            getStoredUser(),
            getAdminDashboard(),
          ]);

          setUser(storedUser);
          setDashboard(
            dashboardData
          );
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to load dashboard.";

          setError(message);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (
    loading &&
    !dashboard
  ) {
    return (
      <ScreenLoader
        role="admin"
        message="Loading dashboard..."
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
    !dashboard
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <View
          style={styles.errorIcon}
        >
          <Ionicons
            name="alert-circle-outline"
            size={27}
            color={COLORS.red}
          />
        </View>

        <Text
          style={styles.errorTitle}
        >
          Unable to load dashboard
        </Text>

        <Text
          style={styles.errorText}
        >
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() =>
            void loadDashboard()
          }
        >
          <Ionicons
            name="refresh-outline"
            size={17}
            color="#FFFFFF"
          />

          <Text
            style={styles.retryText}
          >
            Try Again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * DATA
   * =======================================================
   */

  const firstName =
    user?.firstName || "Admin";

  const users =
    dashboard?.users ?? {
      total: 0,
      customers: 0,
      sellers: 0,
      riders: 0,
    };

  const orders =
    dashboard?.orders ?? {
      total: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    };

  const revenue =
    dashboard?.revenue ?? {
      total: 0,
      today: 0,
    };

  const verifications =
    dashboard?.verifications ?? {
      pendingSellers: 0,
      pendingRiders: 0,
      totalPending: 0,
    };

  const remittances =
    dashboard?.remittances ?? {
      pending: 0,
      submitted: 0,
      awaitingVerification: 0,
    };

  const activities =
    dashboard?.recentActivity ??
    [];

  const pendingActions =
    verifications.totalPending +
    remittances.awaitingVerification;

  /*
   * =======================================================
   * NAVIGATION HELPERS
   * =======================================================
   */

  const openTodayReport = () => {
    router.push({
      pathname:
        "/(admin)/admin-reports",
      params: {
        period: "today",
      },
    } as never);
  };

  const openUsers = (
    role?:
      | "customer"
      | "seller"
      | "rider"
  ) => {
    if (!role) {
      router.push(
        "/(admin)/admin-users"
      );
      return;
    }

    router.push({
      pathname:
        "/(admin)/admin-users",
      params: {
        role,
      },
    } as never);
  };

  return (
  <View style={styles.container}>
    {/*
     * =================================================
     * HEADER
     * =================================================
     */}

    <View style={styles.header}>
      <View style={styles.headerCircleOne} />

      <View style={styles.headerCircleTwo} />

      <View style={styles.headerTop}>
        <View>
          <Text style={styles.systemOverview}>
            System Overview
          </Text>

          <Text style={styles.title}>
            Admin Dashboard
          </Text>

          <Text style={styles.welcomeText}>
            Welcome, {firstName}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <InboxBell />

        <Pressable
          style={styles.headerMenu}
          onPress={() =>
            router.push(
              "/(admin)/admin-settings"
            )
          }
        >
          <Ionicons
            name="settings-outline"
            size={21}
            color="#FFFFFF"
          />
        </Pressable>
        </View>
      </View>

          {/*
           * ===============================================
           * SUMMARY
           * ===============================================
           */}

          <View
            style={styles.summaryGrid}
          >
            <Pressable
              style={styles.summaryCard}
              onPress={
                openTodayReport
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Today&apos;s Revenue
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatCurrency(
                  revenue.today
                )}
              </Text>

              <Text
                style={
                  styles.positiveText
                }
              >
                Recognized today
              </Text>
            </Pressable>

            <Pressable
              style={styles.summaryCard}
              onPress={() =>
                router.push(
                  "/(admin)/admin-orders"
                )
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Active Orders
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatNumber(
                  orders.active
                )}
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                {orders.total} total
                orders
              </Text>
            </Pressable>

            <Pressable
              style={styles.summaryCard}
              onPress={() =>
                openUsers()
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Total Users
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatNumber(
                  users.total
                )}
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                Platform accounts
              </Text>
            </Pressable>

<Pressable
  style={styles.summaryCard}
  onPress={() =>
    router.push(
      "/(admin)/admin-remittances"
    )
  }
>
  <Text
    style={
      styles.summaryLabel
    }
  >
    COD Remittances
  </Text>

  <Text
    style={
      styles.summaryValue
    }
  >
    {formatNumber(
      remittances.awaitingVerification
    )}
  </Text>

  <Text
    style={
      styles.warningText
    }
  >
    Requires review
  </Text>
</Pressable>
          </View>
        </View>

        {/*
         * =================================================
         * CONTENT
         * =================================================
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
              refreshing={
                refreshing
              }
              onRefresh={() =>
                void loadDashboard(
                  true
                )
              }
              tintColor={
                COLORS.purpleAccent
              }
            />
          }
        >
          {!!error && (
            <View
              style={
                styles.inlineError
              }
            >
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={COLORS.red}
              />

              <Text
                style={
                  styles.inlineErrorText
                }
              >
                {error}
              </Text>
            </View>
          )}

          {/*
           * ===============================================
           * ADMIN ACTIONS
           * ===============================================
           */}

          <View
            style={
              styles.verificationCard
            }
          >
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
                  Admin Actions
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Items requiring review
                </Text>
              </View>

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
                  {pendingActions}
                </Text>
              </View>
            </View>

            <Pressable
              style={
                styles.adminActionRow
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-seller-verification"
                )
              }
            >
              <View
                style={[
                  styles.actionIcon,
                  styles.sellerActionIcon,
                ]}
              >
                <Ionicons
                  name="storefront-outline"
                  size={17}
                  color={COLORS.green}
                />
              </View>

              <View
                style={
                  styles.actionInfo
                }
              >
                <Text
                  style={
                    styles.actionTitle
                  }
                >
                  Seller Verification
                </Text>

                <Text
                  style={
                    styles.actionMeta
                  }
                >
                  {
                    verifications.pendingSellers
                  }{" "}
                  application
                  {verifications.pendingSellers ===
                  1
                    ? ""
                    : "s"}{" "}
                  pending
                </Text>
              </View>

              <View
                style={
                  styles.actionCount
                }
              >
                <Text
                  style={
                    styles.actionCountText
                  }
                >
                  {
                    verifications.pendingSellers
                  }
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={
                  COLORS.mutedText
                }
              />
            </Pressable>

            <View
              style={
                styles.rowDivider
              }
            />

            <Pressable
              style={
                styles.adminActionRow
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-rider-verification"
                )
              }
            >
              <View
                style={[
                  styles.actionIcon,
                  styles.riderActionIcon,
                ]}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={17}
                  color={COLORS.yellow}
                />
              </View>

              <View
                style={
                  styles.actionInfo
                }
              >
                <Text
                  style={
                    styles.actionTitle
                  }
                >
                  Rider Verification
                </Text>

                <Text
                  style={
                    styles.actionMeta
                  }
                >
                  {
                    verifications.pendingRiders
                  }{" "}
                  application
                  {verifications.pendingRiders ===
                  1
                    ? ""
                    : "s"}{" "}
                  pending
                </Text>
              </View>

              <View
                style={
                  styles.actionCount
                }
              >
                <Text
                  style={
                    styles.actionCountText
                  }
                >
                  {
                    verifications.pendingRiders
                  }
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={
                  COLORS.mutedText
                }
              />
            </Pressable>

            <View
              style={
                styles.rowDivider
              }
            />

            <Pressable
              style={
                styles.adminActionRow
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-remittances"
                )
              }
            >
              <View
                style={[
                  styles.actionIcon,
                  styles.remittanceActionIcon,
                ]}
              >
                <Ionicons
                  name="cash-outline"
                  size={17}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <View
                style={
                  styles.actionInfo
                }
              >
                <Text
                  style={
                    styles.actionTitle
                  }
                >
                  COD Remittances
                </Text>

                <Text
                  style={
                    styles.actionMeta
                  }
                >
                  {
                    remittances.awaitingVerification
                  }{" "}
                  submitted for
                  verification
                </Text>
              </View>

              <View
                style={
                  styles.actionCount
                }
              >
                <Text
                  style={
                    styles.actionCountText
                  }
                >
                  {
                    remittances.awaitingVerification
                  }
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={
                  COLORS.mutedText
                }
              />
            </Pressable>
          </View>

          {/*
           * ===============================================
           * PLATFORM USERS
           * ===============================================
           */}

          <Text
            style={
              styles.contentHeading
            }
          >
            Platform Users
          </Text>

          <View
            style={
              styles.userStatsRow
            }
          >
            <Pressable
              style={[
                styles.userStatCard,
                styles.customerCard,
              ]}
              onPress={() =>
                openUsers("customer")
              }
            >
              <Text
                style={
                  styles.customerValue
                }
              >
                {formatNumber(
                  users.customers
                )}
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Customers
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.userStatCard,
                styles.sellerCard,
              ]}
              onPress={() =>
                openUsers("seller")
              }
            >
              <Text
                style={
                  styles.sellerValue
                }
              >
                {formatNumber(
                  users.sellers
                )}
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Sellers
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.userStatCard,
                styles.riderCard,
              ]}
              onPress={() =>
                openUsers("rider")
              }
            >
              <Text
                style={
                  styles.riderValue
                }
              >
                {formatNumber(
                  users.riders
                )}
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Riders
              </Text>
            </Pressable>
          </View>
                    {/*
           * ===============================================
           * ORDER MONITORING
           * ===============================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.contentHeading
                }
              >
                Order Monitoring
              </Text>

              <Text
                style={
                  styles.contentSubheading
                }
              >
                Marketplace order
                activity
              </Text>
            </View>

            <Pressable
              style={
                styles.viewAllButton
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-orders"
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

              <Ionicons
                name="chevron-forward"
                size={14}
                color={
                  COLORS.purpleAccent
                }
              />
            </Pressable>
          </View>

          <View
            style={
              styles.orderOverviewCard
            }
          >
            <View
              style={
                styles.orderOverviewRow
              }
            >
              <View
                style={
                  styles.orderMetric
                }
              >
                <View
                  style={[
                    styles.orderMetricIcon,
                    {
                      backgroundColor:
                        COLORS.purpleLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="receipt-outline"
                    size={19}
                    color={
                      COLORS.purpleAccent
                    }
                  />
                </View>

                <Text
                  style={
                    styles.orderMetricValue
                  }
                >
                  {formatNumber(
                    orders.total
                  )}
                </Text>

                <Text
                  style={
                    styles.orderMetricLabel
                  }
                >
                  Total Orders
                </Text>
              </View>

              <View
                style={
                  styles.metricDivider
                }
              />

              <View
                style={
                  styles.orderMetric
                }
              >
                <View
                  style={[
                    styles.orderMetricIcon,
                    {
                      backgroundColor:
                        COLORS.yellowLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={19}
                    color={
                      COLORS.yellow
                    }
                  />
                </View>

                <Text
                  style={
                    styles.orderMetricValue
                  }
                >
                  {formatNumber(
                    orders.active
                  )}
                </Text>

                <Text
                  style={
                    styles.orderMetricLabel
                  }
                >
                  Active
                </Text>
              </View>

              <View
                style={
                  styles.metricDivider
                }
              />

              <View
                style={
                  styles.orderMetric
                }
              >
                <View
                  style={[
                    styles.orderMetricIcon,
                    {
                      backgroundColor:
                        COLORS.greenLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color={
                      COLORS.green
                    }
                  />
                </View>

                <Text
                  style={
                    styles.orderMetricValue
                  }
                >
                  {formatNumber(
                    orders.completed
                  )}
                </Text>

                <Text
                  style={
                    styles.orderMetricLabel
                  }
                >
                  Completed
                </Text>
              </View>
            </View>

            <View
              style={
                styles.orderFooter
              }
            >
              <View
                style={
                  styles.orderFooterItem
                }
              >
                <Ionicons
                  name="close-circle-outline"
                  size={15}
                  color={COLORS.red}
                />

                <Text
                  style={
                    styles.orderFooterLabel
                  }
                >
                  Cancelled
                </Text>

                <Text
                  style={
                    styles.orderFooterValue
                  }
                >
                  {formatNumber(
                    orders.cancelled
                  )}
                </Text>
              </View>

              <Pressable
                style={
                  styles.orderFooterLink
                }
                onPress={() =>
                  router.push(
                    "/(admin)/admin-orders"
                  )
                }
              >
                <Text
                  style={
                    styles.orderFooterLinkText
                  }
                >
                  Monitor orders
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </Pressable>
            </View>
          </View>

          {/*
           * ===============================================
           * RIDER OPERATIONS
           * ===============================================
           *
           * Work shifts (slot limits, approvals) and
           * Rider delivery-fee payouts.
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.contentHeading
                }
              >
                Rider Operations
              </Text>

              <Text
                style={
                  styles.contentSubheading
                }
              >
                Work shifts and Rider payouts
              </Text>
            </View>
          </View>

          <View
            style={
              riderOpsStyles.row
            }
          >
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                riderOpsStyles.card,
                pressed && {
                  opacity: 0.9,
                },
              ]}
              onPress={() =>
                router.push(
                  "/(admin)/admin-rider-shifts" as never
                )
              }
            >
              <View
                style={
                  riderOpsStyles.icon
                }
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={COLORS.purpleAccent}
                />
              </View>

              <Text
                style={
                  riderOpsStyles.title
                }
              >
                Work Shifts
              </Text>

              <Text
                style={
                  riderOpsStyles.text
                }
              >
                Post shifts, set slots, approve Riders
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                riderOpsStyles.card,
                pressed && {
                  opacity: 0.9,
                },
              ]}
              onPress={() =>
                router.push(
                  "/(admin)/admin-rider-payouts" as never
                )
              }
            >
              <View
                style={
                  riderOpsStyles.icon
                }
              >
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={COLORS.purpleAccent}
                />
              </View>

              <Text
                style={
                  riderOpsStyles.title
                }
              >
                Rider Payouts
              </Text>

              <Text
                style={
                  riderOpsStyles.text
                }
              >
                Pay delivery fees and record transfers
              </Text>
            </Pressable>
          </View>

          {/*
           * ===============================================
           * MARKETPLACE TOOLS
           * ===============================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.contentHeading
                }
              >
                Marketplace Tools
              </Text>

              <Text
                style={
                  styles.contentSubheading
                }
              >
                Seller payouts, disputes, penalties and insights
              </Text>
            </View>
          </View>

          {[
            [
              {
                icon: "wallet-outline" as const,
                title: "Seller Payouts",
                text: "Sales minus commission, record transfers",
                route: "/(admin)/admin-seller-payouts",
              },
              {
                icon: "chatbubbles-outline" as const,
                title: "Disputes",
                text: "Review and resolve reported orders",
                route: "/(admin)/admin-disputes",
              },
            ],
            [
              {
                icon: "warning-outline" as const,
                title: "Violations",
                text: "Warnings, suspensions and bans",
                route: "/(admin)/admin-violations",
              },
              {
                icon: "analytics-outline" as const,
                title: "Customer Insights",
                text: "Review sentiment and buying patterns",
                route: "/(admin)/admin-insights",
              },
            ],
          ].map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                riderOpsStyles.row,
                { marginBottom: 12 },
              ]}
            >
              {row.map(tool => (
                <Pressable
                  key={tool.title}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    riderOpsStyles.card,
                    pressed && {
                      opacity: 0.9,
                    },
                  ]}
                  onPress={() =>
                    router.push(
                      tool.route as never
                    )
                  }
                >
                  <View
                    style={
                      riderOpsStyles.icon
                    }
                  >
                    <Ionicons
                      name={tool.icon}
                      size={20}
                      color={COLORS.purpleAccent}
                    />
                  </View>

                  <Text
                    style={
                      riderOpsStyles.title
                    }
                  >
                    {tool.title}
                  </Text>

                  <Text
                    style={
                      riderOpsStyles.text
                    }
                  >
                    {tool.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}

          {/*
           * ===============================================
           * FINANCIAL OVERVIEW
           * ===============================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.contentHeading
                }
              >
                Financial Overview
              </Text>

              <Text
                style={
                  styles.contentSubheading
                }
              >
                Recognized marketplace
                transactions
              </Text>
            </View>

            <Pressable
              style={
                styles.viewAllButton
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-reports"
                )
              }
            >
              <Text
                style={
                  styles.viewAllText
                }
              >
                View Report
              </Text>

              <Ionicons
                name="chevron-forward"
                size={14}
                color={
                  COLORS.purpleAccent
                }
              />
            </Pressable>
          </View>

          <Pressable
            style={
              styles.financialCard
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-reports"
              )
            }
          >
            <View
              style={
                styles.financialHeader
              }
            >
              <View
                style={
                  styles.financialIcon
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={21}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={
                  styles.financialHeaderText
                }
              >
                <Text
                  style={
                    styles.financialEyebrow
                  }
                >
                  RECOGNIZED SALES
                </Text>

                <Text
                  style={
                    styles.financialTitle
                  }
                >
                  Marketplace Revenue
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="rgba(255,255,255,0.65)"
              />
            </View>

            <Text
              style={
                styles.financialValue
              }
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(
                revenue.total
              )}
            </Text>

            <View
              style={
                styles.financialDivider
              }
            />

            <View
              style={
                styles.financialBottom
              }
            >
              <View>
                <Text
                  style={
                    styles.financialSmallLabel
                  }
                >
                  Today
                </Text>

                <Text
                  style={
                    styles.financialSmallValue
                  }
                >
                  {formatCurrency(
                    revenue.today
                  )}
                </Text>
              </View>

              <Pressable
                style={
                  styles.todayReportButton
                }
                onPress={
                  openTodayReport
                }
              >
                <Text
                  style={
                    styles.todayReportText
                  }
                >
                  Today&apos;s Report
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color="#FFFFFF"
                />
              </Pressable>
            </View>
          </Pressable>

          {/*
           * ===============================================
           * SYSTEM ACTIVITY
           * ===============================================
           */}

          <View
            style={
              styles.sectionHeadingRow
            }
          >
            <View>
              <Text
                style={
                  styles.contentHeading
                }
              >
                System Activity
              </Text>

              <Text
                style={
                  styles.contentSubheading
                }
              >
                Recent platform activity
              </Text>
            </View>
          </View>

          <View
            style={
              styles.activityCard
            }
          >
            {activities.length ===
            0 ? (
              <View
                style={
                  styles.emptyActivity
                }
              >
                <View
                  style={
                    styles.emptyActivityIcon
                  }
                >
                  <Ionicons
                    name="notifications-outline"
                    size={23}
                    color={
                      COLORS.mutedText
                    }
                  />
                </View>

                <Text
                  style={
                    styles.emptyActivityTitle
                  }
                >
                  No recent activity
                </Text>

                <Text
                  style={
                    styles.emptyActivityText
                  }
                >
                  Recent orders,
                  verification requests,
                  and remittances will
                  appear here.
                </Text>
              </View>
            ) : (
              activities.map(
                (
                  activity,
                  index
                ) => {
                  const color =
                    getActivityColor(
                      activity.type
                    );

                  return (
                    <View
                      key={`${activity.type}-${activity.id}-${index}`}
                    >
                      <View
                        style={
                          styles.activityRow
                        }
                      >
                        <View
                          style={[
                            styles.activityIcon,
                            {
                              backgroundColor: `${color}18`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={getActivityIcon(
                              activity.type
                            )}
                            size={17}
                            color={
                              color
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.activityInfo
                          }
                        >
                          <Text
                            style={
                              styles.activityTitle
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {getActivityTitle(
                              activity
                            )}
                          </Text>

                          <Text
                            style={
                              styles.activitySubtitle
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {getActivitySubtitle(
                              activity
                            )}
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.activityTime
                          }
                        >
                          {formatTimeAgo(
                            getActivityDate(
                              activity
                            )
                          )}
                        </Text>
                      </View>

                      {index <
                        activities.length -
                          1 && (
                        <View
                          style={
                            styles.activityDivider
                          }
                        />
                      )}
                    </View>
                  );
                }
              )
            )}
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/*
         * =================================================
         * BOTTOM NAVIGATION
         * =================================================
         */}

        <AdminBottomNav active="dashboard" />
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
        COLORS.background,
    },

    screen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.background,
      paddingHorizontal: 28,
    },

    loadingText: {
      marginTop: 13,
      fontSize: 13,
      color:
        COLORS.secondaryText,
    },

    errorIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor:
        COLORS.redLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    errorTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.text,
      textAlign: "center",
    },

    errorText: {
      marginTop: 7,
      fontSize: 12,
      lineHeight: 18,
      color:
        COLORS.secondaryText,
      textAlign: "center",
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 20,
      minHeight: 44,
      borderRadius: 13,
      backgroundColor:
        COLORS.purpleAccent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
    },

    retryText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    /*
     * =====================================================
     * HEADER
     * =====================================================
     */

    header: {
position: "relative",
  overflow: "hidden",
  backgroundColor: COLORS.purple,
  paddingTop: 54,
  paddingHorizontal: 18,
  paddingBottom: 23,
borderBottomLeftRadius: 26,
borderBottomRightRadius: 26,
},

    headerCircleOne: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        "rgba(255,255,255,0.035)",
      right: -70,
      top: -80,
    },

    headerCircleTwo: {
      position: "absolute",
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor:
        "rgba(255,255,255,0.025)",
      left: -55,
      bottom: -45,
    },

    headerTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
    },

    systemOverview: {
      fontSize: 9,
      fontWeight: "800",
      letterSpacing: 1.3,
      color:
        "rgba(255,255,255,0.62)",
      textTransform:
        "uppercase",
    },

    title: {
      marginTop: 4,
      fontSize: 25,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    welcomeText: {
      marginTop: 5,
      fontSize: 11,
      color:
        "rgba(255,255,255,0.65)",
    },

    headerMenu: {
      width: 39,
      height: 39,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      alignItems: "center",
      justifyContent: "center",
    },

    summaryGrid: {
      marginTop: 20,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      rowGap: 10,
    },

    summaryCard: {
      width: "48.5%",
      minHeight: 100,
      padding: 13,
      borderRadius: 16,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    summaryLabel: {
      fontSize: 9,
      fontWeight: "600",
      color:
        "rgba(255,255,255,0.68)",
    },

    summaryValue: {
      marginTop: 5,
      fontSize: 21,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    summaryMeta: {
      marginTop: 4,
      fontSize: 9,
      color:
        "rgba(255,255,255,0.54)",
    },

    positiveText: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: "600",
      color: "#A7E2BB",
    },

    warningText: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: "600",
      color: "#FFD98C",
    },

    /*
     * =====================================================
     * SCROLL CONTENT
     * =====================================================
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,
      paddingTop: 18,
    },

    inlineError: {
      marginBottom: 13,
      padding: 11,
      borderRadius: 12,
      backgroundColor:
        COLORS.redLight,
      flexDirection: "row",
      alignItems:
        "flex-start",
      gap: 7,
    },

    inlineErrorText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 16,
      color: COLORS.red,
    },

    contentHeading: {
      fontSize: 16,
      fontWeight: "800",
      color: COLORS.text,
    },

    contentSubheading: {
      marginTop: 2,
      fontSize: 10,
      color:
        COLORS.secondaryText,
    },

    sectionHeadingRow: {
      marginTop: 21,
      marginBottom: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    viewAllButton: {
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 7,
    },

    viewAllText: {
      fontSize: 10,
      fontWeight: "700",
      color:
        COLORS.purpleAccent,
    },
        /*
     * =====================================================
     * ADMIN ACTIONS
     * =====================================================
     */

    verificationCard: {
      padding: 15,
      borderRadius: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 9,
    },

    sectionTitle: {
      fontSize: 15,
      fontWeight: "800",
      color: COLORS.text,
    },

    sectionSubtitle: {
      marginTop: 2,
      fontSize: 9,
      color:
        COLORS.secondaryText,
    },

    countBadge: {
      minWidth: 28,
      height: 28,
      paddingHorizontal: 8,
      borderRadius: 14,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent: "center",
    },

    countText: {
      fontSize: 11,
      fontWeight: "800",
      color:
        COLORS.purpleAccent,
    },

    adminActionRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
    },

    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    sellerActionIcon: {
      backgroundColor:
        COLORS.greenLight,
    },

    riderActionIcon: {
      backgroundColor:
        COLORS.yellowLight,
    },

    remittanceActionIcon: {
      backgroundColor:
        COLORS.purpleLight,
    },

    actionInfo: {
      flex: 1,
      minWidth: 0,
    },

    actionTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: COLORS.text,
    },

    actionMeta: {
      marginTop: 3,
      fontSize: 9,
      color:
        COLORS.secondaryText,
    },

    actionCount: {
      minWidth: 27,
      height: 27,
      paddingHorizontal: 7,
      borderRadius: 14,
      backgroundColor:
        COLORS.background,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 5,
    },

    actionCountText: {
      fontSize: 10,
      fontWeight: "800",
      color: COLORS.text,
    },

    rowDivider: {
      height: 1,
      marginLeft: 46,
      backgroundColor:
        COLORS.border,
    },

    /*
     * =====================================================
     * PLATFORM USERS
     * =====================================================
     */

    userStatsRow: {
      marginTop: 11,
      flexDirection: "row",
      justifyContent:
        "space-between",
      gap: 8,
    },

    userStatCard: {
      flex: 1,
      minHeight: 86,
      paddingHorizontal: 10,
      paddingVertical: 13,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    customerCard: {
      backgroundColor:
        "#F0EEFF",
      borderColor:
        "#E2DEFF",
    },

    sellerCard: {
      backgroundColor:
        COLORS.greenLight,
      borderColor:
        "#D8EFE0",
    },

    riderCard: {
      backgroundColor:
        COLORS.yellowLight,
      borderColor:
        "#F5E4BE",
    },

    customerValue: {
      fontSize: 21,
      fontWeight: "800",
      color:
        COLORS.purpleAccent,
    },

    sellerValue: {
      fontSize: 21,
      fontWeight: "800",
      color: COLORS.green,
    },

    riderValue: {
      fontSize: 21,
      fontWeight: "800",
      color: COLORS.yellow,
    },

    userStatLabel: {
      marginTop: 4,
      fontSize: 9,
      fontWeight: "600",
      color:
        COLORS.secondaryText,
    },

    /*
     * =====================================================
     * ORDER MONITORING
     * =====================================================
     */

    orderOverviewCard: {
      padding: 15,
      borderRadius: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    orderOverviewRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },

    orderMetric: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 4,
    },

    orderMetricIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },

    orderMetricValue: {
      fontSize: 18,
      fontWeight: "800",
      color: COLORS.text,
    },

    orderMetricLabel: {
      marginTop: 2,
      fontSize: 8,
      fontWeight: "600",
      color:
        COLORS.secondaryText,
      textAlign: "center",
    },

    metricDivider: {
      width: 1,
      backgroundColor:
        COLORS.border,
      marginHorizontal: 5,
    },

    orderFooter: {
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    orderFooterItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    orderFooterLabel: {
      fontSize: 9,
      color:
        COLORS.secondaryText,
    },

    orderFooterValue: {
      fontSize: 10,
      fontWeight: "800",
      color: COLORS.red,
    },

    orderFooterLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    orderFooterLinkText: {
      fontSize: 9,
      fontWeight: "700",
      color:
        COLORS.purpleAccent,
    },

    /*
     * =====================================================
     * FINANCIAL OVERVIEW
     * =====================================================
     */

    financialCard: {
      overflow: "hidden",
      padding: 17,
      borderRadius: 19,
      backgroundColor:
        COLORS.purple,
    },

    financialHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    financialIcon: {
      width: 39,
      height: 39,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.11)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    financialHeaderText: {
      flex: 1,
    },

    financialEyebrow: {
      fontSize: 8,
      fontWeight: "800",
      letterSpacing: 1,
      color:
        "rgba(255,255,255,0.55)",
    },

    financialTitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    financialValue: {
      marginTop: 18,
      fontSize: 27,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    financialDivider: {
      height: 1,
      marginTop: 17,
      marginBottom: 13,
      backgroundColor:
        "rgba(255,255,255,0.10)",
    },

    financialBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    financialSmallLabel: {
      fontSize: 8,
      color:
        "rgba(255,255,255,0.55)",
    },

    financialSmallValue: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    todayReportButton: {
      minHeight: 33,
      paddingHorizontal: 11,
      borderRadius: 17,
      backgroundColor:
        "rgba(255,255,255,0.11)",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    todayReportText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#FFFFFF",
    },

    /*
     * =====================================================
     * SYSTEM ACTIVITY
     * =====================================================
     */

    activityCard: {
      overflow: "hidden",
      borderRadius: 18,
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    activityRow: {
      minHeight: 65,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    activityInfo: {
      flex: 1,
      minWidth: 0,
    },

    activityTitle: {
      fontSize: 10,
      fontWeight: "700",
      color: COLORS.text,
    },

    activitySubtitle: {
      marginTop: 3,
      fontSize: 9,
      color:
        COLORS.secondaryText,
    },

    activityTime: {
      marginLeft: 8,
      fontSize: 8,
      color:
        COLORS.mutedText,
    },

    activityDivider: {
      height: 1,
      marginLeft: 60,
      backgroundColor:
        COLORS.border,
    },

    emptyActivity: {
      paddingHorizontal: 20,
      paddingVertical: 27,
      alignItems: "center",
    },

    emptyActivityIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        COLORS.background,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 9,
    },

    emptyActivityTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: COLORS.text,
    },

    emptyActivityText: {
      marginTop: 4,
      maxWidth: 250,
      fontSize: 9,
      lineHeight: 14,
      color:
        COLORS.secondaryText,
      textAlign: "center",
    },

    bottomSpacer: {
      height: 25,
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
  justifyContent: "space-around",

  backgroundColor: "#FFFFFF",

  borderTopWidth: 1,
  borderTopColor: COLORS.border,
},

bottomNavItem: {
  flex: 1,
  minHeight: 57,
  alignItems: "center",
  justifyContent: "flex-start",
},

bottomNavIconWrap: {
  width: 36,
  height: 31,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
},

bottomNavIconWrapActive: {
  backgroundColor: COLORS.purpleLight,
},

bottomNavLabel: {
  marginTop: 2,
  fontSize: 9,
  lineHeight: 13,
  fontWeight: "500",
  color: COLORS.mutedText,
  textAlign: "center",
},

bottomNavLabelActive: {
  fontWeight: "700",
  color: COLORS.purpleAccent,
},
});
const riderOpsStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.purpleLight,
  },
  title: {
    marginTop: 10,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  text: {
    marginTop: 4,
    color: COLORS.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
});
