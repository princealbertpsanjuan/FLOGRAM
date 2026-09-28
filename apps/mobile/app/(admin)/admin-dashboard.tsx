import { useCallback, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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

  return (
    name ||
    user.email ||
    ""
  );
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
    Date.now() -
    date.getTime();

  const minutes =
    Math.floor(
      difference / 60000
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
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

    default:
      return "#777777";
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
      return "System activity";
  }
};

const getActivitySubtitle = (
  item: AdminRecentActivity
) => {
  switch (item.type) {
    case "seller_verification": {
      const owner =
        getFullName(
          item.owner
        );

      return (
        item.title ||
        owner ||
        "Seller application"
      );
    }

    case "rider_verification": {
      const owner =
        getFullName(
          item.owner
        );

      return (
        owner ||
        "Rider application"
      );
    }

    case "remittance": {
      const rider =
        getFullName(
          item.riderUser
        );

      return `${rider || "Rider"} • ${formatCurrency(
        item.totalAmount || 0
      )}`;
    }

    case "order":
      return `${
        item.title ||
        "Order"
      } • ${
        item.orderStatus ||
        "pending"
      }`;

    default:
      return "";
  }
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function AdminDashboardScreen() {
  const [
    user,
    setUser,
  ] =
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
            setRefreshing(
              true
            );
          } else {
            setLoading(true);
          }

          setError("");

          const [
            storedUser,
            dashboardData,
          ] =
            await Promise.all([
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
          setRefreshing(
            false
          );
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
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#5552B9"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading Admin
          Dashboard...
        </Text>
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
    !dashboard
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.errorSymbol
          }
        >
          !
        </Text>

        <Text
          style={
            styles.errorTitle
          }
        >
          Unable to load
          dashboard
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
            void loadDashboard()
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
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * DATA
   * =======================================================
   */

  const firstName =
    user?.firstName ||
    "Admin";

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

  /*
   * Admin action count:
   *
   * - seller verification
   * - rider verification
   * - submitted COD remittance
   *
   * These are immediate Admin
   * responsibilities.
   */

  const pendingActions =
    verifications.totalPending +
    remittances.awaitingVerification;

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
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerCircleOne
            }
          />

          <View
            style={
              styles.headerCircleTwo
            }
          />

          <View
            style={
              styles.headerTop
            }
          >
            <View>
              <Text
                style={
                  styles.systemOverview
                }
              >
                System Overview
              </Text>

              <Text
                style={
                  styles.title
                }
              >
                Admin Dashboard
              </Text>

              <Text
                style={
                  styles.welcomeText
                }
              >
                Welcome,{" "}
                {firstName}
              </Text>
            </View>

            <Pressable
              style={
                styles.headerMenu
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-settings"
                )
              }
            >
              <Text
                style={
                  styles.headerMenuText
                }
              >
                •••
              </Text>
            </Pressable>
          </View>

          {/* ===============================================
              SUMMARY
          =============================================== */}

          <View
            style={
              styles.summaryGrid
            }
          >
            <Pressable
              style={
                styles.summaryCard
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-reports"
                )
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Todays Revenue
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
                Successful payments
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.summaryCard
              }
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
                {
                  orders.total
                }{" "}
                total orders
              </Text>
            </Pressable>

            <Pressable
              style={
                styles.summaryCard
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-users"
                )
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
              style={
                styles.summaryCard
              }
              onPress={() =>
                router.push(
                  "/(admin)/admin-verifications"
                )
              }
            >
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Pending Actions
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                {formatNumber(
                  pendingActions
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

        {/* =================================================
            CONTENT
        ================================================= */}

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
              onRefresh={() =>
                void loadDashboard(
                  true
                )
              }
              tintColor="#5552B9"
            />
          }
        >
          {!!error && (
            <View
              style={
                styles.inlineError
              }
            >
              <Text
                style={
                  styles.inlineErrorText
                }
              >
                {error}
              </Text>
            </View>
          )}

          {/* ===============================================
              ADMIN ACTIONS
          =============================================== */}

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
                  Items requiring
                  review
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

            {/* SELLER VERIFICATION */}

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
                <Text
                  style={
                    styles.actionIconText
                  }
                >
                  S
                </Text>
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
                  Seller
                  Verification
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

              <Text
                style={
                  styles.chevron
                }
              >
                ›
              </Text>
            </Pressable>

            <View
              style={
                styles.rowDivider
              }
            />

            {/* RIDER VERIFICATION */}

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
                <Text
                  style={
                    styles.actionIconText
                  }
                >
                  R
                </Text>
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
                  Rider
                  Verification
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

              <Text
                style={
                  styles.chevron
                }
              >
                ›
              </Text>
            </Pressable>

            <View
              style={
                styles.rowDivider
              }
            />

            {/* COD REMITTANCE */}

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
                <Text
                  style={
                    styles.actionIconText
                  }
                >
                  ₱
                </Text>
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

              <Text
                style={
                  styles.chevron
                }
              >
                ›
              </Text>
            </Pressable>
          </View>

          {/* ===============================================
              STAKEHOLDER COUNTS
          =============================================== */}

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
                router.push(
                  "/(admin)/admin-users"
                )
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
                router.push(
                  "/(admin)/admin-users"
                )
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
                router.push(
                  "/(admin)/admin-users"
                )
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

          {/* ===============================================
              ORDER MONITORING
          =============================================== */}

          <View
            style={
              styles.orderCard
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
                  Order Monitoring
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Platform-wide
                  order status
                </Text>
              </View>

              <Pressable
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
              </Pressable>
            </View>

            <View
              style={
                styles.orderStatsRow
              }
            >
              <View
                style={
                  styles.orderStat
                }
              >
                <Text
                  style={
                    styles.activeOrderValue
                  }
                >
                  {
                    orders.active
                  }
                </Text>

                <Text
                  style={
                    styles.orderStatLabel
                  }
                >
                  Active
                </Text>
              </View>

              <View
                style={
                  styles.orderDivider
                }
              />

              <View
                style={
                  styles.orderStat
                }
              >
                <Text
                  style={
                    styles.completedOrderValue
                  }
                >
                  {
                    orders.completed
                  }
                </Text>

                <Text
                  style={
                    styles.orderStatLabel
                  }
                >
                  Completed
                </Text>
              </View>

              <View
                style={
                  styles.orderDivider
                }
              />

              <View
                style={
                  styles.orderStat
                }
              >
                <Text
                  style={
                    styles.cancelledOrderValue
                  }
                >
                  {
                    orders.cancelled
                  }
                </Text>

                <Text
                  style={
                    styles.orderStatLabel
                  }
                >
                  Cancelled
                </Text>
              </View>
            </View>
          </View>

          {/* ===============================================
              FINANCIAL OVERVIEW
          =============================================== */}

          <Pressable
            style={
              styles.financeCard
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-reports"
              )
            }
          >
            <View
              style={
                styles.financeTop
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Financial
                  Overview
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Successful
                  platform
                  transactions
                </Text>
              </View>

              <Text
                style={
                  styles.chevron
                }
              >
                ›
              </Text>
            </View>

            <Text
              style={
                styles.totalRevenueLabel
              }
            >
              Total Revenue
            </Text>

            <Text
              style={
                styles.totalRevenueValue
              }
            >
              {formatCurrency(
                revenue.total
              )}
            </Text>

            <Text
              style={
                styles.commissionNote
              }
            >
              Commission,
              payout and
              detailed financial
              analytics are
              available in
              Reports.
            </Text>
          </Pressable>

          {/* ===============================================
              SYSTEM ACTIVITY
          =============================================== */}

          <View
            style={
              styles.activityCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              System Activity
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Recent orders,
              verification
              requests and
              remittances
            </Text>

            {activities.length ===
            0 ? (
              <View
                style={
                  styles.emptyActivity
                }
              >
                <Text
                  style={
                    styles.emptyActivityText
                  }
                >
                  No recent
                  activity.
                </Text>
              </View>
            ) : (
              activities.map(
                (item) => (
                  <ActivityRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                  />
                )
              )
            )}
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* =================================================
            BOTTOM NAVIGATION
        ================================================= */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                "/(admin)/admin-dashboard"
              )
            }
          >
            <View
              style={
                styles.activeNavIcon
              }
            >
              <Text
                style={
                  styles.activeNavSymbol
                }
              >
                ⌂
              </Text>
            </View>

            <Text
              style={
                styles.activeNavText
              }
            >
              Dashboard
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-users"
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ♙
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Users
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-orders"
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ◈
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Orders
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-reports"
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ▥
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                "/(admin)/admin-settings"
              )
            }
          >
            <Text
              style={
                styles.navIcon
              }
            >
              ⚙
            </Text>

            <Text
              style={
                styles.navText
              }
            >
              Settings
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * ACTIVITY ROW
 * =========================================================
 */

function ActivityRow({
  item,
}: {
  item: AdminRecentActivity;
}) {
  return (
    <View
      style={
        styles.activityRow
      }
    >
      <View
        style={[
          styles.activityDot,
          {
            backgroundColor:
              getActivityColor(
                item.type
              ),
          },
        ]}
      />

      <View
        style={
          styles.activityInfo
        }
      >
        <Text
          style={
            styles.activityTitle
          }
        >
          {getActivityTitle(
            item
          )}
        </Text>

        <Text
          style={
            styles.activitySubtitle
          }
          numberOfLines={1}
        >
          {getActivitySubtitle(
            item
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
            item
          )
        )}
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
    container: {
      flex: 1,
      backgroundColor:
        "#F5F5F8",
    },

    screen: {
      flex: 1,
      backgroundColor:
        "#F5F5F8",
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        "#F5F5F8",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
    },

    loadingText: {
      marginTop: 12,
      color: "#88858E",
      fontSize: 12,
    },

    errorSymbol: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        "#FFF0F3",
      color: "#E56391",
      textAlign: "center",
      lineHeight: 46,
      fontSize: 24,
      fontWeight: "800",
    },

    errorTitle: {
      marginTop: 13,
      color: "#3B3940",
      fontSize: 17,
      fontWeight: "800",
    },

    errorText: {
      color: "#99949A",
      fontSize: 11,
      textAlign: "center",
      lineHeight: 17,
      marginTop: 7,
    },

    retryButton: {
      marginTop: 17,
      backgroundColor:
        "#5552B9",
      borderRadius: 12,
      paddingHorizontal: 22,
      paddingVertical: 11,
    },

    retryText: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700",
    },

    /*
     * HEADER
     */

    header: {
      backgroundColor:
        "#24245D",
      paddingHorizontal: 19,
      paddingTop: 18,
      paddingBottom: 18,
      overflow: "hidden",
    },

    headerCircleOne: {
      position: "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        "rgba(255,255,255,0.035)",
      top: -100,
      right: -55,
    },

    headerCircleTwo: {
      position: "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor:
        "rgba(255,255,255,0.025)",
      bottom: -80,
      left: -45,
    },

    headerTop: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between",
    },

    systemOverview: {
      color: "#A8A8CA",
      fontSize: 9,
      marginTop: 4,
      textTransform:
        "uppercase",
      letterSpacing: 0.6,
    },

    title: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800",
      marginTop: 2,
    },

    welcomeText: {
      color: "#A8A8CA",
      fontSize: 8,
      marginTop: 3,
    },

    headerMenu: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent:
        "center",
    },

    headerMenuText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "800",
    },

    /*
     * SUMMARY
     */

    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
      marginTop: 15,
    },

    summaryCard: {
      width: "48.5%",
      minHeight: 72,
      backgroundColor:
        "#3A3975",
      borderRadius: 13,
      paddingHorizontal: 11,
      paddingVertical: 10,
    },

    summaryLabel: {
      color: "#B8B8D3",
      fontSize: 8,
    },

    summaryValue: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "800",
      marginTop: 3,
    },

    positiveText: {
      color: "#76CE9B",
      fontSize: 7,
      marginTop: 4,
    },

    warningText: {
      color: "#F2C36B",
      fontSize: 7,
      marginTop: 4,
    },

    summaryMeta: {
      color: "#B8B8D3",
      fontSize: 7,
      marginTop: 4,
    },

    /*
     * CONTENT
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 14,
    },

    inlineError: {
      backgroundColor:
        "#FFF0F3",
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },

    inlineErrorText: {
      color: "#D95C83",
      fontSize: 9,
    },

    contentHeading: {
      color: "#3B3940",
      fontSize: 11,
      fontWeight: "800",
      marginTop: 14,
      marginBottom: 7,
    },

    /*
     * ADMIN ACTIONS
     */

    verificationCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      padding: 13,
      elevation: 2,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 5,
    },

    sectionTitle: {
      color: "#3B3940",
      fontSize: 11,
      fontWeight: "800",
    },

    sectionSubtitle: {
      color: "#AAA7AC",
      fontSize: 7,
      marginTop: 3,
    },

    countBadge: {
      minWidth: 23,
      height: 23,
      borderRadius: 12,
      paddingHorizontal: 7,
      backgroundColor:
        "#E96291",
      alignItems: "center",
      justifyContent:
        "center",
    },

    countText: {
      color: "#FFFFFF",
      fontSize: 9,
      fontWeight: "800",
    },

    adminActionRow: {
      minHeight: 53,
      flexDirection: "row",
      alignItems: "center",
    },

    actionIcon: {
      width: 31,
      height: 31,
      borderRadius: 16,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    sellerActionIcon: {
      backgroundColor:
        "#EAF7EF",
    },

    riderActionIcon: {
      backgroundColor:
        "#FFF2D8",
    },

    remittanceActionIcon: {
      backgroundColor:
        "#ECECFF",
    },

    actionIconText: {
      color: "#5552B9",
      fontSize: 10,
      fontWeight: "800",
    },

    actionInfo: {
      flex: 1,
    },

    actionTitle: {
      color: "#4A474D",
      fontSize: 9,
      fontWeight: "700",
    },

    actionMeta: {
      color: "#AAA7AC",
      fontSize: 7,
      marginTop: 3,
    },

    actionCount: {
      minWidth: 25,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 7,
      backgroundColor:
        "#F3F3F7",
      alignItems: "center",
      justifyContent:
        "center",
    },

    actionCountText: {
      color: "#6F6C74",
      fontSize: 8,
      fontWeight: "800",
    },

    chevron: {
      color: "#AAA7AC",
      fontSize: 19,
      marginLeft: 6,
    },

    rowDivider: {
      height: 1,
      backgroundColor:
        "#F0F0F3",
      marginLeft: 40,
    },

    /*
     * USER COUNTS
     */

    userStatsRow: {
      flexDirection: "row",
      gap: 8,
    },

    userStatCard: {
      flex: 1,
      height: 61,
      borderRadius: 13,
      alignItems: "center",
      justifyContent:
        "center",
    },

    customerCard: {
      backgroundColor:
        "#FFE7EF",
    },

    sellerCard: {
      backgroundColor:
        "#EAF7EF",
    },

    riderCard: {
      backgroundColor:
        "#FFF2D8",
    },

    customerValue: {
      color: "#DF6E94",
      fontSize: 16,
      fontWeight: "800",
    },

    sellerValue: {
      color: "#6AA880",
      fontSize: 16,
      fontWeight: "800",
    },

    riderValue: {
      color: "#D49B35",
      fontSize: 16,
      fontWeight: "800",
    },

    userStatLabel: {
      color: "#99949A",
      fontSize: 7,
      marginTop: 4,
    },

    /*
     * ORDERS
     */

    orderCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      padding: 13,
      marginTop: 13,
      elevation: 2,
    },

    viewAllText: {
      color: "#5552B9",
      fontSize: 8,
      fontWeight: "700",
    },

    orderStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 13,
    },

    orderStat: {
      flex: 1,
      alignItems: "center",
    },

    orderDivider: {
      width: 1,
      height: 29,
      backgroundColor:
        "#ECECF0",
    },

    activeOrderValue: {
      color: "#D49B35",
      fontSize: 15,
      fontWeight: "800",
    },

    completedOrderValue: {
      color: "#6AA880",
      fontSize: 15,
      fontWeight: "800",
    },

    cancelledOrderValue: {
      color: "#DF6E94",
      fontSize: 15,
      fontWeight: "800",
    },

    orderStatLabel: {
      color: "#99949A",
      fontSize: 7,
      marginTop: 4,
    },

    /*
     * FINANCE
     */

    financeCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      padding: 13,
      marginTop: 13,
      elevation: 2,
    },

    financeTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    totalRevenueLabel: {
      color: "#99949A",
      fontSize: 7,
      marginTop: 13,
    },

    totalRevenueValue: {
      color: "#5552B9",
      fontSize: 19,
      fontWeight: "800",
      marginTop: 2,
    },

    commissionNote: {
      color: "#AAA7AC",
      fontSize: 7,
      lineHeight: 11,
      marginTop: 5,
    },

    /*
     * ACTIVITY
     */

    activityCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      paddingHorizontal: 13,
      paddingVertical: 13,
      marginTop: 13,
      elevation: 2,
    },

    activityRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 43,
      borderBottomWidth: 1,
      borderBottomColor:
        "#F2F2F5",
    },

    activityDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8,
    },

    activityInfo: {
      flex: 1,
    },

    activityTitle: {
      color: "#4A474D",
      fontSize: 8,
      fontWeight: "700",
    },

    activitySubtitle: {
      color: "#AAA7AC",
      fontSize: 7,
      marginTop: 2,
    },

    activityTime: {
      color: "#B6B3B7",
      fontSize: 7,
      marginLeft: 7,
    },

    emptyActivity: {
      minHeight: 60,
      alignItems: "center",
      justifyContent:
        "center",
    },

    emptyActivityText: {
      color: "#AAA7AC",
      fontSize: 8,
    },

    bottomSpacer: {
      height: 20,
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNavigation: {
      height: 70,
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        "#ECECF0",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-around",
      paddingBottom: 3,
    },

    navItem: {
      flex: 1,
      height: "100%",
      alignItems: "center",
      justifyContent:
        "center",
    },

    activeNavIcon: {
      width: 34,
      height: 29,
      borderRadius: 15,
      backgroundColor:
        "#ECECFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    activeNavSymbol: {
      color: "#5652C9",
      fontSize: 16,
    },

    navIcon: {
      color: "#9A99A4",
      fontSize: 16,
    },

    activeNavText: {
      color: "#5652C9",
      fontSize: 8,
      fontWeight: "700",
      marginTop: 3,
    },

    navText: {
      color: "#9D9CA5",
      fontSize: 8,
      marginTop: 4,
    },
  });