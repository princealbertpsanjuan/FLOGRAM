import {
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  apiRequest,
} from '../../services/api';

import {
  getCurrentUser,
  logout,
  type AuthUser,
} from '../../services/auth';

import {
  getMyReviews,
} from '../../services/review';

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type IoniconName =
  ComponentProps<
    typeof Ionicons
  >['name'];

type ProfileResponse = {
  success: boolean;

  message: string;

  data: {
    user: AuthUser;
  };
};

type ProfileMenuItemProps = {
  icon: IoniconName;

  title: string;

  subtitle: string;

  onPress: () => void;

  badge?: string | number | null;

  danger?: boolean;
};

/*
 * =========================================================
 * COLORS
 * =========================================================
 */

const PINK =
  '#DE5A8B';

const PINK_DARK =
  '#C94D7B';

const PINK_LIGHT =
  '#FFF0F5';

const BACKGROUND =
  '#FAF8F9';

const WHITE =
  '#FFFFFF';

const TEXT =
  '#40383F';

const TEXT_SECONDARY =
  '#8C8388';

const BORDER =
  '#F0EAED';

const GREEN =
  '#4A9B72';

const RED =
  '#C95B6B';

const RED_LIGHT =
  '#FFF0F2';

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getErrorMessage = (
  error: unknown
) => {
  if (
    typeof error ===
      'object' &&
    error !== null &&
    'message' in error &&
    typeof (
      error as {
        message?: unknown;
      }
    ).message ===
      'string'
  ) {
    return (
      error as {
        message: string;
      }
    ).message;
  }

  return 'Something went wrong. Please try again.';
};

const capitalize = (
  value?: string | null
) => {
  if (!value) {
    return 'Unknown';
  }

  return (
    value
      .charAt(0)
      .toUpperCase() +
    value
      .slice(1)
      .replaceAll('_', ' ')
  );
};

const isValidPhilippinePhone = (
  value: string
) => {
  return /^(09|\+639)\d{9}$/.test(
    value
  );
};

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerProfileScreen() {
  const [
    user,
    setUser,
  ] =
    useState<AuthUser | null>(
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
    reviewCount,
    setReviewCount,
  ] =
    useState(0);

  const [
    editVisible,
    setEditVisible,
  ] =
    useState(false);

  const [
    firstName,
    setFirstName,
  ] =
    useState('');

  const [
    lastName,
    setLastName,
  ] =
    useState('');

  const [
    phoneNumber,
    setPhoneNumber,
  ] =
    useState('');

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  /*
   * =======================================================
   * LOAD PROFILE
   * =======================================================
   */

  const loadProfile =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (
            showLoader
          ) {
            setLoading(
              true
            );
          }

          const [
            currentUser,
            reviewsResult,
          ] =
            await Promise.allSettled(
              [
                getCurrentUser(),
                getMyReviews(),
              ]
            );

          if (
            currentUser.status ===
            'fulfilled'
          ) {
            setUser(
              currentUser.value
            );
          } else {
            throw currentUser.reason;
          }

          if (
            reviewsResult.status ===
            'fulfilled'
          ) {
            const result =
              reviewsResult.value;

            setReviewCount(
              typeof result.count ===
                'number'
                ? result.count
                : Array.isArray(
                      result.reviews
                    )
                  ? result
                      .reviews
                      .length
                  : 0
            );
          } else {
            setReviewCount(
              0
            );
          }
        } catch (error) {
          Alert.alert(
            'Unable to Load Profile',
            getErrorMessage(
              error
            )
          );
        } finally {
          setLoading(
            false
          );

          setRefreshing(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  /*
   * =======================================================
   * PROFILE VALUES
   * =======================================================
   */

  const initials =
    useMemo(() => {
      const first =
        user?.firstName
          ?.trim()
          .charAt(0) ??
        '';

      const last =
        user?.lastName
          ?.trim()
          .charAt(0) ??
        '';

      const value =
        `${first}${last}`
          .trim()
          .toUpperCase();

      return (
        value || 'C'
      );
    }, [user]);

  const fullName =
    useMemo(() => {
      if (!user) {
        return 'Customer';
      }

      return [
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(' ');
    }, [user]);

  /*
   * =======================================================
   * EDIT PROFILE
   * =======================================================
   */

  const openEditProfile =
    () => {
      if (!user) {
        return;
      }

      setFirstName(
        user.firstName
      );

      setLastName(
        user.lastName
      );

      setPhoneNumber(
        user.phoneNumber
      );

      setEditVisible(
        true
      );
    };

  const closeEditProfile =
    () => {
      if (
        savingProfile
      ) {
        return;
      }

      setEditVisible(
        false
      );
    };

  const saveProfile =
    async () => {
      const cleanedFirstName =
        firstName.trim();

      const cleanedLastName =
        lastName.trim();

      const cleanedPhone =
        phoneNumber.trim();

      if (
        !cleanedFirstName ||
        !cleanedLastName ||
        !cleanedPhone
      ) {
        Alert.alert(
          'Missing Information',
          'First name, last name, and phone number are required.'
        );

        return;
      }

      if (
        cleanedFirstName.length >
          50 ||
        cleanedLastName.length >
          50
      ) {
        Alert.alert(
          'Invalid Name',
          'First name and last name cannot exceed 50 characters.'
        );

        return;
      }

      if (
        !isValidPhilippinePhone(
          cleanedPhone
        )
      ) {
        Alert.alert(
          'Invalid Phone Number',
          'Enter a valid Philippine phone number, such as 09171234567.'
        );

        return;
      }

      try {
        setSavingProfile(
          true
        );

        const response =
          await apiRequest<ProfileResponse>(
            '/users/me',
            {
              method:
                'PATCH',

              authenticated:
                true,

              body:
                JSON.stringify(
                  {
                    firstName:
                      cleanedFirstName,

                    lastName:
                      cleanedLastName,

                    phoneNumber:
                      cleanedPhone,
                  }
                ),
            }
          );

        setUser(
          response.data.user
        );

        /*
         * Refresh the SecureStore copy
         * used by other Customer pages.
         */
        const refreshedUser =
          await getCurrentUser();

        setUser(
          refreshedUser
        );

        setEditVisible(
          false
        );

        Alert.alert(
          'Profile Updated',
          'Your account information has been updated successfully.'
        );
      } catch (error) {
        Alert.alert(
          'Update Failed',
          getErrorMessage(
            error
          )
        );
      } finally {
        setSavingProfile(
          false
        );
      }
    };

  /*
   * =======================================================
   * LOGOUT
   * =======================================================
   */

  const performLogout =
    async () => {
      try {
        setLoggingOut(
          true
        );

        await logout();

        /*
         * Route groups do not appear
         * in the URL. If your login
         * file is app/(auth)/login.tsx,
         * its route is /login.
         */
        router.replace(
          '/login' as never
        );
      } catch (error) {
        Alert.alert(
          'Logout Failed',
          getErrorMessage(
            error
          )
        );
      } finally {
        setLoggingOut(
          false
        );
      }
    };

  const confirmLogout =
    () => {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out of your FLOGRAM account?',
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

            onPress: () => {
              void performLogout();
            },
          },
        ]
      );
    };

  /*
   * =======================================================
   * LOADING
   * =======================================================
   */

  if (
    loading &&
    !user
  ) {
    return (
      <SafeAreaView
        style={
          styles.safeArea
        }
      >
        <View
          style={
            styles.centerContainer
          }
        >
          <View
            style={
              styles.loadingFlower
            }
          >
            <Ionicons
              name="flower"
              size={28}
              color={PINK}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PINK}
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading your
            FLOGRAM profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * =======================================================
   * UI
   * =======================================================
   */

  return (
    <SafeAreaView
      style={
        styles.safeArea
      }
    >
      <View
        style={
          styles.screen
        }
      >
        {/*
         * ===============================================
         * HEADER
         * ===============================================
         */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerSpacer
            }
          />

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Me
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              My FLOGRAM
              account
            </Text>
          </View>

          <Pressable
            style={
              styles.headerButton
            }
            onPress={() =>
              router.push(
                '/(customer)/customer-notifications' as never
              )
            }
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={TEXT}
            />
          </Pressable>
        </View>

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
              tintColor={
                PINK
              }
              onRefresh={() => {
                setRefreshing(
                  true
                );

                void loadProfile(
                  false
                );
              }}
            />
          }
        >
          {/*
           * =============================================
           * PROFILE CARD
           * =============================================
           */}

          <View
            style={
              styles.profileCard
            }
          >
            <View
              style={
                styles.profileAccent
              }
            />

            <View
              style={
                styles.profileBody
              }
            >
              <View
                style={
                  styles.avatarWrapper
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

                <View
                  style={
                    styles.avatarBadge
                  }
                >
                  <Ionicons
                    name="flower"
                    size={12}
                    color={
                      WHITE
                    }
                  />
                </View>
              </View>

              <View
                style={
                  styles.profileInfo
                }
              >
                <Text
                  style={
                    styles.profileName
                  }
                  numberOfLines={
                    1
                  }
                >
                  {fullName}
                </Text>

                <View
                  style={
                    styles.roleBadge
                  }
                >
                  <Text
                    style={
                      styles.roleBadgeText
                    }
                  >
                    CUSTOMER
                  </Text>
                </View>

                <View
                  style={
                    styles.emailRow
                  }
                >
                  <Ionicons
                    name="mail-outline"
                    size={13}
                    color={
                      TEXT_SECONDARY
                    }
                  />

                  <Text
                    style={
                      styles.emailText
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {user?.email ||
                      '—'}
                  </Text>
                </View>
              </View>

              <Pressable
                style={
                  styles.editIconButton
                }
                onPress={
                  openEditProfile
                }
              >
                <Ionicons
                  name="pencil-outline"
                  size={18}
                  color={PINK}
                />
              </Pressable>
            </View>

            <View
              style={
                styles.profileFooter
              }
            >
              <View
                style={
                  styles.profileFooterItem
                }
              >
                <Text
                  style={
                    styles.profileFooterLabel
                  }
                >
                  PHONE
                </Text>

                <Text
                  style={
                    styles.profileFooterValue
                  }
                  numberOfLines={
                    1
                  }
                >
                  {user?.phoneNumber ||
                    'Not available'}
                </Text>
              </View>

              <View
                style={
                  styles.profileFooterDivider
                }
              />

              <View
                style={
                  styles.profileFooterItem
                }
              >
                <Text
                  style={
                    styles.profileFooterLabel
                  }
                >
                  STATUS
                </Text>

                <View
                  style={
                    styles.statusInline
                  }
                >
                  <View
                    style={[
                      styles.statusDot,

                      user?.accountStatus ===
                      'active'
                        ? styles.statusDotActive
                        : styles.statusDotInactive,
                    ]}
                  />

                  <Text
                    style={
                      styles.profileFooterValue
                    }
                  >
                    {capitalize(
                      user?.accountStatus
                    )}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/*
           * =============================================
           * QUICK ACTIONS
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            MY FLOGRAM
          </Text>

          <View
            style={
              styles.quickCard
            }
          >
            <QuickAction
              icon="receipt-outline"
              title="Orders"
              onPress={() =>
                router.push(
                  '/(customer)/customer-orders' as never
                )
              }
            />

            <View
              style={
                styles.quickDivider
              }
            />

            <QuickAction
              icon="notifications-outline"
              title="Updates"
              onPress={() =>
                router.push(
                  '/(customer)/customer-notifications' as never
                )
              }
            />

            <View
              style={
                styles.quickDivider
              }
            />

            <QuickAction
              icon="star-outline"
              title="Reviews"
              badge={
                reviewCount >
                0
                  ? reviewCount
                  : undefined
              }
              onPress={() =>
                router.push(
                  '/(customer)/customer-orders' as never
                )
              }
            />

            <View
              style={
                styles.quickDivider
              }
            />

            <QuickAction
              icon="settings-outline"
              title="Settings"
              onPress={() =>
                router.push(
                  '/(customer)/customer-settings' as never
                )
              }
            />
          </View>

          {/*
           * =============================================
           * ACCOUNT & PROFILE
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            ACCOUNT & PROFILE
          </Text>

          <View
            style={
              styles.menuCard
            }
          >
            <ProfileMenuItem
              icon="person-outline"
              title="Personal Information"
              subtitle="Update your name and phone number"
              onPress={
                openEditProfile
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="settings-outline"
              title="Account Settings"
              subtitle="Password, account information and security"
              onPress={() =>
                router.push(
                  '/(customer)/customer-settings' as never
                )
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="shield-checkmark-outline"
              title="Account Status"
              subtitle={`Your account is currently ${capitalize(
                user?.accountStatus
              ).toLowerCase()}`}
              onPress={() =>
                Alert.alert(
                  'Account Status',
                  `Your FLOGRAM customer account is currently ${capitalize(
                    user?.accountStatus
                  ).toLowerCase()}.`
                )
              }
            />
          </View>

          {/*
           * =============================================
           * ACTIVITY
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            CUSTOMER ACTIVITY
          </Text>

          <View
            style={
              styles.menuCard
            }
          >
            <ProfileMenuItem
              icon="receipt-outline"
              title="My Orders"
              subtitle="View active, completed and cancelled orders"
              onPress={() =>
                router.push(
                  '/(customer)/customer-orders' as never
                )
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="star-outline"
              title="Completed Orders & Reviews"
              subtitle={
                reviewCount >
                0
                  ? `${reviewCount} review${
                      reviewCount ===
                      1
                        ? ''
                        : 's'
                    } submitted`
                  : 'Review your completed FLOGRAM transactions'
              }
              badge={
                reviewCount >
                0
                  ? reviewCount
                  : null
              }
              onPress={() =>
                router.push(
                  '/(customer)/customer-orders' as never
                )
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="notifications-outline"
              title="Notifications"
              subtitle="Order, payment and delivery updates"
              onPress={() =>
                router.push(
                  '/(customer)/customer-notifications' as never
                )
              }
            />
          </View>

          {/*
           * =============================================
           * FLOGRAM SHORTCUTS
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            EXPLORE FLOGRAM
          </Text>

          <View
            style={
              styles.menuCard
            }
          >
            <ProfileMenuItem
              icon="flower-outline"
              title="Discover Flowers"
              subtitle="Browse and search available bouquets"
              onPress={() =>
                router.push(
                  '/(customer)/customer-discover' as never
                )
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="people-outline"
              title="BloomBoard"
              subtitle="Bouquet inspirations and custom requests"
              onPress={() =>
                router.push(
                  '/(customer)/customer-bloomboard' as never
                )
              }
            />

            <MenuDivider />

            <ProfileMenuItem
              icon="sparkles-outline"
              title="FLOGRAM AI"
              subtitle="AI-assisted bouquet recommendations"
              onPress={() =>
                router.push(
                  '/(customer)/customer-ai' as never
                )
              }
            />
          </View>

          {/*
           * =============================================
           * LOGOUT
           * =============================================
           */}

          <Pressable
            style={
              styles.logoutButton
            }
            disabled={
              loggingOut
            }
            onPress={
              confirmLogout
            }
          >
            {loggingOut ? (
              <ActivityIndicator
                size="small"
                color={RED}
              />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={20}
                color={RED}
              />
            )}

            <Text
              style={
                styles.logoutText
              }
            >
              {loggingOut
                ? 'Logging Out...'
                : 'Log Out'}
            </Text>
          </Pressable>

          <View
            style={
              styles.footer
            }
          >
            <View
              style={
                styles.footerBrandRow
              }
            >
              <Ionicons
                name="flower"
                size={16}
                color={PINK}
              />

              <Text
                style={
                  styles.footerBrand
                }
              >
                FLOGRAM
              </Text>
            </View>

            <Text
              style={
                styles.footerCaption
              }
            >
              Flowers made more
              meaningful.
            </Text>
          </View>

          <View
            style={{
              height: 95,
            }}
          />
        </ScrollView>

        {/*
         * ===============================================
         * BOTTOM NAVIGATION
         * ===============================================
         */}

        <View
          style={
            styles.bottomNavigation
          }
        >
          <BottomNavItem
            icon="home-outline"
            label="Home"
            onPress={() =>
              router.push(
                '/(customer)/customer-dashboard' as never
              )
            }
          />

          <BottomNavItem
            icon="search-outline"
            label="Discover"
            onPress={() =>
              router.push(
                '/(customer)/customer-discover' as never
              )
            }
          />

          <BottomNavItem
            icon="flower-outline"
            label="Bloom"
            onPress={() =>
              router.push(
                '/(customer)/customer-bloomboard' as never
              )
            }
          />

          <BottomNavItem
            icon="cart-outline"
            label="Cart"
            onPress={() =>
              router.push(
                '/(customer)/customer-cart' as never
              )
            }
          />

          <BottomNavItem
            icon="sparkles-outline"
            label="AI"
            onPress={() =>
              router.push(
                '/(customer)/customer-ai' as never
              )
            }
          />

          <BottomNavItem
            icon="person"
            label="Me"
            active
            onPress={() => {}}
          />
        </View>

        {/*
         * ===============================================
         * EDIT PROFILE MODAL
         * ===============================================
         */}

        <Modal
          visible={
            editVisible
          }
          transparent
          animationType="slide"
          onRequestClose={
            closeEditProfile
          }
        >
          <KeyboardAvoidingView
            style={
              styles.modalOverlay
            }
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            <Pressable
              style={
                styles.modalBackdrop
              }
              onPress={
                closeEditProfile
              }
            />

            <View
              style={
                styles.modalCard
              }
            >
              <View
                style={
                  styles.modalHandle
                }
              />

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
                    Edit Profile
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Keep your account
                    information accurate
                  </Text>
                </View>

                <Pressable
                  style={
                    styles.modalCloseButton
                  }
                  onPress={
                    closeEditProfile
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color={TEXT}
                  />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  FIRST NAME
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={
                      TEXT_SECONDARY
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      firstName
                    }
                    onChangeText={
                      setFirstName
                    }
                    placeholder="First name"
                    placeholderTextColor="#B8AFB4"
                    editable={
                      !savingProfile
                    }
                    maxLength={
                      50
                    }
                  />
                </View>

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  LAST NAME
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }
                >
                  <Ionicons
                    name="person-outline"
                    size={18}
                    color={
                      TEXT_SECONDARY
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      lastName
                    }
                    onChangeText={
                      setLastName
                    }
                    placeholder="Last name"
                    placeholderTextColor="#B8AFB4"
                    editable={
                      !savingProfile
                    }
                    maxLength={
                      50
                    }
                  />
                </View>

                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  EMAIL ADDRESS
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    styles.readOnlyInput,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color="#AAA1A6"
                  />

                  <Text
                    style={
                      styles.readOnlyText
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {user?.email ||
                      ''}
                  </Text>

                  <Ionicons
                    name="lock-closed-outline"
                    size={15}
                    color="#B7AFB3"
                  />
                </View>

                <Text
                  style={
                    styles.inputHint
                  }
                >
                  Your email address
                  cannot currently be
                  changed.
                </Text>

                <Text
                  style={[
                    styles.inputLabel,
                    styles.phoneLabel,
                  ]}
                >
                  PHONE NUMBER
                </Text>

                <View
                  style={
                    styles.inputContainer
                  }
                >
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={
                      TEXT_SECONDARY
                    }
                  />

                  <TextInput
                    style={
                      styles.input
                    }
                    value={
                      phoneNumber
                    }
                    onChangeText={
                      setPhoneNumber
                    }
                    keyboardType="phone-pad"
                    placeholder="09171234567"
                    placeholderTextColor="#B8AFB4"
                    editable={
                      !savingProfile
                    }
                    maxLength={
                      13
                    }
                  />
                </View>

                <Pressable
                  style={[
                    styles.saveButton,

                    savingProfile &&
                      styles.disabledButton,
                  ]}
                  disabled={
                    savingProfile
                  }
                  onPress={() => {
                    void saveProfile();
                  }}
                >
                  {savingProfile ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        WHITE
                      }
                    />
                  ) : (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color={
                        WHITE
                      }
                    />
                  )}

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {savingProfile
                      ? 'Saving...'
                      : 'Save Changes'}
                  </Text>
                </Pressable>

                <Pressable
                  style={
                    styles.cancelButton
                  }
                  disabled={
                    savingProfile
                  }
                  onPress={
                    closeEditProfile
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * QUICK ACTION
 * =========================================================
 */

function QuickAction({
  icon,
  title,
  badge,
  onPress,
}: {
  icon: IoniconName;

  title: string;

  badge?: number;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.quickAction
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.quickIconWrapper
        }
      >
        <Ionicons
          name={icon}
          size={21}
          color={PINK}
        />

        {badge !==
        undefined ? (
          <View
            style={
              styles.quickBadge
            }
          >
            <Text
              style={
                styles.quickBadgeText
              }
            >
              {badge >
              99
                ? '99+'
                : badge}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={
          styles.quickActionText
        }
      >
        {title}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * MENU ITEM
 * =========================================================
 */

function ProfileMenuItem({
  icon,
  title,
  subtitle,
  onPress,
  badge,
  danger = false,
}: ProfileMenuItemProps) {
  return (
    <Pressable
      style={
        styles.menuItem
      }
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.menuIcon,

          danger &&
            styles.menuIconDanger,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={
            danger
              ? RED
              : PINK
          }
        />
      </View>

      <View
        style={
          styles.menuContent
        }
      >
        <Text
          style={[
            styles.menuTitle,

            danger &&
              styles.menuTitleDanger,
          ]}
        >
          {title}
        </Text>

        <Text
          style={
            styles.menuSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      {badge !==
        undefined &&
      badge !== null ? (
        <View
          style={
            styles.menuBadge
          }
        >
          <Text
            style={
              styles.menuBadgeText
            }
          >
            {badge}
          </Text>
        </View>
      ) : null}

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#BCB4B8"
      />
    </Pressable>
  );
}

function MenuDivider() {
  return (
    <View
      style={
        styles.menuDivider
      }
    />
  );
}

/*
 * =========================================================
 * BOTTOM NAVIGATION
 * =========================================================
 */

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: IoniconName;

  label: string;

  active?: boolean;

  onPress: () => void;
}) {
  return (
    <Pressable
      style={
        styles.bottomNavItem
      }
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.bottomNavIcon,

          active &&
            styles.bottomNavIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={
            active
              ? PINK
              : '#938C90'
          }
        />
      </View>

      <Text
        style={[
          styles.bottomNavLabel,

          active &&
            styles.bottomNavLabelActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,

      backgroundColor:
        WHITE,
    },

    screen: {
      flex: 1,

      backgroundColor:
        BACKGROUND,
    },

    centerContainer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        BACKGROUND,

      paddingHorizontal:
        30,
    },

    loadingFlower: {
      width: 58,

      height: 58,

      borderRadius:
        29,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,

      marginBottom: 15,
    },

    loadingText: {
      marginTop: 11,

      color:
        TEXT_SECONDARY,

      fontSize: 11,
    },

    header: {
      height: 70,

      paddingHorizontal:
        15,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        WHITE,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        BORDER,
    },

    headerSpacer: {
      width: 42,
    },

    headerCenter: {
      flex: 1,

      alignItems:
        'center',
    },

    headerTitle: {
      color:
        TEXT,

      fontSize: 20,

      fontWeight:
        '900',
    },

    headerSubtitle: {
      marginTop: 1,

      color:
        TEXT_SECONDARY,

      fontSize: 9.5,
    },

    headerButton: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        15,

      paddingTop: 15,
    },

    profileCard: {
      overflow:
        'hidden',

      backgroundColor:
        WHITE,

      borderRadius:
        22,

      borderWidth: 1,

      borderColor:
        BORDER,

      marginBottom: 22,
    },

    profileAccent: {
      height: 7,

      backgroundColor:
        PINK,
    },

    profileBody: {
      flexDirection:
        'row',

      alignItems:
        'center',

      padding: 17,
    },

    avatarWrapper: {
      width: 72,

      height: 72,

      position:
        'relative',
    },

    avatar: {
      width: 72,

      height: 72,

      borderRadius:
        36,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,

      borderWidth: 2,

      borderColor:
        '#F4C9D9',
    },

    avatarText: {
      color:
        PINK_DARK,

      fontSize: 22,

      fontWeight:
        '900',
    },

    avatarBadge: {
      position:
        'absolute',

      right: -1,

      bottom: -1,

      width: 25,

      height: 25,

      borderRadius:
        13,

      backgroundColor:
        PINK,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 2,

      borderColor:
        WHITE,
    },

    profileInfo: {
      flex: 1,

      marginLeft: 14,

      minWidth: 0,
    },

    profileName: {
      color:
        TEXT,

      fontSize: 17,

      fontWeight:
        '900',
    },

    roleBadge: {
      alignSelf:
        'flex-start',

      marginTop: 5,

      paddingHorizontal:
        8,

      paddingVertical:
        3,

      borderRadius:
        8,

      backgroundColor:
        PINK_LIGHT,
    },

    roleBadgeText: {
      color:
        PINK_DARK,

      fontSize: 8,

      fontWeight:
        '900',

      letterSpacing:
        0.6,
    },

    emailRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      marginTop: 8,
    },

    emailText: {
      flex: 1,

      color:
        TEXT_SECONDARY,

      fontSize: 10,
    },

    editIconButton: {
      width: 38,

      height: 38,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,
    },

    profileFooter: {
      minHeight: 64,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        '#FFF9FB',

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        BORDER,
    },

    profileFooterItem: {
      flex: 1,

      paddingHorizontal:
        15,
    },

    profileFooterLabel: {
      color:
        '#AAA1A6',

      fontSize: 8,

      fontWeight:
        '800',

      letterSpacing:
        0.7,
    },

    profileFooterValue: {
      marginTop: 4,

      color:
        TEXT,

      fontSize: 10.5,

      fontWeight:
        '700',
    },

    profileFooterDivider: {
      width:
        StyleSheet.hairlineWidth,

      height: 33,

      backgroundColor:
        BORDER,
    },

    statusInline: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 6,
    },

    statusDot: {
      marginTop: 4,

      width: 7,

      height: 7,

      borderRadius:
        4,
    },

    statusDotActive: {
      backgroundColor:
        GREEN,
    },

    statusDotInactive: {
      backgroundColor:
        RED,
    },

    sectionLabel: {
      color:
        '#A1989D',

      fontSize: 9,

      fontWeight:
        '900',

      letterSpacing:
        1,

      marginLeft: 3,

      marginBottom: 8,
    },

    quickCard: {
      minHeight: 92,

      flexDirection:
        'row',

      alignItems:
        'center',

      backgroundColor:
        WHITE,

      borderWidth: 1,

      borderColor:
        BORDER,

      borderRadius:
        18,

      paddingHorizontal:
        4,

      marginBottom: 22,
    },

    quickAction: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        13,
    },

    quickIconWrapper: {
      width: 42,

      height: 42,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,

      position:
        'relative',
    },

    quickBadge: {
      position:
        'absolute',

      top: -5,

      right: -6,

      minWidth: 18,

      height: 18,

      borderRadius:
        9,

      paddingHorizontal:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK,

      borderWidth: 2,

      borderColor:
        WHITE,
    },

    quickBadgeText: {
      color:
        WHITE,

      fontSize: 7,

      fontWeight:
        '900',
    },

    quickActionText: {
      marginTop: 6,

      color:
        '#5C5559',

      fontSize: 9,

      fontWeight:
        '800',
    },

    quickDivider: {
      width:
        StyleSheet.hairlineWidth,

      height: 42,

      backgroundColor:
        BORDER,
    },

    menuCard: {
      backgroundColor:
        WHITE,

      borderWidth: 1,

      borderColor:
        BORDER,

      borderRadius:
        18,

      paddingHorizontal:
        13,

      marginBottom: 22,
    },

    menuItem: {
      minHeight: 70,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    menuIcon: {
      width: 40,

      height: 40,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,
    },

    menuIconDanger: {
      backgroundColor:
        RED_LIGHT,
    },

    menuContent: {
      flex: 1,

      marginLeft: 11,

      marginRight: 8,
    },

    menuTitle: {
      color:
        TEXT,

      fontSize: 12,

      fontWeight:
        '800',
    },

    menuTitleDanger: {
      color:
        RED,
    },

    menuSubtitle: {
      marginTop: 3,

      color:
        TEXT_SECONDARY,

      fontSize: 9.5,

      lineHeight: 13,
    },

    menuBadge: {
      minWidth: 24,

      height: 24,

      paddingHorizontal:
        6,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK,

      marginRight: 7,
    },

    menuBadgeText: {
      color:
        WHITE,

      fontSize: 9,

      fontWeight:
        '900',
    },

    menuDivider: {
      height:
        StyleSheet.hairlineWidth,

      backgroundColor:
        BORDER,

      marginLeft: 51,
    },

    logoutButton: {
      height: 52,

      borderRadius:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,

      backgroundColor:
        RED_LIGHT,

      borderWidth: 1,

      borderColor:
        '#F1CCD2',

      marginBottom: 22,
    },

    logoutText: {
      color:
        RED,

      fontSize: 13,

      fontWeight:
        '800',
    },

    footer: {
      alignItems:
        'center',

      paddingVertical:
        8,
    },

    footerBrandRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,
    },

    footerBrand: {
      color:
        PINK,

      fontSize: 12,

      fontWeight:
        '900',

      letterSpacing:
        1.4,
    },

    footerCaption: {
      marginTop: 3,

      color:
        '#AAA1A6',

      fontSize: 9,
    },

    bottomNavigation: {
      minHeight: 72,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        5,

      paddingTop: 7,

      paddingBottom: 8,

      backgroundColor:
        WHITE,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        BORDER,
    },

    bottomNavItem: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    bottomNavIcon: {
      width: 34,

      height: 30,

      borderRadius:
        11,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    bottomNavIconActive: {
      backgroundColor:
        PINK_LIGHT,
    },

    bottomNavLabel: {
      marginTop: 2,

      color:
        '#938C90',

      fontSize: 8,

      fontWeight:
        '700',
    },

    bottomNavLabelActive: {
      color:
        PINK,

      fontWeight:
        '900',
    },

    modalOverlay: {
      flex: 1,

      justifyContent:
        'flex-end',
    },

    modalBackdrop: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(38, 30, 35, 0.45)',
    },

    modalCard: {
      maxHeight:
        '88%',

      backgroundColor:
        WHITE,

      borderTopLeftRadius:
        26,

      borderTopRightRadius:
        26,

      paddingHorizontal:
        20,

      paddingTop: 10,

      paddingBottom: 28,
    },

    modalHandle: {
      width: 42,

      height: 4,

      borderRadius:
        2,

      alignSelf:
        'center',

      backgroundColor:
        '#DDD6DA',

      marginBottom: 17,
    },

    modalHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom: 20,
    },

    modalTitle: {
      color:
        TEXT,

      fontSize: 20,

      fontWeight:
        '900',
    },

    modalSubtitle: {
      marginTop: 3,

      color:
        TEXT_SECONDARY,

      fontSize: 10,
    },

    modalCloseButton: {
      width: 38,

      height: 38,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F7F3F5',
    },

    inputLabel: {
      marginBottom: 7,

      color:
        '#8E858A',

      fontSize: 9,

      fontWeight:
        '900',

      letterSpacing:
        0.8,
    },

    phoneLabel: {
      marginTop: 16,
    },

    inputContainer: {
      height: 52,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      paddingHorizontal:
        14,

      borderRadius:
        15,

      backgroundColor:
        '#FBF9FA',

      borderWidth: 1,

      borderColor:
        '#EDE7EA',

      marginBottom: 16,
    },

    input: {
      flex: 1,

      color:
        TEXT,

      fontSize: 12,

      paddingVertical: 0,
    },

    readOnlyInput: {
      backgroundColor:
        '#F5F3F4',

      marginBottom: 5,
    },

    readOnlyText: {
      flex: 1,

      color:
        '#91898D',

      fontSize: 11.5,
    },

    inputHint: {
      color:
        '#AAA1A6',

      fontSize: 8.5,

      marginLeft: 3,

      marginBottom: 2,
    },

    saveButton: {
      height: 52,

      marginTop: 8,

      borderRadius:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 8,

      backgroundColor:
        PINK,
    },

    disabledButton: {
      opacity: 0.6,
    },

    saveButtonText: {
      color:
        WHITE,

      fontSize: 12,

      fontWeight:
        '900',
    },

    cancelButton: {
      height: 48,

      marginTop: 9,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    cancelButtonText: {
      color:
        TEXT_SECONDARY,

      fontSize: 11,

      fontWeight:
        '800',
    },
  });