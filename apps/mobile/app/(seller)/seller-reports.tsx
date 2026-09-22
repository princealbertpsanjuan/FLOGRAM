import {
  router,
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
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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
 *
 * IMPORTANT:
 *
 * - Sales are calculated from PAID orders only.
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

const SUCCESSFUL_STATUSES = [
  'delivered',
  'completed',
];

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
          ] =
            await Promise.all([
              getSellerOrders(),
              getSellerReviews(),
              getMyFloristProfile(),
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
   * BASIC ORDER STATS
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
   * =======================================================
   * COMPLETION RATE
   * =======================================================
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
   * SALES
   * =======================================================
   *
   * Only PAID orders are counted.
   *
   * We intentionally do not count unpaid/pending payments
   * as Seller sales.
   * =======================================================
   */

  const paidOrders =
    useMemo(
      () =>
        orders.filter(
          order =>
            order.paymentStatus ===
              'paid' &&
            order.orderStatus !==
              'cancelled'
        ),
      [
        orders,
      ]
    );

  const totalSales =
    useMemo(
      () =>
        paidOrders.reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.totalAmount ||
                0
            ),
          0
        ),
      [
        paidOrders,
      ]
    );

  const todaySales =
    useMemo(() => {
      const now =
        new Date();

      return paidOrders
        .filter(
          order =>
            isSameDay(
              getSaleDate(
                order
              ),
              now
            )
        )
        .reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.totalAmount ||
                0
            ),
          0
        );
    }, [
      paidOrders,
    ]);

  const monthSales =
    useMemo(() => {
      const now =
        new Date();

      return paidOrders
        .filter(
          order =>
            isSameMonth(
              getSaleDate(
                order
              ),
              now
            )
        )
        .reduce(
          (
            total,
            order
          ) =>
            total +
            Number(
              order.totalAmount ||
                0
            ),
          0
        );
    }, [
      paidOrders,
    ]);

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
   * PRODUCT PERFORMANCE
   * =======================================================
   */

  const topProducts =
    useMemo<
      ProductPerformance[]
    >(
      () =>
        buildProductPerformance(
          orders
        ),
      [
        orders,
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

          {/* STAT GRID */}

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
              icon="₱"
              value={formatMoney(
                totalSales
              )}
              label="Paid Sales"
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

          {/* ORDER PERFORMANCE */}

          <View
            style={
              styles.sectionCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Order Performance
            </Text>

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
          </View>

          {/* WEEKLY ORDERS */}

          <View
            style={
              styles.sectionCard
            }
          >
            <View
              style={
                styles.sectionHeaderRow
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Weekly Orders
              </Text>

              <Text
                style={
                  styles.sectionHint
                }
              >
                Current week
              </Text>
            </View>

            <WeeklyChart
              data={
                weeklyData
              }
            />
          </View>

          {/* SALES SUMMARY */}

          <View
            style={
              styles.sectionCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Sales Summary
            </Text>

            <Text
              style={
                styles.sectionDescription
              }
            >
              Based on orders with a
              successful paid payment
              status.
            </Text>

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
                  totalSales
                )}
                isLast
              />
            </View>
          </View>

          {/* TOP PRODUCTS */}

          <View
            style={
              styles.sectionCard
            }
          >
            <View
              style={
                styles.sectionHeaderRow
              }
            >
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Product Performance
              </Text>

              <Text
                style={
                  styles.sectionHint
                }
              >
                Paid orders
              </Text>
            </View>

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
                  will appear after paid
                  orders are recorded.
                </Text>
              </View>
            )}
          </View>

          {/* CUSTOMER RATING */}

          <View
            style={
              styles.sectionCard
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Shop Rating
            </Text>

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
          </View>

          {/* RECENT REVIEWS */}

          {reviews &&
          reviews.reviews.length >
            0 ? (
            <View
              style={
                styles.sectionCard
              }
            >
              <View
                style={
                  styles.sectionHeaderRow
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Recent Reviews
                </Text>

                <Text
                  style={
                    styles.sectionHint
                  }
                >
                  Latest feedback
                </Text>
              </View>

              <View
                style={
                  styles.reviewList
                }
              >
                {reviews.reviews
                  .slice(
                    0,
                    3
                  )
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
                              Math.min(
                                reviews
                                  .reviews
                                  .length,
                                3
                              ) -
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
            </View>
          ) : null}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* BOTTOM NAVIGATION */}

        <View
          style={
            styles.bottomNav
          }
        >
          <NavItem
            icon="⌂"
            label="Dashboard"
            onPress={() =>
              router.replace(
                '/(seller)/seller-dashboard'
              )
            }
          />

          <NavItem
            icon="♧"
            label="Products"
            onPress={() =>
              router.replace(
                '/(seller)/seller-products'
              )
            }
          />

          <NavItem
            icon="▣"
            label="Orders"
            onPress={() =>
              router.replace(
                '/(seller)/seller-orders'
              )
            }
          />

          <NavItem
            icon="▥"
            label="Reports"
            active
          />

          <NavItem
            icon="○"
            label="Profile"
            onPress={() =>
              router.replace(
                '/(seller)/seller-profile'
              )
            }
          />
        </View>
      </View>
    </SafeAreaView>
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
 * NAV ITEM
 * =========================================================
 */

function NavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={
        styles.navItem
      }
      onPress={
        onPress
      }
      disabled={
        active
      }
    >
      <View
        style={[
          styles.navIconContainer,

          active &&
            styles.activeNavIconContainer,
        ]}
      >
        <Text
          style={[
            styles.navIcon,

            active &&
              styles.activeNavIcon,
          ]}
        >
          {icon}
        </Text>
      </View>

      <Text
        style={[
          styles.navText,

          active &&
            styles.activeNavText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * REPORT HELPERS
 * =========================================================
 */

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

      const sales =
        dayOrders
          .filter(
            order =>
              order.paymentStatus ===
                'paid' &&
              order.orderStatus !==
                'cancelled'
          )
          .reduce(
            (
              total,
              order
            ) =>
              total +
              Number(
                order.totalAmount ||
                  0
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
  orders: CustomerOrder[]
): ProductPerformance[] {
  const productMap =
    new Map<
      string,
      ProductPerformance
    >();

  orders
    .filter(
      order =>
        order.paymentStatus ===
          'paid' &&
        SUCCESSFUL_STATUSES.includes(
          order.orderStatus
        )
    )
    .forEach(
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

        current.sales +=
          Number(
            order.totalAmount ||
              0
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

function getSaleDate(
  order: CustomerOrder
) {
  const value =
    order.paidAt ||
    order.completedAt ||
    order.createdAt;

  return new Date(
    value
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

function isSameMonth(
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
      second.getMonth()
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
        10,

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
        9,

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
        9,

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
        8,

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
        8,

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
        9,

      letterSpacing:
        1,
    },

    headerRatingValue: {
      color:
        '#FFFFFF',

      fontSize:
        8,

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
        11,

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
        8.5,
    },

    performanceValue: {
      color:
        '#414A44',

      fontSize:
        9,

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
        8,

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
        8.5,

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
        8.5,

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
        9,

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
        11,

      letterSpacing:
        1,
    },

    ratingSummaryLabel: {
      color:
        '#858F88',

      fontSize:
        8,

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
        9,

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
        8.5,

      fontWeight:
        '900',
    },

    reviewStars: {
      color:
        '#74A485',

      fontSize:
        8,

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