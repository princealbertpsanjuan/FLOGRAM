import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apiRequest } from "../../services/api";
import {
  AdminSettingsData,
  getAdminSettings,
  updateAdminSettings,
} from "../../services/admin";

import AdminBottomNav from '../../components/admin/admin-bottom-nav';

import { ScreenLoader } from '../../components/ui/state-views';

const COLORS = {
  purple: "#312E81",
  purpleDark: "#24245D",
  purpleAccent: "#5B4FCF",
  purpleLight: "#EEEAFE",
  background: "#F7F7FA",
  card: "#FFFFFF",
  text: "#18181B",
  secondaryText: "#777783",
  mutedText: "#A1A1AA",
  border: "#ECECF1",
  green: "#4E9A72",
  greenBackground: "#EAF7EF",
  red: "#D75C73",
  redBackground: "#FDECEF",
  yellow: "#B9892D",
  yellowBackground: "#FFF5D9",
  blue: "#4C7DC0",
  blueBackground: "#EAF2FC",
};

type AdminProfile = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  accountStatus?: string;
  verificationStatus?: string;
  profileImage?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type ProfileResponse = ApiResponse<{
  user?: AdminProfile;
}>;

type PasswordResponse = ApiResponse<unknown>;

function getErrorMessage(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}

function getInitials(
  firstName?: string,
  lastName?: string
) {
  const first =
    firstName?.trim().charAt(0) || "";

  const last =
    lastName?.trim().charAt(0) || "";

  const initials =
    `${first}${last}`.toUpperCase();

  return initials || "A";
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

function SectionHeader({
  title,
  subtitle,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>

      {subtitle ? (
        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

type InputFieldProps = {
  label: string;
  value: string;
  onChangeText?: (
    value: string
  ) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?:
    | "default"
    | "email-address"
    | "phone-pad"
    | "numeric";
  secureTextEntry?: boolean;
  autoCapitalize?:
    | "none"
    | "sentences"
    | "words"
    | "characters";
};

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType = "default",
  secureTextEntry = false,
  autoCapitalize = "sentences",
}: InputFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          !editable &&
            styles.inputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={
          COLORS.mutedText
        }
        editable={editable}
        keyboardType={keyboardType}
        secureTextEntry={
          secureTextEntry
        }
        autoCapitalize={
          autoCapitalize
        }
      />
    </View>
  );
}

type NavigationRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
};

function NavigationRow({
  icon,
  iconBackground,
  iconColor,
  title,
  subtitle,
  onPress,
}: NavigationRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.navigationRow,
        pressed &&
          styles.pressedRow,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.navigationIcon,
          {
            backgroundColor:
              iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={21}
          color={iconColor}
        />
      </View>

      <View
        style={
          styles.navigationContent
        }
      >
        <Text
          style={
            styles.navigationTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.navigationSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.mutedText}
      />
    </Pressable>
  );
}

export default function AdminSettingsScreen() {
  const router = useRouter();

  const [
    settings,
    setSettings,
  ] =
    useState<AdminSettingsData | null>(
      null
    );

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    headerRefreshing,
    setHeaderRefreshing,
  ] = useState(false);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    savingPlatform,
    setSavingPlatform,
  ] = useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(false);

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState("");

  const [
    platformName,
    setPlatformName,
  ] = useState("");

  const [
    commissionPercentage,
    setCommissionPercentage,
  ] = useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const loadProfile =
    useCallback(async () => {
      const response =
        await apiRequest<
          ProfileResponse
        >(
          "/users/me",
          {
            method: "GET",
            authenticated: true,
          }
        );

      const user =
        response?.data?.user;

      if (!user) {
        throw new Error(
          response?.message ||
            "Admin profile could not be loaded."
        );
      }

      setProfile(user);

      setFirstName(
        user.firstName || ""
      );

      setLastName(
        user.lastName || ""
      );

      setPhoneNumber(
        user.phoneNumber || ""
      );
    }, []);

  const loadPlatformSettings =
    useCallback(async () => {
      const data =
        await getAdminSettings();

      setSettings(data);

      setPlatformName(
        data.platformName || ""
      );

      setCommissionPercentage(
        String(
          data.commissionPercentage ??
            15
        )
      );
    }, []);

  const loadPage =
    useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          await Promise.all([
            loadProfile(),
            loadPlatformSettings(),
          ]);
        } catch (error) {
          console.error(
            "Failed to load Admin settings:",
            error
          );

          Alert.alert(
            "Unable to Load Settings",
            getErrorMessage(
              error,
              "Admin settings could not be loaded."
            )
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }

          setRefreshing(false);
        }
      },
      [
        loadPlatformSettings,
        loadProfile,
      ]
    );

  useFocusEffect(
    useCallback(() => {
      void loadPage();

      return undefined;
    }, [loadPage])
  );

  const handleRefresh =
    useCallback(() => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);
      void loadPage(false);
    }, [loadPage, refreshing]);

  const handleHeaderRefresh =
    useCallback(async () => {
      if (headerRefreshing) {
        return;
      }

      try {
        setHeaderRefreshing(true);

        await Promise.all([
          loadProfile(),
          loadPlatformSettings(),
        ]);
      } catch (error) {
        console.error(
          "Failed to refresh Admin settings:",
          error
        );

        Alert.alert(
          "Unable to Refresh Settings",
          getErrorMessage(
            error,
            "Admin settings could not be refreshed."
          )
        );
      } finally {
        setHeaderRefreshing(false);
      }
    }, [
      headerRefreshing,
      loadPlatformSettings,
      loadProfile,
    ]);

  const handleSaveProfile =
    useCallback(async () => {
      const cleanFirstName =
        firstName.trim();

      const cleanLastName =
        lastName.trim();

      const cleanPhoneNumber =
        phoneNumber.trim();

      if (!cleanFirstName) {
        Alert.alert(
          "First Name Required",
          "Please enter your first name."
        );

        return;
      }

      if (!cleanLastName) {
        Alert.alert(
          "Last Name Required",
          "Please enter your last name."
        );

        return;
      }

      if (!cleanPhoneNumber) {
        Alert.alert(
          "Phone Number Required",
          "Please enter your phone number."
        );

        return;
      }

      try {
        setSavingProfile(true);

        const response =
          await apiRequest<
            ProfileResponse
          >(
            "/users/me",
            {
              method: "PATCH",
              authenticated: true,

              body: JSON.stringify({
                firstName:
                  cleanFirstName,

                lastName:
                  cleanLastName,

                phoneNumber:
                  cleanPhoneNumber,
              }),
            }
          );

        const updatedUser =
          response?.data?.user;

        if (!updatedUser) {
          throw new Error(
            response?.message ||
              "Profile could not be updated."
          );
        }

        setProfile(updatedUser);

        setFirstName(
          updatedUser.firstName ||
            cleanFirstName
        );

        setLastName(
          updatedUser.lastName ||
            cleanLastName
        );

        setPhoneNumber(
          updatedUser.phoneNumber ||
            cleanPhoneNumber
        );

        Alert.alert(
          "Profile Updated",
          "Your administrator profile has been updated successfully."
        );
      } catch (error) {
        console.error(
          "Failed to update Admin profile:",
          error
        );

        Alert.alert(
          "Update Failed",
          getErrorMessage(
            error,
            "Your profile could not be updated."
          )
        );
      } finally {
        setSavingProfile(false);
      }
    }, [
      firstName,
      lastName,
      phoneNumber,
    ]);

  const handleSavePlatform =
    useCallback(async () => {
      const cleanPlatformName =
        platformName.trim();

      if (!cleanPlatformName) {
        Alert.alert(
          "Platform Name Required",
          "Please enter the platform name."
        );

        return;
      }

      const parsedCommission =
        Number(
          commissionPercentage
            .trim()
            .replace("%", "")
        );

      if (
        !Number.isFinite(
          parsedCommission
        )
      ) {
        Alert.alert(
          "Invalid Commission",
          "Please enter a valid commission percentage."
        );

        return;
      }

      if (
        parsedCommission < 0 ||
        parsedCommission > 100
      ) {
        Alert.alert(
          "Invalid Commission",
          "Commission must be between 0% and 100%."
        );

        return;
      }

      try {
        setSavingPlatform(true);

        const updatedSettings =
          await updateAdminSettings(
            {
              platformName:
                cleanPlatformName,

              commissionPercentage:
                parsedCommission,
            }
          );

        setSettings(
          updatedSettings
        );

        setPlatformName(
          updatedSettings
            .platformName
        );

        setCommissionPercentage(
          String(
            updatedSettings
              .commissionPercentage
          )
        );

        Alert.alert(
          "Settings Updated",
          "Platform settings have been updated successfully. Dashboard and Reports will use the updated commission rate."
        );
      } catch (error) {
        console.error(
          "Failed to update platform settings:",
          error
        );

        Alert.alert(
          "Update Failed",
          getErrorMessage(
            error,
            "Platform settings could not be updated."
          )
        );
      } finally {
        setSavingPlatform(false);
      }
    }, [
      commissionPercentage,
      platformName,
    ]);

  const handleChangePassword =
    useCallback(async () => {
      if (!currentPassword) {
        Alert.alert(
          "Current Password Required",
          "Please enter your current password."
        );

        return;
      }

      if (!newPassword) {
        Alert.alert(
          "New Password Required",
          "Please enter your new password."
        );

        return;
      }

      if (
        newPassword.length < 8
      ) {
        Alert.alert(
          "Invalid Password",
          "Your new password must contain at least 8 characters."
        );

        return;
      }

      if (
        !/[a-z]/.test(
          newPassword
        ) ||
        !/[A-Z]/.test(
          newPassword
        ) ||
        !/[0-9]/.test(
          newPassword
        )
      ) {
        Alert.alert(
          "Invalid Password",
          "Your new password must contain an uppercase letter, a lowercase letter, and a number."
        );

        return;
      }

      if (
        newPassword !==
        confirmNewPassword
      ) {
        Alert.alert(
          "Passwords Do Not Match",
          "Please make sure your new passwords match."
        );

        return;
      }

      if (
        currentPassword ===
        newPassword
      ) {
        Alert.alert(
          "Choose a New Password",
          "Your new password must be different from your current password."
        );

        return;
      }

      try {
        setChangingPassword(
          true
        );

        const response =
          await apiRequest<
            PasswordResponse
          >(
            "/users/me/password",
            {
              method: "PATCH",
              authenticated: true,

              body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmNewPassword,
              }),
            }
          );

        if (
          response?.success ===
          false
        ) {
          throw new Error(
            response.message ||
              "Password could not be changed."
          );
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");

        Alert.alert(
          "Password Changed",
          "Your password has been changed successfully."
        );
      } catch (error) {
        console.error(
          "Failed to change Admin password:",
          error
        );

        Alert.alert(
          "Password Change Failed",
          getErrorMessage(
            error,
            "Your password could not be changed."
          )
        );
      } finally {
        setChangingPassword(
          false
        );
      }
    }, [
      confirmNewPassword,
      currentPassword,
      newPassword,
    ]);

  const performLogout =
    useCallback(async () => {
      try {
        try {
          await apiRequest(
            "/auth/logout",
            {
              method: "POST",
              authenticated: true,
            }
          );
        } catch (error) {
          console.warn(
            "Server logout request failed:",
            error
          );
        }

        await Promise.all([
          SecureStore.deleteItemAsync(
            "token"
          ),

          SecureStore.deleteItemAsync(
            "authToken"
          ),

          SecureStore.deleteItemAsync(
            "accessToken"
          ),

          SecureStore.deleteItemAsync(
            "user"
          ),
        ]);

        router.replace("/login");
      } catch (error) {
        console.error(
          "Logout failed:",
          error
        );

        Alert.alert(
          "Logout Failed",
          "Unable to log out. Please try again."
        );
      }
    }, [router]);

  const handleLogout =
    useCallback(() => {
      Alert.alert(
        "Log Out",
        "Are you sure you want to log out of your administrator account?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Log Out",
            style:
              "destructive",
            onPress: () => {
              void performLogout();
            },
          },
        ]
      );
    }, [performLogout]);

  if (loading) {
    return (
      <ScreenLoader
        role="admin"
        message="Loading settings..."
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View
        style={
          styles.container
        }
      >
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
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                handleRefresh
              }
              tintColor={
                COLORS.purpleAccent
              }
            />
          }
        >
          <View
            style={styles.header}
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
                styles.headerTop
              }
            >
              <View
                style={
                  styles.headerTitleContent
                }
              >
                <Text
                  style={
                    styles.headerEyebrow
                  }
                >
                  SYSTEM SETTINGS
                </Text>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Settings
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Manage your administrator account and application preferences.
                </Text>
              </View>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.headerButton,
                  pressed &&
                    styles.buttonPressed,
                  headerRefreshing &&
                    styles.headerButtonDisabled,
                ]}
                disabled={
                  headerRefreshing
                }
                onPress={() => {
                  void handleHeaderRefresh();
                }}
              >
                {headerRefreshing ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <Ionicons
                    name="refresh-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="Admin Profile"
              subtitle="Manage your administrator information."
            />

            <View
              style={
                styles.card
              }
            >
              <View
                style={
                  styles.profileHeader
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
                    {getInitials(
                      profile?.firstName,
                      profile?.lastName
                    )}
                  </Text>
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
                  >
                    {[
                      profile?.firstName,
                      profile?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                      "Administrator"}
                  </Text>

                  <Text
                    style={
                      styles.profileEmail
                    }
                  >
                    {profile?.email ||
                      "No email available"}
                  </Text>

                  <View
                    style={
                      styles.adminBadge
                    }
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={13}
                      color={
                        COLORS.purpleAccent
                      }
                    />

                    <Text
                      style={
                        styles.adminBadgeText
                      }
                    >
                      Administrator
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={
                  styles.divider
                }
              />

              <InputField
                label="First Name"
                value={
                  firstName
                }
                onChangeText={
                  setFirstName
                }
                placeholder="First name"
                autoCapitalize="words"
              />

              <InputField
                label="Last Name"
                value={
                  lastName
                }
                onChangeText={
                  setLastName
                }
                placeholder="Last name"
                autoCapitalize="words"
              />

              <InputField
                label="Email Address"
                value={
                  profile?.email ||
                  ""
                }
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Email cannot be changed from this screen.
              </Text>

              <InputField
                label="Phone Number"
                value={
                  phoneNumber
                }
                onChangeText={
                  setPhoneNumber
                }
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.primaryButton,
                  pressed &&
                    styles.buttonPressed,
                  savingProfile &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  savingProfile
                }
                onPress={() => {
                  void handleSaveProfile();
                }}
              >
                {savingProfile ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="save-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Save Profile
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="Platform Settings"
              subtitle="Manage FLOGRAM's platform and financial configuration."
            />

            <View
              style={
                styles.card
              }
            >
              <View
                style={
                  styles.cardHeadingRow
                }
              >
                <View
                  style={[
                    styles.cardHeadingIcon,
                    {
                      backgroundColor:
                        COLORS.purpleLight,
                    },
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={21}
                    color={
                      COLORS.purpleAccent
                    }
                  />
                </View>

                <View
                  style={
                    styles.cardHeadingContent
                  }
                >
                  <Text
                    style={
                      styles.cardHeadingTitle
                    }
                  >
                    General Configuration
                  </Text>

                  <Text
                    style={
                      styles.cardHeadingSubtitle
                    }
                  >
                    Platform identity and commission rate.
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.divider
                }
              />

              <InputField
                label="Platform Name"
                value={
                  platformName
                }
                onChangeText={
                  setPlatformName
                }
                placeholder="FLOGRAM"
                autoCapitalize="characters"
              />

              <View
                style={
                  styles.commissionLabelRow
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Platform Commission Rate
                </Text>

                <View
                  style={
                    styles.commissionBadge
                  }
                >
                  <Text
                    style={
                      styles.commissionBadgeText
                    }
                  >
                    {
                      commissionPercentage
                    }
                    %
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.percentageInputContainer
                }
              >
                <TextInput
                  style={
                    styles.percentageInput
                  }
                  value={
                    commissionPercentage
                  }
                  onChangeText={
                    setCommissionPercentage
                  }
                  placeholder="15"
                  placeholderTextColor={
                    COLORS.mutedText
                  }
                  keyboardType="decimal-pad"
                />

                <View
                  style={
                    styles.percentageSuffix
                  }
                >
                  <Text
                    style={
                      styles.percentageSuffixText
                    }
                  >
                    %
                  </Text>
                </View>
              </View>

              <Text
                style={
                  styles.helperText
                }
              >
                This rate is used when calculating the platform commission and seller share in Dashboard and Reports.
              </Text>

              <View
                style={
                  styles.infoBox
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={
                    COLORS.blue
                  }
                />

                <Text
                  style={
                    styles.infoBoxText
                  }
                >
                  This is the current platform commission rate applied to successful orders.
                </Text>
              </View>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.primaryButton,
                  pressed &&
                    styles.buttonPressed,
                  savingPlatform &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  savingPlatform
                }
                onPress={() => {
                  void handleSavePlatform();
                }}
              >
                {savingPlatform ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Save Platform Settings
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="Admin Operations"
              subtitle="Quick access to important platform management tasks."
            />

            <View
              style={[
                styles.card,
                styles.navigationCard,
              ]}
            >
              <NavigationRow
                icon="storefront-outline"
                iconBackground={
                  COLORS.purpleLight
                }
                iconColor={
                  COLORS.purpleAccent
                }
                title="Seller Verification"
                subtitle="Review florist and seller applications."
                onPress={() =>
                  router.push(
                    "/(admin)/admin-seller-verification"
                  )
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <NavigationRow
                icon="bicycle-outline"
                iconBackground={
                  COLORS.blueBackground
                }
                iconColor={
                  COLORS.blue
                }
                title="Rider Verification"
                subtitle="Review rider registration and verification."
                onPress={() =>
                  router.push(
                    "/(admin)/admin-rider-verification"
                  )
                }
              />

              <View
                style={
                  styles.rowDivider
                }
              />

              <NavigationRow
                icon="wallet-outline"
                iconBackground={
                  COLORS.greenBackground
                }
                iconColor={
                  COLORS.green
                }
                title="COD Remittances"
                subtitle="Review and verify rider COD remittances."
                onPress={() =>
                  router.push(
                    "/(admin)/admin-remittances"
                  )
                }
              />
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="Account & Security"
              subtitle="Keep your administrator account secure."
            />

            <View
              style={
                styles.card
              }
            >
              <View
                style={
                  styles.cardHeadingRow
                }
              >
                <View
                  style={[
                    styles.cardHeadingIcon,
                    {
                      backgroundColor:
                        COLORS.yellowBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={21}
                    color={
                      COLORS.yellow
                    }
                  />
                </View>

                <View
                  style={
                    styles.cardHeadingContent
                  }
                >
                  <Text
                    style={
                      styles.cardHeadingTitle
                    }
                  >
                    Change Password
                  </Text>

                  <Text
                    style={
                      styles.cardHeadingSubtitle
                    }
                  >
                    Update your administrator password.
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.divider
                }
              />

              <View
                style={
                  styles.inputGroup
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Current Password
                </Text>

                <View
                  style={
                    styles.passwordInputContainer
                  }
                >
                  <TextInput
                    style={
                      styles.passwordInput
                    }
                    value={
                      currentPassword
                    }
                    onChangeText={
                      setCurrentPassword
                    }
                    placeholder="Enter current password"
                    placeholderTextColor={
                      COLORS.mutedText
                    }
                    secureTextEntry={
                      !showCurrentPassword
                    }
                    autoCapitalize="none"
                  />

                  <Pressable
                    style={
                      styles.eyeButton
                    }
                    onPress={() =>
                      setShowCurrentPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    <Ionicons
                      name={
                        showCurrentPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color={
                        COLORS.secondaryText
                      }
                    />
                  </Pressable>
                </View>
              </View>

              <View
                style={
                  styles.inputGroup
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  New Password
                </Text>

                <View
                  style={
                    styles.passwordInputContainer
                  }
                >
                  <TextInput
                    style={
                      styles.passwordInput
                    }
                    value={
                      newPassword
                    }
                    onChangeText={
                      setNewPassword
                    }
                    placeholder="Enter new password"
                    placeholderTextColor={
                      COLORS.mutedText
                    }
                    secureTextEntry={
                      !showNewPassword
                    }
                    autoCapitalize="none"
                  />

                  <Pressable
                    style={
                      styles.eyeButton
                    }
                    onPress={() =>
                      setShowNewPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    <Ionicons
                      name={
                        showNewPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color={
                        COLORS.secondaryText
                      }
                    />
                  </Pressable>
                </View>
              </View>

              <View
                style={
                  styles.inputGroup
                }
              >
                <Text
                  style={
                    styles.inputLabel
                  }
                >
                  Confirm New Password
                </Text>

                <View
                  style={
                    styles.passwordInputContainer
                  }
                >
                  <TextInput
                    style={
                      styles.passwordInput
                    }
                    value={
                      confirmNewPassword
                    }
                    onChangeText={
                      setConfirmNewPassword
                    }
                    placeholder="Confirm new password"
                    placeholderTextColor={
                      COLORS.mutedText
                    }
                    secureTextEntry={
                      !showConfirmPassword
                    }
                    autoCapitalize="none"
                  />

                  <Pressable
                    style={
                      styles.eyeButton
                    }
                    onPress={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    <Ionicons
                      name={
                        showConfirmPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color={
                        COLORS.secondaryText
                      }
                    />
                  </Pressable>
                </View>
              </View>

              <Text
                style={
                  styles.helperText
                }
              >
                Use at least 8 characters with an uppercase letter, lowercase letter, and number.
              </Text>

              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.secondaryButton,
                  pressed &&
                    styles.secondaryButtonPressed,
                  changingPassword &&
                    styles.buttonDisabled,
                ]}
                disabled={
                  changingPassword
                }
                onPress={() => {
                  void handleChangePassword();
                }}
              >
                {changingPassword ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      COLORS.purpleAccent
                    }
                  />
                ) : (
                  <>
                    <Ionicons
                      name="key-outline"
                      size={18}
                      color={
                        COLORS.purpleAccent
                      }
                    />

                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Change Password
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <SectionHeader
              title="System Information"
              subtitle="Current FLOGRAM platform information."
            />

            <View
              style={
                styles.card
              }
            >
              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoRowLeft
                  }
                >
                  <View
                    style={[
                      styles.smallIcon,
                      {
                        backgroundColor:
                          COLORS.purpleLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name="flower-outline"
                      size={18}
                      color={
                        COLORS.purpleAccent
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.infoRowLabel
                    }
                  >
                    Platform
                  </Text>
                </View>

                <Text
                  style={
                    styles.infoRowValue
                  }
                >
                  {settings
                    ?.platformName ||
                    "FLOGRAM"}
                </Text>
              </View>

              <View
                style={
                  styles.rowDivider
                }
              />

              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoRowLeft
                  }
                >
                  <View
                    style={[
                      styles.smallIcon,
                      {
                        backgroundColor:
                          COLORS.blueBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name="code-slash-outline"
                      size={18}
                      color={
                        COLORS.blue
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.infoRowLabel
                    }
                  >
                    App Version
                  </Text>
                </View>

                <Text
                  style={
                    styles.infoRowValue
                  }
                >
                  {settings
                    ?.appVersion ||
                    "1.0.0"}
                </Text>
              </View>

              <View
                style={
                  styles.rowDivider
                }
              />

              <View
                style={
                  styles.infoRow
                }
              >
                <View
                  style={
                    styles.infoRowLeft
                  }
                >
                  <View
                    style={[
                      styles.smallIcon,
                      {
                        backgroundColor:
                          COLORS.greenBackground,
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={
                        COLORS.green
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.infoRowLabel
                    }
                  >
                    Account Role
                  </Text>
                </View>

                <Text
                  style={
                    styles.infoRowValue
                  }
                >
                  Administrator
                </Text>
              </View>
            </View>
          </View>

          <View
            style={
              styles.section
            }
          >
            <Pressable
              style={({
                pressed,
              }) => [
                styles.logoutButton,
                pressed &&
                  styles.logoutButtonPressed,
              ]}
              onPress={
                handleLogout
              }
            >
              <View
                style={
                  styles.logoutIcon
                }
              >
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color={
                    COLORS.red
                  }
                />
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
                  Log Out
                </Text>

                <Text
                  style={
                    styles.logoutSubtitle
                  }
                >
                  Sign out of your administrator account.
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  COLORS.red
                }
              />
            </Pressable>
          </View>
        </ScrollView>

        <AdminBottomNav active="settings" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    scrollView: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 120,
    },

    header: {
      backgroundColor:
        COLORS.purple,
      paddingHorizontal: 20,
      paddingTop: 54,
      paddingBottom: 26,
      overflow: "hidden",
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
    },

    headerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
    },

    headerTitleContent: {
      flex: 1,
      paddingRight: 12,
    },

    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
    },

    headerButtonDisabled: {
      opacity: 0.8,
    },

    headerCircleOne: {
      position: "absolute",
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor:
        "rgba(255,255,255,0.05)",
      right: -55,
      top: -75,
    },

    headerCircleTwo: {
      position: "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor:
        "rgba(255,255,255,0.04)",
      right: 45,
      bottom: -70,
    },

    headerEyebrow: {
      color: "#BFC2E8",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform:
        "uppercase",
      marginBottom: 7,
    },

    headerTitle: {
      color: "#FFFFFF",
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      letterSpacing: -0.5,
    },

    headerSubtitle: {
      marginTop: 7,
      color: "#D9D9EC",
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 330,
    },

    loadingContainer: {
      flex: 1,
      backgroundColor:
        COLORS.background,
      alignItems: "center",
      justifyContent: "center",
    },

    loadingContent: {
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },

    loadingText: {
      color:
        COLORS.secondaryText,
      fontSize: 14,
      fontWeight: "500",
    },

    section: {
      paddingHorizontal: 16,
      marginTop: 22,
    },

    sectionHeader: {
      marginBottom: 10,
    },

    sectionTitle: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: "800",
    },

    sectionSubtitle: {
      color:
        COLORS.secondaryText,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },

    card: {
      backgroundColor:
        COLORS.card,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      shadowColor: "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      elevation: 1,
    },

    divider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginVertical: 17,
    },

    rowDivider: {
      height: 1,
      backgroundColor:
        COLORS.border,
      marginLeft: 58,
    },

    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor:
        COLORS.purpleLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    avatarText: {
      color:
        COLORS.purpleAccent,
      fontSize: 19,
      fontWeight: "800",
    },

    profileInfo: {
      flex: 1,
    },

    profileName: {
      color: COLORS.text,
      fontSize: 17,
      fontWeight: "800",
    },

    profileEmail: {
      color:
        COLORS.secondaryText,
      fontSize: 12,
      marginTop: 3,
    },

    adminBadge: {
      alignSelf:
        "flex-start",
      marginTop: 7,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor:
        COLORS.purpleLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 20,
    },

    adminBadgeText: {
      color:
        COLORS.purpleAccent,
      fontSize: 10,
      fontWeight: "700",
    },

    inputGroup: {
      marginBottom: 14,
    },

    inputLabel: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 7,
    },

    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor:
        "#DEDEE7",
      borderRadius: 12,
      paddingHorizontal: 13,
      color: COLORS.text,
      fontSize: 14,
      backgroundColor:
        "#FFFFFF",
    },

    inputDisabled: {
      backgroundColor:
        "#F3F3F6",
      color:
        COLORS.secondaryText,
    },

    helperText: {
      color:
        COLORS.secondaryText,
      fontSize: 11,
      lineHeight: 16,
      marginTop: -5,
      marginBottom: 15,
    },

    cardHeadingRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    cardHeadingIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    cardHeadingContent: {
      flex: 1,
    },

    cardHeadingTitle: {
      color: COLORS.text,
      fontSize: 14,
      fontWeight: "800",
    },

    cardHeadingSubtitle: {
      color:
        COLORS.secondaryText,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 2,
    },

    commissionLabelRow: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      alignItems: "center",
      marginBottom: 7,
    },

    commissionBadge: {
      backgroundColor:
        COLORS.greenBackground,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 20,
    },

    commissionBadgeText: {
      color: COLORS.green,
      fontSize: 11,
      fontWeight: "800",
    },

    percentageInputContainer: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "#DEDEE7",
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor:
        "#FFFFFF",
      marginBottom: 12,
    },

    percentageInput: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 13,
      color: COLORS.text,
      fontSize: 14,
    },

    percentageSuffix: {
      alignSelf: "stretch",
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        "#F4F4F7",
      borderLeftWidth: 1,
      borderLeftColor:
        COLORS.border,
    },

    percentageSuffixText: {
      color:
        COLORS.secondaryText,
      fontSize: 14,
      fontWeight: "700",
    },

    infoBox: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      backgroundColor:
        COLORS.blueBackground,
      borderRadius: 12,
      padding: 12,
      gap: 9,
      marginBottom: 16,
    },

    infoBoxText: {
      flex: 1,
      color: "#456589",
      fontSize: 11,
      lineHeight: 17,
    },

    primaryButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor:
        COLORS.purpleAccent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

    secondaryButton: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor:
        COLORS.purpleAccent,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
    },

    secondaryButtonText: {
      color:
        COLORS.purpleAccent,
      fontSize: 13,
      fontWeight: "800",
    },

    buttonPressed: {
      opacity: 0.88,
    },

    secondaryButtonPressed: {
      backgroundColor:
        COLORS.purpleLight,
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    navigationCard: {
      padding: 0,
      overflow: "hidden",
    },

    navigationRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 74,
      paddingHorizontal: 15,
      paddingVertical: 12,
    },

    pressedRow: {
      backgroundColor:
        "#F8F8FB",
    },

    navigationIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    navigationContent: {
      flex: 1,
      paddingRight: 8,
    },

    navigationTitle: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "800",
    },

    navigationSubtitle: {
      color:
        COLORS.secondaryText,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    passwordInputContainer: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor:
        "#DEDEE7",
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
    },

    passwordInput: {
      flex: 1,
      minHeight: 48,
      paddingHorizontal: 13,
      color: COLORS.text,
      fontSize: 14,
    },

    eyeButton: {
      width: 46,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
    },

    infoRow: {
      minHeight: 57,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
    },

    infoRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    smallIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    infoRowLabel: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: "700",
    },

    infoRowValue: {
      color:
        COLORS.secondaryText,
      fontSize: 12,
      fontWeight: "600",
      maxWidth: "45%",
      textAlign: "right",
    },

    logoutButton: {
      backgroundColor:
        COLORS.card,
      borderWidth: 1,
      borderColor:
        "#F5D7DE",
      borderRadius: 18,
      minHeight: 74,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 12,
    },

    logoutButtonPressed: {
      backgroundColor:
        COLORS.redBackground,
    },

    logoutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        COLORS.redBackground,
      marginRight: 12,
    },

    logoutContent: {
      flex: 1,
    },

    logoutTitle: {
      color: COLORS.red,
      fontSize: 13,
      fontWeight: "800",
    },

    logoutSubtitle: {
      color:
        COLORS.secondaryText,
      fontSize: 11,
      marginTop: 3,
    },

    bottomNavigation: {
      minHeight: 76,
      paddingTop: 7,
      paddingBottom: 9,
      paddingHorizontal: 6,
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-around",
      backgroundColor:
        "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor:
        COLORS.border,
    },

    bottomNavItem: {
      flex: 1,
      minHeight: 57,
      alignItems: "center",
      justifyContent:
        "flex-start",
    },

    bottomNavIconWrap: {
      width: 36,
      height: 31,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },

    bottomNavIconWrapActive: {
      backgroundColor:
        COLORS.purpleLight,
    },

    bottomNavLabel: {
      marginTop: 2,
      fontSize: 9,
      lineHeight: 13,
      fontWeight: "500",
      color:
        COLORS.mutedText,
      textAlign: "center",
    },

    bottomNavLabelActive: {
      fontWeight: "700",
      color:
        COLORS.purpleAccent,
    },
  });