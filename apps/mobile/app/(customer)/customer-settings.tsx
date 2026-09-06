import {
  type ComponentProps,
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

/*
 * =========================================================
 * TYPES
 * =========================================================
 */

type IoniconName =
  ComponentProps<
    typeof Ionicons
  >['name'];

type ChangePasswordResponse = {
  success: boolean;

  message: string;
};

/*
 * =========================================================
 * COLORS
 * =========================================================
 */

const PINK =
  '#DE5A8B';

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

const GREEN_LIGHT =
  '#EDF8F2';

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

/*
 * =========================================================
 * SCREEN
 * =========================================================
 */

export default function CustomerSettingsScreen() {
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
    currentPassword,
    setCurrentPassword,
  ] =
    useState('');

  const [
    newPassword,
    setNewPassword,
  ] =
    useState('');

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] =
    useState('');

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] =
    useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] =
    useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  /*
   * =======================================================
   * LOAD USER
   * =======================================================
   */

  const loadUser =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          const result =
            await getCurrentUser();

          setUser(
            result
          );
        } catch (error) {
          Alert.alert(
            'Unable to Load Settings',
            getErrorMessage(
              error
            )
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      void loadUser();
    }, [loadUser])
  );

  /*
   * =======================================================
   * PASSWORD VALIDATION
   * =======================================================
   */

  const validatePassword =
    () => {
      if (
        !currentPassword ||
        !newPassword ||
        !confirmNewPassword
      ) {
        Alert.alert(
          'Missing Information',
          'Please complete all password fields.'
        );

        return false;
      }

      if (
        newPassword.length <
        8
      ) {
        Alert.alert(
          'Invalid Password',
          'Your new password must contain at least 8 characters.'
        );

        return false;
      }

      if (
        !/[a-z]/.test(
          newPassword
        )
      ) {
        Alert.alert(
          'Invalid Password',
          'Your new password must contain at least one lowercase letter.'
        );

        return false;
      }

      if (
        !/[A-Z]/.test(
          newPassword
        )
      ) {
        Alert.alert(
          'Invalid Password',
          'Your new password must contain at least one uppercase letter.'
        );

        return false;
      }

      if (
        !/[0-9]/.test(
          newPassword
        )
      ) {
        Alert.alert(
          'Invalid Password',
          'Your new password must contain at least one number.'
        );

        return false;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        Alert.alert(
          'Passwords Do Not Match',
          'The new password and confirmation must match.'
        );

        return false;
      }

      if (
        currentPassword ===
        newPassword
      ) {
        Alert.alert(
          'Choose a New Password',
          'Your new password must be different from your current password.'
        );

        return false;
      }

      return true;
    };

  /*
   * =======================================================
   * CHANGE PASSWORD
   * =======================================================
   */

  const changePassword =
    async () => {
      if (
        !validatePassword()
      ) {
        return;
      }

      try {
        setChangingPassword(
          true
        );

        const response =
          await apiRequest<ChangePasswordResponse>(
            '/users/me/password',
            {
              method:
                'PATCH',

              authenticated:
                true,

              body:
                JSON.stringify(
                  {
                    currentPassword,

                    newPassword,

                    confirmNewPassword,
                  }
                ),
            }
          );

        setCurrentPassword(
          ''
        );

        setNewPassword(
          ''
        );

        setConfirmNewPassword(
          ''
        );

        setShowCurrentPassword(
          false
        );

        setShowNewPassword(
          false
        );

        setShowConfirmPassword(
          false
        );

        Alert.alert(
          'Password Updated',
          response.message ||
            'Your password has been changed successfully.'
        );
      } catch (error) {
        Alert.alert(
          'Password Change Failed',
          getErrorMessage(
            error
          )
        );
      } finally {
        setChangingPassword(
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
              styles.loadingIcon
            }
          >
            <Ionicons
              name="settings-outline"
              size={27}
              color={PINK}
            />
          </View>

          <ActivityIndicator
            color={PINK}
            size="small"
          />

          <Text
            style={
              styles.loadingText
            }
          >
            Loading account
            settings...
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
      <KeyboardAvoidingView
        style={
          styles.screen
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
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
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={TEXT}
            />
          </Pressable>

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
              Account Settings
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Security and
              account information
            </Text>
          </View>

          <View
            style={
              styles.headerSpacer
            }
          />
        </View>

        <ScrollView
          style={
            styles.scrollView
          }
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/*
           * =============================================
           * ACCOUNT SUMMARY
           * =============================================
           */}

          <View
            style={
              styles.accountCard
            }
          >
            <View
              style={
                styles.accountIcon
              }
            >
              <Ionicons
                name="person-outline"
                size={24}
                color={PINK}
              />
            </View>

            <View
              style={
                styles.accountInfo
              }
            >
              <Text
                style={
                  styles.accountName
                }
              >
                {[
                  user?.firstName,
                  user?.lastName,
                ]
                  .filter(Boolean)
                  .join(' ') ||
                  'Customer'}
              </Text>

              <Text
                style={
                  styles.accountEmail
                }
                numberOfLines={
                  1
                }
              >
                {user?.email ||
                  '—'}
              </Text>
            </View>

            <View
              style={[
                styles.accountStatusBadge,

                user?.accountStatus ===
                'active'
                  ? styles.accountStatusActive
                  : styles.accountStatusInactive,
              ]}
            >
              <View
                style={[
                  styles.accountStatusDot,

                  user?.accountStatus ===
                  'active'
                    ? styles.accountStatusDotActive
                    : styles.accountStatusDotInactive,
                ]}
              />

              <Text
                style={[
                  styles.accountStatusText,

                  user?.accountStatus ===
                  'active'
                    ? styles.accountStatusTextActive
                    : styles.accountStatusTextInactive,
                ]}
              >
                {capitalize(
                  user?.accountStatus
                )}
              </Text>
            </View>
          </View>

          {/*
           * =============================================
           * ACCOUNT INFORMATION
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            ACCOUNT INFORMATION
          </Text>

          <View
            style={
              styles.settingsCard
            }
          >
            <InfoRow
              icon="mail-outline"
              label="Email Address"
              value={
                user?.email ||
                'Not available'
              }
            />

            <SettingDivider />

            <InfoRow
              icon="call-outline"
              label="Phone Number"
              value={
                user?.phoneNumber ||
                'Not available'
              }
            />

            <SettingDivider />

            <InfoRow
              icon="person-circle-outline"
              label="Account Type"
              value="Customer"
            />

            <SettingDivider />

            <InfoRow
              icon="shield-checkmark-outline"
              label="Account Status"
              value={capitalize(
                user?.accountStatus
              )}
            />
          </View>

          <View
            style={
              styles.readOnlyNotice
            }
          >
            <Ionicons
              name="information-circle-outline"
              size={17}
              color="#8C8388"
            />

            <Text
              style={
                styles.readOnlyNoticeText
              }
            >
              Update your name
              and phone number
              from the Personal
              Information section
              of your Me page.
            </Text>
          </View>

          {/*
           * =============================================
           * SECURITY
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            SECURITY
          </Text>

          <View
            style={
              styles.passwordCard
            }
          >
            <View
              style={
                styles.passwordHeader
              }
            >
              <View
                style={
                  styles.securityIcon
                }
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={21}
                  color={PINK}
                />
              </View>

              <View
                style={
                  styles.passwordHeaderContent
                }
              >
                <Text
                  style={
                    styles.passwordTitle
                  }
                >
                  Change Password
                </Text>

                <Text
                  style={
                    styles.passwordSubtitle
                  }
                >
                  Keep your FLOGRAM
                  account secure
                </Text>
              </View>
            </View>

            <Text
              style={
                styles.inputLabel
              }
            >
              CURRENT PASSWORD
            </Text>

            <PasswordInput
              value={
                currentPassword
              }
              onChangeText={
                setCurrentPassword
              }
              placeholder="Enter current password"
              visible={
                showCurrentPassword
              }
              onToggle={() =>
                setShowCurrentPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              editable={
                !changingPassword
              }
            />

            <Text
              style={
                styles.inputLabel
              }
            >
              NEW PASSWORD
            </Text>

            <PasswordInput
              value={
                newPassword
              }
              onChangeText={
                setNewPassword
              }
              placeholder="Enter new password"
              visible={
                showNewPassword
              }
              onToggle={() =>
                setShowNewPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              editable={
                !changingPassword
              }
            />

            <View
              style={
                styles.passwordRequirements
              }
            >
              <Requirement
                valid={
                  newPassword.length >=
                  8
                }
                text="At least 8 characters"
              />

              <Requirement
                valid={/[a-z]/.test(
                  newPassword
                )}
                text="At least one lowercase letter"
              />

              <Requirement
                valid={/[A-Z]/.test(
                  newPassword
                )}
                text="At least one uppercase letter"
              />

              <Requirement
                valid={/[0-9]/.test(
                  newPassword
                )}
                text="At least one number"
              />
            </View>

            <Text
              style={
                styles.inputLabel
              }
            >
              CONFIRM NEW PASSWORD
            </Text>

            <PasswordInput
              value={
                confirmNewPassword
              }
              onChangeText={
                setConfirmNewPassword
              }
              placeholder="Confirm new password"
              visible={
                showConfirmPassword
              }
              onToggle={() =>
                setShowConfirmPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
              editable={
                !changingPassword
              }
            />

            {confirmNewPassword.length >
              0 &&
            newPassword.length >
              0 ? (
              <View
                style={
                  styles.matchRow
                }
              >
                <Ionicons
                  name={
                    confirmNewPassword ===
                    newPassword
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={14}
                  color={
                    confirmNewPassword ===
                    newPassword
                      ? GREEN
                      : RED
                  }
                />

                <Text
                  style={[
                    styles.matchText,

                    confirmNewPassword ===
                    newPassword
                      ? styles.matchTextValid
                      : styles.matchTextInvalid,
                  ]}
                >
                  {confirmNewPassword ===
                  newPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.changePasswordButton,

                changingPassword &&
                  styles.disabledButton,
              ]}
              disabled={
                changingPassword
              }
              onPress={() => {
                void changePassword();
              }}
            >
              {changingPassword ? (
                <ActivityIndicator
                  size="small"
                  color={
                    WHITE
                  }
                />
              ) : (
                <Ionicons
                  name="key-outline"
                  size={19}
                  color={
                    WHITE
                  }
                />
              )}

              <Text
                style={
                  styles.changePasswordButtonText
                }
              >
                {changingPassword
                  ? 'Updating Password...'
                  : 'Update Password'}
              </Text>
            </Pressable>
          </View>

          {/*
           * =============================================
           * SESSION
           * =============================================
           */}

          <Text
            style={
              styles.sectionLabel
            }
          >
            SESSION
          </Text>

          <View
            style={
              styles.settingsCard
            }
          >
            <Pressable
              style={
                styles.logoutRow
              }
              disabled={
                loggingOut
              }
              onPress={
                confirmLogout
              }
            >
              <View
                style={
                  styles.logoutIcon
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
              </View>

              <View
                style={
                  styles.logoutContent
                }
              >
                <Text
                  style={
                    styles.logoutTitle
                  }
                >
                  {loggingOut
                    ? 'Logging Out...'
                    : 'Log Out'}
                </Text>

                <Text
                  style={
                    styles.logoutSubtitle
                  }
                >
                  End your current
                  FLOGRAM session
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#BDB5B9"
              />
            </Pressable>
          </View>

          {/*
           * =============================================
           * SECURITY NOTE
           * =============================================
           */}

          <View
            style={
              styles.securityNotice
            }
          >
            <View
              style={
                styles.securityNoticeIcon
              }
            >
              <Ionicons
                name="shield-checkmark"
                size={19}
                color={GREEN}
              />
            </View>

            <View
              style={
                styles.securityNoticeContent
              }
            >
              <Text
                style={
                  styles.securityNoticeTitle
                }
              >
                Account Security
              </Text>

              <Text
                style={
                  styles.securityNoticeText
                }
              >
                FLOGRAM requires
                your current password
                before allowing a
                password change.
                Your password is
                securely stored as a
                protected hash.
              </Text>
            </View>
          </View>

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
                styles.footerText
              }
            >
              Account & Profile
              Management
            </Text>
          </View>

          <View
            style={{
              height: 25,
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * PASSWORD INPUT
 * =========================================================
 */

function PasswordInput({
  value,
  onChangeText,
  placeholder,
  visible,
  onToggle,
  editable,
}: {
  value: string;

  onChangeText: (
    value: string
  ) => void;

  placeholder: string;

  visible: boolean;

  onToggle: () => void;

  editable: boolean;
}) {
  return (
    <View
      style={
        styles.passwordInputContainer
      }
    >
      <Ionicons
        name="lock-closed-outline"
        size={17}
        color="#948B90"
      />

      <TextInput
        style={
          styles.passwordInput
        }
        value={
          value
        }
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor="#B8AFB4"
        secureTextEntry={
          !visible
        }
        autoCapitalize="none"
        autoCorrect={
          false
        }
        editable={
          editable
        }
      />

      <Pressable
        style={
          styles.eyeButton
        }
        onPress={
          onToggle
        }
        disabled={
          !editable
        }
      >
        <Ionicons
          name={
            visible
              ? 'eye-off-outline'
              : 'eye-outline'
          }
          size={19}
          color="#8F878B"
        />
      </Pressable>
    </View>
  );
}

/*
 * =========================================================
 * REQUIREMENT
 * =========================================================
 */

function Requirement({
  valid,
  text,
}: {
  valid: boolean;

  text: string;
}) {
  return (
    <View
      style={
        styles.requirementRow
      }
    >
      <Ionicons
        name={
          valid
            ? 'checkmark-circle'
            : 'ellipse-outline'
        }
        size={13}
        color={
          valid
            ? GREEN
            : '#B7AFB3'
        }
      />

      <Text
        style={[
          styles.requirementText,

          valid &&
            styles.requirementTextValid,
        ]}
      >
        {text}
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
  icon,
  label,
  value,
}: {
  icon: IoniconName;

  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={
          styles.infoIcon
        }
      >
        <Ionicons
          name={icon}
          size={19}
          color={PINK}
        />
      </View>

      <View
        style={
          styles.infoContent
        }
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
            1
          }
        >
          {value}
        </Text>
      </View>

      <Ionicons
        name="lock-closed-outline"
        size={14}
        color="#BEB6BA"
      />
    </View>
  );
}

function SettingDivider() {
  return (
    <View
      style={
        styles.settingDivider
      }
    />
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
    },

    loadingIcon: {
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
      marginTop: 10,

      color:
        TEXT_SECONDARY,

      fontSize: 10.5,
    },

    header: {
      height: 70,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        15,

      backgroundColor:
        WHITE,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        BORDER,
    },

    backButton: {
      width: 42,

      height: 42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F8F4F6',
    },

    headerCenter: {
      flex: 1,

      alignItems:
        'center',
    },

    headerSpacer: {
      width: 42,
    },

    headerTitle: {
      color:
        TEXT,

      fontSize: 18,

      fontWeight:
        '900',
    },

    headerSubtitle: {
      marginTop: 2,

      color:
        TEXT_SECONDARY,

      fontSize: 8.5,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal:
        15,

      paddingTop: 16,
    },

    accountCard: {
      minHeight: 91,

      flexDirection:
        'row',

      alignItems:
        'center',

      padding: 15,

      marginBottom: 22,

      borderRadius:
        20,

      backgroundColor:
        WHITE,

      borderWidth: 1,

      borderColor:
        BORDER,
    },

    accountIcon: {
      width: 50,

      height: 50,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,
    },

    accountInfo: {
      flex: 1,

      marginLeft: 12,

      minWidth: 0,
    },

    accountName: {
      color:
        TEXT,

      fontSize: 13.5,

      fontWeight:
        '900',
    },

    accountEmail: {
      marginTop: 4,

      color:
        TEXT_SECONDARY,

      fontSize: 9.5,
    },

    accountStatusBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      borderRadius:
        12,
    },

    accountStatusActive: {
      backgroundColor:
        GREEN_LIGHT,
    },

    accountStatusInactive: {
      backgroundColor:
        RED_LIGHT,
    },

    accountStatusDot: {
      width: 6,

      height: 6,

      borderRadius:
        3,
    },

    accountStatusDotActive: {
      backgroundColor:
        GREEN,
    },

    accountStatusDotInactive: {
      backgroundColor:
        RED,
    },

    accountStatusText: {
      fontSize: 8.5,

      fontWeight:
        '900',
    },

    accountStatusTextActive: {
      color:
        GREEN,
    },

    accountStatusTextInactive: {
      color:
        RED,
    },

    sectionLabel: {
      marginLeft: 3,

      marginBottom: 8,

      color:
        '#A1989D',

      fontSize: 9,

      fontWeight:
        '900',

      letterSpacing:
        1,
    },

    settingsCard: {
      paddingHorizontal:
        13,

      marginBottom: 12,

      borderRadius:
        18,

      backgroundColor:
        WHITE,

      borderWidth: 1,

      borderColor:
        BORDER,
    },

    infoRow: {
      minHeight: 68,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    infoIcon: {
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

    infoContent: {
      flex: 1,

      marginLeft: 11,

      marginRight: 9,

      minWidth: 0,
    },

    infoLabel: {
      color:
        '#968D92',

      fontSize: 8.5,

      fontWeight:
        '700',
    },

    infoValue: {
      marginTop: 3,

      color:
        TEXT,

      fontSize: 11,

      fontWeight:
        '800',
    },

    settingDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft: 49,

      backgroundColor:
        BORDER,
    },

    readOnlyNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 8,

      marginBottom: 22,

      paddingHorizontal:
        4,
    },

    readOnlyNoticeText: {
      flex: 1,

      color:
        TEXT_SECONDARY,

      fontSize: 8.8,

      lineHeight: 13,
    },

    passwordCard: {
      marginBottom: 22,

      padding: 16,

      borderRadius:
        20,

      backgroundColor:
        WHITE,

      borderWidth: 1,

      borderColor:
        BORDER,
    },

    passwordHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom: 20,
    },

    securityIcon: {
      width: 44,

      height: 44,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        PINK_LIGHT,
    },

    passwordHeaderContent: {
      flex: 1,

      marginLeft: 11,
    },

    passwordTitle: {
      color:
        TEXT,

      fontSize: 13,

      fontWeight:
        '900',
    },

    passwordSubtitle: {
      marginTop: 3,

      color:
        TEXT_SECONDARY,

      fontSize: 9,
    },

    inputLabel: {
      marginBottom: 7,

      color:
        '#8E858A',

      fontSize: 8.5,

      fontWeight:
        '900',

      letterSpacing:
        0.75,
    },

    passwordInputContainer: {
      height: 51,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      paddingHorizontal:
        13,

      marginBottom: 16,

      borderRadius:
        15,

      backgroundColor:
        '#FBF9FA',

      borderWidth: 1,

      borderColor:
        '#EDE7EA',
    },

    passwordInput: {
      flex: 1,

      paddingVertical: 0,

      color:
        TEXT,

      fontSize: 11.5,
    },

    eyeButton: {
      width: 35,

      height: 35,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    passwordRequirements: {
      padding: 12,

      marginTop: -6,

      marginBottom: 17,

      borderRadius:
        13,

      backgroundColor:
        '#F9F7F8',
    },

    requirementRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,

      minHeight: 22,
    },

    requirementText: {
      color:
        '#9C9398',

      fontSize: 8.8,
    },

    requirementTextValid: {
      color:
        GREEN,

      fontWeight:
        '700',
    },

    matchRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      marginTop: -8,

      marginBottom: 15,

      marginLeft: 3,
    },

    matchText: {
      fontSize: 8.5,

      fontWeight:
        '700',
    },

    matchTextValid: {
      color:
        GREEN,
    },

    matchTextInvalid: {
      color:
        RED,
    },

    changePasswordButton: {
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
        PINK,
    },

    disabledButton: {
      opacity: 0.6,
    },

    changePasswordButtonText: {
      color:
        WHITE,

      fontSize: 11.5,

      fontWeight:
        '900',
    },

    logoutRow: {
      minHeight: 72,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    logoutIcon: {
      width: 40,

      height: 40,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        RED_LIGHT,
    },

    logoutContent: {
      flex: 1,

      marginLeft: 11,
    },

    logoutTitle: {
      color:
        RED,

      fontSize: 12,

      fontWeight:
        '900',
    },

    logoutSubtitle: {
      marginTop: 3,

      color:
        TEXT_SECONDARY,

      fontSize: 9,
    },

    securityNotice: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 10,

      padding: 14,

      borderRadius:
        17,

      backgroundColor:
        GREEN_LIGHT,

      borderWidth: 1,

      borderColor:
        '#D4EDDF',

      marginBottom: 23,
    },

    securityNoticeIcon: {
      width: 35,

      height: 35,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        WHITE,
    },

    securityNoticeContent: {
      flex: 1,
    },

    securityNoticeTitle: {
      color:
        '#3D805F',

      fontSize: 10.5,

      fontWeight:
        '900',
    },

    securityNoticeText: {
      marginTop: 4,

      color:
        '#658371',

      fontSize: 8.7,

      lineHeight: 13,
    },

    footer: {
      alignItems:
        'center',

      paddingVertical:
        9,
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

    footerText: {
      marginTop: 3,

      color:
        '#AAA1A6',

      fontSize: 8.5,
    },
  });