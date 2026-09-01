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

type VerificationItem = {
  id: string;
  name: string;
  type: string;
  time: string;
  initial: string;
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type:
    | 'seller'
    | 'order'
    | 'payment'
    | 'rider';
};

const pendingVerifications: VerificationItem[] = [
  {
    id: '1',
    name: 'Bloom Garden Co.',
    type: 'Seller Application',
    time: '2h ago',
    initial: 'B',
  },
  {
    id: '2',
    name: 'Pedro T. Santos',
    type: 'Rider Application',
    time: '4h ago',
    initial: 'P',
  },
];

const activities: ActivityItem[] = [
  {
    id: '1',
    title: 'New seller registered',
    subtitle: 'Petals & More, Quezon City',
    time: '5 min',
    type: 'seller',
  },
  {
    id: '2',
    title: 'Order dispute filed',
    subtitle: '#FLG-4488 — Customer refund',
    time: '12 min',
    type: 'order',
  },
  {
    id: '3',
    title: 'Payment processed',
    subtitle: 'GCash batch — ₱12,450',
    time: '18 min',
    type: 'payment',
  },
  {
    id: '4',
    title: 'Rider verified',
    subtitle: 'Ana Santos, Makati City',
    time: '1 hr',
    type: 'rider',
  },
];

export default function AdminDashboardScreen() {
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
    user?.firstName || 'Admin';

  const handleTemporaryNavigation = (
    screen: string
  ) => {
    Alert.alert(
      screen,
      `${screen} screen will be connected next.`
    );
  };

  const handleVerification = (
    item: VerificationItem,
    action: 'approve' | 'reject'
  ) => {
    Alert.alert(
      action === 'approve'
        ? 'Approve Application'
        : 'Reject Application',
      `${action === 'approve'
        ? 'Approve'
        : 'Reject'
      } ${item.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text:
            action === 'approve'
              ? 'Approve'
              : 'Reject',

          style:
            action === 'reject'
              ? 'destructive'
              : 'default',

          onPress: () => {
            Alert.alert(
              'Pending Backend Connection',
              'Verification API will be connected to this action next.'
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <ActivityIndicator
          size="large"
          color="#5552B9"
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
          <View
            style={styles.headerCircleOne}
          />

          <View
            style={styles.headerCircleTwo}
          />

          <View style={styles.headerTop}>
            <View>
              <Text style={styles.timeText}>
                9:41
              </Text>

              <Text
                style={
                  styles.systemOverview
                }
              >
                System Overview
              </Text>

              <Text style={styles.title}>
                Admin Dashboard
              </Text>

              <Text style={styles.welcomeText}>
                Welcome, {firstName}
              </Text>
            </View>

            <Pressable
              style={styles.headerMenu}
              onPress={() =>
                handleTemporaryNavigation(
                  'Admin Menu'
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

          {/* ===================================================
              SUMMARY
          =================================================== */}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Daily Revenue
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                ₱84,200
              </Text>

              <Text
                style={
                  styles.positiveText
                }
              >
                +18% vs yesterday
              </Text>
            </View>

            <View style={styles.summaryCard}>
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
                234
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                Live right now
              </Text>
            </View>

            <View style={styles.summaryCard}>
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
                12,847
              </Text>

              <Text
                style={
                  styles.positiveText
                }
              >
                +412 today
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text
                style={
                  styles.summaryLabel
                }
              >
                Platform Uptime
              </Text>

              <Text
                style={
                  styles.summaryValue
                }
              >
                99.8%
              </Text>

              <Text
                style={
                  styles.summaryMeta
                }
              >
                All systems go
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            CONTENT
        ===================================================== */}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ===================================================
              PENDING VERIFICATIONS
          =================================================== */}

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
              <Text
                style={
                  styles.sectionTitle
                }
              >
                Pending Verifications
              </Text>

              <View
                style={styles.countBadge}
              >
                <Text
                  style={
                    styles.countText
                  }
                >
                  7
                </Text>
              </View>
            </View>

            {pendingVerifications.map(
              (item) => (
                <View
                  key={item.id}
                  style={
                    styles.verificationRow
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
                      {item.initial}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.verificationInfo
                    }
                  >
                    <Text
                      style={
                        styles.verificationName
                      }
                    >
                      {item.name}
                    </Text>

                    <Text
                      style={
                        styles.verificationMeta
                      }
                    >
                      {item.type} • {item.time}
                    </Text>
                  </View>

                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.approveButton,
                    ]}
                    onPress={() =>
                      handleVerification(
                        item,
                        'approve'
                      )
                    }
                  >
                    <Text
                      style={
                        styles.approveText
                      }
                    >
                      ✓
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.rejectButton,
                    ]}
                    onPress={() =>
                      handleVerification(
                        item,
                        'reject'
                      )
                    }
                  >
                    <Text
                      style={
                        styles.rejectText
                      }
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              )
            )}
          </View>

          {/* ===================================================
              STAKEHOLDER COUNTS
          =================================================== */}

          <View style={styles.userStatsRow}>
            <View
              style={[
                styles.userStatCard,
                styles.customerCard,
              ]}
            >
              <Text
                style={
                  styles.customerValue
                }
              >
                9,241
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Customers
              </Text>
            </View>

            <View
              style={[
                styles.userStatCard,
                styles.sellerCard,
              ]}
            >
              <Text
                style={
                  styles.sellerValue
                }
              >
                847
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Sellers
              </Text>
            </View>

            <View
              style={[
                styles.userStatCard,
                styles.riderCard,
              ]}
            >
              <Text
                style={
                  styles.riderValue
                }
              >
                312
              </Text>

              <Text
                style={
                  styles.userStatLabel
                }
              >
                Riders
              </Text>
            </View>
          </View>

          {/* ===================================================
              SYSTEM ACTIVITY
          =================================================== */}

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
              System Activity Log
            </Text>

            {activities.map(
              (activity) => (
                <ActivityRow
                  key={activity.id}
                  item={activity}
                />
              )
            )}
          </View>

          <View
            style={styles.bottomSpacer}
          />
        </ScrollView>

        {/* =====================================================
            BOTTOM NAVIGATION
        ===================================================== */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <Pressable
            style={styles.navItem}
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
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Users'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ♙
            </Text>

            <Text
              style={styles.navText}
            >
              Users
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
            <Text
              style={styles.navIcon}
            >
              ◈
            </Text>

            <Text
              style={styles.navText}
            >
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
            <Text
              style={styles.navIcon}
            >
              ▥
            </Text>

            <Text
              style={styles.navText}
            >
              Reports
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Settings'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ⚙
            </Text>

            <Text
              style={styles.navText}
            >
              Settings
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ActivityRow({
  item,
}: {
  item: ActivityItem;
}) {
  const getColor = () => {
    switch (item.type) {
      case 'seller':
        return '#70B889';

      case 'order':
        return '#E56391';

      case 'payment':
        return '#D9A536';

      case 'rider':
        return '#70B889';

      default:
        return '#777777';
    }
  };

  return (
    <View style={styles.activityRow}>
      <View
        style={[
          styles.activityDot,
          {
            backgroundColor:
              getColor(),
          },
        ]}
      />

      <View
        style={styles.activityInfo}
      >
        <Text
          style={styles.activityTitle}
        >
          {item.title}
        </Text>

        <Text
          style={
            styles.activitySubtitle
          }
        >
          {item.subtitle}
        </Text>
      </View>

      <Text style={styles.activityTime}>
        {item.time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /*
   * =========================================================
   * SCREEN
   * =========================================================
   */

  container: {
    flex: 1,
    backgroundColor: '#F5F5F8',
  },

  screen: {
    flex: 1,
    backgroundColor: '#F5F5F8',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /*
   * =========================================================
   * HEADER
   * =========================================================
   */

  header: {
    backgroundColor: '#24245D',
    paddingHorizontal: 19,
    paddingTop: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },

  headerCircleOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor:
      'rgba(255,255,255,0.035)',
    top: -100,
    right: -55,
  },

  headerCircleTwo: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor:
      'rgba(255,255,255,0.025)',
    bottom: -80,
    left: -45,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  timeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  systemOverview: {
    color: '#A8A8CA',
    fontSize: 9,
    marginTop: 6,
  },

  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },

  welcomeText: {
    color: '#A8A8CA',
    fontSize: 8,
    marginTop: 3,
  },

  headerMenu: {
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

  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 15,
  },

  summaryCard: {
    width: '48.5%',
    minHeight: 68,
    backgroundColor: '#3A3975',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },

  summaryLabel: {
    color: '#B8B8D3',
    fontSize: 8,
  },

  summaryValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 3,
  },

  positiveText: {
    color: '#76CE9B',
    fontSize: 7,
    marginTop: 4,
  },

  summaryMeta: {
    color: '#B8B8D3',
    fontSize: 7,
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
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /*
   * =========================================================
   * VERIFICATIONS
   * =========================================================
   */

  verificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 13,
    elevation: 2,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  sectionTitle: {
    color: '#3B3940',
    fontSize: 11,
    fontWeight: '800',
  },

  countBadge: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: '#E96291',
    alignItems: 'center',
    justifyContent: 'center',
  },

  countText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },

  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2F2F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  avatarText: {
    color: '#81818A',
    fontSize: 10,
    fontWeight: '700',
  },

  verificationInfo: {
    flex: 1,
  },

  verificationName: {
    color: '#4A474D',
    fontSize: 9,
    fontWeight: '700',
  },

  verificationMeta: {
    color: '#AAA7AC',
    fontSize: 7,
    marginTop: 3,
  },

  actionButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },

  approveButton: {
    backgroundColor: '#EDF9F1',
  },

  approveText: {
    color: '#6FC389',
    fontSize: 13,
    fontWeight: '800',
  },

  rejectButton: {
    backgroundColor: '#FFF0F3',
  },

  rejectText: {
    color: '#E16B8F',
    fontSize: 15,
  },

  /*
   * =========================================================
   * USER COUNTS
   * =========================================================
   */

  userStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },

  userStatCard: {
    flex: 1,
    height: 61,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  customerCard: {
    backgroundColor: '#FFE7EF',
  },

  sellerCard: {
    backgroundColor: '#EAF7EF',
  },

  riderCard: {
    backgroundColor: '#FFF2D8',
  },

  customerValue: {
    color: '#DF6E94',
    fontSize: 16,
    fontWeight: '800',
  },

  sellerValue: {
    color: '#6AA880',
    fontSize: 16,
    fontWeight: '800',
  },

  riderValue: {
    color: '#D49B35',
    fontSize: 16,
    fontWeight: '800',
  },

  userStatLabel: {
    color: '#99949A',
    fontSize: 7,
    marginTop: 4,
  },

  /*
   * =========================================================
   * ACTIVITY
   * =========================================================
   */

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 13,
    marginTop: 13,
    elevation: 2,
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 43,
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
    color: '#4A474D',
    fontSize: 8,
    fontWeight: '700',
  },

  activitySubtitle: {
    color: '#AAA7AC',
    fontSize: 7,
    marginTop: 2,
  },

  activityTime: {
    color: '#B6B3B7',
    fontSize: 7,
  },

  bottomSpacer: {
    height: 20,
  },

  /*
   * =========================================================
   * BOTTOM NAVIGATION
   * =========================================================
   */

  bottomNavigation: {
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECF0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 3,
  },

  navItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavIcon: {
    width: 34,
    height: 29,
    borderRadius: 15,
    backgroundColor: '#ECECFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavSymbol: {
    color: '#5652C9',
    fontSize: 16,
  },

  navIcon: {
    color: '#9A99A4',
    fontSize: 16,
  },

  activeNavText: {
    color: '#5652C9',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
  },

  navText: {
    color: '#9D9CA5',
    fontSize: 8,
    marginTop: 4,
  },
});