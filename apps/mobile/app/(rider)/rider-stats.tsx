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
  getRiderDashboard,
  type RiderDashboardData,
} from '../../services/delivery';

/*
 * =========================================================
 * RIDER STATS
 * =========================================================
 *
 * Real Rider performance screen.
 *
 * Source:
 *
 * GET /api/v1/riders/me/dashboard
 *
 * IMPORTANT:
 *
 * - Delivery Value is NOT Rider earnings.
 * - Rider salary/payroll is separate.
 * - Rating remains "--" until the real
 *   Review/Rating module exists.
 * - Weekly deliveries come from real
 *   delivered Delivery records.
 * =========================================================
 */

export default function RiderStatsScreen() {
  const [
    dashboard,
    setDashboard,
  ] = useState<
    RiderDashboardData | null
  >(null);

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
  ] = useState<
    string | null
  >(null);

  /*
   * =========================================================
   * LOAD STATS
   * =========================================================
   */

  const loadStats =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setErrorMessage(
            null
          );

          const result =
            await getRiderDashboard();

          setDashboard(
            result
          );
        } catch (error) {
          console.log(
            'Rider stats error:',
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
   * =========================================================
   * REFRESH WHEN SCREEN GAINS FOCUS
   * =========================================================
   */

  useFocusEffect(
    useCallback(() => {
      loadStats();

      return undefined;
    }, [
      loadStats,
    ])
  );

  /*
   * =========================================================
   * PULL TO REFRESH
   * =========================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadStats(
            false
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        loadStats,
      ]
    );

  /*
   * =========================================================
   * DERIVED VALUES
   * =========================================================
   */

  const riderName =
    useMemo(() => {
      if (!dashboard) {
        return 'Rider';
      }

      const fullName = [
        dashboard
          .rider
          .firstName,

        dashboard
          .rider
          .lastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      return fullName ||
        'Rider';
    }, [
      dashboard,
    ]);

  const initials =
    useMemo(() => {
      if (!dashboard) {
        return 'R';
      }

      const first =
        dashboard
          .rider
          .firstName
          ?.trim()
          .charAt(0)
          .toUpperCase() ||
        '';

      const last =
        dashboard
          .rider
          .lastName
          ?.trim()
          .charAt(0)
          .toUpperCase() ||
        '';

      return (
        `${first}${last}` ||
        'R'
      );
    }, [
      dashboard,
    ]);

  const averageRating =
    dashboard?.rating
      .average;

  const ratingCount =
    dashboard?.rating
      .count ?? 0;

  const totalDeliveries =
    dashboard?.deliveries
      .total ?? 0;

  const completedDeliveries =
    dashboard?.deliveries
      .completed ?? 0;

  const activeDeliveries =
    dashboard?.deliveries
      .active ?? 0;

  const cancelledDeliveries =
    dashboard?.deliveries
      .cancelled ?? 0;

  const completionRate =
    dashboard?.performance
      .completionRate ?? 0;

  const totalDeliveryValue =
    dashboard?.deliveryValue
      .total ?? 0;

  const todayDeliveryValue =
    dashboard?.deliveryValue
      .today ?? 0;

  const monthDeliveryValue =
    dashboard?.deliveryValue
      .thisMonth ?? 0;

  const weeklyDeliveries =
    dashboard
      ?.weeklyDeliveries ??
    [
      {
        day:
          'Mon' as const,

        value:
          0,
      },

      {
        day:
          'Tue' as const,

        value:
          0,
      },

      {
        day:
          'Wed' as const,

        value:
          0,
      },

      {
        day:
          'Thu' as const,

        value:
          0,
      },

      {
        day:
          'Fri' as const,

        value:
          0,
      },

      {
        day:
          'Sat' as const,

        value:
          0,
      },

      {
        day:
          'Sun' as const,

        value:
          0,
      },
    ];

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (
    loading &&
    !dashboard
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
            color="#C99730"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading Rider stats...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (
    errorMessage &&
    !dashboard
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
            Unable to Load Stats
          </Text>

          <Text
            style={
              styles.errorMessage
            }
          >
            {errorMessage}
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.retryButton,

              pressed && {
                opacity:
                  0.75,
              },
            ]}
            onPress={() =>
              loadStats(
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
   * =========================================================
   * SCREEN
   * =========================================================
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
        {/* =====================================================
            HEADER
        ===================================================== */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.avatar
            }
          >
            <Text
              style={
                styles.avatarText
              }
            >
              {initials}
            </Text>
          </View>

          <Text
            style={
              styles.riderName
            }
          >
            {riderName}
          </Text>

          <View
            style={
              styles.ratingRow
            }
          >
            <Text
              style={
                styles.ratingStars
              }
            >
              {averageRating !==
              null &&
              typeof averageRating ===
                'number'
                ? renderStars(
                    averageRating
                  )
                : '☆ ☆ ☆ ☆ ☆'}
            </Text>

            <Text
              style={
                styles.ratingValue
              }
            >
              {averageRating !==
              null &&
              typeof averageRating ===
                'number'
                ? averageRating.toFixed(
                    2
                  )
                : '--'}
            </Text>
          </View>

          <Text
            style={
              styles.ratingCount
            }
          >
            {ratingCount > 0
              ? `${ratingCount} ${
                  ratingCount ===
                  1
                    ? 'rating'
                    : 'ratings'
                }`
              : 'No customer ratings yet'}
          </Text>
        </View>

        {/* =====================================================
            CONTENT
        ===================================================== */}

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
              tintColor="#C99730"
              colors={[
                '#C99730',
              ]}
            />
          }
        >
          {/* ===================================================
              STAT GRID
          =================================================== */}

          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              icon="🛵"
              value={formatNumber(
                totalDeliveries
              )}
              label="Total Deliveries"
              iconBackground="#FFF3DC"
            />

            <StatCard
              icon="✓"
              value={formatNumber(
                completedDeliveries
              )}
              label="Completed"
              iconBackground="#EAF7EF"
            />

            <StatCard
              icon="₱"
              value={formatMoney(
                totalDeliveryValue
              )}
              label="Delivery Value"
              iconBackground="#FFF3DC"
            />

            <StatCard
              icon="◷"
              value={formatNumber(
                activeDeliveries
              )}
              label="Active"
              iconBackground="#EFEAFF"
            />
          </View>

          {/* ===================================================
              DELIVERY PERFORMANCE
          =================================================== */}

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
              Delivery Performance
            </Text>

            <View
              style={
                styles.performanceList
              }
            >
              <PerformanceRow
                label="Completed"
                value={formatNumber(
                  completedDeliveries
                )}
              />

              <PerformanceRow
                label="Active"
                value={formatNumber(
                  activeDeliveries
                )}
              />

              <PerformanceRow
                label="Cancelled"
                value={formatNumber(
                  cancelledDeliveries
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

          {/* ===================================================
              WEEKLY DELIVERIES
          =================================================== */}

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
                Weekly Deliveries
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
                weeklyDeliveries
              }
            />
          </View>

          {/* ===================================================
              DELIVERY VALUE
          =================================================== */}

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
              Delivery Value
            </Text>

            <Text
              style={
                styles.valueDisclaimer
              }
            >
              Value of successfully delivered
              customer orders. This is not
              Rider salary or earnings.
            </Text>

            <View
              style={
                styles.performanceList
              }
            >
              <PerformanceRow
                label="Today"
                value={formatMoney(
                  todayDeliveryValue
                )}
              />

              <PerformanceRow
                label="This Month"
                value={formatMoney(
                  monthDeliveryValue
                )}
              />

              <PerformanceRow
                label="All Time"
                value={formatMoney(
                  totalDeliveryValue
                )}
                isLast
              />
            </View>
          </View>

          {/* ===================================================
              RIDER RATING
          =================================================== */}

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
              Rider Rating
            </Text>

            {averageRating !==
              null &&
            typeof averageRating ===
              'number' ? (
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
                    Customer ratings will appear
                    here once the Review and
                    Rating feature is available.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* =====================================================
            BOTTOM NAV
        ===================================================== */}

        <View
          style={
            styles.bottomNav
          }
        >
          {/* DASHBOARD */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(rider)/rider-dashboard'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ⌂
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Dashboard
            </Text>
          </Pressable>

          {/* DELIVERIES */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-deliveries'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ▣
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Deliveries
            </Text>
          </Pressable>

          {/* WALLET */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-wallet'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ₱
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Wallet
            </Text>
          </Pressable>

          {/* ALERTS */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.push(
                '/(rider)/rider-alerts'
              )
            }
          >
            <View
              style={
                styles.navIconContainer
              }
            >
              <Text
                style={
                  styles.navIcon
                }
              >
                ♢
              </Text>
            </View>

            <Text
              style={
                styles.navText
              }
            >
              Alerts
            </Text>
          </Pressable>

          {/* STATS */}

          <Pressable
            style={
              styles.navItem
            }
          >
            <View
              style={[
                styles.navIconContainer,
                styles.activeNavIconContainer,
              ]}
            >
              <Text
                style={[
                  styles.navIcon,
                  styles.activeNavIcon,
                ]}
              >
                ♙
              </Text>
            </View>

            <Text
              style={[
                styles.navText,
                styles.activeNavText,
              ]}
            >
              Stats
            </Text>
          </Pressable>
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
  icon:
    string;

  value:
    string;

  label:
    string;

  iconBackground:
    string;
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
  label:
    string;

  value:
    string;

  isLast?:
    boolean;
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
  data:
    RiderDashboardData[
      'weeklyDeliveries'
    ];
}) {
  const maxValue =
    Math.max(
      1,
      ...data.map(
        item =>
          Number(
            item.value
          ) || 0
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
          const safeValue =
            Math.max(
              0,
              Number(
                item.value
              ) || 0
            );

          const barHeight =
            safeValue > 0
              ? Math.max(
                  12,
                  (
                    safeValue /
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
                {safeValue}
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

                    safeValue ===
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
 * HELPERS
 * =========================================================
 */

function formatNumber(
  value:
    number
) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-PH'
  );
}

function formatMoney(
  value:
    number
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
  rating:
    number
) {
  const fullStars =
    Math.max(
      0,
      Math.min(
        5,
        Math.round(
          rating
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
  ).join(' ');
}

function getErrorMessage(
  error:
    unknown
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
        '#F4F3F5',
    },

    screen: {
      flex:
        1,

      backgroundColor:
        '#F4F3F5',
    },

    /*
     * =====================================================
     * LOADING
     * =====================================================
     */

    loadingContainer: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F4F3F5',
    },

    loadingText: {
      color:
        '#8C8589',

      fontSize:
        10,

      marginTop:
        12,

      fontWeight:
        '600',
    },

    /*
     * =====================================================
     * ERROR
     * =====================================================
     */

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
        '#F4F3F5',
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
        '#454045',

      fontSize:
        14,

      fontWeight:
        '900',
    },

    errorMessage: {
      color:
        '#8E888C',

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
        '#C99730',

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

    /*
     * =====================================================
     * HEADER
     * =====================================================
     */

    header: {
      backgroundColor:
        '#C99730',

      paddingTop:
        25,

      paddingBottom:
        20,

      paddingHorizontal:
        18,

      alignItems:
        'center',
    },

    avatar: {
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

    avatarText: {
      color:
        '#FFFFFF',

      fontSize:
        18,

      fontWeight:
        '900',
    },

    riderName: {
      color:
        '#FFFFFF',

      fontSize:
        15,

      fontWeight:
        '900',

      marginTop:
        11,
    },

    ratingRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        4,
    },

    ratingStars: {
      color:
        '#FFFFFF',

      fontSize:
        9,

      letterSpacing:
        1,
    },

    ratingValue: {
      color:
        '#FFFFFF',

      fontSize:
        8,

      fontWeight:
        '800',

      marginLeft:
        6,
    },

    ratingCount: {
      color:
        'rgba(255,255,255,0.82)',

      fontSize:
        7,

      marginTop:
        4,
    },

    /*
     * =====================================================
     * SCROLL
     * =====================================================
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
     * =====================================================
     * STAT GRID
     * =====================================================
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
      fontSize:
        14,
    },

    statValue: {
      color:
        '#454045',

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
        '#A9A2A6',

      fontSize:
        7,

      marginTop:
        3,
    },

    /*
     * =====================================================
     * SECTIONS
     * =====================================================
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
        '#4B4549',

      fontSize:
        11,

      fontWeight:
        '900',
    },

    sectionHint: {
      color:
        '#ACA5A9',

      fontSize:
        7,
    },

    valueDisclaimer: {
      color:
        '#A0999D',

      fontSize:
        7.5,

      lineHeight:
        12,

      marginTop:
        5,

      marginBottom:
        3,
    },

    /*
     * =====================================================
     * PERFORMANCE
     * =====================================================
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
        '#F2EFF1',
    },

    performanceRowLast: {
      borderBottomWidth:
        0,
    },

    performanceLabel: {
      color:
        '#777074',

      fontSize:
        8.5,
    },

    performanceValue: {
      color:
        '#4B4549',

      fontSize:
        9,

      fontWeight:
        '900',
    },

    /*
     * =====================================================
     * CHART
     * =====================================================
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
        '#817A7E',

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
        '#C99730',
    },

    chartBarZero: {
      opacity:
        0.2,
    },

    chartLabel: {
      color:
        '#A8A1A5',

      fontSize:
        7,

      marginTop:
        5,
    },

    /*
     * =====================================================
     * RATING
     * =====================================================
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
        '#FFF3DC',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    ratingCircleValue: {
      color:
        '#C99730',

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
        '#C99730',

      fontSize:
        11,

      letterSpacing:
        1,
    },

    ratingSummaryLabel: {
      color:
        '#8D868A',

      fontSize:
        8,

      marginTop:
        5,
    },

    noRatingState: {
      marginTop:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#FAF9FA',

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
        '#FFF3DC',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    noRatingIcon: {
      color:
        '#C99730',

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
        '#4B4549',

      fontSize:
        9,

      fontWeight:
        '900',
    },

    noRatingMessage: {
      color:
        '#989195',

      fontSize:
        7.5,

      lineHeight:
        12,

      marginTop:
        3,
    },

    /*
     * =====================================================
     * BOTTOM
     * =====================================================
     */

    bottomSpacer: {
      height:
        25,
    },

    /*
     * =====================================================
     * BOTTOM NAVIGATION
     * =====================================================
     */

    bottomNav: {
      height:
        70,

      backgroundColor:
        '#FFFFFF',

      borderTopWidth:
        1,

      borderTopColor:
        '#ECEAEC',

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
        '#FFF1CB',
    },

    navIcon: {
      color:
        '#A5A0A3',

      fontSize:
        15,

      fontWeight:
        '700',
    },

    activeNavIcon: {
      color:
        '#C58E27',
    },

    navText: {
      color:
        '#9D979B',

      fontSize:
        7,

      fontWeight:
        '600',

      marginTop:
        3,
    },

    activeNavText: {
      color:
        '#C58E27',

      fontWeight:
        '900',
    },
  });