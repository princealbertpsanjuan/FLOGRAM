import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getStoredUser,
  type AuthUser,
} from '../../services/auth';

const categories = [
  'All',
  'Roses',
  'Tulips',
  'Orchids',
  'Mixed',
];

const occasions = [
  {
    icon: '🎂',
    label: 'Birthday',
  },
  {
    icon: '💖',
    label: 'Romance',
  },
  {
    icon: '💐',
    label: 'Wedding',
  },
  {
    icon: '🕊️',
    label: 'Sympathy',
  },
];

const bouquets = [
  {
    id: '1',
    name: 'Pink Garden',
    price: '₱1,299',
    icon: '💐',
  },
  {
    id: '2',
    name: 'Rose Elegance',
    price: '₱1,499',
    icon: '🌹',
  },
];

export default function CustomerDashboardScreen() {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

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
    user?.firstName || 'Customer';

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
          color="#E55B8E"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={
            styles.scrollContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ===============================================
              HEADER
          =============================================== */}

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.timeText}>
                  9:41
                </Text>

                <Text
                  style={
                    styles.greetingText
                  }
                >
                  Good morning 🌸
                </Text>

                <Text
                  style={styles.userName}
                >
                  {firstName}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <Pressable
                  style={
                    styles.headerIconButton
                  }
                  onPress={() =>
                    handleTemporaryNavigation(
                      'Notifications'
                    )
                  }
                >
                  <Text
                    style={
                      styles.headerIcon
                    }
                  >
                    ♧
                  </Text>

                  <View
                    style={
                      styles.notificationBadge
                    }
                  >
                    <Text
                      style={
                        styles.notificationBadgeText
                      }
                    >
                      3
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>

            {/* SEARCH */}

            <View
              style={styles.searchRow}
            >
              <View
                style={
                  styles.searchContainer
                }
              >
                <Text
                  style={styles.searchIcon}
                >
                  ⌕
                </Text>

                <TextInput
                  style={styles.searchInput}
                  placeholder="Search flowers, bouquets..."
                  placeholderTextColor="#C5C0C3"
                  value={search}
                  onChangeText={setSearch}
                />

                <Pressable
                  onPress={() =>
                    handleTemporaryNavigation(
                      'Image Search'
                    )
                  }
                >
                  <Text
                    style={
                      styles.cameraIcon
                    }
                  >
                    ◎
                  </Text>
                </Pressable>
              </View>

              <Pressable
                style={styles.filterButton}
                onPress={() =>
                  handleTemporaryNavigation(
                    'Filters'
                  )
                }
              >
                <Text
                  style={styles.filterIcon}
                >
                  ✣
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ===============================================
              PROMOTIONAL BANNER
          =============================================== */}

          <View style={styles.banner}>
            <View
              style={styles.bannerCircleOne}
            />

            <View
              style={styles.bannerCircleTwo}
            />

            <View style={styles.bannerContent}>
              <Text style={styles.offerText}>
                LIMITED TIME OFFER
              </Text>

              <Text
                style={styles.bannerTitle}
              >
                Say it with{'\n'}
                Fresh Flowers
              </Text>

              <Pressable
                style={styles.shopButton}
                onPress={() =>
                  handleTemporaryNavigation(
                    'Flower Shop'
                  )
                }
              >
                <Text
                  style={
                    styles.shopButtonText
                  }
                >
                  Shop Now →
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.deliveryBadge
              }
            >
              <Text
                style={
                  styles.deliveryBadgeText
                }
              >
                🚚 Free delivery today
              </Text>
            </View>

            <Text
              style={styles.bannerFlower}
            >
              🌿
            </Text>
          </View>

          {/* ===============================================
              FLOWER CATEGORIES
          =============================================== */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.categoryContainer
            }
          >
            {categories.map(
              (category) => {
                const selected =
                  selectedCategory ===
                  category;

                return (
                  <Pressable
                    key={category}
                    style={[
                      styles.categoryButton,

                      selected &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setSelectedCategory(
                        category
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.categoryText,

                        selected &&
                          styles.categoryTextActive,
                      ]}
                    >
                      {category}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </ScrollView>

          {/* ===============================================
              OCCASIONS
          =============================================== */}

          <View style={styles.occasionRow}>
            {occasions.map(
              (occasion) => (
                <Pressable
                  key={occasion.label}
                  style={
                    styles.occasionCard
                  }
                  onPress={() =>
                    handleTemporaryNavigation(
                      occasion.label
                    )
                  }
                >
                  <Text
                    style={
                      styles.occasionIcon
                    }
                  >
                    {occasion.icon}
                  </Text>

                  <Text
                    style={
                      styles.occasionLabel
                    }
                  >
                    {occasion.label}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* ===============================================
              TRENDING BOUQUETS
          =============================================== */}

          <View style={styles.sectionHeader}>
            <Text
              style={styles.sectionTitle}
            >
              Trending Bouquets
            </Text>

            <Pressable
              onPress={() =>
                handleTemporaryNavigation(
                  'Trending Bouquets'
                )
              }
            >
              <Text
                style={styles.viewAllText}
              >
                View All →
              </Text>
            </Pressable>
          </View>

          <View style={styles.bouquetRow}>
            {bouquets.map(
              (bouquet) => (
                <Pressable
                  key={bouquet.id}
                  style={
                    styles.bouquetCard
                  }
                  onPress={() =>
                    handleTemporaryNavigation(
                      bouquet.name
                    )
                  }
                >
                  <View
                    style={
                      styles.bouquetImage
                    }
                  >
                    <Text
                      style={
                        styles.bouquetEmoji
                      }
                    >
                      {bouquet.icon}
                    </Text>

                    <Pressable
                      style={
                        styles.favoriteButton
                      }
                      onPress={() =>
                        Alert.alert(
                          'Favorites',
                          `${bouquet.name} added to favorites.`
                        )
                      }
                    >
                      <Text
                        style={
                          styles.favoriteIcon
                        }
                      >
                        ♡
                      </Text>
                    </Pressable>
                  </View>

                  <Text
                    style={
                      styles.bouquetName
                    }
                    numberOfLines={1}
                  >
                    {bouquet.name}
                  </Text>

                  <Text
                    style={
                      styles.bouquetPrice
                    }
                  >
                    {bouquet.price}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          <View
            style={styles.bottomSpacer}
          />
        </ScrollView>

        {/* ===============================================
            BOTTOM NAVIGATION
        =============================================== */}

        <View
          style={styles.bottomNavigation}
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
              Home
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Discover'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ⌕
            </Text>

            <Text
              style={styles.navText}
            >
              Discover
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Bloom'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ✣
            </Text>

            <Text
              style={styles.navText}
            >
              Bloom
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'Cart'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              🛒
            </Text>

            <Text
              style={styles.navText}
            >
              Cart
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'AI'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ◯
            </Text>

            <Text
              style={styles.navText}
            >
              AI
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={() =>
              handleTemporaryNavigation(
                'My Profile'
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
              Me
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 17,
    paddingTop: 15,
  },

  /*
   * HEADER
   */

  header: {
    marginBottom: 15,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  timeText: {
    color: '#59515A',
    fontSize: 9,
    fontWeight: '700',
  },

  greetingText: {
    color: '#A59CA2',
    fontSize: 10,
    marginTop: 8,
  },

  userName: {
    color: '#413A40',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIcon: {
    color: '#DF628F',
    fontSize: 18,
  },

  notificationBadge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#DE5A8B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },

  /*
   * SEARCH
   */

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 8,
  },

  searchContainer: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FAF9FA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  searchIcon: {
    color: '#B7B1B5',
    fontSize: 17,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    color: '#494249',
    fontSize: 11,
    padding: 0,
  },

  cameraIcon: {
    color: '#DC648F',
    fontSize: 17,
  },

  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DE6692',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterIcon: {
    color: '#FFFFFF',
    fontSize: 15,
  },

  /*
   * BANNER
   */

  banner: {
    height: 147,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F5E5E9',
    padding: 17,
  },

  bannerCircleOne: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#8B545E',
    right: -40,
    bottom: -45,
    opacity: 0.85,
  },

  bannerCircleTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    right: 55,
    bottom: -70,
    opacity: 0.3,
  },

  bannerContent: {
    zIndex: 2,
  },

  offerText: {
    color: '#D55E86',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  bannerTitle: {
    color: '#48353B',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    marginTop: 5,
  },

  shopButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#E35E8E',
    paddingHorizontal: 15,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  deliveryBadge: {
    position: 'absolute',
    top: 12,
    right: 10,
    zIndex: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  deliveryBadgeText: {
    color: '#7B817A',
    fontSize: 7,
    fontWeight: '600',
  },

  bannerFlower: {
    position: 'absolute',
    right: 29,
    bottom: 13,
    fontSize: 60,
    opacity: 0.65,
  },

  /*
   * CATEGORIES
   */

  categoryContainer: {
    gap: 8,
    paddingVertical: 13,
  },

  categoryButton: {
    height: 31,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#F8F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryButtonActive: {
    backgroundColor: '#E55E90',
  },

  categoryText: {
    color: '#827B80',
    fontSize: 9,
    fontWeight: '600',
  },

  categoryTextActive: {
    color: '#FFFFFF',
  },

  /*
   * OCCASIONS
   */

  occasionRow: {
    flexDirection: 'row',
    gap: 8,
  },

  occasionCard: {
    flex: 1,
    height: 67,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1EFF0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },

  occasionIcon: {
    fontSize: 21,
  },

  occasionLabel: {
    color: '#777077',
    fontSize: 8,
    marginTop: 5,
  },

  /*
   * TRENDING
   */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 17,
    marginBottom: 9,
  },

  sectionTitle: {
    color: '#403A40',
    fontSize: 13,
    fontWeight: '800',
  },

  viewAllText: {
    color: '#DB5D8B',
    fontSize: 9,
    fontWeight: '700',
  },

  bouquetRow: {
    flexDirection: 'row',
    gap: 10,
  },

  bouquetCard: {
    flex: 1,
  },

  bouquetImage: {
    height: 120,
    borderRadius: 16,
    backgroundColor: '#F7E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  bouquetEmoji: {
    fontSize: 56,
  },

  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  favoriteIcon: {
    color: '#DF5B8B',
    fontSize: 16,
  },

  bouquetName: {
    color: '#4A4348',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 7,
  },

  bouquetPrice: {
    color: '#DE5D8B',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
  },

  bottomSpacer: {
    height: 20,
  },

  /*
   * BOTTOM NAVIGATION
   */

  bottomNavigation: {
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EDEF',
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
    backgroundColor: '#FFE8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeNavSymbol: {
    color: '#DF5D8D',
    fontSize: 16,
  },

  navIcon: {
    color: '#A5A0A4',
    fontSize: 16,
  },

  activeNavText: {
    color: '#DF5D8D',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 3,
  },

  navText: {
    color: '#A7A1A5',
    fontSize: 8,
    marginTop: 4,
  },
});