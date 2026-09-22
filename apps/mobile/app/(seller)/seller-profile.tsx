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

import { router } from 'expo-router';

import {
  getStoredUser,
  logout,
  type AuthUser,
} from '../../services/auth';

import {
  getMyFloristProfile,
  updateMyFloristProfile,
  type FloristProfile,
} from '../../services/florist';

import {
  getSellerOrders,
  type CustomerOrder,
} from '../../services/orders';

import {
  getSellerFlowers,
  type FlowerListing,
} from '../../services/flower';

import {
  getSellerReviews,
  type SellerReviewsData,
} from '../../services/review';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type ProfileData = {
  user: AuthUser | null;
  florist: FloristProfile;
  orders: CustomerOrder[];
  flowers: FlowerListing[];
  reviews: SellerReviewsData;
};

type EditForm = {
  shopName: string;
  description: string;
  contactNumber: string;
  businessEmail: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
};

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

const getInitialForm = (
  florist: FloristProfile
): EditForm => ({
  shopName:
    florist.shopName || '',

  description:
    florist.description || '',

  contactNumber:
    florist.contactNumber || '',

  businessEmail:
    florist.businessEmail || '',

  street:
    florist.address?.street || '',

  barangay:
    florist.address?.barangay || '',

  city:
    florist.address?.city || '',

  province:
    florist.address?.province || '',

  postalCode:
    florist.address?.postalCode || '',
});

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function SellerProfileScreen() {
  const [
    data,
    setData,
  ] =
    useState<ProfileData | null>(
      null
    );

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
    useState<string | null>(null);

  const [
    editVisible,
    setEditVisible,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    form,
    setForm,
  ] =
    useState<EditForm>({
      shopName: '',
      description: '',
      contactNumber: '',
      businessEmail: '',
      street: '',
      barangay: '',
      city: '',
      province: '',
      postalCode: '',
    });

  /*
   * =======================================================
   * LOAD PROFILE
   * =======================================================
   */

  const loadProfile =
    useCallback(
      async () => {
        const [
          storedUser,
          florist,
          orders,
          flowers,
          reviews,
        ] =
          await Promise.all([
            getStoredUser(),
            getMyFloristProfile(),
            getSellerOrders(),
            getSellerFlowers(),
            getSellerReviews(),
          ]);

        setData({
          user:
            storedUser,
          florist,
          orders,
          flowers,
          reviews,
        });

        setError(null);
      },
      []
    );

  /*
   * =======================================================
   * INITIAL LOAD
   * =======================================================
   */

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        await loadProfile();
      } catch (
        err: unknown
      ) {
        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load seller profile.'
        );
      } finally {
        if (mounted) {
          setLoading(
            false
          );
        }
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [
    loadProfile,
  ]);

  /*
   * =======================================================
   * REFRESH
   * =======================================================
   */

  const handleRefresh =
    useCallback(
      async () => {
        try {
          setRefreshing(
            true
          );

          await loadProfile();
        } catch (
          err: unknown
        ) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to refresh seller profile.'
          );
        } finally {
          setRefreshing(
            false
          );
        }
      },
      [
        loadProfile,
      ]
    );

  /*
   * =======================================================
   * RETRY
   * =======================================================
   */

  const handleRetry =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setError(
            null
          );

          await loadProfile();
        } catch (
          err: unknown
        ) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load seller profile.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        loadProfile,
      ]
    );

  /*
   * =======================================================
   * ANALYTICS
   * =======================================================
   */

  const analytics =
    useMemo(() => {
      const orders =
        data?.orders ??
        [];

      const flowers =
        data?.flowers ??
        [];

      const paidOrders =
        orders.filter(
          order =>
            order.paymentStatus ===
              'paid' &&
            order.orderStatus !==
              'cancelled'
        );

      const totalSales =
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
        );

      const completedOrders =
        orders.filter(
          order =>
            order.orderStatus ===
              'completed' ||
            order.orderStatus ===
              'delivered'
        ).length;

      const activeProducts =
        flowers.filter(
          flower =>
            flower.isActive !==
            false
        ).length;

      return {
        totalSales,
        totalOrders:
          orders.length,
        completedOrders,
        activeProducts,
      };
    }, [
      data,
    ]);

  /*
   * =======================================================
   * EDIT PROFILE
   * =======================================================
   */

  const openEditProfile =
    useCallback(() => {
      if (!data?.florist) {
        return;
      }

      setForm(
        getInitialForm(
          data.florist
        )
      );

      setEditVisible(
        true
      );
    }, [
      data,
    ]);

  const updateField = <
    K extends keyof EditForm,
  >(
    field: K,
    value: EditForm[K]
  ) => {
    setForm(
      current => ({
        ...current,
        [field]:
          value,
      })
    );
  };

  const handleSaveProfile =
    useCallback(
      async () => {
        if (
          !form.shopName.trim()
        ) {
          Alert.alert(
            'Shop Name Required',
            'Please enter your shop name.'
          );

          return;
        }

        try {
          setSaving(
            true
          );

          const updated =
            await updateMyFloristProfile(
              {
                shopName:
                  form.shopName.trim(),

                description:
                  form.description.trim(),

                contactNumber:
                  form.contactNumber.trim(),

                businessEmail:
                  form.businessEmail.trim(),

                address: {
                  street:
                    form.street.trim(),

                  barangay:
                    form.barangay.trim(),

                  city:
                    form.city.trim(),

                  province:
                    form.province.trim(),

                  postalCode:
                    form.postalCode.trim(),
                },
              }
            );

          setData(
            current => {
              if (
                !current
              ) {
                return current;
              }

              return {
                ...current,
                florist:
                  updated,
              };
            }
          );

          setEditVisible(
            false
          );

          Alert.alert(
            'Profile Updated',
            'Your shop information has been updated successfully.'
          );
        } catch (
          err: unknown
        ) {
          Alert.alert(
            'Unable to Update Profile',
            err instanceof Error
              ? err.message
              : 'Unable to update your shop profile.'
          );
        } finally {
          setSaving(
            false
          );
        }
      },
      [
        form,
      ]
    );

  /*
   * =======================================================
   * LOGOUT
   * =======================================================
   */

  const handleLogout =
    useCallback(() => {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          {
            text:
              'Cancel',
            style:
              'cancel',
          },

          {
            text:
              'Log Out',

            style:
              'destructive',

            onPress:
              async () => {
                try {
                  await logout();

                  router.replace(
                    '/(auth)/login'
                  );
                } catch (
                  err: unknown
                ) {
                  Alert.alert(
                    'Log Out Failed',
                    err instanceof Error
                      ? err.message
                      : 'Unable to log out.'
                  );
                }
              },
          },
        ]
      );
    }, []);

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
          color="#6FA382"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading seller
          profile...
        </Text>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * ERROR
   * =======================================================
   */

  if (
    error &&
    !data
  ) {
    return (
      <SafeAreaView
        style={
          styles.loadingContainer
        }
      >
        <Text
          style={
            styles.errorTitle
          }
        >
          Unable to load
          profile
        </Text>

        <Text
          style={
            styles.errorText
          }
        >
          {error}
        </Text>

        <Pressable
          style={
            styles.retryButton
          }
          onPress={
            handleRetry
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
      </SafeAreaView>
    );
  }

  const user =
    data?.user;

  const florist =
    data?.florist;

  const reviews =
    data?.reviews;

  const sellerName =
    `${user?.firstName ?? ''} ${
      user?.lastName ?? ''
    }`.trim() ||
    'Seller';

  const shopName =
    florist?.shopName ||
    sellerName;

  const locationText =
    [
      florist?.address
        ?.street,

      florist?.address
        ?.barangay,

      florist?.address
        ?.city,

      florist?.address
        ?.province,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Shop address not set';

  const verificationStatus =
    florist?.verificationStatus ??
    user?.verificationStatus ??
    'pending';

  const isVerified =
    verificationStatus ===
    'approved';

  const description =
    florist?.description ||
    'Add a description to tell customers about your flower shop.';

  const rating =
    reviews?.averageRating;

  /*
   * =======================================================
   * UI
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
              tintColor="#6FA382"
            />
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
              <Text
                style={
                  styles.headerTitle
                }
              >
                Seller Profile
              </Text>

              <Pressable
                style={
                  styles.settingsButton
                }
                onPress={
                  openEditProfile
                }
              >
                <Text
                  style={
                    styles.settingsIcon
                  }
                >
                  ⚙
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ERROR */}

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

          {/* PROFILE CARD */}

          <View
            style={
              styles.profileCard
            }
          >
            <View
              style={
                styles.coverArea
              }
            />

            <View
              style={
                styles.profileContent
              }
            >
              <View
                style={
                  styles.logoWrapper
                }
              >
                {florist?.shopLogo ? (
                  <Image
                    source={{
                      uri:
                        florist.shopLogo,
                    }}
                    style={
                      styles.shopLogo
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.logoPlaceholder
                    }
                  >
                    <Text
                      style={
                        styles.logoPlaceholderText
                      }
                    >
                      🌸
                    </Text>
                  </View>
                )}
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
                  styles.shopLocation
                }
              >
                {locationText}
              </Text>

              <Text
                style={
                  styles.description
                }
              >
                {description}
              </Text>

              <View
                style={
                  styles.badgeRow
                }
              >
                <View
                  style={[
                    styles.statusBadge,

                    isVerified
                      ? styles.verifiedBadge
                      : styles.pendingBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,

                      isVerified
                        ? styles.verifiedText
                        : styles.pendingText,
                    ]}
                  >
                    {isVerified
                      ? 'Verified Seller ✓'
                      : verificationStatus ===
                          'rejected'
                        ? 'Verification Rejected'
                        : 'Verification Pending'}
                  </Text>
                </View>

                {florist?.isActive !==
                false ? (
                  <View
                    style={
                      styles.openBadge
                    }
                  >
                    <Text
                      style={
                        styles.openBadgeText
                      }
                    >
                      Active Shop
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.closedBadge
                    }
                  >
                    <Text
                      style={
                        styles.closedBadgeText
                      }
                    >
                      Inactive
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* STATS */}

          <View
            style={
              styles.statsGrid
            }
          >
            <StatCard
              value={formatCurrency(
                analytics.totalSales
              )}
              label="Total Sales"
            />

            <StatCard
              value={String(
                analytics.totalOrders
              )}
              label="Orders"
            />

            <StatCard
              value={
                rating !==
                null &&
                rating !==
                undefined
                  ? `${rating.toFixed(
                      1
                    )} ★`
                  : '—'
              }
              label={
                reviews?.count
                  ? `${reviews.count} Ratings`
                  : 'Rating'
              }
            />

            <StatCard
              value={String(
                analytics.activeProducts
              )}
              label="Products"
            />
          </View>

          {/* SHOP INFORMATION */}

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
              Shop Information
            </Text>

            <InfoRow
              label="Shop Name"
              value={
                shopName
              }
            />

            <InfoRow
              label="Contact"
              value={
                florist?.contactNumber ||
                'Not set'
              }
            />

            <InfoRow
              label="Business Email"
              value={
                florist?.businessEmail ||
                'Not set'
              }
            />

            <InfoRow
              label="Address"
              value={
                locationText
              }
              last
            />
          </View>

          {/* MANAGEMENT */}

          <View
            style={
              styles.menuCard
            }
          >
            <MenuItem
              icon="✎"
              label="Edit Shop Profile"
              onPress={
                openEditProfile
              }
            />

            <MenuItem
              icon="◇"
              label="Manage Products"
              onPress={() =>
                router.replace(
                  '/(seller)/seller-products'
                )
              }
            />

            <MenuItem
              icon="🛒"
              label="Manage Orders"
              onPress={() =>
                router.replace(
                  '/(seller)/seller-orders'
                )
              }
            />

            <MenuItem
              icon="▥"
              label="Shop Reports"
              onPress={() =>
                router.replace(
                  '/(seller)/seller-reports'
                )
              }
              last
            />
          </View>

          {/* PERFORMANCE */}

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
              Shop Performance
            </Text>

            <InfoRow
              label="Total Orders"
              value={String(
                analytics.totalOrders
              )}
            />

            <InfoRow
              label="Completed"
              value={String(
                analytics.completedOrders
              )}
            />

            <InfoRow
              label="Total Sales"
              value={formatCurrency(
                analytics.totalSales
              )}
            />

            <InfoRow
              label="Seller Rating"
              value={
                rating !==
                null &&
                rating !==
                undefined
                  ? `${rating.toFixed(
                      1
                    )} / 5`
                  : 'No ratings yet'
              }
              last
            />
          </View>

          {/* ACCOUNT */}

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
              Account
            </Text>

            <InfoRow
              label="Seller"
              value={
                sellerName
              }
            />

            <InfoRow
              label="Email"
              value={
                user?.email ||
                '—'
              }
            />

            <InfoRow
              label="Role"
              value="Seller"
            />

            <InfoRow
              label="Verification"
              value={
                verificationStatus
              }
              last
            />
          </View>

          {/* LOGOUT */}

          <Pressable
            style={({
              pressed,
            }) => [
              styles.logoutButton,

              pressed &&
                styles.buttonPressed,
            ]}
            onPress={
              handleLogout
            }
          >
            <Text
              style={
                styles.logoutText
              }
            >
              Log Out
            </Text>
          </Pressable>

          <View
            style={
              styles.bottomSpacer
            }
          />
        </ScrollView>

        {/* BOTTOM NAVIGATION */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <BottomNavItem
            icon="⌂"
            label="Dashboard"
            onPress={() =>
              router.replace(
                '/(seller)/seller-dashboard'
              )
            }
          />

          <BottomNavItem
            icon="◇"
            label="Products"
            onPress={() =>
              router.replace(
                '/(seller)/seller-products'
              )
            }
          />

          <BottomNavItem
            icon="🛒"
            label="Orders"
            onPress={() =>
              router.replace(
                '/(seller)/seller-orders'
              )
            }
          />

          <BottomNavItem
            icon="▥"
            label="Reports"
            onPress={() =>
              router.replace(
                '/(seller)/seller-reports'
              )
            }
          />

          <BottomNavItem
            icon="♙"
            label="Profile"
            active
            onPress={() => {}}
          />
        </View>

        {/* ============================================= */}
        {/* EDIT PROFILE MODAL */}
        {/* ============================================= */}

        <Modal
          visible={
            editVisible
          }
          animationType="slide"
          transparent
          onRequestClose={() => {
            if (
              !saving
            ) {
              setEditVisible(
                false
              );
            }
          }}
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <View
              style={
                styles.modalContainer
              }
            >
              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    Edit Shop
                    Profile
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Update your
                    shop information
                  </Text>
                </View>

                <Pressable
                  disabled={
                    saving
                  }
                  style={
                    styles.modalClose
                  }
                  onPress={() =>
                    setEditVisible(
                      false
                    )
                  }
                >
                  <Text
                    style={
                      styles.modalCloseText
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.modalScrollContent
                }
              >
                <FormField
                  label="Shop Name"
                  value={
                    form.shopName
                  }
                  placeholder="Enter shop name"
                  onChangeText={
                    value =>
                      updateField(
                        'shopName',
                        value
                      )
                  }
                />

                <FormField
                  label="Description"
                  value={
                    form.description
                  }
                  placeholder="Tell customers about your flower shop"
                  multiline
                  onChangeText={
                    value =>
                      updateField(
                        'description',
                        value
                      )
                  }
                />

                <FormField
                  label="Contact Number"
                  value={
                    form.contactNumber
                  }
                  placeholder="Enter contact number"
                  keyboardType="phone-pad"
                  onChangeText={
                    value =>
                      updateField(
                        'contactNumber',
                        value
                      )
                  }
                />

                <FormField
                  label="Business Email"
                  value={
                    form.businessEmail
                  }
                  placeholder="Enter business email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={
                    value =>
                      updateField(
                        'businessEmail',
                        value
                      )
                  }
                />

                <Text
                  style={
                    styles.formSectionTitle
                  }
                >
                  Shop Address
                </Text>

                <FormField
                  label="Street"
                  value={
                    form.street
                  }
                  placeholder="Street / Building"
                  onChangeText={
                    value =>
                      updateField(
                        'street',
                        value
                      )
                  }
                />

                <FormField
                  label="Barangay"
                  value={
                    form.barangay
                  }
                  placeholder="Barangay"
                  onChangeText={
                    value =>
                      updateField(
                        'barangay',
                        value
                      )
                  }
                />

                <FormField
                  label="City"
                  value={
                    form.city
                  }
                  placeholder="City"
                  onChangeText={
                    value =>
                      updateField(
                        'city',
                        value
                      )
                  }
                />

                <FormField
                  label="Province"
                  value={
                    form.province
                  }
                  placeholder="Province"
                  onChangeText={
                    value =>
                      updateField(
                        'province',
                        value
                      )
                  }
                />

                <FormField
                  label="Postal Code"
                  value={
                    form.postalCode
                  }
                  placeholder="Postal code"
                  keyboardType="number-pad"
                  onChangeText={
                    value =>
                      updateField(
                        'postalCode',
                        value
                      )
                  }
                />

                <View
                  style={
                    styles.modalActions
                  }
                >
                  <Pressable
                    disabled={
                      saving
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.cancelButton,

                      pressed &&
                        styles.buttonPressed,
                    ]}
                    onPress={() =>
                      setEditVisible(
                        false
                      )
                    }
                  >
                    <Text
                      style={
                        styles.cancelButtonText
                      }
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      saving
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.saveButton,

                      pressed &&
                        styles.buttonPressed,

                      saving &&
                        styles.disabledButton,
                    ]}
                    onPress={
                      handleSaveProfile
                    }
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.saveButtonText
                        }
                      >
                        Save Changes
                      </Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
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
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <View
      style={
        styles.statCard
      }
    >
      <Text
        style={
          styles.statValue
        }
        numberOfLines={
          1
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
 * INFO ROW
 * =========================================================
 */

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        last &&
          styles.infoRowLast,
      ]}
    >
      <Text
        style={
          styles.infoLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.infoValue
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

/*
 * =========================================================
 * MENU ITEM
 * =========================================================
 */

function MenuItem({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({
        pressed,
      }) => [
        styles.menuItem,

        last &&
          styles.menuItemLast,

        pressed &&
          styles.buttonPressed,
      ]}
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.menuIconCircle
        }
      >
        <Text
          style={
            styles.menuIcon
          }
        >
          {icon}
        </Text>
      </View>

      <Text
        style={
          styles.menuLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          styles.menuArrow
        }
      >
        ›
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * BOTTOM NAV
 * =========================================================
 */

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.navItem
      }
      onPress={
        onPress
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
 * FORM FIELD
 * =========================================================
 */

function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (
    value: string
  ) => void;
  multiline?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad'
    | 'number-pad';
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
}) {
  return (
    <View
      style={
        styles.formGroup
      }
    >
      <Text
        style={
          styles.formLabel
        }
      >
        {label}
      </Text>

      <TextInput
        value={
          value
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#B0B2B0"
        onChangeText={
          onChangeText
        }
        multiline={
          multiline
        }
        keyboardType={
          keyboardType
        }
        autoCapitalize={
          autoCapitalize
        }
        style={[
          styles.input,

          multiline &&
            styles.multilineInput,
        ]}
      />
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

    loadingContainer: {
      flex: 1,
      backgroundColor:
        '#F5F6F5',
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        30,
    },

    loadingText: {
      marginTop: 12,
      color: '#7D847F',
      fontSize: 13,
    },

    errorTitle: {
      color: '#333333',
      fontSize: 18,
      fontWeight:
        '800',
      textAlign:
        'center',
    },

    errorText: {
      color: '#8A8A8A',
      fontSize: 13,
      textAlign:
        'center',
      marginTop: 8,
      lineHeight: 19,
    },

    retryButton: {
      backgroundColor:
        '#6FA382',
      paddingHorizontal:
        24,
      paddingVertical:
        12,
      borderRadius: 22,
      marginTop: 20,
    },

    retryButtonText: {
      color: '#FFFFFF',
      fontWeight:
        '700',
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 18,
    },

    /*
     * HEADER
     */

    header: {
      height: 106,
      backgroundColor:
        '#6FA382',
      paddingHorizontal:
        20,
      paddingTop: 23,
      overflow:
        'hidden',
    },

    headerCircleOne: {
      position:
        'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor:
        'rgba(255,255,255,0.06)',
      right: -45,
      top: -80,
    },

    headerCircleTwo: {
      position:
        'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        'rgba(255,255,255,0.05)',
      left: -30,
      bottom: -55,
    },

    headerRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    headerTitle: {
      color: '#FFFFFF',
      fontSize: 22,
      fontWeight:
        '800',
    },

    settingsButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(255,255,255,0.18)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    settingsIcon: {
      color: '#FFFFFF',
      fontSize: 17,
    },

    inlineError: {
      marginHorizontal:
        17,
      marginTop: 10,
      padding: 10,
      backgroundColor:
        '#FFF1F1',
      borderRadius: 10,
    },

    inlineErrorText: {
      color: '#B75C5C',
      fontSize: 10,
      textAlign:
        'center',
    },

    /*
     * PROFILE
     */

    profileCard: {
      backgroundColor:
        '#FFFFFF',
      marginHorizontal:
        17,
      marginTop: -26,
      borderRadius: 16,
      overflow:
        'hidden',
      elevation: 2,
    },

    coverArea: {
      height: 58,
      backgroundColor:
        '#DDF1DF',
    },

    profileContent: {
      paddingHorizontal:
        17,
      paddingBottom: 16,
    },

    logoWrapper: {
      width: 68,
      height: 68,
      borderRadius: 12,
      backgroundColor:
        '#FFFFFF',
      padding: 4,
      marginTop: -34,
      elevation: 2,
    },

    shopLogo: {
      width: '100%',
      height: '100%',
      borderRadius: 9,
    },

    logoPlaceholder: {
      flex: 1,
      backgroundColor:
        '#F2F7F3',
      borderRadius: 9,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    logoPlaceholderText: {
      fontSize: 28,
    },

    shopName: {
      color: '#37373A',
      fontSize: 18,
      fontWeight:
        '800',
      marginTop: 10,
    },

    shopLocation: {
      color: '#8B8B8F',
      fontSize: 10,
      marginTop: 3,
    },

    description: {
      color: '#79797D',
      fontSize: 10,
      lineHeight: 16,
      marginTop: 10,
    },

    badgeRow: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 12,
    },

    statusBadge: {
      paddingHorizontal:
        10,
      paddingVertical: 6,
      borderRadius: 14,
    },

    verifiedBadge: {
      backgroundColor:
        '#E8F5EB',
    },

    pendingBadge: {
      backgroundColor:
        '#FFF3DA',
    },

    statusBadgeText: {
      fontSize: 9,
      fontWeight:
        '700',
    },

    verifiedText: {
      color: '#62A276',
    },

    pendingText: {
      color: '#C59632',
    },

    openBadge: {
      backgroundColor:
        '#EDF8EF',
      paddingHorizontal:
        10,
      paddingVertical: 6,
      borderRadius: 14,
    },

    openBadgeText: {
      color: '#69A77B',
      fontSize: 9,
      fontWeight:
        '700',
    },

    closedBadge: {
      backgroundColor:
        '#F1F1F1',
      paddingHorizontal:
        10,
      paddingVertical: 6,
      borderRadius: 14,
    },

    closedBadgeText: {
      color: '#888888',
      fontSize: 9,
      fontWeight:
        '700',
    },

    /*
     * STATS
     */

    statsGrid: {
      flexDirection:
        'row',
      flexWrap: 'wrap',
      gap: 10,
      marginHorizontal:
        17,
      marginTop: 13,
    },

    statCard: {
      width: '48%',
      minHeight: 76,
      backgroundColor:
        '#FFFFFF',
      borderRadius: 14,
      paddingHorizontal:
        14,
      paddingVertical:
        14,
      elevation: 1,
    },

    statValue: {
      color: '#6FA382',
      fontSize: 18,
      fontWeight:
        '800',
    },

    statLabel: {
      color: '#A0A0A4',
      fontSize: 9,
      marginTop: 6,
    },

    /*
     * SECTIONS
     */

    sectionCard: {
      backgroundColor:
        '#FFFFFF',
      marginHorizontal:
        17,
      marginTop: 13,
      borderRadius: 16,
      paddingHorizontal:
        15,
      paddingVertical:
        14,
      elevation: 1,
    },

    sectionTitle: {
      color: '#3E3E41',
      fontSize: 12,
      fontWeight:
        '800',
      marginBottom: 8,
    },

    infoRow: {
      minHeight: 42,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
      gap: 12,
      borderBottomWidth:
        1,
      borderBottomColor:
        '#F1F1F1',
      paddingVertical: 8,
    },

    infoRowLast: {
      borderBottomWidth:
        0,
    },

    infoLabel: {
      color: '#9A9A9D',
      fontSize: 10,
    },

    infoValue: {
      flex: 1,
      color: '#565659',
      fontSize: 10,
      fontWeight:
        '600',
      textAlign:
        'right',
    },

    /*
     * MENU
     */

    menuCard: {
      backgroundColor:
        '#FFFFFF',
      marginHorizontal:
        17,
      marginTop: 13,
      borderRadius: 16,
      paddingHorizontal:
        13,
      elevation: 1,
    },

    menuItem: {
      minHeight: 57,
      flexDirection:
        'row',
      alignItems:
        'center',
      borderBottomWidth:
        1,
      borderBottomColor:
        '#F0F1F0',
    },

    menuItemLast: {
      borderBottomWidth:
        0,
    },

    menuIconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor:
        '#EAF5ED',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    menuIcon: {
      color: '#6FA382',
      fontSize: 14,
      fontWeight:
        '700',
    },

    menuLabel: {
      flex: 1,
      color: '#4B4B4E',
      fontSize: 11,
      fontWeight:
        '600',
      marginLeft: 12,
    },

    menuArrow: {
      color: '#B9BCBA',
      fontSize: 20,
    },

    /*
     * LOGOUT
     */

    logoutButton: {
      height: 49,
      backgroundColor:
        '#FFFFFF',
      marginHorizontal:
        17,
      marginTop: 13,
      borderRadius: 15,
      alignItems:
        'center',
      justifyContent:
        'center',
      elevation: 1,
    },

    logoutText: {
      color: '#6FA382',
      fontSize: 11,
      fontWeight:
        '700',
    },

    buttonPressed: {
      opacity: 0.7,
    },

    disabledButton: {
      opacity: 0.55,
    },

    bottomSpacer: {
      height: 8,
    },

    /*
     * BOTTOM NAV
     */

    bottomNavigation: {
      height: 72,
      backgroundColor:
        '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor:
        '#ECEEEC',
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-around',
      paddingBottom: 4,
    },

    navItem: {
      flex: 1,
      height: '100%',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    navIconContainer: {
      minWidth: 32,
      height: 28,
      borderRadius: 14,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    activeNavIconContainer: {
      backgroundColor:
        '#EAF4ED',
    },

    navIcon: {
      color: '#9BA19D',
      fontSize: 15,
    },

    activeNavIcon: {
      color: '#6EA382',
    },

    navText: {
      color: '#A4A5A6',
      fontSize: 8,
      marginTop: 3,
    },

    activeNavText: {
      color: '#6EA382',
      fontWeight:
        '700',
    },

    /*
     * EDIT MODAL
     */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.35)',
      justifyContent:
        'flex-end',
    },

    modalContainer: {
      height: '88%',
      backgroundColor:
        '#F7F8F7',
      borderTopLeftRadius:
        24,
      borderTopRightRadius:
        24,
      overflow: 'hidden',
    },

    modalHeader: {
      backgroundColor:
        '#6FA382',
      paddingHorizontal:
        20,
      paddingTop: 18,
      paddingBottom: 17,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },

    modalTitle: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight:
        '800',
    },

    modalSubtitle: {
      color:
        'rgba(255,255,255,0.78)',
      fontSize: 9,
      marginTop: 3,
    },

    modalClose: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        'rgba(255,255,255,0.16)',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    modalCloseText: {
      color: '#FFFFFF',
      fontSize: 26,
      lineHeight: 28,
    },

    modalScrollContent: {
      padding: 18,
      paddingBottom: 35,
    },

    formSectionTitle: {
      color: '#3F4140',
      fontSize: 13,
      fontWeight:
        '800',
      marginTop: 6,
      marginBottom: 12,
    },

    formGroup: {
      marginBottom: 14,
    },

    formLabel: {
      color: '#555A57',
      fontSize: 10,
      fontWeight:
        '700',
      marginBottom: 6,
    },

    input: {
      minHeight: 47,
      backgroundColor:
        '#FFFFFF',
      borderWidth: 1,
      borderColor:
        '#E1E5E2',
      borderRadius: 12,
      paddingHorizontal:
        13,
      color: '#404341',
      fontSize: 12,
    },

    multilineInput: {
      minHeight: 95,
      paddingTop: 12,
      paddingBottom: 12,
      textAlignVertical:
        'top',
    },

    modalActions: {
      flexDirection:
        'row',
      gap: 10,
      marginTop: 8,
    },

    cancelButton: {
      flex: 1,
      height: 48,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        '#6FA382',
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#FFFFFF',
    },

    cancelButtonText: {
      color: '#6FA382',
      fontSize: 11,
      fontWeight:
        '800',
    },

    saveButton: {
      flex: 1,
      height: 48,
      borderRadius: 13,
      backgroundColor:
        '#6FA382',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight:
        '800',
    },
  });