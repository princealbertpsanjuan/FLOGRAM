import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
  View,
} from "react-native";

import {
  AdminReportBreakdown,
  AdminReportPeriod,
  AdminReportsData,
  AdminSalesTrendItem,
  AdminTopShop,
  getAdminReports,
} from "../../services/admin";

/*
 * =========================================================
 * COLORS
 * =========================================================
 */

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

/*
 * =========================================================
 * PERIOD FILTERS
 * =========================================================
 */

const PERIODS: {
  label: string;
  value: AdminReportPeriod;
}[] = [
  {
    label: "7 Days",
    value: "7d",
  },
  {
    label: "30 Days",
    value: "30d",
  },
  {
    label: "6 Months",
    value: "6m",
  },
  {
    label: "1 Year",
    value: "1y",
  },
  {
    label: "All Time",
    value: "all",
  },
];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function formatCurrency(
  value?: number | null
) {
  const amount = Number(value || 0);

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(
  value?: number | null
) {
  return Number(value || 0).toLocaleString("en-PH");
}

function formatPercent(
  value?: number | null
) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatLabel(
  value?: string | null
) {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatShortPeriod(
  value: string
) {
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    const date = new Date(
      `${value}T00:00:00`
    );

    return date.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        day: "numeric",
      }
    );
  }

  if (
    /^\d{4}-\d{2}$/.test(
      value
    )
  ) {
    const [year, month] =
      value.split("-");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );

    return date.toLocaleDateString(
      "en-PH",
      {
        month: "short",
        year: "2-digit",
      }
    );
  }

  return value;
}

function getPeriodLabel(
  period: AdminReportPeriod
) {
  return (
    PERIODS.find(
      (item) =>
        item.value === period
    )?.label || "30 Days"
  );
}

/*
 * =========================================================
 * SECTION HEADER
 * =========================================================
 */

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEyebrow}>
        {eyebrow}
      </Text>

      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={styles.sectionSubtitle}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * STAT CARD
 * =========================================================
 */

type StatCardProps = {
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  label: string;
  value: string;
  detail?: string;
  tone?:
    | "purple"
    | "green"
    | "blue"
    | "yellow"
    | "red";
};

function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "purple",
}: StatCardProps) {
  const toneData = {
    purple: {
      iconColor: COLORS.purpleAccent,
      background: COLORS.purpleLight,
    },

    green: {
      iconColor: COLORS.green,
      background:
        COLORS.greenBackground,
    },

    blue: {
      iconColor: COLORS.blue,
      background:
        COLORS.blueBackground,
    },

    yellow: {
      iconColor: COLORS.yellow,
      background:
        COLORS.yellowBackground,
    },

    red: {
      iconColor: COLORS.red,
      background:
        COLORS.redBackground,
    },
  }[tone];

  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              toneData.background,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={toneData.iconColor}
        />
      </View>

      <Text style={styles.statLabel}>
        {label}
      </Text>

      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      {detail ? (
        <Text style={styles.statDetail}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

/*
 * =========================================================
 * INFO ROW
 * =========================================================
 */

type InfoRowProps = {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
};

function InfoRow({
  label,
  value,
  valueColor,
  last = false,
}: InfoRowProps) {
  return (
    <View
      style={[
        styles.infoRow,
        last && styles.infoRowLast,
      ]}
    >
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.infoValue,
          valueColor
            ? {
                color: valueColor,
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
 * BREAKDOWN CARD
 * =========================================================
 */

type BreakdownCardProps = {
  title: string;
  icon: React.ComponentProps<
    typeof Ionicons
  >["name"];
  data: AdminReportBreakdown[];
};

function BreakdownCard({
  title,
  icon,
  data,
}: BreakdownCardProps) {
  const total = data.reduce(
    (sum, item) =>
      sum + Number(item.count || 0),
    0
  );

  return (
    <View style={styles.contentCard}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons
            name={icon}
            size={18}
            color={COLORS.purpleAccent}
          />
        </View>

        <Text style={styles.cardTitle}>
          {title}
        </Text>
      </View>

      {data.length === 0 ? (
        <Text
          style={styles.emptySmallText}
        >
          No data available for this
          period.
        </Text>
      ) : (
        data.map((item, index) => {
          const percentage =
            total > 0
              ? (item.count / total) *
                100
              : 0;

          return (
            <View
              key={`${item.key}-${index}`}
              style={
                styles.breakdownItem
              }
            >
              <View
                style={
                  styles.breakdownTop
                }
              >
                <Text
                  style={
                    styles.breakdownLabel
                  }
                >
                  {formatLabel(
                    item.key
                  )}
                </Text>

                <Text
                  style={
                    styles.breakdownCount
                  }
                >
                  {formatNumber(
                    item.count
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        percentage,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={
                  styles.breakdownPercent
                }
              >
                {percentage.toFixed(1)}%
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

/*
 * =========================================================
 * SALES TREND
 * =========================================================
 */

type SalesTrendProps = {
  data: AdminSalesTrendItem[];
};

function SalesTrend({
  data,
}: SalesTrendProps) {
  const visibleData =
    data.slice(-12);

  const maximum = Math.max(
    ...visibleData.map((item) =>
      Number(item.total || 0)
    ),
    1
  );

  return (
    <View style={styles.contentCard}>
      <View style={styles.cardTitleRow}>
        <View style={styles.cardTitleIcon}>
          <Ionicons
            name="trending-up-outline"
            size={18}
            color={COLORS.purpleAccent}
          />
        </View>

        <View
          style={styles.cardTitleText}
        >
          <Text style={styles.cardTitle}>
            Sales Trend
          </Text>

          <Text
            style={styles.cardSubtitle}
          >
            Recognized sales over the
            selected period
          </Text>
        </View>
      </View>

      {visibleData.length === 0 ? (
        <Text
          style={styles.emptySmallText}
        >
          No recognized sales recorded
          for this period.
        </Text>
      ) : (
        <>
          <View
            style={styles.chartContainer}
          >
            {visibleData.map(
              (item, index) => {
                const ratio =
                  maximum > 0
                    ? item.total /
                      maximum
                    : 0;

                const height =
                  Math.max(
                    ratio * 120,
                    item.total > 0
                      ? 8
                      : 2
                  );

                return (
                  <View
                    key={`${item.period}-${index}`}
                    style={
                      styles.chartColumn
                    }
                  >
                    <View
                      style={
                        styles.chartBarArea
                      }
                    >
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.chartLabel
                      }
                    >
                      {formatShortPeriod(
                        item.period
                      )}
                    </Text>
                  </View>
                );
              }
            )}
          </View>

          <View
            style={styles.chartLegend}
          >
            <View
              style={styles.legendItem}
            >
              <View
                style={[
                  styles.legendDot,
                  {
                    backgroundColor:
                      COLORS.purpleAccent,
                  },
                ]}
              />

              <Text
                style={styles.legendText}
              >
                Recognized Sales
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/*
 * =========================================================
 * TOP SHOP
 * =========================================================
 */

type TopShopRowProps = {
  shop: AdminTopShop;
};

function TopShopRow({
  shop,
}: TopShopRowProps) {
  const ownerName = [
    shop.owner?.firstName,
    shop.owner?.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.shopRow}>
      <View style={styles.rankCircle}>
        <Text style={styles.rankText}>
          {shop.rank}
        </Text>
      </View>

      <View style={styles.shopInfo}>
        <Text
          style={styles.shopName}
          numberOfLines={1}
        >
          {shop.shopName}
        </Text>

        <Text
          style={styles.shopMeta}
          numberOfLines={1}
        >
          {ownerName || "Seller"}
          {" • "}
          {formatNumber(shop.orders)}{" "}
          orders
        </Text>
      </View>

      <View
        style={styles.shopValueWrap}
      >
        <Text
          style={styles.shopValue}
        >
          {formatCurrency(
            shop.orderValue
          )}
        </Text>

        <Text
          style={
            styles.shopValueLabel
          }
        >
          order value
        </Text>
      </View>
    </View>
  );
}

/*
 * =========================================================
 * BOTTOM NAVIGATION
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
      "/(admin)/admin-reports"
    ) {
      return;
    }

    router.replace(
      item.route as never
    );
  };

  return (
    <View
      style={styles.bottomNavigation}
    >
      {ADMIN_NAV_ITEMS.map(
        (item) => {
          const isActive =
            item.label === "Reports";

          return (
            <Pressable
              key={item.label}
              style={
                styles.bottomNavItem
              }
              onPress={() =>
                handleNavigation(item)
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

/*
 * =========================================================
 * MAIN SCREEN
 * =========================================================
 */

export default function AdminReportsScreen() {
  const router = useRouter();

  const [
    selectedPeriod,
    setSelectedPeriod,
  ] =
    useState<AdminReportPeriod>(
      "30d"
    );

  const [report, setReport] =
    useState<AdminReportsData | null>(
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
   * LOAD REPORT
   * =======================================================
   */

  const loadReport =
    useCallback(
      async (
        period:
          AdminReportPeriod,
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const data =
            await getAdminReports(
              period
            );

          setReport(data);
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Reports and analytics could not be loaded.";

          setError(message);
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  /*
   * =======================================================
   * LOAD ON FOCUS / PERIOD CHANGE
   * =======================================================
   */

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const run = async () => {
        try {
          setLoading(true);
          setError("");

          const data =
            await getAdminReports(
              selectedPeriod
            );

          if (active) {
            setReport(data);
          }
        } catch (err) {
          if (active) {
            setError(
              err instanceof Error
                ? err.message
                : "Reports and analytics could not be loaded."
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      void run();

      return () => {
        active = false;
      };
    }, [selectedPeriod])
  );

  /*
   * =======================================================
   * DERIVED DATA
   * =======================================================
   */

  const periodLabel = useMemo(
    () =>
      getPeriodLabel(
        selectedPeriod
      ),
    [selectedPeriod]
  );

  const orderTotal =
    report?.orders.total || 0;

  const deliveryCount =
    useMemo(() => {
      return (
        report?.orders.byFulfillment.find(
          (item) =>
            item.key === "delivery"
        )?.count || 0
      );
    }, [report]);

  const pickupCount =
    useMemo(() => {
      return (
        report?.orders.byFulfillment.find(
          (item) =>
            item.key === "pickup"
        )?.count || 0
      );
    }, [report]);

  const deliveryPercent =
    orderTotal > 0
      ? (deliveryCount /
          orderTotal) *
        100
      : 0;

  const pickupPercent =
    orderTotal > 0
      ? (pickupCount /
          orderTotal) *
        100
      : 0;

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (loading && !report) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator
          size="large"
          color={COLORS.purpleAccent}
        />

        <Text style={styles.loadingText}>
          Loading reports and
          analytics...
        </Text>
      </View>
    );
  }

  /*
   * =======================================================
   * ERROR
   * =======================================================
   */

  if (error && !report) {
    return (
      <View style={styles.centerScreen}>
        <View style={styles.errorIcon}>
          <Ionicons
            name="alert-circle-outline"
            size={30}
            color={COLORS.red}
          />
        </View>

        <Text style={styles.errorTitle}>
          Unable to load reports
        </Text>

        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() =>
            void loadReport(
              selectedPeriod
            )
          }
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.retryButtonText
            }
          >
            Try Again
          </Text>
        </Pressable>

        <Pressable
          style={styles.backTextButton}
          onPress={() =>
            router.back()
          }
        >
          <Text style={styles.backText}>
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.mainScroll}
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              void loadReport(
                selectedPeriod,
                true
              )
            }
            tintColor={
              COLORS.purpleAccent
            }
          />
        }
      >
        {/*
         * =================================================
         * HEADER
         * =================================================
         */}

        <View style={styles.header}>
          <View
            style={styles.headerTop}
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
                name="arrow-back"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>

            <Pressable
              style={
                styles.headerButton
              }
              onPress={() =>
                void loadReport(
                  selectedPeriod,
                  true
                )
              }
            >
              <Ionicons
                name="refresh-outline"
                size={21}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <Text
            style={
              styles.headerEyebrow
            }
          >
            SYSTEM ANALYTICS
          </Text>

          <Text
            style={styles.headerTitle}
          >
            Reports & Analytics
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Monitor FLOGRAM&apos;s
            marketplace performance
            and financial activity.
          </Text>

          <View
            style={
              styles.headerSummary
            }
          >
            <View>
              <Text
                style={
                  styles.headerSummaryLabel
                }
              >
                Recognized Sales
              </Text>

              <Text
                style={
                  styles.headerSummaryValue
                }
              >
                {formatCurrency(
                  report.sales.total
                )}
              </Text>
            </View>

            <View
              style={
                styles.headerPeriodBadge
              }
            >
              <Ionicons
                name="calendar-outline"
                size={15}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.headerPeriodText
                }
              >
                {periodLabel}
              </Text>
            </View>
          </View>
        </View>

        {/*
         * =================================================
         * BODY
         * =================================================
         */}

        <View style={styles.body}>
          <SectionHeader
            eyebrow="REPORT PERIOD"
            title="Analytics Overview"
            subtitle="Choose a period to update all report data."
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.periodRow
            }
          >
            {PERIODS.map((item) => {
              const active =
                selectedPeriod ===
                item.value;

              return (
                <Pressable
                  key={item.value}
                  style={[
                    styles.periodButton,
                    active &&
                      styles.periodButtonActive,
                  ]}
                  onPress={() =>
                    setSelectedPeriod(
                      item.value
                    )
                  }
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      active &&
                        styles.periodButtonTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <View
              style={styles.inlineError}
            >
              <Ionicons
                name="alert-circle-outline"
                size={18}
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
          ) : null}

          <View style={styles.statGrid}>
            <StatCard
              icon="cash-outline"
              label="Sales"
              value={formatCurrency(
                report.overview
                  .recognizedSales
              )}
              detail="Recognized"
              tone="purple"
            />

            <StatCard
              icon="receipt-outline"
              label="Orders"
              value={formatNumber(
                report.overview
                  .totalOrders
              )}
              detail={`${formatPercent(
                report.overview
                  .completionRate
              )} completed`}
              tone="blue"
            />

            <StatCard
              icon="people-outline"
              label="Users"
              value={formatNumber(
                report.overview
                  .totalUsers
              )}
              detail="Platform users"
              tone="green"
            />

            <StatCard
              icon="wallet-outline"
              label="Commission"
              value={formatCurrency(
                report.overview
                  .commission
              )}
              detail="15% platform share"
              tone="yellow"
            />
          </View>

          <SectionHeader
            eyebrow="FINANCIAL PERFORMANCE"
            title="Sales & Revenue"
            subtitle="Recognized marketplace transactions based on successful online payments and verified COD remittances."
          />

          <View
            style={styles.financeHero}
          >
            <View
              style={
                styles.financeHeroTop
              }
            >
              <View
                style={
                  styles.financeHeroIcon
                }
              >
                <Ionicons
                  name="analytics-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={
                  styles.financeHeroLabel
                }
              >
                TOTAL RECOGNIZED SALES
              </Text>
            </View>

            <Text
              style={
                styles.financeHeroValue
              }
            >
              {formatCurrency(
                report.sales.total
              )}
            </Text>

            <Text
              style={
                styles.financeHeroSubtext
              }
            >
              {periodLabel}
            </Text>
          </View>

          <View
            style={styles.contentCard}
          >
            <InfoRow
              label="Online Payments"
              value={formatCurrency(
                report.sales.online
              )}
              valueColor={COLORS.blue}
            />

            <InfoRow
              label="Verified COD"
              value={formatCurrency(
                report.sales.cod
              )}
              valueColor={
                COLORS.green
              }
            />

            <InfoRow
              label={`FLOGRAM Commission (${report.sales.commissionPercentage}%)`}
              value={formatCurrency(
                report.sales
                  .commission
              )}
              valueColor={
                COLORS.purpleAccent
              }
            />

            <InfoRow
              label="Seller Share"
              value={formatCurrency(
                report.sales
                  .sellerShare
              )}
              last
            />
          </View>

          <SalesTrend
            data={report.sales.trend}
          />

          <SectionHeader
            eyebrow="ORDER PERFORMANCE"
            title="Order Analytics"
            subtitle="Analyze order completion, cancellation, fulfillment, and marketplace activity."
          />

          <View style={styles.statGrid}>
            <StatCard
              icon="bag-handle-outline"
              label="Total Orders"
              value={formatNumber(
                report.orders.total
              )}
              tone="purple"
            />

            <StatCard
              icon="checkmark-circle-outline"
              label="Completed"
              value={formatNumber(
                report.orders.completed
              )}
              detail={formatPercent(
                report.orders
                  .completionRate
              )}
              tone="green"
            />

            <StatCard
              icon="close-circle-outline"
              label="Cancelled"
              value={formatNumber(
                report.orders.cancelled
              )}
              detail={formatPercent(
                report.orders
                  .cancellationRate
              )}
              tone="red"
            />

            <StatCard
              icon="calendar-outline"
              label="Pre-Orders"
              value={formatNumber(
                report.orders.preOrders
              )}
              tone="yellow"
            />
          </View>

          <BreakdownCard
            title="Orders by Status"
            icon="layers-outline"
            data={
              report.orders.byStatus
            }
          />

          <BreakdownCard
            title="Payment Methods"
            icon="card-outline"
            data={
              report.orders
                .byPaymentMethod
            }
          />

          <BreakdownCard
            title="Order Sources"
            icon="flower-outline"
            data={
              report.orders.bySource
            }
          />

          <View
            style={styles.contentCard}
          >
            <View
              style={styles.cardTitleRow}
            >
              <View
                style={
                  styles.cardTitleIcon
                }
              >
                <Ionicons
                  name="navigate-outline"
                  size={18}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>

              <View
                style={
                  styles.cardTitleText
                }
              >
                <Text
                  style={styles.cardTitle}
                >
                  Fulfillment
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  Delivery versus
                  customer pickup
                </Text>
              </View>
            </View>

            <View
              style={
                styles.fulfillmentRow
              }
            >
              <View
                style={
                  styles.fulfillmentItem
                }
              >
                <View
                  style={[
                    styles.fulfillmentIcon,
                    {
                      backgroundColor:
                        COLORS.blueBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="bicycle-outline"
                    size={21}
                    color={COLORS.blue}
                  />
                </View>

                <Text
                  style={
                    styles.fulfillmentValue
                  }
                >
                  {formatNumber(
                    deliveryCount
                  )}
                </Text>

                <Text
                  style={
                    styles.fulfillmentLabel
                  }
                >
                  Delivery
                </Text>

                <Text
                  style={
                    styles.fulfillmentPercent
                  }
                >
                  {deliveryPercent.toFixed(
                    1
                  )}
                  %
                </Text>
              </View>

              <View
                style={
                  styles.fulfillmentDivider
                }
              />

              <View
                style={
                  styles.fulfillmentItem
                }
              >
                <View
                  style={[
                    styles.fulfillmentIcon,
                    {
                      backgroundColor:
                        COLORS.greenBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={21}
                    color={
                      COLORS.green
                    }
                  />
                </View>

                <Text
                  style={
                    styles.fulfillmentValue
                  }
                >
                  {formatNumber(
                    pickupCount
                  )}
                </Text>

                <Text
                  style={
                    styles.fulfillmentLabel
                  }
                >
                  Pickup
                </Text>

                <Text
                  style={
                    styles.fulfillmentPercent
                  }
                >
                  {pickupPercent.toFixed(
                    1
                  )}
                  %
                </Text>
              </View>
            </View>
          </View>

          <SectionHeader
            eyebrow="PLATFORM COMMUNITY"
            title="User Analytics"
            subtitle="Current platform population and registrations within the selected report period."
          />

          <View
            style={styles.contentCard}
          >
            <InfoRow
              label="Total Platform Users"
              value={formatNumber(
                report.users.total
              )}
            />

            <InfoRow
              label="Customers"
              value={formatNumber(
                report.users.customers
              )}
            />

            <InfoRow
              label="Sellers"
              value={formatNumber(
                report.users.sellers
              )}
            />

            <InfoRow
              label="Riders"
              value={formatNumber(
                report.users.riders
              )}
              last
            />
          </View>

          <View
            style={styles.newUsersCard}
          >
            <View
              style={
                styles.newUsersHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.newUsersEyebrow
                  }
                >
                  NEW REGISTRATIONS
                </Text>

                <Text
                  style={
                    styles.newUsersValue
                  }
                >
                  {formatNumber(
                    report.users.newUsers
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.newUsersIcon
                }
              >
                <Ionicons
                  name="person-add-outline"
                  size={23}
                  color={
                    COLORS.purpleAccent
                  }
                />
              </View>
            </View>

            <View
              style={
                styles.newUserBreakdown
              }
            >
              <View
                style={
                  styles.newUserItem
                }
              >
                <Text
                  style={
                    styles.newUserNumber
                  }
                >
                  {formatNumber(
                    report.users
                      .newCustomers
                  )}
                </Text>

                <Text
                  style={
                    styles.newUserLabel
                  }
                >
                  Customers
                </Text>
              </View>

              <View
                style={
                  styles.newUserItem
                }
              >
                <Text
                  style={
                    styles.newUserNumber
                  }
                >
                  {formatNumber(
                    report.users
                      .newSellers
                  )}
                </Text>

                <Text
                  style={
                    styles.newUserLabel
                  }
                >
                  Sellers
                </Text>
              </View>

              <View
                style={
                  styles.newUserItem
                }
              >
                <Text
                  style={
                    styles.newUserNumber
                  }
                >
                  {formatNumber(
                    report.users
                      .newRiders
                  )}
                </Text>

                <Text
                  style={
                    styles.newUserLabel
                  }
                >
                  Riders
                </Text>
              </View>
            </View>
          </View>

          <SectionHeader
            eyebrow="COD MONITORING"
            title="Remittance Analytics"
            subtitle="Monitor rider cash-on-delivery remittance activity and verified COD value."
          />

          <View style={styles.statGrid}>
            <StatCard
              icon="time-outline"
              label="Pending"
              value={formatNumber(
                report.remittances
                  .pending
              )}
              tone="yellow"
            />

            <StatCard
              icon="document-text-outline"
              label="Submitted"
              value={formatNumber(
                report.remittances
                  .submitted
              )}
              detail="For verification"
              tone="blue"
            />

            <StatCard
              icon="checkmark-done-outline"
              label="Verified"
              value={formatNumber(
                report.remittances
                  .verified
              )}
              tone="green"
            />

            <StatCard
              icon="close-outline"
              label="Rejected"
              value={formatNumber(
                report.remittances
                  .rejected
              )}
              tone="red"
            />
          </View>

          <View
            style={styles.codValueCard}
          >
            <View
              style={
                styles.codValueIcon
              }
            >
              <Ionicons
                name="cash-outline"
                size={24}
                color={COLORS.green}
              />
            </View>

            <View
              style={
                styles.codValueContent
              }
            >
              <Text
                style={
                  styles.codValueLabel
                }
              >
                Verified COD Value
              </Text>

              <Text
                style={styles.codValue}
              >
                {formatCurrency(
                  report.remittances
                    .verifiedAmount
                )}
              </Text>

              <Text
                style={
                  styles.codValueMeta
                }
              >
                {formatNumber(
                  report.remittances
                    .verifiedInPeriod
                )}{" "}
                remittance
                {report.remittances
                  .verifiedInPeriod ===
                1
                  ? ""
                  : "s"}{" "}
                verified during this
                period
              </Text>
            </View>
          </View>

          <SectionHeader
            eyebrow="MARKETPLACE PERFORMANCE"
            title="Top Shops"
            subtitle="Completed order performance for the selected report period."
          />

          <View
            style={styles.contentCard}
          >
            <View
              style={styles.cardTitleRow}
            >
              <View
                style={
                  styles.cardTitleIcon
                }
              >
                <Ionicons
                  name="trophy-outline"
                  size={18}
                  color={COLORS.yellow}
                />
              </View>

              <View
                style={
                  styles.cardTitleText
                }
              >
                <Text
                  style={styles.cardTitle}
                >
                  Shop Performance
                </Text>

                <Text
                  style={
                    styles.cardSubtitle
                  }
                >
                  Based on completed
                  marketplace order
                  value
                </Text>
              </View>
            </View>

            {report.topShops.length ===
            0 ? (
              <View
                style={
                  styles.emptyInline
                }
              >
                <Ionicons
                  name="storefront-outline"
                  size={27}
                  color={
                    COLORS.mutedText
                  }
                />

                <Text
                  style={
                    styles.emptySmallText
                  }
                >
                  No completed shop
                  orders found for this
                  period.
                </Text>
              </View>
            ) : (
              report.topShops.map(
                (shop) => (
                  <TopShopRow
                    key={`${shop.floristId ?? shop.rank}`}
                    shop={shop}
                  />
                )
              )
            )}
          </View>

          <View
            style={styles.noticeCard}
          >
            <View
              style={styles.noticeIcon}
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  COLORS.purpleAccent
                }
              />
            </View>

            <View
              style={
                styles.noticeContent
              }
            >
              <Text
                style={
                  styles.noticeTitle
                }
              >
                About Financial Reports
              </Text>

              <Text
                style={
                  styles.noticeText
                }
              >
                Recognized sales include
                successful online
                payments and COD funds
                only after the rider
                remittance has been
                verified by an
                administrator.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <AdminBottomNavigation />
    </View>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  mainScroll: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  /*
   * =======================================================
   * CENTER STATES
   * =======================================================
   */

  centerScreen: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.secondaryText,
  },

  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor:
      COLORS.redBackground,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },

  errorText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.secondaryText,
    textAlign: "center",
  },

  retryButton: {
    marginTop: 22,
    minHeight: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor:
      COLORS.purpleAccent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  backTextButton: {
    marginTop: 16,
    padding: 8,
  },

  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.purpleAccent,
  },

  /*
   * =======================================================
   * HEADER
   * =======================================================
   */

  header: {
    backgroundColor:
      COLORS.purple,
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    marginBottom: 24,
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    color:
      "rgba(255,255,255,0.65)",
  },

  headerTitle: {
    marginTop: 6,
    fontSize: 29,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    marginTop: 8,
    maxWidth: 330,
    fontSize: 14,
    lineHeight: 21,
    color:
      "rgba(255,255,255,0.72)",
  },

  headerSummary: {
    marginTop: 24,
    padding: 16,
    borderRadius: 18,
    backgroundColor:
      "rgba(255,255,255,0.11)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 12,
  },

  headerSummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color:
      "rgba(255,255,255,0.68)",
  },

  headerSummaryValue: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  headerPeriodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor:
      "rgba(255,255,255,0.12)",
  },

  headerPeriodText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /*
   * =======================================================
   * BODY
   * =======================================================
   */

  body: {
    paddingHorizontal: 18,
    paddingTop: 24,
  },

  sectionHeader: {
    marginBottom: 14,
    marginTop: 10,
  },

  sectionEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: COLORS.purpleAccent,
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  sectionSubtitle: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * PERIOD
   * =======================================================
   */

  periodRow: {
    gap: 8,
    paddingBottom: 6,
  },

  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  periodButtonActive: {
    backgroundColor:
      COLORS.purpleAccent,
    borderColor:
      COLORS.purpleAccent,
  },

  periodButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondaryText,
  },

  periodButtonTextActive: {
    color: "#FFFFFF",
  },

  inlineError: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      COLORS.redBackground,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  inlineErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.red,
  },

  /*
   * =======================================================
   * STAT CARDS
   * =======================================================
   */

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent:
      "space-between",
    marginTop: 18,
    marginBottom: 22,
    rowGap: 12,
  },

  statCard: {
    width: "48.4%",
    minHeight: 148,
    padding: 15,
    borderRadius: 18,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.secondaryText,
  },

  statValue: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },

  statDetail: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.mutedText,
  },

  /*
   * =======================================================
   * GENERAL CARD
   * =======================================================
   */

  contentCard: {
    marginBottom: 16,
    padding: 17,
    borderRadius: 18,
    backgroundColor:
      COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  cardTitleText: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },

  cardSubtitle: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * INFO ROW
   * =======================================================
   */

  infoRow: {
    minHeight: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.secondaryText,
  },

  infoValue: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "right",
  },

  /*
   * =======================================================
   * FINANCE
   * =======================================================
   */

  financeHero: {
    marginBottom: 14,
    padding: 19,
    borderRadius: 20,
    backgroundColor:
      COLORS.purple,
  },

  financeHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  financeHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  financeHeroLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color:
      "rgba(255,255,255,0.68)",
  },

  financeHeroValue: {
    marginTop: 17,
    fontSize: 29,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  financeHeroSubtext: {
    marginTop: 4,
    fontSize: 12,
    color:
      "rgba(255,255,255,0.65)",
  },

  /*
   * =======================================================
   * BREAKDOWN
   * =======================================================
   */

  breakdownItem: {
    marginBottom: 15,
  },

  breakdownTop: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  breakdownLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },

  breakdownCount: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.purpleAccent,
  },

  progressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor:
      COLORS.purpleLight,
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor:
      COLORS.purpleAccent,
  },

  breakdownPercent: {
    marginTop: 4,
    fontSize: 9,
    color: COLORS.mutedText,
    textAlign: "right",
  },

  /*
   * =======================================================
   * CHART
   * =======================================================
   */

  chartContainer: {
    height: 170,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent:
      "space-between",
    gap: 5,
    paddingTop: 8,
  },

  chartColumn: {
    flex: 1,
    minWidth: 18,
    alignItems: "center",
  },

  chartBarArea: {
    height: 125,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  chartBar: {
    width: "65%",
    maxWidth: 24,
    minWidth: 7,
    borderRadius: 6,
    backgroundColor:
      COLORS.purpleAccent,
  },

  chartLabel: {
    width: "100%",
    marginTop: 7,
    fontSize: 8,
    color: COLORS.mutedText,
    textAlign: "center",
  },

  chartLegend: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendText: {
    fontSize: 10,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * FULFILLMENT
   * =======================================================
   */

  fulfillmentRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },

  fulfillmentItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },

  fulfillmentDivider: {
    width: 1,
    backgroundColor:
      COLORS.border,
    marginHorizontal: 8,
  },

  fulfillmentIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  fulfillmentValue: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },

  fulfillmentLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.secondaryText,
  },

  fulfillmentPercent: {
    marginTop: 3,
    fontSize: 10,
    color: COLORS.mutedText,
  },

  /*
   * =======================================================
   * NEW USERS
   * =======================================================
   */

  newUsersCard: {
    marginBottom: 22,
    padding: 18,
    borderRadius: 18,
    backgroundColor:
      COLORS.purpleLight,
  },

  newUsersHeader: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
  },

  newUsersEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.purpleAccent,
  },

  newUsersValue: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.purple,
  },

  newUsersIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor:
      COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  newUserBreakdown: {
    marginTop: 18,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor:
      "rgba(91,79,207,0.12)",
    flexDirection: "row",
  },

  newUserItem: {
    flex: 1,
    alignItems: "center",
  },

  newUserNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  newUserLabel: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * COD
   * =======================================================
   */

  codValueCard: {
    marginBottom: 22,
    padding: 17,
    borderRadius: 18,
    backgroundColor:
      COLORS.greenBackground,
    flexDirection: "row",
    alignItems: "center",
  },

  codValueIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor:
      COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  codValueContent: {
    flex: 1,
  },

  codValueLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.green,
  },

  codValue: {
    marginTop: 3,
    fontSize: 21,
    fontWeight: "800",
    color: COLORS.text,
  },

  codValueMeta: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 15,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * TOP SHOPS
   * =======================================================
   */

  shopRow: {
    minHeight: 67,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor:
      COLORS.border,
  },

  rankCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor:
      COLORS.purpleLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  rankText: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.purpleAccent,
  },

  shopInfo: {
    flex: 1,
    minWidth: 0,
  },

  shopName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },

  shopMeta: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.secondaryText,
  },

  shopValueWrap: {
    marginLeft: 10,
    alignItems: "flex-end",
  },

  shopValue: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.text,
  },

  shopValueLabel: {
    marginTop: 2,
    fontSize: 8,
    color: COLORS.mutedText,
  },

  /*
   * =======================================================
   * EMPTY
   * =======================================================
   */

  emptyInline: {
    alignItems: "center",
    paddingVertical: 22,
    gap: 8,
  },

  emptySmallText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: COLORS.mutedText,
  },

  /*
   * =======================================================
   * NOTICE
   * =======================================================
   */

  noticeCard: {
    marginTop: 4,
    marginBottom: 20,
    padding: 15,
    borderRadius: 16,
    backgroundColor:
      COLORS.purpleLight,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  noticeContent: {
    flex: 1,
  },

  noticeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.purple,
  },

  noticeText: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 16,
    color: COLORS.secondaryText,
  },

  /*
   * =======================================================
   * BOTTOM NAVIGATION
   * =======================================================
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

    backgroundColor: "#FFFFFF",

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
    justifyContent: "center",
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
    color: COLORS.mutedText,
    textAlign: "center",
  },

  bottomNavLabelActive: {
    fontWeight: "700",
    color: COLORS.purpleAccent,
  },
});