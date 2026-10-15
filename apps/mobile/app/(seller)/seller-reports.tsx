import {
  useFocusEffect,
} from 'expo-router';

import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import SafeAreaView from '../../components/ui/top-safe-area-view';

import {
  getSellerOrders,
  type CustomerOrder,
} from '../../services/orders';

import {
  getSellerReviews,
  type SellerReviewsData,
} from '../../services/review';

import {
  getMyFloristProfile,
  type FloristProfile,
} from '../../services/florist';

import SellerBottomNav from '../../components/seller/seller-bottom-nav';

import {
  SeeAllButton,
  useSeeAll,
} from '../../components/ui/see-all';

import {
  getShopRevenue,
} from '../../utils/order-status';

import {
  getMyEarnings,
} from '../../services/seller-payouts';

import CollapsibleSection from '../../components/ui/collapsible-section';

import {
  DateRangeButton,
  formatRange,
  type DateRange,
} from '../../components/ui/date-range-picker';

/*
 * =========================================================
 * SELLER REPORTS
 * =========================================================
 *
 * Real Seller performance screen.
 *
 * Sources:
 *
 * GET /api/v1/orders/seller/mine
 * GET /api/v1/reviews/seller/mine
 * GET /api/v1/florists/profile
 * GET /api/v1/seller-payouts/me   (commission rate)
 *
 * IMPORTANT:
 *
 * - Sales count only COMPLETED orders (customer marked
 *   "Order Received" / pickup handed over), for every
 *   payment method. Paid-but-in-progress online orders
 *   are not sales yet.
 * - Shop sales exclude Order.deliveryFee (Rider income).
 * - Your Earnings = sales − FLOGRAM commission (same
 *   formula as Seller Earnings / payouts).
 * - Seller rating uses sellerRating, not overallRating.
 * - No fake report values are used.
 * =========================================================
 */

const ACTIVE_STATUSES = [
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'ready_for_delivery',
  'out_for_delivery',
];

/*
 * Report periods for the earnings summary and top products.
 */
type ReportPeriod = 'all' | 'today' | '7d' | 'month';

const PERIODS: { label: string; value: ReportPeriod }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: '7d' },
  { label: 'This Month', value: 'month' },
];

const PAYMENT_LABELS: Record<string, string> = {
  paymongo: 'Online (PayMongo)',
  cash_on_delivery: 'Cash on Delivery',
  cash_on_pickup: 'Cash on Pickup',
};

type WeeklyData = {
  day: string;
  orders: number;
  sales: number;
};

type ProductPerformance = {
  name: string;
  quantity: number;
  sales: number;
};

type SalesTotals = {
  orders: number;
  sales: number;
  preOrderFees: number;
  commission: number;
  earnings: number;
  byMethod: { method: string; sales: number; orders: number }[];
};

export default function SellerReportsScreen() {
  const [
    orders,
    setOrders,
  ] = useState<CustomerOrder[]>([]);

  const [
    reviews,
    setReviews,
  ] = useState<SellerReviewsData | null>(
    null
  );

  const [
    florist,
    setFlorist,
  ] = useState<FloristProfile | null>(
    null
  );

  /*
   * Admin commission rate (from Seller Earnings, same
   * source the payouts use). null = could not load.
   */
  const [
    commissionRate,
    setCommissionRate,
  ] = useState<number | null>(
    null
  );

  const [
    period,
    setPeriod,
  ] = useState<ReportPeriod>('all');

  const [
    customRange,
    setCustomRange,
  ] = useState<DateRange | null>(
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
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  /*
   * =======================================================
   * LOAD REPORT
   * =======================================================
   */

  const loadReport =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(null);

          const [
            sellerOrders,
            sellerReviews,
            floristProfile,
            earnings,
          ] =
            await Promise.all([
              getSellerOrders(),
              getSellerReviews(),
              getMyFloristProfile(),
              /*
               * Only needed for the commission rate; the
               * report still works without it.
               */
              getMyEarnings().catch(() => null),
            ]);

          setOrders(
            sellerOrders
          );

          setReviews(
            sellerReviews
          );

          setFlorist(
            floristProfile
          );

          setCommissionRate(
            earnings && Number.isFinite(Number(earnings.commissionRate))
              ? Number(earnings.commissionRate)
              : null
          );
        } catch (error) {
          console.log(
            'Seller reports error:',
            error
          );

          setErrorMessage(
            getErrorMessage(
              error
            )
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      []
    );

  /*
   * =======================================================
   * REFRESH WHEN SCREEN GAINS FOCUS
   * =======================================================
   */

  useFocusEffect(
    useCallback(() => {
      void loadReport();

      return undefined;
    }, [
      loadReport,
    ])
  );

  /*
   * =======================================================
   * PULL TO REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadReport(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        loadReport,
      ]
    );

  /*
   * =======================================================
   * BASIC ORDER STATS (all orders, all time)
   * =======================================================
   */

  const totalOrders =
    orders.length;

  const completedOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.orderStatus ===
            'completed'
        ).length,
      [
        orders,
      ]
    );

  /*
   * Delivered by the Rider, customer has not tapped
   * "Order Received" yet. Not a sale yet.
   */
  const awaitingConfirmation =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.orderStatus ===
            'delivered'
        ).length,
      [
        orders,
      ]
    );

  const activeOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            ACTIVE_STATUSES.includes(
              order.orderStatus
            )
        ).length,
      [
        orders,
      ]
    );

  const pendingOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.orderStatus ===
            'pending'
        ).length,
      [
        orders,
      ]
    );

  const cancelledOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.orderStatus ===
            'cancelled'
        ).length,
      [
        orders,
      ]
    );

  /*
   * Completion rate = completed ÷ (completed + cancelled).
   */
  const completionRate =
    useMemo(() => {
      const finishedOrders =
        completedOrders +
        cancelledOrders;

      if (
        finishedOrders === 0
      ) {
        return 0;
      }

      return (
        completedOrders /
        finishedOrders
      ) * 100;
    }, [
      completedOrders,
      cancelledOrders,
    ]);

  /*
   * =======================================================
   * SALES (completed orders only)
   * =======================================================
   */

  const saleOrders =
    useMemo(
      () =>
        orders.filter(
          isCompletedSale
        ),
      [
        orders,
      ]
    );

  const periodRange =
    useMemo<DateRange | null>(
      () =>
        customRange ??
        getPeriodRange(
          period
        ),
      [
        customRange,
        period,
      ]
    );

  const periodLabel =
    customRange
      ? formatRange(
          customRange
        )
      : PERIODS.find(
          item =>
            item.value ===
            period
        )?.label ||
        'All Time';

  const periodSales =
    useMemo(
      () =>
        saleOrders.filter(
          order =>
            isKeyInRange(
              manilaDayKey(
                getSaleDate(
                  order
                )
              ),
              periodRange
            )
        ),
      [
        saleOrders,
        periodRange,
      ]
    );

  const totals =
    useMemo(
      () =>
        summarizeSales(
          periodSales,
          commissionRate
        ),
      [
        periodSales,
        commissionRate,
      ]
    );

  const salesForDays =
    useCallback(
      (range: DateRange | null) =>
        summarizeSales(
          saleOrders.filter(
            order =>
              isKeyInRange(
                manilaDayKey(
                  getSaleDate(
                    order
                  )
                ),
                range
              )
          ),
          commissionRate
        ).sales,
      [
        saleOrders,
        commissionRate,
      ]
    );

  const todaySales =
    useMemo(
      () =>
        salesForDays(
          getPeriodRange(
            'today'
          )
        ),
      [
        salesForDays,
      ]
    );

  const monthSales =
    useMemo(
      () =>
        salesForDays(
          getPeriodRange(
            'month'
          )
        ),
      [
        salesForDays,
      ]
    );

  const allTimeSales =
    useMemo(
      () =>
        salesForDays(
          null
        ),
      [
        salesForDays,
      ]
    );

  /*
   * =======================================================
   * WEEKLY DATA
   * =======================================================
   */

  const weeklyData =
    useMemo<WeeklyData[]>(
      () =>
        buildWeeklyData(
          orders
        ),
      [
        orders,
      ]
    );

  /*
   * =======================================================
   * PRODUCT PERFORMANCE (selected period)
   * =======================================================
   */

  const topProducts =
    useMemo<
      ProductPerformance[]
    >(
      () =>
        buildProductPerformance(
          periodSales
        ),
      [
        periodSales,
      ]
    );

  /*
   * =======================================================
   * RATING
   * =======================================================
   */

  const averageRating =
    reviews?.averageRating ??
    null;

  const ratingCount =
    reviews?.count ?? 0;

  const ratingDistribution =
    reviews?.distribution ?? {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

  /*
   * =======================================================
   * SHOP
   * =======================================================
   */

  const shopName =
    florist?.shopName ||
    'My Flower Shop';

  const shopInitial =
    shopName
      .trim()
      .charAt(0)
      .toUpperCase() ||
    'F';

  /*
   * Recent reviews: show 5, then "See all (N)".
   */
  const recentReviews =
    useSeeAll(
      reviews?.reviews
    );

  const ratePercent =
    commissionRate !== null
      ? Math.round(
          commissionRate *
            10000
        ) / 100
      : null;

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (
    loading &&
    orders.length === 0 &&
    !reviews
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#74A485"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading shop reports...
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
    orders.length === 0 &&
    !reviews
  ) {
    return (
      <SafeAreaView
        style={
          styles.container
        }
      >
        <View
          style={
            styles.errorContainer
          }
        >
          <View
            style={
              styles.errorIconCircle
            }
          >
            <Text
              style={
                styles.errorIcon
              }
            >
              !
            </Text>
          </View>

          <Text
            style={
              styles.errorTitle
            }
          >
            Unable to Load Reports
          </Text>

          <Text
            style={
              styles.errorMessage
            }
          >
            {errorMessage}
          </Text>

          <Pressable
            style={
              styles.retryButton
            }
            onPress={() =>
              void loadReport(
                true
              )
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
        styles.container
      }
    >
      <View
        style={
          styles.screen
        }
      >
        {/* HEADER */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.shopAvatar
            }
          >
            <Text
              style={
                styles.shopAvatarText
              }
            >
              {shopInitial}
            </Text>
          </View>

          <Text
            style={
              styles.shopName
            }
          >
            {shopName}
          </Text>

          <Text
            style={
              styles.reportTitle
            }
          >
            Shop Performance
          </Text>

          <View
            style={
              styles.headerRating
            }
          >
            <Text
              style={
                styles.headerStars
              }
            >
              {averageRating !==
              null
                ? renderStars(
                    averageRating
                  )
                : '☆ ☆ ☆ ☆ ☆'}
            </Text>

            <Text
              style={
                styles.headerRatingValue
              }
            >
              {averageRating !==
              null
                ? averageRating.toFixed(
                    2
                  )
                : '--'}
            </Text>
          </View>

          <Text
            style={
              styles.headerRatingCount
            }
          >
            {ratingCount > 0
              ? `${ratingCount} ${
                  ratingCount ===
                  1
                    ? 'customer rating'
                    : 'customer ratings'
                }`
              : 'No customer ratings yet'}
          </Text>
        </View>

        {/* CONTENT */}

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
              tintColor="#74A485"
              colors={[
                '#74A485',
              ]}
            />
          }
        >
          {errorMessage ? (
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
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* PERIOD */}

          <View
            style={
              styles.periodRow
            }
          >
            {PERIODS.map(
              item => {
                const active =
                  !customRange &&
                  period ===
                    item.value;

                return (
                  <Pressable
                    key={
                      item.value
                    }
                    onPress={() => {
                      setCustomRange(
                        null
                      );
                      setPeriod(
                        item.value
                      );
                    }}
                    style={[
                      styles.periodChip,
                      active &&
                        styles.periodChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        active &&
                          styles.periodChipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }
            )}

            <DateRangeButton
              value={
                customRange
              }
              onChange={
                setCustomRange
              }
              role="seller"
              maxDate={new Date()}
            />
          </View>

          {/* EARNINGS SUMMARY */}

          <View
            style={
              styles.summaryCard
            }
          >
            <Text
              style={
                styles.summaryEyebrow
              }
            >
              {periodLabel.toUpperCase()} •{' '}
              {totals.orders}{' '}
              {totals.orders === 1
                ? 'COMPLETED ORDER'
                : 'COMPLETED ORDERS'}
            </Text>

            <SummaryRow
              label="Total Sales"
              hint="Bouquets, add-ons and pre-order fees. Delivery fees go to Riders."
              value={formatMoney(
                totals.sales
              )}
            />

            <SummaryRow
              label={
                ratePercent !== null
                  ? `FLOGRAM Commission (${ratePercent}%)`
                  : 'FLOGRAM Commission'
              }
              value={
                commissionRate !== null
                  ? `− ${formatMoney(
                      totals.commission
                    )}`
                  : '—'
              }
              muted
            />

            <SummaryRow
              label="Your Earnings"
              hint="Total Sales − Commission"
              value={
                commissionRate !== null
                  ? formatMoney(
                      totals.earnings
                    )
                  : '—'
              }
              strong
              last
            />

            <Text
              style={
                styles.summaryNote
              }
            >
              A sale counts only when the order is completed:
              the customer tapped &quot;Order Received&quot;, or
              you handed over a pickup order. Paid online orders
              still in progress are not counted yet. Payout timing
              (e.g. COD after the Rider remits) is shown in
              Earnings.
            </Text>
          </View>

          {/* SALES OVERVIEW */}

          <CollapsibleSection
            title="Sales Overview"
            subtitle="Today, this month, all time and by payment method"
            icon="cash-outline"
            role="seller"
          >
            <View
              style={
                styles.performanceList
              }
            >
              <PerformanceRow
                label="Today"
                value={formatMoney(
                  todaySales
                )}
              />

              <PerformanceRow
                label="This Month"
                value={formatMoney(
                  monthSales
                )}
              />

              <PerformanceRow
                label="All Time"
                value={formatMoney(
                  allTimeSales
                )}
                isLast
              />
            </View>

            <Text
              style={
                styles.subheading
              }
            >
              {periodLabel} by payment method
            </Text>

            <View
              style={
                styles.performanceList
              }
            >
              {totals.byMethod.length >
              0 ? (
                totals.byMethod.map(
                  (
                    item,
                    index
                  ) => (
                    <PerformanceRow
                      key={
                        item.method
                      }
                      label={`${PAYMENT_LABELS[item.method] || 'Other'} (${item.orders})`}
                      value={formatMoney(
                        item.sales
                      )}
                      isLast={
                        index ===
                          totals.byMethod.length -
                            1 &&
                        totals.preOrderFees <=
                          0
                      }
                    />
                  )
                )
              ) : (
                <PerformanceRow
                  label="No completed orders"
                  value={formatMoney(
                    0
                  )}
                  isLast
                />
              )}

              {totals.preOrderFees >
              0 ? (
                <PerformanceRow
                  label="Includes pre-order fees"
                  value={formatMoney(
                    totals.preOrderFees
                  )}
                  isLast
                />
              ) : null}
            </View>
          </CollapsibleSection>

          {/* TOP PRODUCTS */}

          <CollapsibleSection
            title="Top Products"
            subtitle={`${periodLabel} • what customers paid per bouquet`}
            icon="flower-outline"
            role="seller"
          >
            {topProducts.length >
            0 ? (
              <View
                style={
                  styles.productList
                }
              >
                {topProducts.map(
                  (
                    product,
                    index
                  ) => (
                    <View
                      key={
                        `${product.name}-${index}`
                      }
                      style={[
                        styles.productRow,

                        index ===
                          topProducts.length -
                            1 &&
                          styles.productRowLast,
                      ]}
                    >
                      <View
                        style={
                          styles.productRank
                        }
                      >
                        <Text
                          style={
                            styles.productRankText
                          }
                        >
                          {index +
                            1}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.productInfo
                        }
                      >
                        <Text
                          numberOfLines={
                            1
                          }
                          style={
                            styles.productName
                          }
                        >
                          {
                            product.name
                          }
                        </Text>

                        <Text
                          style={
                            styles.productOrders
                          }
                        >
                          {
                            product.quantity
                          }{' '}
                          {product.quantity ===
                          1
                            ? 'item sold'
                            : 'items sold'}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.productSales
                        }
                      >
                        {formatMoney(
                          product.sales
                        )}
                      </Text>
                    </View>
                  )
                )}

                <Text
                  style={
                    styles.summaryNote
                  }
                >
                  Product amount = price × quantity + add-ons (no
                  delivery fee, before commission
                  {totals.preOrderFees > 0
                    ? ', pre-order fees shown in Sales Overview'
                    : ''}
                  ).
                </Text>
              </View>
            ) : (
              <View
                style={
                  styles.emptyState
                }
              >
                <Text
                  style={
                    styles.emptyIcon
                  }
                >
                  ♧
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No Product Sales Yet
                </Text>

                <Text
                  style={
                    styles.emptyMessage
                  }
                >
                  Product performance
                  will appear after
                  orders are completed.
                </Text>
              </View>
            )}
          </CollapsibleSection>

          {/* ORDERS */}

          <CollapsibleSection
            title="Orders"
            subtitle="All your shop orders and their status"
            icon="receipt-outline"
            role="seller"
          >
            <View
              style={
                styles.statsGrid
              }
            >
              <StatCard
                icon="▣"
                value={formatNumber(
                  totalOrders
                )}
                label="Total Orders"
                iconBackground="#EAF5EE"
              />

              <StatCard
                icon="✓"
                value={formatNumber(
                  completedOrders
                )}
                label="Completed"
                iconBackground="#E8F6ED"
              />

              <StatCard
                icon="⌂"
                value={formatNumber(
                  awaitingConfirmation
                )}
                label="Delivered, awaiting confirmation"
                iconBackground="#FFF4D9"
              />

              <StatCard
                icon="◷"
                value={formatNumber(
                  activeOrders
                )}
                label="Active Orders"
                iconBackground="#F0EBFA"
              />
            </View>

            <View
              style={
                styles.performanceList
              }
            >
              <PerformanceRow
                label="Pending"
                value={formatNumber(
                  pendingOrders
                )}
              />

              <PerformanceRow
                label="Active"
                value={formatNumber(
                  activeOrders
                )}
              />

              <PerformanceRow
                label="Delivered (awaiting customer)"
                value={formatNumber(
                  awaitingConfirmation
                )}
              />

              <PerformanceRow
                label="Completed"
                value={formatNumber(
                  completedOrders
                )}
              />

              <PerformanceRow
                label="Cancelled"
                value={formatNumber(
                  cancelledOrders
                )}
              />

              <PerformanceRow
                label="Completion Rate"
                value={`${completionRate.toFixed(
                  1
                )}%`}
                isLast
              />
            </View>
          </CollapsibleSection>

          {/* WEEKLY ORDERS */}

          <CollapsibleSection
            title="Weekly Orders"
            subtitle="Orders placed this week (Mon–Sun)"
            icon="bar-chart-outline"
            role="seller"
          >
            <WeeklyChart
              data={
                weeklyData
              }
            />
          </CollapsibleSection>

          {/* CUSTOMER RATING */}

          <CollapsibleSection
            title="Shop Rating"
            subtitle={
              ratingCount > 0 &&
              averageRating !== null
                ? `${averageRating.toFixed(1)} from ${ratingCount} ${ratingCount === 1 ? 'rating' : 'ratings'}`
                : 'No ratings yet'
            }
            icon="star-outline"
            role="seller"
          >
            {averageRating !==
              null &&
            ratingCount > 0 ? (
              <>
                <View
                  style={
                    styles.ratingSummary
                  }
                >
                  <View
                    style={
                      styles.ratingCircle
                    }
                  >
                    <Text
                      style={
                        styles.ratingCircleValue
                      }
                    >
                      {averageRating.toFixed(
                        1
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.ratingSummaryText
                    }
                  >
                    <Text
                      style={
                        styles.ratingSummaryStars
                      }
                    >
                      {renderStars(
                        averageRating
                      )}
                    </Text>

                    <Text
                      style={
                        styles.ratingSummaryLabel
                      }
                    >
                      Based on{' '}
                      {ratingCount}{' '}
                      {ratingCount ===
                      1
                        ? 'customer rating'
                        : 'customer ratings'}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.ratingDistribution
                  }
                >
                  {[
                    5,
                    4,
                    3,
                    2,
                    1,
                  ].map(
                    rating => {
                      const count =
                        ratingDistribution[
                          rating as keyof typeof ratingDistribution
                        ] ||
                        0;

                      const percentage =
                        ratingCount >
                        0
                          ? (count /
                              ratingCount) *
                            100
                          : 0;

                      return (
                        <RatingRow
                          key={
                            rating
                          }
                          rating={
                            rating
                          }
                          count={
                            count
                          }
                          percentage={
                            percentage
                          }
                        />
                      );
                    }
                  )}
                </View>
              </>
            ) : (
              <View
                style={
                  styles.noRatingState
                }
              >
                <View
                  style={
                    styles.noRatingIconCircle
                  }
                >
                  <Text
                    style={
                      styles.noRatingIcon
                    }
                  >
                    ☆
                  </Text>
                </View>

                <View
                  style={
                    styles.noRatingTextArea
                  }
                >
                  <Text
                    style={
                      styles.noRatingTitle
                    }
                  >
                    No Ratings Yet
                  </Text>

                  <Text
                    style={
                      styles.noRatingMessage
                    }
                  >
                    Customer ratings
                    will appear here
                    after completed
                    orders are reviewed.
                  </Text>
                </View>
              </View>
            )}
          </CollapsibleSection>

          {/* RECENT REVIEWS */}

          {reviews &&
          reviews.reviews.length >
            0 ? (
            <CollapsibleSection
              title="Customer Reviews"
              subtitle="Latest feedback"
              icon="chatbubble-ellipses-outline"
              role="seller"
            >
              <View
                style={
                  styles.reviewList
                }
              >
                {recentReviews.visible
                  .map(
                    (
                      review,
                      index
                    ) => {
                      const customerName =
                        [
                          review
                            .customer
                            ?.firstName,
                          review
                            .customer
                            ?.lastName,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ' '
                          )
                          .trim() ||
                        'Customer';

                      return (
                        <View
                          key={
                            review.id
                          }
                          style={[
                            styles.reviewRow,

                            index ===
                              recentReviews
                                .visible
                                .length -
                                1 &&
                              styles.reviewRowLast,
                          ]}
                        >
                          <View
                            style={
                              styles.reviewTopRow
                            }
                          >
                            <Text
                              style={
                                styles.reviewCustomer
                              }
                            >
                              {
                                customerName
                              }
                            </Text>

                            <Text
                              style={
                                styles.reviewStars
                              }
                            >
                              {renderStars(
                                review.sellerRating
                              )}
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.reviewRatingText
                            }
                          >
                            {Number(
                              review.sellerRating
                            ).toFixed(
                              1
                            )}{' '}
                            / 5
                          </Text>

                          {review.comment ? (
                            <Text
                              style={
                                styles.reviewComment
                              }
                            >
                              “
                              {
                                review.comment
                              }
                              ”
                            </Text>
                          ) : (
                            <Text
                              style={
                                styles.noComment
                              }
                            >
                              No written
                              comment.
                            </Text>
                          )}
                        </View>
                      );
                    }
                  )}
              </View>

              <SeeAllButton
                state={
                  recentReviews
                }
                role="seller"
              />
            </CollapsibleSection>
          ) : null}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <SellerBottomNav active="reports" />
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * SUMMARY ROW
 * =========================================================
 */

function SummaryRow({
  label,
  value,
  hint,
  muted = false,
  strong = false,
  last = false,
}: {
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
  strong?: boolean;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryRow,
        last &&
          styles.summaryRowLast,
      ]}
    >
      <View
        style={
          styles.summaryLabelWrap
        }
      >
        <Text
          style={[
            styles.summaryLabel,
            strong &&
              styles.summaryLabelStrong,
          ]}
        >
          {label}
        </Text>

        {hint ? (
          <Text
            style={
              styles.summaryHint
            }
          >
            {hint}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.summaryValue,
          muted &&
            styles.summaryValueMuted,
          strong &&
            styles.summaryValueStrong,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * STAT CARD
 * =========================================================
 */

function StatCard({
  icon,
  value,
  label,
  iconBackground,
}: {
  icon: string;
  value: string;
  label: string;
  iconBackground: string;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <View
        style={[
          styles.statIconCircle,

          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Text
          style={
            styles.statIcon
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        numberOfLines={
          1
        }
        adjustsFontSizeToFit
        style={
          styles.statValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * PERFORMANCE ROW
 * =========================================================
 */

function PerformanceRow({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.performanceRow,

        isLast &&
          styles.performanceRowLast,
      ]}
    >
      <Text
        style={
          styles.performanceLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.performanceValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * WEEKLY CHART
 * =========================================================
 */

function WeeklyChart({
  data,
}: {
  data: WeeklyData[];
}) {
  const maxValue =
    Math.max(
      1,
      ...data.map(
        item =>
          item.orders
      )
    );

  return (
    <View
      style={
        styles.chart
      }
    >
      {data.map(
        item => {
          const barHeight =
            item.orders > 0
              ? Math.max(
                  12,
                  (
                    item.orders /
                    maxValue
                  ) *
                    80
                )
              : 4;

          return (
            <View
              key={
                item.day
              }
              style={
                styles.chartColumn
              }
            >
              <Text
                style={
                  styles.chartValue
                }
              >
                {
                  item.orders
                }
              </Text>

              <View
                style={
                  styles.chartBarArea
                }
              >
                <View
                  style={[
                    styles.chartBar,

                    {
                      height:
                        barHeight,
                    },

                    item.orders ===
                      0 &&
                      styles.chartBarZero,
                  ]}
                />
              </View>

              <Text
                style={
                  styles.chartLabel
                }
              >
                {item.day}
              </Text>
            </View>
          );
        }
      )}
    </View>
  );
}

/*
 * =========================================================
 * RATING DISTRIBUTION
 * =========================================================
 */

function RatingRow({
  rating,
  count,
  percentage,
}: {
  rating: number;
  count: number;
  percentage: number;
}) {
  return (
    <View
      style={
        styles.ratingRow
      }
    >
      <Text
        style={
          styles.ratingRowLabel
        }
      >
        {rating} ★
      </Text>

      <View
        style={
          styles.ratingTrack
        }
      >
        <View
          style={[
            styles.ratingFill,

            {
              width:
                `${Math.min(
                  100,
                  Math.max(
                    0,
                    percentage
                  )
                )}%`,
            },
          ]}
        />
      </View>

      <Text
        style={
          styles.ratingRowCount
        }
      >
        {count}
      </Text>
    </View>
  );
}


/*
 * =========================================================
 * REPORT HELPERS
 * =========================================================
 *
 * Same rules as the Admin report and Seller Earnings
 * (server: admin/revenue.service.js, sellerPayouts):
 *
 *   sale         = order COMPLETED (customer marked received /
 *                  pickup handed over), not refunded
 *   sale date    = completedAt (older orders: deliveredAt,
 *                  then updatedAt)
 *   Total Sales  = Σ (totalAmount − deliveryFee)
 *                = price × qty + add-ons + pre-order fee
 *   Commission   = Σ round(order sales × commission rate)
 *   Earnings     = Total Sales − Commission
 * =========================================================
 */

const MANILA_OFFSET_MS =
  8 * 60 * 60 * 1000;

function roundMoney(
  value: number
) {
  return (
    Math.round(
      (Number(value) || 0) *
        100
    ) / 100
  );
}

function isCompletedSale(
  order: CustomerOrder
) {
  return (
    order.orderStatus ===
      'completed' &&
    order.paymentStatus !==
      'refunded'
  );
}

function getSaleDate(
  order: CustomerOrder
) {
  return new Date(
    order.completedAt ||
      order.deliveredAt ||
      order.updatedAt ||
      order.createdAt
  );
}

/*
 * What the customer paid for the bouquet line itself:
 * unit price × quantity + add-ons (no delivery fee, no
 * pre-order fee, before commission).
 */
function getProductLineAmount(
  order: CustomerOrder
) {
  const subtotal =
    Number(
      order.subtotal
    );

  if (
    Number.isFinite(
      subtotal
    ) &&
    subtotal > 0
  ) {
    return subtotal;
  }

  return (
    Number(
      order.unitPrice ||
        0
    ) *
      Number(
        order.quantity ||
          1
      ) +
    Number(
      order.addOnsTotal ||
        0
    )
  );
}

function summarizeSales(
  saleOrders: CustomerOrder[],
  rate: number | null
): SalesTotals {
  const methods =
    new Map<
      string,
      { sales: number; orders: number }
    >();

  let sales = 0;
  let commission = 0;
  let preOrderFees = 0;

  saleOrders.forEach(
    order => {
      const orderSales =
        roundMoney(
          getShopRevenue(
            order
          )
        );

      sales += orderSales;

      preOrderFees +=
        Number(
          order.preOrderFee ||
            0
        );

      if (
        rate !== null
      ) {
        commission +=
          roundMoney(
            orderSales *
              rate
          );
      }

      const method =
        order.paymentMethod ||
        'other';

      const current =
        methods.get(
          method
        ) || {
          sales: 0,
          orders: 0,
        };

      current.sales +=
        orderSales;

      current.orders += 1;

      methods.set(
        method,
        current
      );
    }
  );

  return {
    orders:
      saleOrders.length,
    sales:
      roundMoney(
        sales
      ),
    preOrderFees:
      roundMoney(
        preOrderFees
      ),
    commission:
      roundMoney(
        commission
      ),
    earnings:
      roundMoney(
        sales -
          commission
      ),
    byMethod:
      Array.from(
        methods.entries()
      )
        .map(
          ([
            method,
            value,
          ]) => ({
            method,
            sales:
              roundMoney(
                value.sales
              ),
            orders:
              value.orders,
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            second.sales -
            first.sales
        ),
  };
}

/*
 * "YYYY-MM-DD" of the Philippine calendar day.
 */
function manilaDayKey(
  date: Date
) {
  const time =
    date.getTime();

  if (
    Number.isNaN(
      time
    )
  ) {
    return '';
  }

  return new Date(
    time +
      MANILA_OFFSET_MS
  )
    .toISOString()
    .slice(
      0,
      10
    );
}

function getPeriodRange(
  period: ReportPeriod
): DateRange | null {
  if (
    period === 'all'
  ) {
    return null;
  }

  const today =
    manilaDayKey(
      new Date()
    );

  if (
    period === 'today'
  ) {
    return {
      start: today,
      end: today,
    };
  }

  if (
    period === 'month'
  ) {
    return {
      start: `${today.slice(0, 7)}-01`,
      end: today,
    };
  }

  return {
    start:
      manilaDayKey(
        new Date(
          Date.now() -
            6 *
              24 *
              60 *
              60 *
              1000
        )
      ),
    end: today,
  };
}

function isKeyInRange(
  key: string,
  range: DateRange | null
) {
  if (!range) {
    return true;
  }

  return (
    Boolean(key) &&
    key >= range.start &&
    key <= range.end
  );
}

function buildWeeklyData(
  orders: CustomerOrder[]
): WeeklyData[] {
  const labels = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  const start =
    startOfCurrentWeek();

  return labels.map(
    (
      day,
      index
    ) => {
      const date =
        new Date(
          start
        );

      date.setDate(
        start.getDate() +
          index
      );

      /*
       * Bars = orders placed that day.
       */
      const dayOrders =
        orders.filter(
          order =>
            isSameDay(
              new Date(
                order.createdAt
              ),
              date
            )
        );

      /*
       * Sales = orders completed that day.
       */
      const sales =
        orders
          .filter(
            order =>
              isCompletedSale(
                order
              ) &&
              isSameDay(
                getSaleDate(
                  order
                ),
                date
              )
          )
          .reduce(
            (
              total,
              order
            ) =>
              total +
              getShopRevenue(
                order
              ),
            0
          );

      return {
        day,
        orders:
          dayOrders.length,
        sales,
      };
    }
  );
}

function buildProductPerformance(
  saleOrders: CustomerOrder[]
): ProductPerformance[] {
  const productMap =
    new Map<
      string,
      ProductPerformance
    >();

  saleOrders.forEach(
    order => {
      const productName =
        order.productName?.trim() ||
        'Custom Bouquet';

      const quantity =
        Number(
          order.quantity ||
            1
        );

      const current =
        productMap.get(
          productName
        ) || {
          name:
            productName,

          quantity:
            0,

          sales:
            0,
        };

      current.quantity +=
        Number.isFinite(
          quantity
        ) &&
        quantity > 0
          ? quantity
          : 1;

      current.sales =
        roundMoney(
          current.sales +
            getProductLineAmount(
              order
            )
        );

      productMap.set(
        productName,
        current
      );
    }
  );

  return Array.from(
    productMap.values()
  )
    .sort(
      (
        first,
        second
      ) =>
        second.quantity -
          first.quantity ||
        second.sales -
          first.sales
    )
    .slice(
      0,
      5
    );
}

function startOfCurrentWeek() {
  const now =
    new Date();

  const day =
    now.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  const start =
    new Date(
      now
    );

  start.setDate(
    now.getDate() +
      difference
  );

  start.setHours(
    0,
    0,
    0,
    0
  );

  return start;
}

function isSameDay(
  first: Date,
  second: Date
) {
  if (
    Number.isNaN(
      first.getTime()
    ) ||
    Number.isNaN(
      second.getTime()
    )
  ) {
    return false;
  }

  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}

function formatNumber(
  value: number
) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-PH'
  );
}

function formatMoney(
  value: number
) {
  return `₱${Number(
    value || 0
  ).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        0,
    }
  )}`;
}

function renderStars(
  rating: number
) {
  const fullStars =
    Math.max(
      0,
      Math.min(
        5,
        Math.round(
          Number(
            rating
          )
        )
      )
    );

  return Array.from(
    {
      length:
        5,
    },
    (
      _,
      index
    ) =>
      index <
      fullStars
        ? '★'
        : '☆'
  ).join(
    ' '
  );
}

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof
      Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex:
        1,

      backgroundColor:
        '#F5F6F5',
    },

    screen: {
      flex:
        1,

      backgroundColor:
        '#F5F6F5',
    },

    loadingContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F5F6F5',
    },

    loadingText: {
      color:
        '#7F8982',

      fontSize:
        12,

      marginTop:
        12,

      fontWeight:
        '600',
    },

    errorContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,

      backgroundColor:
        '#F5F6F5',
    },

    errorIconCircle: {
      width:
        54,

      height:
        54,

      borderRadius:
        27,

      backgroundColor:
        '#FBEAEA',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    errorIcon: {
      color:
        '#D26C6C',

      fontSize:
        22,

      fontWeight:
        '900',
    },

    errorTitle: {
      marginTop:
        13,

      color:
        '#3F4942',

      fontSize:
        14,

      fontWeight:
        '900',
    },

    errorMessage: {
      color:
        '#858E88',

      fontSize:
        11,

      lineHeight:
        14,

      textAlign:
        'center',

      marginTop:
        6,
    },

    retryButton: {
      backgroundColor:
        '#74A485',

      paddingHorizontal:
        20,

      paddingVertical:
        10,

      borderRadius:
        12,

      marginTop:
        16,
    },

    retryButtonText: {
      color:
        '#FFFFFF',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    inlineError: {
      backgroundColor:
        '#FFF1F1',

      borderRadius:
        10,

      padding:
        10,

      marginBottom:
        10,
    },

    inlineErrorText: {
      color:
        '#B96868',

      fontSize:
        11,

      lineHeight:
        12,
    },

    /*
     * HEADER
     */

    header: {
      backgroundColor:
        '#74A485',

      paddingTop:
        22,

      paddingBottom:
        18,

      paddingHorizontal:
        18,

      alignItems:
        'center',
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
    },

    shopAvatar: {
      width:
        54,

      height:
        54,

      borderRadius:
        18,

      backgroundColor:
        'rgba(255,255,255,0.20)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    shopAvatarText: {
      color:
        '#FFFFFF',

      fontSize:
        19,

      fontWeight:
        '900',
    },

    shopName: {
      color:
        '#FFFFFF',

      fontSize:
        15,

      fontWeight:
        '900',

      marginTop:
        9,
    },

    reportTitle: {
      color:
        'rgba(255,255,255,0.78)',

      fontSize:
        11,

      marginTop:
        3,
    },

    headerRating: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        7,
    },

    headerStars: {
      color:
        '#FFFFFF',

      fontSize:
        11,

      letterSpacing:
        1,
    },

    headerRatingValue: {
      color:
        '#FFFFFF',

      fontSize:
        11,

      fontWeight:
        '800',

      marginLeft:
        6,
    },

    headerRatingCount: {
      color:
        'rgba(255,255,255,0.78)',

      fontSize:
        7,

      marginTop:
        4,
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex:
        1,
    },

    scrollContent: {
      paddingHorizontal:
        14,

      paddingTop:
        12,
    },

    /*
     * STATS
     */

    /*
     * PERIOD + EARNINGS SUMMARY
     */

    periodRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },

    periodChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#DCE8E0',
      backgroundColor: '#FFFFFF',
    },

    periodChipActive: {
      backgroundColor: '#5E9874',
      borderColor: '#5E9874',
    },

    periodChipText: {
      color: '#5F6B63',
      fontSize: 12,
      fontWeight: '700',
    },

    periodChipTextActive: {
      color: '#FFFFFF',
    },

    summaryCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#E3EEE7',
    },

    summaryEyebrow: {
      color: '#5E9874',
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 6,
    },

    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#EFF2F0',
      gap: 10,
    },

    summaryRowLast: {
      borderBottomWidth: 0,
    },

    summaryLabelWrap: {
      flex: 1,
    },

    summaryLabel: {
      color: '#414A44',
      fontSize: 13,
      fontWeight: '700',
    },

    summaryLabelStrong: {
      color: '#2F5C40',
      fontSize: 14,
      fontWeight: '900',
    },

    summaryHint: {
      marginTop: 2,
      color: '#949D97',
      fontSize: 10.5,
    },

    summaryValue: {
      color: '#414A44',
      fontSize: 15,
      fontWeight: '900',
    },

    summaryValueMuted: {
      color: '#B0626F',
    },

    summaryValueStrong: {
      color: '#2F7A4D',
      fontSize: 18,
    },

    summaryNote: {
      marginTop: 8,
      color: '#8A938D',
      fontSize: 10.5,
      lineHeight: 15,
    },

    subheading: {
      marginTop: 14,
      color: '#5F6B63',
      fontSize: 11,
      fontWeight: '800',
    },

    statsGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',
    },

    statCard: {
      width:
        '48.5%',

      minHeight:
        105,

      backgroundColor:
        '#FFFFFF',

      borderRadius:
        15,

      padding:
        12,

      marginBottom:
        10,

      elevation:
        2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          1,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        4,
    },

    statIconCircle: {
      width:
        30,

      height:
        30,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    statIcon: {
      color:
        '#557862',

      fontSize:
        14,

      fontWeight:
        '800',
    },

    statValue: {
      color:
        '#3F4942',

      fontSize:
        15,

      fontWeight:
        '900',

      marginTop:
        9,

      maxWidth:
        '100%',
    },

    statLabel: {
      color:
        '#9CA49F',

      fontSize:
        7,

      marginTop:
        3,
    },

    /*
     * SECTIONS
     */

    sectionCard: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        16,

      padding:
        14,

      marginBottom:
        11,

      elevation:
        2,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          1,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        4,
    },

    sectionHeaderRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    sectionTitle: {
      color:
        '#414A44',

      fontSize:
        13,

      fontWeight:
        '900',
    },

    sectionHint: {
      color:
        '#A1AAA4',

      fontSize:
        7,
    },

    sectionDescription: {
      color:
        '#949D97',

      fontSize:
        7.5,

      lineHeight:
        12,

      marginTop:
        5,
    },

    /*
     * PERFORMANCE
     */

    performanceList: {
      marginTop:
        8,
    },

    performanceRow: {
      minHeight:
        38,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EFF2F0',
    },

    performanceRowLast: {
      borderBottomWidth:
        0,
    },

    performanceLabel: {
      color:
        '#6F7972',

      fontSize:
        11.5,
    },

    performanceValue: {
      color:
        '#414A44',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    /*
     * CHART
     */

    chart: {
      height:
        135,

      flexDirection:
        'row',

      alignItems:
        'flex-end',

      justifyContent:
        'space-between',

      marginTop:
        10,

      paddingHorizontal:
        2,
    },

    chartColumn: {
      flex:
        1,

      alignItems:
        'center',
    },

    chartValue: {
      color:
        '#768078',

      fontSize:
        7,

      fontWeight:
        '700',

      marginBottom:
        4,
    },

    chartBarArea: {
      height:
        90,

      width:
        '100%',

      justifyContent:
        'flex-end',

      alignItems:
        'center',
    },

    chartBar: {
      width:
        21,

      borderRadius:
        4,

      backgroundColor:
        '#74A485',
    },

    chartBarZero: {
      opacity:
        0.18,
    },

    chartLabel: {
      color:
        '#A0A9A3',

      fontSize:
        7,

      marginTop:
        5,
    },

    /*
     * PRODUCTS
     */

    productList: {
      marginTop:
        8,
    },

    productRow: {
      minHeight:
        52,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EFF2F0',
    },

    productRowLast: {
      borderBottomWidth:
        0,
    },

    productRank: {
      width:
        27,

      height:
        27,

      borderRadius:
        9,

      backgroundColor:
        '#EAF5EE',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    productRankText: {
      color:
        '#659276',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    productInfo: {
      flex:
        1,

      marginLeft:
        9,
    },

    productName: {
      color:
        '#465049',

      fontSize:
        11.5,

      fontWeight:
        '800',
    },

    productOrders: {
      color:
        '#9AA39D',

      fontSize:
        7,

      marginTop:
        3,
    },

    productSales: {
      color:
        '#5F8F70',

      fontSize:
        11.5,

      fontWeight:
        '900',

      marginLeft:
        8,
    },

    emptyState: {
      alignItems:
        'center',

      paddingVertical:
        22,
    },

    emptyIcon: {
      color:
        '#74A485',

      fontSize:
        25,
    },

    emptyTitle: {
      color:
        '#465049',

      fontSize:
        11,

      fontWeight:
        '900',

      marginTop:
        6,
    },

    emptyMessage: {
      color:
        '#9AA39D',

      fontSize:
        7.5,

      lineHeight:
        12,

      textAlign:
        'center',

      marginTop:
        4,

      maxWidth:
        190,
    },

    /*
     * RATING
     */

    ratingSummary: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    ratingCircle: {
      width:
        54,

      height:
        54,

      borderRadius:
        27,

      backgroundColor:
        '#EAF5EE',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    ratingCircleValue: {
      color:
        '#659276',

      fontSize:
        16,

      fontWeight:
        '900',
    },

    ratingSummaryText: {
      flex:
        1,

      marginLeft:
        12,
    },

    ratingSummaryStars: {
      color:
        '#74A485',

      fontSize:
        13,

      letterSpacing:
        1,
    },

    ratingSummaryLabel: {
      color:
        '#858F88',

      fontSize:
        11,

      marginTop:
        5,
    },

    ratingDistribution: {
      marginTop:
        14,

      paddingTop:
        10,

      borderTopWidth:
        1,

      borderTopColor:
        '#EFF2F0',
    },

    ratingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      minHeight:
        25,
    },

    ratingRowLabel: {
      width:
        28,

      color:
        '#68736B',

      fontSize:
        7.5,

      fontWeight:
        '700',
    },

    ratingTrack: {
      flex:
        1,

      height:
        6,

      borderRadius:
        3,

      overflow:
        'hidden',

      backgroundColor:
        '#EDF0EE',

      marginHorizontal:
        8,
    },

    ratingFill: {
      height:
        '100%',

      borderRadius:
        3,

      backgroundColor:
        '#74A485',
    },

    ratingRowCount: {
      width:
        22,

      textAlign:
        'right',

      color:
        '#8C958F',

      fontSize:
        7.5,
    },

    noRatingState: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#F8FAF8',

      borderRadius:
        12,

      padding:
        12,
    },

    noRatingIconCircle: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      backgroundColor:
        '#EAF5EE',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    noRatingIcon: {
      color:
        '#74A485',

      fontSize:
        20,
    },

    noRatingTextArea: {
      flex:
        1,

      marginLeft:
        11,
    },

    noRatingTitle: {
      color:
        '#414A44',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    noRatingMessage: {
      color:
        '#929B95',

      fontSize:
        7.5,

      lineHeight:
        12,

      marginTop:
        3,
    },

    /*
     * REVIEWS
     */

    reviewList: {
      marginTop:
        8,
    },

    reviewRow: {
      paddingVertical:
        11,

      borderBottomWidth:
        1,

      borderBottomColor:
        '#EFF2F0',
    },

    reviewRowLast: {
      borderBottomWidth:
        0,
    },

    reviewTopRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    reviewCustomer: {
      flex:
        1,

      color:
        '#465049',

      fontSize:
        11.5,

      fontWeight:
        '900',
    },

    reviewStars: {
      color:
        '#74A485',

      fontSize:
        11,

      letterSpacing:
        0.5,
    },

    reviewRatingText: {
      color:
        '#7F8982',

      fontSize:
        7,

      marginTop:
        3,
    },

    reviewComment: {
      color:
        '#717B74',

      fontSize:
        7.5,

      lineHeight:
        12,

      marginTop:
        7,
    },

    noComment: {
      color:
        '#A0A8A3',

      fontSize:
        7,

      fontStyle:
        'italic',

      marginTop:
        6,
    },

    bottomSpacer: {
      height:
        25,
    },

    /*
     * BOTTOM NAV
     */

    bottomNav: {
      height:
        70,

      backgroundColor:
        '#FFFFFF',

      borderTopWidth:
        1,

      borderTopColor:
        '#E9EEEA',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-around',

      paddingHorizontal:
        3,

      elevation:
        8,
    },

    navItem: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    navIconContainer: {
      width:
        32,

      height:
        28,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    activeNavIconContainer: {
      backgroundColor:
        '#E4F1E8',
    },

    navIcon: {
      color:
        '#9DA69F',

      fontSize:
        15,

      fontWeight:
        '700',
    },

    activeNavIcon: {
      color:
        '#659276',
    },

    navText: {
      color:
        '#959E98',

      fontSize:
        7,

      fontWeight:
        '600',

      marginTop:
        3,
    },

    activeNavText: {
      color:
        '#659276',

      fontWeight:
        '900',
    },
  });