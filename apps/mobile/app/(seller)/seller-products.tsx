import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { router } from 'expo-router';

import {
  deactivateSellerFlower,
  getSellerFlowers,
  getFlowerImageUrl,
  updateFlowerAvailability,
  type FlowerListing,
} from '../../services/flower';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type ProductFilter =
  | 'all'
  | 'available'
  | 'unavailable';

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const formatCurrency = (
  value: number
) => {
  return `₱${Number(
    value || 0
  ).toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const getProductImage = (
  flower: FlowerListing
) => {
  const firstImage =
    flower.images?.[0];

  if (!firstImage) {
    return null;
  }

  return getFlowerImageUrl(
    firstImage
  );
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function SellerProductsScreen() {
  const [flowers, setFlowers] =
    useState<FlowerListing[]>([]);

  const [filter, setFilter] =
    useState<ProductFilter>('all');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  /*
   * =======================================================
   * LOAD PRODUCTS
   * =======================================================
   */

  const loadProducts =
    useCallback(async () => {
      const sellerFlowers =
        await getSellerFlowers();

      setFlowers(sellerFlowers);

      setError(null);
    }, []);

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    let active = true;

    getSellerFlowers()
      .then((sellerFlowers) => {
        if (!active) {
          return;
        }

        setFlowers(
          sellerFlowers
        );

        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) {
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load products.';

        setError(message);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(async () => {
      try {
        setRefreshing(true);

        await loadProducts();
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to refresh products.';

        setError(message);
      } finally {
        setRefreshing(false);
      }
    }, [loadProducts]);

  /*
   * =======================================================
   * FILTERED PRODUCTS
   * =======================================================
   */

  const filteredFlowers =
    useMemo(() => {
      /*
       * Deactivated products are hidden from
       * the normal Products list.
       *
       * DELETE on the backend is a soft delete.
       */

      const activeFlowers =
        flowers.filter(
          (flower) =>
            flower.isActive !==
            false
        );

      if (
        filter === 'available'
      ) {
        return activeFlowers.filter(
          (flower) =>
            flower.isAvailable
        );
      }

      if (
        filter ===
        'unavailable'
      ) {
        return activeFlowers.filter(
          (flower) =>
            !flower.isAvailable
        );
      }

      return activeFlowers;
    }, [flowers, filter]);

  /*
   * =======================================================
   * COUNTS
   * =======================================================
   */

  const counts = useMemo(() => {
    const activeFlowers =
      flowers.filter(
        (flower) =>
          flower.isActive !== false
      );

    return {
      all: activeFlowers.length,

      available:
        activeFlowers.filter(
          (flower) =>
            flower.isAvailable
        ).length,

      unavailable:
        activeFlowers.filter(
          (flower) =>
            !flower.isAvailable
        ).length,
    };
  }, [flowers]);

  /*
   * =======================================================
   * AVAILABILITY
   * =======================================================
   */

  const handleAvailabilityChange =
    useCallback(
      async (
        flower: FlowerListing,
        nextValue: boolean
      ) => {
        if (updatingId) {
          return;
        }

        const previousValue =
          flower.isAvailable;

        /*
         * Optimistic UI update.
         */

        setFlowers(
          (currentFlowers) =>
            currentFlowers.map(
              (item) =>
                item._id ===
                flower._id
                  ? {
                      ...item,
                      isAvailable:
                        nextValue,
                    }
                  : item
            )
        );

        try {
          setUpdatingId(
            flower._id
          );

          const updatedFlower =
            await updateFlowerAvailability(
              flower._id,
              nextValue
            );

          setFlowers(
            (currentFlowers) =>
              currentFlowers.map(
                (item) =>
                  item._id ===
                  flower._id
                    ? updatedFlower
                    : item
              )
          );
        } catch (err: unknown) {
          /*
           * Restore previous value
           * if backend update fails.
           */

          setFlowers(
            (currentFlowers) =>
              currentFlowers.map(
                (item) =>
                  item._id ===
                  flower._id
                    ? {
                        ...item,
                        isAvailable:
                          previousValue,
                      }
                    : item
              )
          );

          const message =
            err instanceof Error
              ? err.message
              : 'Unable to update product availability.';

          Alert.alert(
            'Update Failed',
            message
          );
        } finally {
          setUpdatingId(null);
        }
      },
      [updatingId]
    );

  /*
   * =======================================================
   * DELETE / DEACTIVATE
   * =======================================================
   */

  const handleDelete =
    useCallback(
      (
        flower: FlowerListing
      ) => {
        Alert.alert(
          'Remove Product',
          `Are you sure you want to remove "${flower.name}" from your shop?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Remove',
              style: 'destructive',

              onPress: async () => {
                try {
                  setUpdatingId(
                    flower._id
                  );

                  const updatedFlower =
                    await deactivateSellerFlower(
                      flower._id
                    );

                  setFlowers(
                    (
                      currentFlowers
                    ) =>
                      currentFlowers.map(
                        (item) =>
                          item._id ===
                          flower._id
                            ? updatedFlower
                            : item
                      )
                  );
                } catch (
                  err: unknown
                ) {
                  const message =
                    err instanceof
                    Error
                      ? err.message
                      : 'Unable to remove product.';

                  Alert.alert(
                    'Remove Failed',
                    message
                  );
                } finally {
                  setUpdatingId(
                    null
                  );
                }
              },
            },
          ]
        );
      },
      []
    );

  /*
   * =======================================================
   * LOADING
   * =======================================================
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
          color="#74A485"
        />

        <Text
          style={styles.loadingText}
        >
          Loading products...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * INITIAL ERROR
   * =======================================================
   */

  if (
    error &&
    flowers.length === 0
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={styles.errorTitle}
        >
          Unable to load products
        </Text>

        <Text
          style={styles.errorText}
        >
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text
            style={styles.retryText}
          >
            Try Again
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.screen}>
        {/* ============================================= */}
        {/* HEADER */}
        {/* ============================================= */}

        <View style={styles.header}>
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
              styles.headerRow
            }
          >
            <View>
              <Text
                style={
                  styles.headerTitle
                }
              >
                Products
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage your bouquet
                listings
              </Text>
            </View>

            <Pressable
              style={
                styles.addButton
              }
              onPress={() =>
  router.push(
    '/(seller)/seller-add-product'
  )
}
            >
              <Text
                style={
                  styles.addButtonPlus
                }
              >
                +
              </Text>

              <Text
                style={
                  styles.addButtonText
                }
              >
                Add Product
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ============================================= */}
        {/* FILTERS */}
        {/* ============================================= */}

        <View
          style={
            styles.filterContainer
          }
        >
          <FilterButton
            label={`All (${counts.all})`}
            active={
              filter === 'all'
            }
            onPress={() =>
              setFilter('all')
            }
          />

          <FilterButton
            label={`Available (${counts.available})`}
            active={
              filter ===
              'available'
            }
            onPress={() =>
              setFilter(
                'available'
              )
            }
          />

          <FilterButton
            label={`Unavailable (${counts.unavailable})`}
            active={
              filter ===
              'unavailable'
            }
            onPress={() =>
              setFilter(
                'unavailable'
              )
            }
          />
        </View>

        {/* ============================================= */}
        {/* PRODUCTS */}
        {/* ============================================= */}

        <ScrollView
          style={styles.scrollView}
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
            />
          }
        >
          {error ? (
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
          ) : null}

          {filteredFlowers.length ===
          0 ? (
            <View
              style={
                styles.emptyContainer
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Text
                  style={
                    styles.emptyIconText
                  }
                >
                  ✿
                </Text>
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                {filter === 'all'
                  ? 'No products yet'
                  : filter ===
                      'available'
                    ? 'No available products'
                    : 'No unavailable products'}
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                {filter === 'all'
                  ? 'Add your first bouquet listing to your shop.'
                  : 'Products matching this filter will appear here.'}
              </Text>
            </View>
          ) : (
            filteredFlowers.map(
              (flower) => (
                <ProductCard
                  key={flower._id}
                  flower={flower}
                  updating={
                    updatingId ===
                    flower._id
                  }
                  onAvailabilityChange={
                    (
                      nextValue
                    ) =>
                      handleAvailabilityChange(
                        flower,
                        nextValue
                      )
                  }
onEdit={() =>
  router.push({
    pathname:
      '/(seller)/seller-edit-product',
    params: {
      flowerId: flower._id,
    },
  })
}
                  onDelete={() =>
                    handleDelete(
                      flower
                    )
                  }
                />
              )
            )
          )}

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* ============================================= */}
        {/* BOTTOM NAVIGATION */}
        {/* ============================================= */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <Pressable
            style={styles.navItem}
            onPress={() =>
              router.replace(
                '/(seller)/seller-dashboard'
              )
            }
          >
            <Text
              style={styles.navIcon}
            >
              ⌂
            </Text>

            <Text
              style={styles.navText}
            >
              Dashboard
            </Text>
          </Pressable>

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
                ◈
              </Text>
            </View>

            <Text
              style={
                styles.activeNavText
              }
            >
              Products
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
onPress={() =>
  router.replace(
    '/(seller)/seller-orders'
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
              Orders
            </Text>
          </Pressable>

<Pressable
  style={styles.navItem}
  onPress={() =>
    router.replace(
      '/(seller)/seller-reports'
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
              router.push(
                '/(seller)/seller-profile'
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
              Seller Profile
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * FILTER BUTTON
 * =========================================================
 */

function FilterButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,

        active &&
          styles.filterButtonActive,
      ]}
    >
      <Text
        style={[
          styles.filterText,

          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * PRODUCT CARD
 * =========================================================
 */

function ProductCard({
  flower,
  updating,
  onAvailabilityChange,
  onEdit,
  onDelete,
}: {
  flower: FlowerListing;
  updating: boolean;
  onAvailabilityChange: (
    value: boolean
  ) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const imageUrl =
    getProductImage(flower);

  return (
    <View
      style={styles.productCard}
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
              uri: imageUrl,
            }}
            style={
              styles.productImage
            }
            resizeMode="cover"
          />
        ) : (
          <View
            style={
              styles.imagePlaceholder
            }
          >
            <Text
              style={
                styles.imagePlaceholderText
              }
            >
              🌸
            </Text>
          </View>
        )}

        <View
          style={[
            styles.availabilityBadge,

            flower.isAvailable
              ? styles.availableBadge
              : styles.unavailableBadge,
          ]}
        >
          <Text
            style={[
              styles.availabilityBadgeText,

              flower.isAvailable
                ? styles.availableBadgeText
                : styles.unavailableBadgeText,
            ]}
          >
            {flower.isAvailable
              ? 'Available'
              : 'Unavailable'}
          </Text>
        </View>
      </View>

      {/* INFORMATION */}

      <View
        style={styles.productBody}
      >
        <View
          style={
            styles.productTopRow
          }
        >
          <View
            style={
              styles.productTitleArea
            }
          >
            <Text
              style={
                styles.productName
              }
              numberOfLines={1}
            >
              {flower.name}
            </Text>

            <Text
              style={
                styles.productCategory
              }
              numberOfLines={1}
            >
              {flower.category}
            </Text>
          </View>

          <Text
            style={
              styles.productPrice
            }
          >
            {formatCurrency(
              flower.price
            )}
          </Text>
        </View>

        <Text
          style={
            styles.productDescription
          }
          numberOfLines={2}
        >
          {flower.description}
        </Text>

        {/* AVAILABILITY */}

        <View
          style={
            styles.availabilityRow
          }
        >
          <View>
            <Text
              style={
                styles.availabilityTitle
              }
            >
              Product Availability
            </Text>

            <Text
              style={
                styles.availabilitySubtitle
              }
            >
              {flower.isAvailable
                ? 'Customers can order this bouquet'
                : 'Hidden from customer ordering'}
            </Text>
          </View>

          {updating ? (
            <ActivityIndicator
              size="small"
              color="#74A485"
            />
          ) : (
            <Switch
              value={
                flower.isAvailable
              }
              onValueChange={
                onAvailabilityChange
              }
              trackColor={{
                false: '#DADADA',
                true: '#A8CCB4',
              }}
              thumbColor={
                flower.isAvailable
                  ? '#74A485'
                  : '#F5F5F5'
              }
            />
          )}
        </View>

        {/* ACTIONS */}

        <View
          style={
            styles.actionRow
          }
        >
          <Pressable
            style={
              styles.editButton
            }
            onPress={onEdit}
            disabled={updating}
          >
            <Text
              style={
                styles.editIcon
              }
            >
              ✎
            </Text>

            <Text
              style={
                styles.editText
              }
            >
              Edit
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.deleteButton
            }
            onPress={onDelete}
            disabled={updating}
          >
            <Text
              style={
                styles.deleteIcon
              }
            >
              ♲
            </Text>

            <Text
              style={
                styles.deleteText
              }
            >
              Delete
            </Text>
          </Pressable>
        </View>
      </View>
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
        '#F5F6F5',
    },

    screen: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
    },

    /*
     * LOADING / ERROR
     */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30,
    },

    loadingText: {
      marginTop: 12,
      fontSize: 12,
      color: '#888888',
    },

    errorTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#3E3E3E',
      textAlign: 'center',
    },

    errorText: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 17,
      color: '#888888',
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 18,
      paddingHorizontal: 24,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor:
        '#74A485',
    },

    retryText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 11,
    },

    /*
     * HEADER
     */

    header: {
      backgroundColor:
        '#74A485',
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 23,
      overflow: 'hidden',
    },

    headerCircleOne: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      top: -90,
      right: -40,
      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleTwo: {
      position: 'absolute',
      width: 110,
      height: 110,
      borderRadius: 55,
      bottom: -65,
      left: -30,
      backgroundColor:
        'rgba(255,255,255,0.05)',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 23,
      fontWeight: '800',
    },

    headerSubtitle: {
      marginTop: 4,
      color:
        'rgba(255,255,255,0.80)',
      fontSize: 10,
    },

    addButton: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor:
        '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },

    addButtonPlus: {
      color: '#6C9F7D',
      fontSize: 20,
      fontWeight: '500',
      marginRight: 5,
      marginTop: -2,
    },

    addButtonText: {
      color: '#608F70',
      fontSize: 10,
      fontWeight: '700',
    },

    /*
     * FILTER
     */

    filterContainer: {
      flexDirection: 'row',
      backgroundColor:
        '#FFFFFF',
      paddingHorizontal: 17,
      paddingVertical: 13,
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor:
        '#EEEEEE',
    },

    filterButton: {
      flex: 1,
      minHeight: 35,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#F3F4F3',
      paddingHorizontal: 5,
    },

    filterButtonActive: {
      backgroundColor:
        '#E7F2EA',
    },

    filterText: {
      color: '#969696',
      fontSize: 9,
      fontWeight: '600',
    },

    filterTextActive: {
      color: '#659676',
      fontWeight: '800',
    },

    /*
     * SCROLL
     */

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 17,
      paddingTop: 15,
    },

    inlineError: {
      backgroundColor:
        '#FFF0F0',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
    },

    inlineErrorText: {
      color: '#B65A5A',
      fontSize: 10,
      textAlign: 'center',
    },

    /*
     * PRODUCT CARD
     */

    productCard: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      marginBottom: 13,
      overflow: 'hidden',

      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 6,

      elevation: 2,
    },

    productImageContainer: {
      height: 145,
      backgroundColor:
        '#EFF1EF',
      position: 'relative',
    },

    productImage: {
      width: '100%',
      height: '100%',
    },

    imagePlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        '#EFF4F0',
    },

    imagePlaceholderText: {
      fontSize: 38,
    },

    availabilityBadge: {
      position: 'absolute',
      top: 11,
      right: 11,
      borderRadius: 12,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    availableBadge: {
      backgroundColor:
        '#EAF5ED',
    },

    unavailableBadge: {
      backgroundColor:
        '#F1F1F1',
    },

    availabilityBadgeText: {
      fontSize: 8,
      fontWeight: '700',
    },

    availableBadgeText: {
      color: '#619574',
    },

    unavailableBadgeText: {
      color: '#888888',
    },

    productBody: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 13,
    },

    productTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent:
        'space-between',
    },

    productTitleArea: {
      flex: 1,
      paddingRight: 10,
    },

    productName: {
      color: '#383838',
      fontSize: 14,
      fontWeight: '800',
    },

    productCategory: {
      color: '#9A9A9A',
      fontSize: 8,
      marginTop: 3,
    },

    productPrice: {
      color: '#669878',
      fontSize: 14,
      fontWeight: '800',
    },

    productDescription: {
      marginTop: 8,
      color: '#888888',
      fontSize: 9,
      lineHeight: 14,
    },

    /*
     * AVAILABILITY
     */

    availabilityRow: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor:
        '#F0F0F0',
      marginTop: 12,
      paddingTop: 11,
    },

    availabilityTitle: {
      color: '#4C4C4C',
      fontSize: 9,
      fontWeight: '700',
    },

    availabilitySubtitle: {
      color: '#A2A2A2',
      fontSize: 7,
      marginTop: 3,
    },

    /*
     * ACTIONS
     */

    actionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },

    editButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: 10,
      backgroundColor:
        '#EDF5EF',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },

    editIcon: {
      color: '#659676',
      fontSize: 12,
      marginRight: 5,
    },

    editText: {
      color: '#659676',
      fontSize: 9,
      fontWeight: '700',
    },

    deleteButton: {
      flex: 1,
      minHeight: 34,
      borderRadius: 10,
      backgroundColor:
        '#FFF0F1',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },

    deleteIcon: {
      color: '#D77A80',
      fontSize: 11,
      marginRight: 5,
    },

    deleteText: {
      color: '#D77A80',
      fontSize: 9,
      fontWeight: '700',
    },

    /*
     * EMPTY
     */

    emptyContainer: {
      backgroundColor:
        '#FFFFFF',
      borderRadius: 17,
      paddingHorizontal: 30,
      paddingVertical: 55,
      alignItems: 'center',
    },

    emptyIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        '#EDF5EF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIconText: {
      color: '#74A485',
      fontSize: 26,
    },

    emptyTitle: {
      marginTop: 14,
      color: '#444444',
      fontSize: 14,
      fontWeight: '800',
    },

    emptyText: {
      marginTop: 6,
      color: '#999999',
      fontSize: 9,
      lineHeight: 14,
      textAlign: 'center',
    },

    bottomSpacer: {
      height: 20,
    },

    /*
     * NAVIGATION
     */

    bottomNavigation: {
      height: 72,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor:
        '#ECEEEC',
      flexDirection: 'row',
      justifyContent:
        'space-around',
      alignItems: 'center',
      paddingBottom: 4,
    },

    navItem: {
      flex: 1,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    navIcon: {
      color: '#9BA19D',
      fontSize: 16,
    },

    navText: {
      color: '#A4A5A6',
      fontSize: 8,
      marginTop: 4,
    },

    activeNavIcon: {
      width: 34,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        '#EAF4ED',
      alignItems: 'center',
      justifyContent: 'center',
    },

    activeNavSymbol: {
      color: '#6EA382',
      fontSize: 16,
    },

    activeNavText: {
      color: '#6EA382',
      fontSize: 8,
      fontWeight: '700',
      marginTop: 3,
    },
  });