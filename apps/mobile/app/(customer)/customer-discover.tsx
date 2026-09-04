import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
} from 'expo-router';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  apiRequest,
} from '../../services/api';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type FloristAddress = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

type FlowerFlorist = {
  _id: string;
  shopName: string;
  address?: FloristAddress;
};

type FlowerListing = {
  _id: string;
  seller: string;
  florist: FlowerFlorist | null;
  name: string;
  description: string;
  price: number;
  category: string;
  occasion: string[];
  flowerTypes: string[];
  colors: string[];
  images: string[];
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PublicFlowersResponse = {
  success: boolean;
  message: string;

  data: {
    count: number;
    flowers: FlowerListing[];
  };
};

/*
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? '';

const PRICE_OPTIONS = [
  {
    label: 'Any Price',
    minPrice: undefined,
    maxPrice: undefined,
  },

  {
    label: 'Under ₱1,000',
    minPrice: undefined,
    maxPrice: 1000,
  },

  {
    label: '₱1,000 - ₱1,500',
    minPrice: 1000,
    maxPrice: 1500,
  },

  {
    label: '₱1,500 - ₱2,000',
    minPrice: 1500,
    maxPrice: 2000,
  },

  {
    label: '₱2,000+',
    minPrice: 2000,
    maxPrice: undefined,
  },
];

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getServerUrl = () => {
  return API_URL.replace(
    /\/api\/v1\/?$/,
    ''
  );
};

const getImageUrl = (
  imagePath?: string | null
) => {
  if (!imagePath) {
    return null;
  }

  if (
    imagePath.startsWith('http://') ||
    imagePath.startsWith('https://')
  ) {
    return imagePath;
  }

  const serverUrl =
    getServerUrl();

  const normalizedPath =
    imagePath.startsWith('/')
      ? imagePath
      : `/${imagePath}`;

  return `${serverUrl}${normalizedPath}`;
};

const formatPrice = (
  price: number
) => {
  return `₱${price.toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
};

const pluralizeFlowerType = (
  value: string
) => {
  if (
    value
      .toLowerCase()
      .endsWith('s')
  ) {
    return value;
  }

  return `${value}s`;
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerDiscoverScreen() {
  const [
    flowers,
    setFlowers,
  ] =
    useState<FlowerListing[]>(
      []
    );

  /*
   * Unfiltered listings are also kept so
   * available filter choices can be derived
   * from real Seller listings.
   */
  const [
    marketplaceFlowers,
    setMarketplaceFlowers,
  ] =
    useState<FlowerListing[]>(
      []
    );

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    selectedFlowerType,
    setSelectedFlowerType,
  ] =
    useState('All');

  const [
    selectedOccasion,
    setSelectedOccasion,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedColor,
    setSelectedColor,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedPriceIndex,
    setSelectedPriceIndex,
  ] =
    useState(0);

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
    useState<string | null>(
      null
    );

  const [
    filterVisible,
    setFilterVisible,
  ] =
    useState(false);

  /*
   * =========================================================
   * FETCH FLOWERS
   * =========================================================
   */

  const fetchFlowers =
    useCallback(
      async (
        options?: {
          search?: string;
          flowerType?: string;
          occasion?: string;
          color?: string;
          minPrice?: number;
          maxPrice?: number;
        }
      ) => {
        const params =
          new URLSearchParams();

        if (
          options?.search?.trim()
        ) {
          params.append(
            'search',
            options.search.trim()
          );
        }

        if (
          options?.flowerType &&
          options.flowerType !==
            'All'
        ) {
          params.append(
            'flowerType',
            options.flowerType
          );
        }

        if (
          options?.occasion
        ) {
          params.append(
            'occasion',
            options.occasion
          );
        }

        if (
          options?.color
        ) {
          params.append(
            'color',
            options.color
          );
        }

        if (
          options?.minPrice !==
          undefined
        ) {
          params.append(
            'minPrice',
            String(
              options.minPrice
            )
          );
        }

        if (
          options?.maxPrice !==
          undefined
        ) {
          params.append(
            'maxPrice',
            String(
              options.maxPrice
            )
          );
        }

        const query =
          params.toString();

        const response =
          await apiRequest<PublicFlowersResponse>(
            query
              ? `/flowers?${query}`
              : '/flowers',
            {
              method: 'GET',
            }
          );

        return response.data.flowers;
      },
      []
    );

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */

  const loadDiscover =
    useCallback(
      async (
        isRefresh = false
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          const result =
            await fetchFlowers();

          setFlowers(result);

          setMarketplaceFlowers(
            result
          );
        } catch (loadError) {
          console.error(
            'Discover Error:',
            loadError
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load flowers.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [fetchFlowers]
    );

  useEffect(() => {
    loadDiscover();
  }, [loadDiscover]);

  /*
   * =========================================================
   * REAL FLOWER TYPES
   * =========================================================
   */

  const flowerTypes =
    useMemo(() => {
      const values =
        marketplaceFlowers
          .flatMap(
            (flower) =>
              flower.flowerTypes ??
              []
          )
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      return [
        'All',
        ...Array.from(
          new Set(values)
        ),
      ];
    }, [
      marketplaceFlowers,
    ]);

  /*
   * =========================================================
   * REAL OCCASIONS
   * =========================================================
   */

  const occasions =
    useMemo(() => {
      const values =
        marketplaceFlowers
          .flatMap(
            (flower) =>
              flower.occasion ??
              []
          )
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      return Array.from(
        new Set(values)
      );
    }, [
      marketplaceFlowers,
    ]);

  /*
   * =========================================================
   * REAL COLORS
   * =========================================================
   */

  const colors =
    useMemo(() => {
      const values =
        marketplaceFlowers
          .flatMap(
            (flower) =>
              flower.colors ?? []
          )
          .map(
            (value) =>
              value.trim()
          )
          .filter(Boolean);

      return Array.from(
        new Set(values)
      );
    }, [
      marketplaceFlowers,
    ]);

  /*
   * =========================================================
   * APPLY ALL FILTERS
   * =========================================================
   */

  const applyFilters =
    async (
      overrides?: {
        search?: string;
        flowerType?: string;
        occasion?: string | null;
        color?: string | null;
        priceIndex?: number;
      }
    ) => {
      try {
        setLoading(true);
        setError(null);

        const effectiveSearch =
          overrides?.search ??
          search;

        const effectiveFlowerType =
          overrides?.flowerType ??
          selectedFlowerType;

        const effectiveOccasion =
          overrides?.occasion !==
          undefined
            ? overrides.occasion
            : selectedOccasion;

        const effectiveColor =
          overrides?.color !==
          undefined
            ? overrides.color
            : selectedColor;

        const effectivePriceIndex =
          overrides?.priceIndex ??
          selectedPriceIndex;

        const price =
          PRICE_OPTIONS[
            effectivePriceIndex
          ];

        const result =
          await fetchFlowers({
            search:
              effectiveSearch,

            flowerType:
              effectiveFlowerType,

            occasion:
              effectiveOccasion ??
              undefined,

            color:
              effectiveColor ??
              undefined,

            minPrice:
              price.minPrice,

            maxPrice:
              price.maxPrice,
          });

        setFlowers(result);
      } catch (
        filterError
      ) {
        console.error(
          'Discover Filter Error:',
          filterError
        );

        setError(
          filterError instanceof Error
            ? filterError.message
            : 'Unable to filter flowers.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * =========================================================
   * SEARCH
   * =========================================================
   */

  const handleSearch =
    async () => {
      await applyFilters({
        search,
      });
    };

  /*
   * =========================================================
   * FLOWER TYPE
   * =========================================================
   */

  const handleFlowerType =
    async (
      flowerType: string
    ) => {
      setSelectedFlowerType(
        flowerType
      );

      await applyFilters({
        flowerType,
      });
    };

  /*
   * =========================================================
   * OCCASION
   * =========================================================
   */

  const handleOccasion =
    async (
      occasion: string
    ) => {
      const newOccasion =
        selectedOccasion ===
        occasion
          ? null
          : occasion;

      setSelectedOccasion(
        newOccasion
      );

      await applyFilters({
        occasion:
          newOccasion,
      });
    };

  /*
   * =========================================================
   * APPLY ADVANCED FILTER
   * =========================================================
   */

  const handleApplyAdvancedFilters =
    async () => {
      setFilterVisible(false);

      await applyFilters();
    };

  /*
   * =========================================================
   * RESET FILTERS
   * =========================================================
   */

  const handleResetFilters =
    async () => {
      setSearch('');

      setSelectedFlowerType(
        'All'
      );

      setSelectedOccasion(
        null
      );

      setSelectedColor(
        null
      );

      setSelectedPriceIndex(
        0
      );

      setFilterVisible(false);

      try {
        setLoading(true);
        setError(null);

        const result =
          await fetchFlowers();

        setFlowers(result);
      } catch (
        resetError
      ) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : 'Unable to reset filters.'
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * =========================================================
   * PRODUCT DETAILS
   * =========================================================
   */

  const handleFlowerPress = (
    flower: FlowerListing
  ) => {
    router.push({
      pathname:
        '/(customer)/customer-product-details',

      params: {
        flowerId:
          flower._id,
      },
    });
  };

  /*
   * =========================================================
   * IMAGE SEARCH
   * =========================================================
   *
   * Backend support already exists.
   * We will connect Expo Image Picker
   * when we implement image search.
   * =========================================================
   */

  const handleImageSearch =
    () => {
      Alert.alert(
        'Image Search',
        'Image-based bouquet search will be connected to the existing FLOGRAM image-search backend.'
      );
    };

  /*
   * =========================================================
   * ACTIVE FILTER COUNT
   * =========================================================
   */

  const activeFilterCount =
    [
      selectedFlowerType !==
        'All',

      Boolean(
        selectedOccasion
      ),

      Boolean(
        selectedColor
      ),

      selectedPriceIndex !==
        0,
    ].filter(Boolean).length;

  /*
   * =========================================================
   * INITIAL LOADING
   * =========================================================
   */

  if (
    loading &&
    marketplaceFlowers.length ===
      0 &&
    !error
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#E55D8D"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Discovering flowers...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * =========================================================
   * RENDER
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
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={() =>
                loadDiscover(
                  true
                )
              }
              tintColor="#E55D8D"
              colors={[
                '#E55D8D',
              ]}
            />
          }
        >
          {/* ================================================
              HEADER
          ================================================ */}

          <View
            style={
              styles.header
            }
          >
            <Text
              style={
                styles.pageTitle
              }
            >
              Discover
            </Text>

            <Text
              style={
                styles.pageSubtitle
              }
            >
              Find the perfect
              bouquet for every
              moment
            </Text>
          </View>

          {/* ================================================
              SEARCH BAR
          ================================================ */}

          <View
            style={
              styles.searchRow
            }
          >
            <View
              style={
                styles.searchContainer
              }
            >
              <Ionicons
                name="search-outline"
                size={19}
                color="#B4ADB1"
              />

              <TextInput
                style={
                  styles.searchInput
                }
                value={search}
                onChangeText={
                  setSearch
                }
                placeholder="Search flowers, bouquets..."
                placeholderTextColor="#B5AEB2"
                returnKeyType="search"
                onSubmitEditing={
                  handleSearch
                }
              />

              {search.length >
                0 && (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setSearch('');

                    applyFilters({
                      search: '',
                    });
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color="#C7C0C4"
                  />
                </Pressable>
              )}

              <Pressable
                style={
                  styles.cameraButton
                }
                onPress={
                  handleImageSearch
                }
                hitSlop={8}
              >
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color="#DE628F"
                />
              </Pressable>
            </View>

            <Pressable
              style={
                styles.filterButton
              }
              onPress={() =>
                setFilterVisible(
                  true
                )
              }
            >
              <Ionicons
                name="options-outline"
                size={20}
                color="#FFFFFF"
              />

              {activeFilterCount >
                0 && (
                <View
                  style={
                    styles.filterBadge
                  }
                >
                  <Text
                    style={
                      styles.filterBadgeText
                    }
                  >
                    {
                      activeFilterCount
                    }
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ================================================
              FLOWER TYPE CHIPS
          ================================================ */}

          {flowerTypes.length >
            1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              style={
                styles.typeScroll
              }
              contentContainerStyle={
                styles.typeContainer
              }
            >
              {flowerTypes.map(
                (
                  flowerType
                ) => {
                  const selected =
                    selectedFlowerType ===
                    flowerType;

                  return (
                    <Pressable
                      key={
                        flowerType
                      }
                      style={[
                        styles.typeChip,

                        selected &&
                          styles.typeChipActive,
                      ]}
                      onPress={() =>
                        handleFlowerType(
                          flowerType
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.typeChipText,

                          selected &&
                            styles.typeChipTextActive,
                        ]}
                      >
                        {flowerType ===
                        'All'
                          ? 'All'
                          : pluralizeFlowerType(
                              flowerType
                            )}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </ScrollView>
          )}

          {/* ================================================
              BROWSE BY OCCASION
          ================================================ */}

          {occasions.length >
            0 && (
            <View
              style={
                styles.occasionSection
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
                      styles.sectionEyebrow
                    }
                  >
                    FIND YOUR MOMENT
                  </Text>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Browse by Occasion
                  </Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                style={
                  styles.occasionScroll
                }
                contentContainerStyle={
                  styles.occasionContainer
                }
              >
                {occasions.map(
                  (
                    occasion
                  ) => {
                    const selected =
                      selectedOccasion ===
                      occasion;

                    return (
                      <Pressable
                        key={
                          occasion
                        }
                        style={[
                          styles.occasionChip,

                          selected &&
                            styles.occasionChipActive,
                        ]}
                        onPress={() =>
                          handleOccasion(
                            occasion
                          )
                        }
                      >
                        <Ionicons
                          name={
                            selected
                              ? 'flower'
                              : 'flower-outline'
                          }
                          size={14}
                          color={
                            selected
                              ? '#FFFFFF'
                              : '#D95E8A'
                          }
                        />

                        <Text
                          style={[
                            styles.occasionChipText,

                            selected &&
                              styles.occasionChipTextActive,
                          ]}
                        >
                          {
                            occasion
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </ScrollView>
            </View>
          )}

          {/* ================================================
              RESULTS HEADER
          ================================================ */}

          <View
            style={
              styles.resultsHeader
            }
          >
            <View>
              <Text
                style={
                  styles.resultsTitle
                }
              >
                {search.trim()
                  ? 'Search Results'
                  : selectedOccasion
                    ? `${selectedOccasion} Flowers`
                    : selectedFlowerType !==
                        'All'
                      ? pluralizeFlowerType(
                          selectedFlowerType
                        )
                      : 'All Bouquets'}
              </Text>

              <Text
                style={
                  styles.resultsCount
                }
              >
                {flowers.length}{' '}
                {flowers.length ===
                1
                  ? 'flower'
                  : 'flowers'}{' '}
                found
              </Text>
            </View>

            {activeFilterCount >
              0 && (
              <Pressable
                onPress={
                  handleResetFilters
                }
                hitSlop={8}
              >
                <Text
                  style={
                    styles.clearText
                  }
                >
                  Clear
                </Text>
              </Pressable>
            )}
          </View>

          {/* ================================================
              INLINE LOADING
          ================================================ */}

          {loading &&
            marketplaceFlowers.length >
              0 && (
              <View
                style={
                  styles.inlineLoading
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#E55D8D"
                />

                <Text
                  style={
                    styles.inlineLoadingText
                  }
                >
                  Updating results...
                </Text>
              </View>
            )}

          {/* ================================================
              ERROR
          ================================================ */}

          {!loading &&
            error && (
              <View
                style={
                  styles.messageCard
                }
              >
                <View
                  style={
                    styles.messageIcon
                  }
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={29}
                    color="#DF628F"
                  />
                </View>

                <Text
                  style={
                    styles.messageTitle
                  }
                >
                  Unable to load
                  flowers
                </Text>

                <Text
                  style={
                    styles.messageDescription
                  }
                >
                  {error}
                </Text>

                <Pressable
                  style={
                    styles.retryButton
                  }
                  onPress={() =>
                    loadDiscover()
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

          {/* ================================================
              EMPTY
          ================================================ */}

          {!loading &&
            !error &&
            flowers.length ===
              0 && (
              <View
                style={
                  styles.messageCard
                }
              >
                <View
                  style={
                    styles.messageIcon
                  }
                >
                  <Ionicons
                    name="search-outline"
                    size={29}
                    color="#DF628F"
                  />
                </View>

                <Text
                  style={
                    styles.messageTitle
                  }
                >
                  No flowers found
                </Text>

                <Text
                  style={
                    styles.messageDescription
                  }
                >
                  Try another
                  search term or
                  change your
                  filters.
                </Text>

                <Pressable
                  style={
                    styles.retryButton
                  }
                  onPress={
                    handleResetFilters
                  }
                >
                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Show All
                    Flowers
                  </Text>
                </Pressable>
              </View>
            )}

          {/* ================================================
              PRODUCT GRID
          ================================================ */}

          {!error &&
            flowers.length >
              0 && (
              <View
                style={
                  styles.productGrid
                }
              >
                {flowers.map(
                  (
                    flower
                  ) => {
                    const imageUrl =
                      getImageUrl(
                        flower
                          .images?.[0]
                      );

                    return (
                      <Pressable
                        key={
                          flower._id
                        }
                        style={
                          styles.productCard
                        }
                        onPress={() =>
                          handleFlowerPress(
                            flower
                          )
                        }
                      >
                        {/* IMAGE */}

                        <View
                          style={
                            styles.productImageContainer
                          }
                        >
                          {imageUrl ? (
                            <Image
                              source={{
                                uri:
                                  imageUrl,
                              }}
                              style={
                                styles.productImage
                              }
                              resizeMode="cover"
                            />
                          ) : (
                            <View
                              style={
                                styles.productImageFallback
                              }
                            >
                              <Ionicons
                                name="flower-outline"
                                size={48}
                                color="#DC87A5"
                              />

                              <Text
                                style={
                                  styles.noImageText
                                }
                              >
                                No image
                              </Text>
                            </View>
                          )}

                          <View
                            style={
                              styles.availableBadge
                            }
                          >
                            <View
                              style={
                                styles.availableDot
                              }
                            />

                            <Text
                              style={
                                styles.availableText
                              }
                            >
                              Available
                            </Text>
                          </View>
                        </View>

                        {/* PRODUCT INFO */}

                        <View
                          style={
                            styles.productInfo
                          }
                        >
                          <Text
                            style={
                              styles.shopName
                            }
                            numberOfLines={
                              1
                            }
                          >
                            {flower
                              .florist
                              ?.shopName ??
                              'FLOGRAM Florist'}
                          </Text>

                          <Text
                            style={
                              styles.productName
                            }
                            numberOfLines={
                              2
                            }
                          >
                            {
                              flower.name
                            }
                          </Text>

                          {flower
                            .flowerTypes
                            ?.length >
                            0 && (
                            <Text
                              style={
                                styles.productType
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {flower.flowerTypes.join(
                                ' • '
                              )}
                            </Text>
                          )}

                          <View
                            style={
                              styles.productFooter
                            }
                          >
                            <Text
                              style={
                                styles.productPrice
                              }
                            >
                              {formatPrice(
                                flower.price
                              )}
                            </Text>

                            <View
                              style={
                                styles.productArrow
                              }
                            >
                              <Ionicons
                                name="chevron-forward"
                                size={13}
                                color="#DD628D"
                              />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  }
                )}
              </View>
            )}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* ================================================
            BOTTOM NAVIGATION
        ================================================ */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          {/* HOME */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(customer)/customer-dashboard'
              )
            }
          >
            <Ionicons
              name="home-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Home
            </Text>
          </Pressable>

          {/* DISCOVER ACTIVE */}

          <Pressable
            style={
              styles.navItem
            }
          >
            <View
              style={
                styles.activeNavIcon
              }
            >
              <Ionicons
                name="search"
                size={19}
                color="#DF5D8D"
              />
            </View>

            <Text
              style={
                styles.activeNavText
              }
            >
              Discover
            </Text>
          </Pressable>

          {/* BLOOM */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(customer)/customer-bloomboard'
              )
            }
          >
            <Ionicons
              name="flower-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Bloom
            </Text>
          </Pressable>

          {/* CART */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(customer)/customer-cart'
              )
            }
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Cart
            </Text>
          </Pressable>

          {/* AI */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(customer)/customer-ai'
              )
            }
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              AI
            </Text>
          </Pressable>

          {/* PROFILE */}

          <Pressable
            style={
              styles.navItem
            }
            onPress={() =>
              router.replace(
                '/(customer)/customer-profile'
              )
            }
          >
            <Ionicons
              name="person-outline"
              size={20}
              color="#A5A0A4"
            />

            <Text
              style={
                styles.navText
              }
            >
              Me
            </Text>
          </Pressable>
        </View>

        {/* ================================================
            FILTER MODAL
        ================================================ */}

        <Modal
          visible={
            filterVisible
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setFilterVisible(
              false
            )
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                styles.modalBackdrop
              }
              onPress={() =>
                setFilterVisible(
                  false
                )
              }
            />

            <View
              style={
                styles.filterSheet
              }
            >
              {/* HANDLE */}

              <View
                style={
                  styles.sheetHandle
                }
              />

              {/* HEADER */}

              <View
                style={
                  styles.filterHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.filterTitle
                    }
                  >
                    Filters
                  </Text>

                  <Text
                    style={
                      styles.filterSubtitle
                    }
                  >
                    Refine your
                    flower search
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.closeButton
                  }
                  onPress={() =>
                    setFilterVisible(
                      false
                    )
                  }
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="#5B5358"
                  />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.filterContent
                }
              >
                {/* COLOR */}

                {colors.length >
                  0 && (
                  <View
                    style={
                      styles.filterSection
                    }
                  >
                    <Text
                      style={
                        styles.filterSectionTitle
                      }
                    >
                      Color
                    </Text>

                    <View
                      style={
                        styles.filterWrap
                      }
                    >
                      <Pressable
                        style={[
                          styles.filterChoice,

                          !selectedColor &&
                            styles.filterChoiceActive,
                        ]}
                        onPress={() =>
                          setSelectedColor(
                            null
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.filterChoiceText,

                            !selectedColor &&
                              styles.filterChoiceTextActive,
                          ]}
                        >
                          Any
                        </Text>
                      </Pressable>

                      {colors.map(
                        (
                          color
                        ) => {
                          const selected =
                            selectedColor ===
                            color;

                          return (
                            <Pressable
                              key={
                                color
                              }
                              style={[
                                styles.filterChoice,

                                selected &&
                                  styles.filterChoiceActive,
                              ]}
                              onPress={() =>
                                setSelectedColor(
                                  selected
                                    ? null
                                    : color
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.filterChoiceText,

                                  selected &&
                                    styles.filterChoiceTextActive,
                                ]}
                              >
                                {
                                  color
                                }
                              </Text>
                            </Pressable>
                          );
                        }
                      )}
                    </View>
                  </View>
                )}

                {/* PRICE */}

                <View
                  style={
                    styles.filterSection
                  }
                >
                  <Text
                    style={
                      styles.filterSectionTitle
                    }
                  >
                    Price Range
                  </Text>

                  <View
                    style={
                      styles.priceList
                    }
                  >
                    {PRICE_OPTIONS.map(
                      (
                        option,
                        index
                      ) => {
                        const selected =
                          selectedPriceIndex ===
                          index;

                        return (
                          <Pressable
                            key={
                              option.label
                            }
                            style={[
                              styles.priceOption,

                              selected &&
                                styles.priceOptionActive,
                            ]}
                            onPress={() =>
                              setSelectedPriceIndex(
                                index
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.priceOptionText,

                                selected &&
                                  styles.priceOptionTextActive,
                              ]}
                            >
                              {
                                option.label
                              }
                            </Text>

                            <View
                              style={[
                                styles.radioOuter,

                                selected &&
                                  styles.radioOuterActive,
                              ]}
                            >
                              {selected && (
                                <View
                                  style={
                                    styles.radioInner
                                  }
                                />
                              )}
                            </View>
                          </Pressable>
                        );
                      }
                    )}
                  </View>
                </View>
              </ScrollView>

              {/* ACTIONS */}

              <View
                style={
                  styles.filterActions
                }
              >
                <Pressable
                  style={
                    styles.resetButton
                  }
                  onPress={
                    handleResetFilters
                  }
                >
                  <Text
                    style={
                      styles.resetButtonText
                    }
                  >
                    Reset
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.applyButton
                  }
                  onPress={
                    handleApplyAdvancedFilters
                  }
                >
                  <Text
                    style={
                      styles.applyButtonText
                    }
                  >
                    Apply Filters
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
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
        '#FFFFFF',
    },

    screen: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 17,
      paddingTop: 18,
    },

    /*
     * =======================================================
     * LOADING
     * =======================================================
     */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent:
        'center',
      gap: 11,
    },

    loadingText: {
      color: '#8E868B',
      fontSize: 12,
    },

    inlineLoading: {
      flexDirection: 'row',
      justifyContent:
        'center',
      alignItems: 'center',
      paddingVertical: 15,
      gap: 8,
    },

    inlineLoadingText: {
      color: '#9B9398',
      fontSize: 10,
    },

    /*
     * =======================================================
     * HEADER
     * =======================================================
     */

    header: {
      marginBottom: 17,
    },

    pageTitle: {
      color: '#40393E',
      fontSize: 26,
      fontWeight: '800',
    },

    pageSubtitle: {
      color: '#A49CA1',
      fontSize: 11,
      lineHeight: 15,
      marginTop: 4,
      maxWidth: 210,
    },

    /*
     * =======================================================
     * SEARCH
     * =======================================================
     */

    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },

    searchContainer: {
      flex: 1,
      height: 50,
      borderRadius: 16,
      backgroundColor:
        '#FAF8F9',
      borderWidth: 1,
      borderColor:
        '#F1EDEF',
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },

    searchInput: {
      flex: 1,
      fontSize: 12,
      color: '#4E464B',
      marginLeft: 9,
      paddingVertical: 0,
    },

    cameraButton: {
      marginLeft: 8,
    },

    filterButton: {
      width: 47,
      height: 47,
      borderRadius: 24,
      backgroundColor:
        '#DF628F',
      alignItems: 'center',
      justifyContent:
        'center',
      shadowColor:
        '#DF628F',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 3,
    },

    filterBadge: {
      position: 'absolute',
      top: -4,
      right: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor:
        '#8F4C65',
      borderWidth: 2,
      borderColor:
        '#FFFFFF',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    filterBadgeText: {
      color: '#FFFFFF',
      fontSize: 8,
      fontWeight: '800',
    },

    /*
     * =======================================================
     * FLOWER TYPES
     * =======================================================
     */

    typeScroll: {
      marginHorizontal:
        -17,
    },

    typeContainer: {
      paddingHorizontal: 17,
      paddingVertical: 16,
      gap: 8,
    },

    typeChip: {
      height: 34,
      borderRadius: 18,
      paddingHorizontal: 17,
      backgroundColor:
        '#F8F6F7',
      borderWidth: 1,
      borderColor:
        '#F1EDEF',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    typeChipActive: {
      backgroundColor:
        '#DF608E',
      borderColor:
        '#DF608E',
    },

    typeChipText: {
      color: '#7E777B',
      fontSize: 10,
      fontWeight: '600',
    },

    typeChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    /*
     * =======================================================
     * OCCASIONS
     * =======================================================
     */

    occasionSection: {
      marginBottom: 5,
    },

    sectionHeader: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'flex-end',
      marginBottom: 11,
    },

    sectionEyebrow: {
      color: '#D7628C',
      fontSize: 7,
      letterSpacing: 0.8,
      fontWeight: '800',
      marginBottom: 3,
    },

    sectionTitle: {
      color: '#413A3F',
      fontSize: 14,
      fontWeight: '800',
    },

    occasionScroll: {
      marginHorizontal:
        -17,
    },

    occasionContainer: {
      paddingHorizontal: 17,
      paddingBottom: 12,
      gap: 8,
    },

    occasionChip: {
      height: 36,
      paddingHorizontal: 13,
      borderRadius: 18,
      backgroundColor:
        '#FFF5F8',
      borderWidth: 1,
      borderColor:
        '#F5DCE5',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    occasionChipActive: {
      backgroundColor:
        '#DF608E',
      borderColor:
        '#DF608E',
    },

    occasionChipText: {
      color: '#B35779',
      fontSize: 9,
      fontWeight: '600',
    },

    occasionChipTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },

    /*
     * =======================================================
     * RESULTS
     * =======================================================
     */

    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent:
        'space-between',
      marginTop: 7,
      marginBottom: 12,
    },

    resultsTitle: {
      color: '#40393E',
      fontSize: 15,
      fontWeight: '800',
    },

    resultsCount: {
      color: '#A49CA1',
      fontSize: 9,
      marginTop: 3,
    },

    clearText: {
      color: '#DC5D8A',
      fontSize: 10,
      fontWeight: '700',
    },

    /*
     * =======================================================
     * PRODUCTS
     * =======================================================
     */

    productGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent:
        'space-between',
      rowGap: 15,
    },

    productCard: {
      width: '48.4%',
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor:
        '#F1ECEF',
      shadowColor:
        '#000000',
      shadowOpacity: 0.035,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 2,
    },

    productImageContainer: {
      width: '100%',
      aspectRatio: 1.02,
      overflow: 'hidden',
      backgroundColor:
        '#F7E8ED',
    },

    productImage: {
      width: '100%',
      height: '100%',
    },

    productImageFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F8E9EE',
      gap: 5,
    },

    noImageText: {
      color: '#B99DA7',
      fontSize: 8,
      fontWeight: '600',
    },

    availableBadge: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor:
        'rgba(255,255,255,0.94)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 4,
    },

    availableDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        '#50A267',
    },

    availableText: {
      color: '#627066',
      fontSize: 7,
      fontWeight: '700',
    },

    productInfo: {
      paddingHorizontal: 10,
      paddingTop: 9,
      paddingBottom: 10,
    },

    shopName: {
      color: '#A49BA1',
      fontSize: 8,
      marginBottom: 3,
    },

    productName: {
      color: '#494147',
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      minHeight: 28,
    },

    productType: {
      color: '#A99FA5',
      fontSize: 7,
      marginTop: 3,
    },

    productFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginTop: 7,
    },

    productPrice: {
      color: '#DE5D8B',
      fontSize: 11,
      fontWeight: '800',
    },

    productArrow: {
      width: 23,
      height: 23,
      borderRadius: 12,
      backgroundColor:
        '#FFF0F5',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    /*
     * =======================================================
     * EMPTY / ERROR
     * =======================================================
     */

    messageCard: {
      minHeight: 230,
      borderRadius: 18,
      backgroundColor:
        '#FCF9FA',
      borderWidth: 1,
      borderColor:
        '#F1EBEE',
      paddingHorizontal: 25,
      paddingVertical: 25,
      alignItems: 'center',
      justifyContent:
        'center',
    },

    messageIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor:
        '#FFF0F5',
      alignItems: 'center',
      justifyContent:
        'center',
      marginBottom: 11,
    },

    messageTitle: {
      color: '#494146',
      fontSize: 14,
      fontWeight: '800',
      textAlign: 'center',
    },

    messageDescription: {
      color: '#958D92',
      fontSize: 10,
      lineHeight: 15,
      textAlign: 'center',
      marginTop: 6,
      maxWidth: 250,
    },

    retryButton: {
      marginTop: 14,
      backgroundColor:
        '#E05F8D',
      borderRadius: 17,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },

    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
    },

    bottomSpacer: {
      height: 25,
    },

    /*
     * =======================================================
     * NAVIGATION
     * =======================================================
     */

    bottomNavigation: {
      height: 72,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor:
        '#F0EDEF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-around',
      paddingBottom: 3,
      shadowColor:
        '#000000',
      shadowOpacity: 0.035,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: -2,
      },
      elevation: 5,
    },

    navItem: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    activeNavIcon: {
      width: 37,
      height: 30,
      borderRadius: 16,
      backgroundColor:
        '#FFE8F0',
      alignItems: 'center',
      justifyContent:
        'center',
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

    /*
     * =======================================================
     * FILTER MODAL
     * =======================================================
     */

    modalOverlay: {
      flex: 1,
      justifyContent:
        'flex-end',
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        'rgba(42,32,37,0.35)',
    },

    filterSheet: {
      maxHeight: '78%',
      backgroundColor:
        '#FFFFFF',
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      paddingTop: 10,
      paddingHorizontal: 19,
      paddingBottom: 18,
    },

    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor:
        '#E2DCE0',
      alignSelf: 'center',
      marginBottom: 15,
    },

    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      marginBottom: 10,
    },

    filterTitle: {
      color: '#40393E',
      fontSize: 20,
      fontWeight: '800',
    },

    filterSubtitle: {
      color: '#A49CA1',
      fontSize: 9,
      marginTop: 2,
    },

    closeButton: {
      width: 37,
      height: 37,
      borderRadius: 19,
      backgroundColor:
        '#F8F5F7',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    filterContent: {
      paddingBottom: 12,
    },

    filterSection: {
      marginTop: 15,
    },

    filterSectionTitle: {
      color: '#4C4449',
      fontSize: 12,
      fontWeight: '800',
      marginBottom: 10,
    },

    filterWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    filterChoice: {
      height: 34,
      borderRadius: 17,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor:
        '#ECE6E9',
      backgroundColor:
        '#FAF8F9',
      justifyContent:
        'center',
      alignItems: 'center',
    },

    filterChoiceActive: {
      borderColor:
        '#DF608E',
      backgroundColor:
        '#FFF0F5',
    },

    filterChoiceText: {
      color: '#81797E',
      fontSize: 9,
      fontWeight: '600',
    },

    filterChoiceTextActive: {
      color: '#D95D89',
      fontWeight: '700',
    },

    priceList: {
      gap: 7,
    },

    priceOption: {
      minHeight: 43,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        '#EEE9EC',
      backgroundColor:
        '#FAF8F9',
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    priceOptionActive: {
      backgroundColor:
        '#FFF4F7',
      borderColor:
        '#EDA8C0',
    },

    priceOptionText: {
      color: '#736C70',
      fontSize: 10,
      fontWeight: '600',
    },

    priceOptionTextActive: {
      color: '#D75C88',
      fontWeight: '700',
    },

    radioOuter: {
      width: 17,
      height: 17,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor:
        '#C8C0C4',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    radioOuterActive: {
      borderColor:
        '#DE608D',
    },

    radioInner: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        '#DE608D',
    },

    filterActions: {
      flexDirection: 'row',
      gap: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor:
        '#F0EBEE',
    },

    resetButton: {
      flex: 0.42,
      height: 45,
      borderRadius: 23,
      borderWidth: 1,
      borderColor:
        '#E2DCE0',
      alignItems: 'center',
      justifyContent:
        'center',
      backgroundColor:
        '#FFFFFF',
    },

    resetButtonText: {
      color: '#696166',
      fontSize: 10,
      fontWeight: '700',
    },

    applyButton: {
      flex: 1,
      height: 45,
      borderRadius: 23,
      backgroundColor:
        '#DE608E',
      alignItems: 'center',
      justifyContent:
        'center',
    },

    applyButtonText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '800',
    },
  });