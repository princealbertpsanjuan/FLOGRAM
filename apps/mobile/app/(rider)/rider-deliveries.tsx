import {
  router,
  useFocusEffect,
  useLocalSearchParams,
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
  getRiderDeliveries,
  type Delivery,
  type DeliveryFlorist,
  type DeliveryOrder,
  type DeliveryStatus,
} from '../../services/delivery';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type DeliveryTab =
  | 'active'
  | 'completed';

const ACTIVE_DELIVERY_STATUSES:
  DeliveryStatus[] = [
    'accepted',
    'picked_up',
    'out_for_delivery',
  ];

/*
 * =========================================================
 * RIDER DELIVERIES SCREEN
 * =========================================================
 */

export default function RiderDeliveriesScreen() {
  const params =
    useLocalSearchParams<{
      deliveryId?: string;
    }>();

  const selectedDeliveryId =
    typeof params.deliveryId === 'string'
      ? params.deliveryId
      : '';

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<DeliveryTab>('active');

  const [
    deliveries,
    setDeliveries,
  ] =
    useState<Delivery[]>([]);

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
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(null);

  /*
   * =========================================================
   * LOAD RIDER DELIVERIES
   * =========================================================
   */

  const loadDeliveries =
    useCallback(async () => {
      try {
        setErrorMessage(null);

        const response =
          await getRiderDeliveries();

        setDeliveries(
          Array.isArray(
            response.deliveries
          )
            ? response.deliveries
            : []
        );
      } catch (error) {
        console.error(
          'Unable to load rider deliveries:',
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your deliveries.'
        );
      }
    }, []);

  /*
   * =========================================================
   * LOAD EVERY TIME SCREEN IS FOCUSED
   * =========================================================
   */

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const initialize =
        async () => {
          try {
            if (mounted) {
              setLoading(true);
            }

            await loadDeliveries();
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        };

      initialize();

      return () => {
        mounted = false;
      };
    }, [
      loadDeliveries,
    ])
  );

  /*
   * =========================================================
   * REFRESH
   * =========================================================
   */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await loadDeliveries();
      } finally {
        setRefreshing(false);
      }
    }, [
      loadDeliveries,
    ]);

  /*
   * =========================================================
   * ACTIVE DELIVERIES
   * =========================================================
   */

  const activeDeliveries =
    useMemo(() => {
      const filtered =
        deliveries.filter(
          (delivery) =>
            ACTIVE_DELIVERY_STATUSES.includes(
              delivery.status
            )
        );

      /*
       * If we arrived here immediately
       * after accepting a delivery,
       * place that delivery first.
       */
      return [...filtered].sort(
        (a, b) => {
          if (
            selectedDeliveryId &&
            a._id ===
              selectedDeliveryId
          ) {
            return -1;
          }

          if (
            selectedDeliveryId &&
            b._id ===
              selectedDeliveryId
          ) {
            return 1;
          }

          const aTime =
            new Date(
              a.updatedAt ??
                a.createdAt ??
                0
            ).getTime();

          const bTime =
            new Date(
              b.updatedAt ??
                b.createdAt ??
                0
            ).getTime();

          return bTime - aTime;
        }
      );
    }, [
      deliveries,
      selectedDeliveryId,
    ]);

  /*
   * =========================================================
   * COMPLETED DELIVERIES
   * =========================================================
   */

  const completedDeliveries =
    useMemo(() => {
      return deliveries
        .filter(
          (delivery) =>
            delivery.status ===
            'delivered'
        )
        .sort(
          (a, b) => {
            const aTime =
              new Date(
                a.deliveredAt ??
                  a.updatedAt ??
                  0
              ).getTime();

            const bTime =
              new Date(
                b.deliveredAt ??
                  b.updatedAt ??
                  0
              ).getTime();

            return bTime - aTime;
          }
        );
    }, [
      deliveries,
    ]);

  /*
   * =========================================================
   * OPEN ACTIVE DELIVERY
   * =========================================================
   */

  const handleContinueDelivery =
    (
      delivery: Delivery
    ) => {
      router.push({
        pathname:
          '/(rider)/rider-delivery',

        params: {
          deliveryId:
            delivery._id,
        },
      });
    };

  /*
   * =========================================================
   * LOADING SCREEN
   * =========================================================
   */

  if (loading) {
    return (
      <SafeAreaView
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
          Loading deliveries...
        </Text>
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
        {/* HEADER */}

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
            <View>
              <Text
                style={
                  styles.headerEyebrow
                }
              >
                RIDER CENTER
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                My Deliveries
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage your current and completed jobs.
              </Text>
            </View>

            <View
              style={
                styles.headerIcon
              }
            >
              <Text
                style={
                  styles.headerIconText
                }
              >
                🛵
              </Text>
            </View>
          </View>

          {/* SUMMARY */}

          <View
            style={
              styles.summaryRow
            }
          >
            <View
              style={
                styles.summaryItem
              }
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  activeDeliveries.length
                }
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Active
              </Text>
            </View>

            <View
              style={
                styles.summaryDivider
              }
            />

            <View
              style={
                styles.summaryItem
              }
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {
                  completedDeliveries.length
                }
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                Completed
              </Text>
            </View>
          </View>
        </View>

        {/* TABS */}

        <View
          style={
            styles.tabsContainer
          }
        >
          <Pressable
            style={[
              styles.tabButton,

              activeTab ===
                'active' &&
                styles.activeTabButton,
            ]}
            onPress={() =>
              setActiveTab(
                'active'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'active' &&
                  styles.activeTabText,
              ]}
            >
              ACTIVE
            </Text>

            <View
              style={[
                styles.tabCount,

                activeTab ===
                  'active' &&
                  styles.activeTabCount,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,

                  activeTab ===
                    'active' &&
                    styles.activeTabCountText,
                ]}
              >
                {
                  activeDeliveries.length
                }
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.tabButton,

              activeTab ===
                'completed' &&
                styles.activeTabButton,
            ]}
            onPress={() =>
              setActiveTab(
                'completed'
              )
            }
          >
            <Text
              style={[
                styles.tabText,

                activeTab ===
                  'completed' &&
                  styles.activeTabText,
              ]}
            >
              COMPLETED
            </Text>

            <View
              style={[
                styles.tabCount,

                activeTab ===
                  'completed' &&
                  styles.activeTabCount,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,

                  activeTab ===
                    'completed' &&
                    styles.activeTabCountText,
                ]}
              >
                {
                  completedDeliveries.length
                }
              </Text>
            </View>
          </Pressable>
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
              tintColor="#C99730"
              colors={[
                '#C99730',
              ]}
            />
          }
        >
          {errorMessage && (
            <View
              style={
                styles.errorCard
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Unable to load deliveries
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>

              <Pressable
                style={
                  styles.retryButton
                }
                onPress={
                  handleRefresh
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
          )}

          {/* ACTIVE TAB */}

          {activeTab ===
            'active' && (
            <>
              {activeDeliveries.length ===
              0 ? (
                <EmptyState
                  icon="🌷"
                  title="No active delivery"
                  description="Accepted delivery jobs will appear here."
                />
              ) : (
                activeDeliveries.map(
                  (
                    delivery,
                    index
                  ) => (
                    <ActiveDeliveryCard
                      key={
                        delivery._id
                      }
                      delivery={
                        delivery
                      }
                      isCurrent={
                        index === 0
                      }
                      onContinue={() =>
                        handleContinueDelivery(
                          delivery
                        )
                      }
                    />
                  )
                )
              )}
            </>
          )}

          {/* COMPLETED TAB */}

          {activeTab ===
            'completed' && (
            <>
              {completedDeliveries.length ===
              0 ? (
                <EmptyState
                  icon="✓"
                  title="No completed deliveries"
                  description="Successfully completed deliveries will appear here."
                />
              ) : (
                completedDeliveries.map(
                  (
                    delivery
                  ) => (
                    <CompletedDeliveryCard
                      key={
                        delivery._id
                      }
                      delivery={
                        delivery
                      }
                    />
                  )
                )
              )}
            </>
          )}

          <View
            style={
              styles.bottomContentSpacer
            }
          />
        </ScrollView>

{/* BOTTOM NAVIGATION */}

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
    onPress={() => {
      /*
       * Already on the Deliveries screen.
       */
    }}
  >
    <View
      style={[
        styles.navIconContainer,
        styles.activeNavIcon,
      ]}
    >
      <Text
        style={[
          styles.navIcon,
          styles.activeNavIconText,
        ]}
      >
        ▣
      </Text>
    </View>

    <Text
      style={[
        styles.navText,
        styles.activeNavText,
      ]}
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
    onPress={() =>
      router.push(
        '/(rider)/rider-stats'
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
        ≡
      </Text>
    </View>

    <Text
      style={
        styles.navText
      }
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
 * ACTIVE DELIVERY CARD
 * =========================================================
 */

function ActiveDeliveryCard({
  delivery,
  isCurrent,
  onContinue,
}: {
  delivery: Delivery;
  isCurrent: boolean;
  onContinue: () => void;
}) {
  const order =
    getOrder(
      delivery
    );

  const florist =
    getFlorist(
      delivery
    );

  const status =
    getStatusDisplay(
      delivery.status
    );

  return (
    <View
      style={
        styles.activeCard
      }
    >
      {/* TOP */}

      <View
        style={
          styles.cardTopRow
        }
      >
        <View
          style={
            styles.currentDeliveryArea
          }
        >
          {isCurrent && (
            <View
              style={
                styles.currentDeliveryBadge
              }
            >
              <Text
                style={
                  styles.currentDeliveryText
                }
              >
                CURRENT DELIVERY
              </Text>
            </View>
          )}

          <Text
            style={
              styles.deliveryCode
            }
          >
            #
            {shortId(
              delivery._id
            )}
          </Text>
        </View>

        <View
          style={
            styles.liveStatusBadge
          }
        >
          <View
            style={
              styles.liveStatusDot
            }
          />

          <Text
            style={
              styles.liveStatusText
            }
          >
            LIVE
          </Text>
        </View>
      </View>

      {/* STATUS */}

      <View
        style={
          styles.statusRow
        }
      >
        <View
          style={
            styles.statusIconCircle
          }
        >
          <Text
            style={
              styles.statusIcon
            }
          >
            {status.icon}
          </Text>
        </View>

        <View
          style={
            styles.statusContent
          }
        >
          <Text
            style={
              styles.statusLabel
            }
          >
            STATUS
          </Text>

          <Text
            style={
              styles.statusTitle
            }
          >
            {status.title}
          </Text>

          <Text
            style={
              styles.statusDescription
            }
          >
            {
              status.description
            }
          </Text>
        </View>
      </View>

      {/* RECIPIENT */}

      <View
        style={
          styles.infoSection
        }
      >
        <Text
          style={
            styles.infoSectionLabel
          }
        >
          RECIPIENT
        </Text>

        <Text
          style={
            styles.recipientName
          }
        >
          {
            delivery.recipientName ||
            'Recipient'
          }
        </Text>

        <Text
          style={
            styles.recipientPhone
          }
        >
          {
            delivery.recipientPhoneNumber ||
            'Phone unavailable'
          }
        </Text>
      </View>

      {/* ORDER */}

      <View
        style={
          styles.detailsGrid
        }
      >
        <InfoBlock
          label="Bouquet"
          value={
            order?.productName ||
            'Flower Order'
          }
        />

        <InfoBlock
          label="Payment"
          value={
            formatPayment(
              order
            )
          }
        />

        <InfoBlock
          label="Florist"
          value={
            florist?.shopName ||
            'Florist'
          }
        />

        <InfoBlock
          label="Total"
          value={
            formatMoney(
              order?.totalAmount
            )
          }
        />
      </View>

      {/* ROUTE */}

      <View
        style={
          styles.routeBox
        }
      >
        <RouteRow
          icon="💐"
          label="Pickup"
          value={
            formatAddress(
              delivery.pickupAddress
            )
          }
        />

        <View
          style={
            styles.routeConnector
          }
        />

        <RouteRow
          icon="📍"
          label="Deliver To"
          value={
            formatAddress(
              delivery.deliveryAddress
            )
          }
        />
      </View>

      {/* PROOF STATUS */}

      {delivery.status ===
        'out_for_delivery' && (
        <View
          style={[
            styles.podMiniCard,

            hasProof(
              delivery
            )
              ? styles.podReadyCard
              : styles.podRequiredCard,
          ]}
        >
          <Text
            style={
              styles.podMiniIcon
            }
          >
            {hasProof(
              delivery
            )
              ? '✓'
              : '📷'}
          </Text>

          <View
            style={
              styles.podMiniContent
            }
          >
            <Text
              style={[
                styles.podMiniTitle,

                hasProof(
                  delivery
                )
                  ? styles.podReadyTitle
                  : styles.podRequiredTitle,
              ]}
            >
              {hasProof(
                delivery
              )
                ? 'Proof of Delivery Uploaded'
                : 'Proof of Delivery Required'}
            </Text>

            <Text
              style={
                styles.podMiniText
              }
            >
              {hasProof(
                delivery
              )
                ? 'You can proceed with delivery completion.'
                : 'Open the delivery to take and upload the required photo.'}
            </Text>
          </View>
        </View>
      )}

      {/* CONTINUE */}

      <Pressable
        style={({ pressed }) => [
          styles.continueButton,

          pressed &&
            styles.pressed,
        ]}
        onPress={
          onContinue
        }
      >
        <Text
          style={
            styles.continueButtonText
          }
        >
          Continue Delivery
        </Text>

        <Text
          style={
            styles.continueArrow
          }
        >
          →
        </Text>
      </Pressable>
    </View>
  );
}

/*
 * =========================================================
 * COMPLETED DELIVERY CARD
 * =========================================================
 */

function CompletedDeliveryCard({
  delivery,
}: {
  delivery: Delivery;
}) {
  const order =
    getOrder(
      delivery
    );

  const florist =
    getFlorist(
      delivery
    );

  return (
    <View
      style={
        styles.completedCard
      }
    >
      <View
        style={
          styles.completedHeader
        }
      >
        <View
          style={
            styles.completedIconCircle
          }
        >
          <Text
            style={
              styles.completedIcon
            }
          >
            ✓
          </Text>
        </View>

        <View
          style={
            styles.completedHeaderText
          }
        >
          <Text
            style={
              styles.completedTitle
            }
          >
            Delivery Completed
          </Text>

          <Text
            style={
              styles.completedDate
            }
          >
            {formatDate(
              delivery.deliveredAt ??
                delivery.updatedAt
            )}
          </Text>
        </View>

        <View
          style={
            styles.completedBadge
          }
        >
          <Text
            style={
              styles.completedBadgeText
            }
          >
            DELIVERED
          </Text>
        </View>
      </View>

      <View
        style={
          styles.completedDivider
        }
      />

      <DetailLine
        label="Recipient"
        value={
          delivery.recipientName ||
          'Recipient'
        }
      />

      <DetailLine
        label="Bouquet"
        value={
          order?.productName ||
          'Flower Order'
        }
      />

      <DetailLine
        label="Florist"
        value={
          florist?.shopName ||
          'Florist'
        }
      />

      <DetailLine
        label="Destination"
        value={
          formatAddress(
            delivery.deliveryAddress
          )
        }
      />

      <View
        style={
          styles.completedFooter
        }
      >
        <View>
          <Text
            style={
              styles.completedFooterLabel
            }
          >
            ORDER TOTAL
          </Text>

          <Text
            style={
              styles.completedAmount
            }
          >
            {formatMoney(
              order?.totalAmount
            )}
          </Text>
        </View>

        {hasProof(
          delivery
        ) && (
          <View
            style={
              styles.proofCompleteBadge
            }
          >
            <Text
              style={
                styles.proofCompleteText
              }
            >
              ✓ POD
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

/*
 * =========================================================
 * SMALL COMPONENTS
 * =========================================================
 */

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.infoBlock
      }
    >
      <Text
        style={
          styles.infoBlockLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoBlockValue
        }
        numberOfLines={
          2
        }
      >
        {value}
      </Text>
    </View>
  );
}

function RouteRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.routeRow
      }
    >
      <View
        style={
          styles.routeIconCircle
        }
      >
        <Text
          style={
            styles.routeIcon
          }
        >
          {icon}
        </Text>
      </View>

      <View
        style={
          styles.routeContent
        }
      >
        <Text
          style={
            styles.routeLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.routeAddress
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View
      style={
        styles.detailLine
      }
    >
      <Text
        style={
          styles.detailLineLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.detailLineValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <View
        style={
          styles.emptyIconCircle
        }
      >
        <Text
          style={
            styles.emptyIcon
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getOrder(
  delivery: Delivery
): DeliveryOrder | null {
  if (
    typeof delivery.order ===
    'object' &&
    delivery.order !== null
  ) {
    return delivery.order;
  }

  return null;
}

function getFlorist(
  delivery: Delivery
): DeliveryFlorist | null {
  if (
    typeof delivery.florist ===
    'object' &&
    delivery.florist !== null
  ) {
    return delivery.florist;
  }

  return null;
}

function hasProof(
  delivery: Delivery
) {
  return Boolean(
    delivery.proofOfDelivery
      ?.imageUrl &&
      delivery.proofOfDelivery
        ?.uploadedAt
  );
}

function getStatusDisplay(
  status: DeliveryStatus
) {
  switch (status) {
    case 'accepted':
      return {
        icon: '💐',

        title:
          'Heading to Florist',

        description:
          'Pick up the bouquet from the florist.',
      };

    case 'picked_up':
      return {
        icon: '🛵',

        title:
          'Bouquet Picked Up',

        description:
          'Start the customer delivery when ready.',
      };

    case 'out_for_delivery':
      return {
        icon: '📍',

        title:
          'Out for Delivery',

        description:
          'Deliver the bouquet and upload proof of delivery.',
      };

    default:
      return {
        icon: '🛵',

        title:
          'Active Delivery',

        description:
          'Continue your current delivery.',
      };
  }
}

function formatAddress(
  address?: {
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    landmark?: string;
  }
) {
  if (!address) {
    return 'Address unavailable';
  }

  const addressText =
    [
      address.street,
      address.barangay,
      address.city,
      address.province,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

  if (
    address.landmark
  ) {
    return `${addressText} • Landmark: ${address.landmark}`;
  }

  return (
    addressText ||
    'Address unavailable'
  );
}

function formatMoney(
  value:
    number | null | undefined
) {
  if (
    typeof value !==
    'number'
  ) {
    return '₱--';
  }

  return `₱${value.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function formatPayment(
  order:
    DeliveryOrder | null
) {
  if (!order) {
    return 'Payment unavailable';
  }

  const method =
    order.paymentMethod
      ?.replaceAll(
        '_',
        ' '
      )
      .toUpperCase() ||
    'PAYMENT';

  const status =
    order.paymentStatus
      ?.replaceAll(
        '_',
        ' '
      )
      .toUpperCase();

  return status
    ? `${method} • ${status}`
    : method;
}

function formatDate(
  value?:
    string | null
) {
  if (!value) {
    return 'Date unavailable';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Date unavailable';
  }

  return date.toLocaleString(
    'en-PH',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

function shortId(
  id: string
) {
  if (!id) {
    return '------';
  }

  return id
    .slice(-6)
    .toUpperCase();
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
        '#F5F5F6',
    },

    screen: {
      flex: 1,
      backgroundColor:
        '#F5F5F6',
    },

    /*
     * LOADING
     */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F5F5F6',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    loadingText: {
      color: '#8C8588',
      fontSize: 11,
      marginTop: 12,
    },

    /*
     * HEADER
     */

    header: {
      backgroundColor:
        '#C99730',
      paddingHorizontal:
        18,
      paddingTop: 18,
      paddingBottom: 17,
    },

    headerTop: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    headerEyebrow: {
      color:
        'rgba(255,255,255,0.72)',
      fontSize: 8,
      fontWeight:
        '800',
      letterSpacing: 1,
    },

    headerTitle: {
      color:
        '#FFFFFF',
      fontSize: 23,
      fontWeight:
        '900',
      marginTop: 3,
    },

    headerSubtitle: {
      color:
        'rgba(255,255,255,0.78)',
      fontSize: 9,
      marginTop: 5,
    },

    headerIcon: {
      width: 49,
      height: 49,
      borderRadius: 25,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerIconText: {
      fontSize: 21,
    },

    /*
     * SUMMARY
     */

    summaryRow: {
      marginTop: 17,
      backgroundColor:
        'rgba(255,255,255,0.15)',
      borderRadius: 14,
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical: 10,
    },

    summaryItem: {
      flex: 1,
      alignItems:
        'center',
    },

    summaryValue: {
      color:
        '#FFFFFF',
      fontSize: 17,
      fontWeight:
        '900',
    },

    summaryLabel: {
      color:
        'rgba(255,255,255,0.72)',
      fontSize: 8,
      marginTop: 2,
      fontWeight:
        '600',
    },

    summaryDivider: {
      width: 1,
      height: 28,
      backgroundColor:
        'rgba(255,255,255,0.22)',
    },

    /*
     * TABS
     */

    tabsContainer: {
      flexDirection:
        'row',
      backgroundColor:
        '#FFFFFF',
      paddingHorizontal:
        16,
      paddingTop: 12,
      paddingBottom: 9,
      gap: 9,
      elevation: 2,
    },

    tabButton: {
      flex: 1,
      height: 42,
      borderRadius: 13,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F4F3F3',
    },

    activeTabButton: {
      backgroundColor:
        '#FFF4DA',
      borderWidth: 1,
      borderColor:
        '#EBD7A7',
    },

    tabText: {
      color:
        '#8D878A',
      fontSize: 9,
      fontWeight:
        '800',
    },

    activeTabText: {
      color:
        '#B78123',
    },

    tabCount: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor:
        '#E6E3E4',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginLeft: 7,
      paddingHorizontal: 5,
    },

    activeTabCount: {
      backgroundColor:
        '#C99730',
    },

    tabCountText: {
      color:
        '#7C7578',
      fontSize: 8,
      fontWeight:
        '800',
    },

    activeTabCountText: {
      color:
        '#FFFFFF',
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        16,
      paddingTop: 15,
    },

    /*
     * ACTIVE CARD
     */

    activeCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      padding: 15,
      marginBottom: 14,
      elevation: 2,
    },

    cardTopRow: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
    },

    currentDeliveryArea: {
      flex: 1,
    },

    currentDeliveryBadge: {
      alignSelf:
        'flex-start',
      backgroundColor:
        '#FFF2CE',
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    currentDeliveryText: {
      color:
        '#B47D1F',
      fontSize: 7,
      fontWeight:
        '900',
      letterSpacing: 0.7,
    },

    deliveryCode: {
      color:
        '#A39DA0',
      fontSize: 8,
      marginTop: 7,
      fontWeight:
        '700',
    },

    liveStatusBadge: {
      backgroundColor:
        '#EEF8F1',
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 6,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    liveStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        '#59A875',
      marginRight: 5,
    },

    liveStatusText: {
      color:
        '#59A875',
      fontSize: 7,
      fontWeight:
        '900',
    },

    /*
     * STATUS
     */

    statusRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginTop: 15,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor:
        '#F0EEEF',
    },

    statusIconCircle: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        '#FFF4DA',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    statusIcon: {
      fontSize: 19,
    },

    statusContent: {
      flex: 1,
      marginLeft: 12,
    },

    statusLabel: {
      color:
        '#B1A9A0',
      fontSize: 7,
      fontWeight:
        '800',
      letterSpacing: 0.7,
    },

    statusTitle: {
      color:
        '#443E41',
      fontSize: 14,
      fontWeight:
        '900',
      marginTop: 2,
    },

    statusDescription: {
      color:
        '#8E878B',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 3,
    },

    /*
     * RECIPIENT
     */

    infoSection: {
      marginTop: 13,
    },

    infoSectionLabel: {
      color:
        '#ACA5A8',
      fontSize: 7,
      fontWeight:
        '800',
      letterSpacing: 0.7,
    },

    recipientName: {
      color:
        '#484145',
      fontSize: 15,
      fontWeight:
        '900',
      marginTop: 3,
    },

    recipientPhone: {
      color:
        '#857E82',
      fontSize: 9,
      marginTop: 2,
    },

    /*
     * GRID
     */

    detailsGrid: {
      flexDirection:
        'row',
      flexWrap:
        'wrap',
      marginHorizontal: -4,
      marginTop: 10,
    },

    infoBlock: {
      width: '50%',
      paddingHorizontal: 4,
      marginTop: 8,
    },

    infoBlockLabel: {
      color:
        '#AAA3A7',
      fontSize: 7,
      fontWeight:
        '700',
    },

    infoBlockValue: {
      color:
        '#514A4E',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
      fontWeight:
        '700',
    },

    /*
     * ROUTE BOX
     */

    routeBox: {
      backgroundColor:
        '#FAF8F4',
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },

    routeRow: {
      flexDirection:
        'row',
      alignItems:
        'flex-start',
    },

    routeIconCircle: {
      width: 31,
      height: 31,
      borderRadius: 16,
      backgroundColor:
        '#FFFFFF',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    routeIcon: {
      fontSize: 13,
    },

    routeContent: {
      flex: 1,
      marginLeft: 9,
    },

    routeLabel: {
      color:
        '#A29B9F',
      fontSize: 7,
      fontWeight:
        '800',
    },

    routeAddress: {
      color:
        '#5E575A',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 2,
    },

    routeConnector: {
      width: 1,
      height: 12,
      backgroundColor:
        '#D8CFBC',
      marginLeft: 15,
      marginVertical: 3,
    },

    /*
     * POD
     */

    podMiniCard: {
      borderRadius: 13,
      padding: 11,
      flexDirection:
        'row',
      marginTop: 12,
      alignItems:
        'center',
    },

    podRequiredCard: {
      backgroundColor:
        '#FFF7E7',
    },

    podReadyCard: {
      backgroundColor:
        '#EEF8F1',
    },

    podMiniIcon: {
      width: 30,
      textAlign:
        'center',
      fontSize: 15,
    },

    podMiniContent: {
      flex: 1,
      marginLeft: 6,
    },

    podMiniTitle: {
      fontSize: 9,
      fontWeight:
        '800',
    },

    podRequiredTitle: {
      color:
        '#B7862E',
    },

    podReadyTitle: {
      color:
        '#4D9562',
    },

    podMiniText: {
      color:
        '#847D80',
      fontSize: 7,
      lineHeight: 12,
      marginTop: 2,
    },

    /*
     * CONTINUE
     */

    continueButton: {
      height: 52,
      borderRadius: 14,
      backgroundColor:
        '#C99730',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginTop: 14,
    },

    continueButtonText: {
      color:
        '#FFFFFF',
      fontSize: 11,
      fontWeight:
        '900',
    },

    continueArrow: {
      color:
        '#FFFFFF',
      fontSize: 17,
      fontWeight:
        '800',
      marginLeft: 8,
    },

    /*
     * COMPLETED CARD
     */

    completedCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      padding: 15,
      marginBottom: 13,
      elevation: 2,
    },

    completedHeader: {
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    completedIconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        '#EAF7EE',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    completedIcon: {
      color:
        '#59A875',
      fontSize: 18,
      fontWeight:
        '900',
    },

    completedHeaderText: {
      flex: 1,
      marginLeft: 10,
    },

    completedTitle: {
      color:
        '#474044',
      fontSize: 12,
      fontWeight:
        '900',
    },

    completedDate: {
      color:
        '#A19A9E',
      fontSize: 7,
      marginTop: 3,
    },

    completedBadge: {
      backgroundColor:
        '#EEF8F1',
      borderRadius: 11,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    completedBadgeText: {
      color:
        '#59A875',
      fontSize: 6,
      fontWeight:
        '900',
    },

    completedDivider: {
      height: 1,
      backgroundColor:
        '#F0EEEF',
      marginVertical: 12,
    },

    detailLine: {
      marginBottom: 9,
    },

    detailLineLabel: {
      color:
        '#ACA5A8',
      fontSize: 7,
      fontWeight:
        '700',
    },

    detailLineValue: {
      color:
        '#575054',
      fontSize: 9,
      lineHeight: 14,
      marginTop: 2,
    },

    completedFooter: {
      borderTopWidth: 1,
      borderTopColor:
        '#F0EEEF',
      paddingTop: 11,
      marginTop: 2,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
    },

    completedFooterLabel: {
      color:
        '#ABA4A7',
      fontSize: 7,
      fontWeight:
        '700',
    },

    completedAmount: {
      color:
        '#B78123',
      fontSize: 14,
      fontWeight:
        '900',
      marginTop: 2,
    },

    proofCompleteBadge: {
      backgroundColor:
        '#EAF7EE',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 11,
    },

    proofCompleteText: {
      color:
        '#519667',
      fontSize: 7,
      fontWeight:
        '900',
    },

    /*
     * EMPTY
     */

    emptyCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 18,
      paddingHorizontal: 22,
      paddingVertical: 38,
      alignItems:
        'center',
      elevation: 1,
    },

    emptyIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor:
        '#FFF4DA',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    emptyIcon: {
      fontSize: 25,
      color:
        '#C99730',
    },

    emptyTitle: {
      color:
        '#484145',
      fontSize: 14,
      fontWeight:
        '900',
      marginTop: 14,
    },

    emptyDescription: {
      color:
        '#999296',
      fontSize: 9,
      lineHeight: 14,
      textAlign:
        'center',
      marginTop: 6,
    },

    /*
     * ERROR
     */

    errorCard: {
      backgroundColor:
        '#FFF0F0',
      borderRadius: 14,
      padding: 13,
      marginBottom: 12,
    },

    errorTitle: {
      color:
        '#BE5D5D',
      fontSize: 10,
      fontWeight:
        '800',
    },

    errorText: {
      color:
        '#A76B6B',
      fontSize: 8,
      lineHeight: 13,
      marginTop: 4,
    },

    retryButton: {
      alignSelf:
        'flex-start',
      backgroundColor:
        '#C99730',
      borderRadius: 11,
      paddingHorizontal: 11,
      paddingVertical: 7,
      marginTop: 9,
    },

    retryButtonText: {
      color:
        '#FFFFFF',
      fontSize: 8,
      fontWeight:
        '800',
    },

    pressed: {
      opacity: 0.8,
    },

    bottomContentSpacer: {
      height: 25,
    },

    /*
     * BOTTOM NAVIGATION
     */

    bottomNav: {
      height: 70,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor:
        '#EEECEE',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-around',
      paddingHorizontal: 4,
      elevation: 8,
    },

    navItem: {
      flex: 1,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    navIconContainer: {
      width: 31,
      height: 27,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    activeNavIcon: {
      backgroundColor:
        '#FFF2CF',
    },

    navIcon: {
      color:
        '#9F989C',
      fontSize: 15,
      fontWeight:
        '700',
    },

    activeNavIconText: {
      color:
        '#B87F20',
    },

    navText: {
      color:
        '#9F989C',
      fontSize: 7,
      fontWeight:
        '600',
      marginTop: 3,
    },

    activeNavText: {
      color:
        '#B87F20',
      fontWeight:
        '900',
    },
  });