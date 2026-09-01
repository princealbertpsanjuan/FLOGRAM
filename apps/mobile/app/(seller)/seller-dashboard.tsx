import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getStoredUser,
  type AuthUser,
} from '../../services/auth';

type OrderItem = {
  id: string;
  title: string;
  subtitle: string;
  status: 'Preparing' | 'Ready' | 'Pending' | 'Done';
};

const recentOrders: OrderItem[] = [
  {
    id: '#FLG-4521',
    title: 'Blush Garden',
    subtitle: '×1 • Maria C.',
    status: 'Preparing',
  },
  {
    id: '#FLG-4520',
    title: 'Rose Elegance',
    subtitle: '×2 • Juan P.',
    status: 'Ready',
  },
  {
    id: '#FLG-4519',
    title: 'Sunflower Glow',
    subtitle: '×1 • Sofia R.',
    status: 'Pending',
  },
];

const weeklyRevenue = [
  { day: 'Mon', value: 28 },
  { day: 'Tue', value: 42 },
  { day: 'Wed', value: 34 },
  { day: 'Thu', value: 51 },
  { day: 'Fri', value: 60 },
  { day: 'Sat', value: 78 },
  { day: 'Sun', value: 67 },
];

export default function SellerDashboardScreen() {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser =
          await getStoredUser();

        setUser(storedUser);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const firstName =
    user?.firstName || 'Seller';

  const handleTemporaryNavigation = (
    screen: string
  ) => {
    Alert.alert(
      screen,
      `${screen} screen will be connected next.`
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#6FA382"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        {/* =====================================================
            HEADER
        ===================================================== */}

        <View style={styles.header}>
          <View style={styles.headerCircleOne} />
          <View style={styles.headerCircleTwo} />

          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.timeText}>
                8:41
              </Text>

              <Text style={styles.greetingLabel}>
                Good morning
              </Text>

              <Text style={styles.shopName}>
                {firstName} Manila 🌸
              </Text>
            </View>

            <Pressable
              style={styles.headerMenuButton}
              onPress={() =>
                handleTemporaryNavigation(
                  'Seller Menu'
                )
              }
            >
              <Text style={styles.headerMenuText}>
                •••
              </Text>
            </Pressable>
          </View>

          {/* SUMMARY CARDS */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                Today&apos;s Sales
              </Text>

              <Text style={styles.summaryValue}>
                ₱8,420
              </Text>

              <Text style={styles.summaryMeta}>
                +24% vs yesterday
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>
                Pending Orders
              </Text>

              <Text style={styles.summaryValue}>
                7
              </Text>

              <Text style={styles.summaryMeta}>
                Need attention
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* STATUS COUNTS */}

          <View style={styles.statusRow}>
            <StatusCard
              value="12"
              label="Active"
              background="#EEF8F1"
              text="#5C9D73"
            />

            <StatusCard
              value="3"
              label="Ready"
              background="#FFF5DC"
              text="#D2A23F"
            />

            <StatusCard
              value="7"
              label="Pending"
              background="#FFF0F5"
              text="#DB7298"
            />

            <StatusCard
              value="28"
              label="Done"
              background="#F0F1FF"
              text="#6E73D7"
            />
          </View>

          {/* WEEKLY REVENUE */}

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.sectionTitle}>
                Weekly Revenue
              </Text>

              <Text style={styles.revenueTotal}>
                ₱50,400 total
              </Text>
            </View>

            <View style={styles.chart}>
              {weeklyRevenue.map(
                (item) => (
                  <View
                    key={item.day}
                    style={styles.chartColumn}
                  >
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: item.value,
                        },
                      ]}
                    />

                    <Text style={styles.chartLabel}>
                      {item.day}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>

          {/* RECENT ORDERS */}

          <View style={styles.ordersCard}>
            <View style={styles.ordersHeader}>
              <Text style={styles.sectionTitle}>
                Recent Orders
              </Text>

              <Pressable
                onPress={() =>
                  handleTemporaryNavigation(
                    'Orders'
                  )
                }
              >
                <Text style={styles.viewAllText}>
                  View All
                </Text>
              </Pressable>
            </View>

            {recentOrders.map(
              (order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                />
              )
            )}
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* =====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <View style={styles.bottomNavigation}>
          <Pressable style={styles.navItem}>
            <View style={styles.activeNavIcon}>
              <Text style={styles.navIcon}>
                ⌂
              </Text>
            </View>

            <Text style={styles.activeNavText}>
              Dashboard
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Products'
              )
            }
          >
            <Text style={styles.navIcon}>
              ◈
            </Text>

            <Text style={styles.navText}>
              Products
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Orders'
              )
            }
          >
            <Text style={styles.navIcon}>
              🛒
            </Text>

            <Text style={styles.navText}>
              Orders
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Reports'
              )
            }
          >
            <Text style={styles.navIcon}>
              ▥
            </Text>

            <Text style={styles.navText}>
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Seller Profile'
              )
            }
          >
            <Text style={styles.navIcon}>
              ♙
            </Text>

            <Text style={styles.navText}>
              Seller Profile
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

type StatusCardProps = {
  value: string;
  label: string;
  background: string;
  text: string;
};

function StatusCard({
  value,
  label,
  background,
  text,
}: StatusCardProps) {
  return (
    <View
      style={[
        styles.statusCard,
        {
          backgroundColor:
            background,
        },
      ]}
    >
      <Text
        style={[
          styles.statusValue,
          {
            color: text,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={[
          styles.statusLabel,
          {
            color: text,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function OrderRow({
  order,
}: {
  order: OrderItem;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.orderRow,
        pressed &&
          styles.pressed,
      ]}
      onPress={() => {
        Alert.alert(
          order.id,
          `${order.title}\n${order.subtitle}`
        );
      }}
    >
      <View style={styles.orderIcon}>
        <Text style={styles.orderIconText}>
          ◈
        </Text>
      </View>

      <View style={styles.orderInfo}>
        <Text style={styles.orderId}>
          {order.id}
        </Text>

        <Text style={styles.orderDescription}>
          {order.title} {order.subtitle}
        </Text>
      </View>

      <StatusBadge
        status={order.status}
      />
    </Pressable>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderItem['status'];
}) {
  let backgroundColor =
    '#FFF4DD';

  let color =
    '#C99B35';

  if (status === 'Preparing') {
    backgroundColor =
      '#EDF8EF';

    color =
      '#65A879';
  }

  if (status === 'Pending') {
    backgroundColor =
      '#FFF0F5';

    color =
      '#D96D94';
  }

  if (status === 'Done') {
    backgroundColor =
      '#EFF0FF';

    color =
      '#7276CF';
  }

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          {
            color,
          },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F5',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F5F6F5',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F6F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * =========================================================
   * HEADER
   * =========================================================
   */

  header: {
    backgroundColor: '#74A485',
    paddingTop: 19,
    paddingHorizontal: 20,
    paddingBottom: 19,
    overflow: 'hidden',
  },

  headerCircleOne: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor:
      'rgba(255,255,255,0.06)',
    top: -90,
    right: -35,
  },

  headerCircleTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor:
      'rgba(255,255,255,0.05)',
    bottom: -75,
    left: -20,
  },

  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  timeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  greetingLabel: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    marginTop: 6,
  },

  shopName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },

  headerMenuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerMenuText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },

  /*
   * =========================================================
   * SUMMARY
   * =========================================================
   */

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  summaryCard: {
    flex: 1,
    minHeight: 78,
    backgroundColor:
      'rgba(255,255,255,0.17)',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },

  summaryLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 9,
    fontWeight: '600',
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },

  summaryMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 8,
    marginTop: 4,
  },

  /*
   * =========================================================
   * CONTENT
   * =========================================================
   */

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 14,
  },

  /*
   * =========================================================
   * STATUS
   * =========================================================
   */

  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },

  statusCard: {
    flex: 1,
    height: 63,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusValue: {
    fontSize: 17,
    fontWeight: '800',
  },

  statusLabel: {
    fontSize: 8,
    marginTop: 4,
  },

  /*
   * =========================================================
   * REVENUE
   * =========================================================
   */

  revenueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginTop: 14,
    elevation: 2,
  },

  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: '#37373A',
    fontSize: 12,
    fontWeight: '800',
  },

  revenueTotal: {
    color: '#6EA382',
    fontSize: 9,
    fontWeight: '700',
  },

  chart: {
    height: 105,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 4,
  },

  chartColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  chartBar: {
    width: 20,
    minHeight: 12,
    backgroundColor: '#83AF90',
    borderRadius: 4,
  },

  chartLabel: {
    color: '#A4A4A6',
    fontSize: 7,
    marginTop: 5,
  },

  /*
   * =========================================================
   * ORDERS
   * =========================================================
   */

  ordersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginTop: 14,
    elevation: 2,
  },

  ordersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  viewAllText: {
    color: '#6EA382',
    fontSize: 9,
    fontWeight: '700',
  },

  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F2',
  },

  orderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F7F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  orderIconText: {
    color: '#8FA29A',
    fontSize: 13,
  },

  orderInfo: {
    flex: 1,
  },

  orderId: {
    color: '#444246',
    fontSize: 10,
    fontWeight: '800',
  },

  orderDescription: {
    color: '#9A979A',
    fontSize: 8,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
  },

  statusBadgeText: {
    fontSize: 7,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.75,
  },

  bottomSpacer: {
    height: 20,
  },

  /*
   * =========================================================
   * BOTTOM NAV
   * =========================================================
   */

  bottomNavigation: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECEEEC',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 4,
  },

  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavIcon: {
    width: 34,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EAF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    color: '#9BA19D',
    fontSize: 16,
  },

  activeNavText: {
    color: '#6EA382',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
  },

  navText: {
    color: '#A4A5A6',
    fontSize: 8,
    marginTop: 4,
  },
});