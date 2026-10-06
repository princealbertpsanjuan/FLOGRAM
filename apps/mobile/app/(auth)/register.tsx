import { router } from "expo-router";
import { useState } from "react";
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
} from "react-native";

import {
  logout,
  register,
  type UserRole,
} from "../../services/auth";

type RegistrationRole = Exclude<
  UserRole,
  "admin"
>;

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX =
  /^(09|\+639)\d{9}$/;

const LOWERCASE_REGEX =
  /[a-z]/;

const UPPERCASE_REGEX =
  /[A-Z]/;

const NUMBER_REGEX =
  /[0-9]/;

export default function RegisterScreen() {
  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    phoneNumber,
    setPhoneNumber,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    role,
    setRole,
  ] =
    useState<RegistrationRole>(
      "customer"
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  /*
   * =======================================================
   * VALIDATION
   * =======================================================
   */

  const validateForm = () => {
    const cleanFirstName =
      firstName.trim();

    const cleanLastName =
      lastName.trim();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    const cleanPhoneNumber =
      phoneNumber.trim();

    if (!cleanFirstName) {
      Alert.alert(
        "First Name Required",
        "Please enter your first name."
      );

      return false;
    }

    if (
      cleanFirstName.length >
      50
    ) {
      Alert.alert(
        "Invalid First Name",
        "First name cannot exceed 50 characters."
      );

      return false;
    }

    if (!cleanLastName) {
      Alert.alert(
        "Last Name Required",
        "Please enter your last name."
      );

      return false;
    }

    if (
      cleanLastName.length >
      50
    ) {
      Alert.alert(
        "Invalid Last Name",
        "Last name cannot exceed 50 characters."
      );

      return false;
    }

    if (!cleanEmail) {
      Alert.alert(
        "Email Required",
        "Please enter your email address."
      );

      return false;
    }

    if (
      !EMAIL_REGEX.test(
        cleanEmail
      )
    ) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address."
      );

      return false;
    }

    if (!cleanPhoneNumber) {
      Alert.alert(
        "Phone Number Required",
        "Please enter your phone number."
      );

      return false;
    }

    if (
      !PHONE_REGEX.test(
        cleanPhoneNumber
      )
    ) {
      Alert.alert(
        "Invalid Phone Number",
        "Enter a valid Philippine phone number, such as 09171234567."
      );

      return false;
    }

    if (!password) {
      Alert.alert(
        "Password Required",
        "Please enter a password."
      );

      return false;
    }

    if (
      password.length < 8
    ) {
      Alert.alert(
        "Invalid Password",
        "Password must contain at least 8 characters."
      );

      return false;
    }

    if (
      !LOWERCASE_REGEX.test(
        password
      )
    ) {
      Alert.alert(
        "Invalid Password",
        "Password must contain at least one lowercase letter."
      );

      return false;
    }

    if (
      !UPPERCASE_REGEX.test(
        password
      )
    ) {
      Alert.alert(
        "Invalid Password",
        "Password must contain at least one uppercase letter."
      );

      return false;
    }

    if (
      !NUMBER_REGEX.test(
        password
      )
    ) {
      Alert.alert(
        "Invalid Password",
        "Password must contain at least one number."
      );

      return false;
    }

    if (!confirmPassword) {
      Alert.alert(
        "Confirm Password",
        "Please confirm your password."
      );

      return false;
    }

    if (
      password !==
      confirmPassword
    ) {
      Alert.alert(
        "Password Mismatch",
        "Your password confirmation does not match."
      );

      return false;
    }

    return true;
  };

  /*
   * =======================================================
   * REGISTER
   * =======================================================
   */

  const handleRegister =
    async () => {
      if (!validateForm()) {
        return;
      }

      try {
        setLoading(true);

        const response =
          await register({
            firstName:
              firstName.trim(),

            lastName:
              lastName.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            phoneNumber:
              phoneNumber.trim(),

            password,

            confirmPassword,

            role,
          });

        const user =
          response.data.user;

        /*
         * ===============================================
         * CUSTOMER
         * ===============================================
         *
         * Customer accounts do not require
         * administrator verification.
         *
         * register() already saves the session,
         * so the customer can continue directly
         * to the Customer application.
         */

        if (
          user.role ===
          "customer"
        ) {
          Alert.alert(
            "Account Created",
            `Welcome to FLOGRAM, ${user.firstName}!`,
            [
              {
                text: "Continue",

                onPress: () => {
                  router.replace(
                    "/(customer)/customer-dashboard"
                  );
                },
              },
            ]
          );

          return;
        }

        /*
         * ===============================================
         * SELLER / RIDER
         * ===============================================
         *
         * register() stores the access token returned
         * by the backend.
         *
         * Pending seller/rider accounts should not
         * remain signed in while waiting for Admin
         * verification, so clear the newly created
         * session before returning to Login.
         */

        if (
          user.verificationStatus ===
          "pending"
        ) {
          /*
           * Sellers and Riders stay signed in and go
           * straight to uploading their requirements.
           * Their account stays pending until Admin
           * approves it.
           */
          router.replace(
            "/(auth)/application" as never
          );

          return;
        }

        /*
         * Safety fallback for a non-customer
         * registration that does not return pending.
         */

        await logout();

        router.replace(
          "/(auth)/login"
        );
      } catch (error) {
        Alert.alert(
          "Registration Failed",
          error instanceof Error
            ? error.message
            : "Unable to create your account."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * =======================================================
   * UI
   * =======================================================
   */

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ============================================
              HEADER
          ============================================ */}

          <View
            style={styles.hero}
          >
            <View
              style={
                styles.decorLeft
              }
            />

            <View
              style={
                styles.decorRight
              }
            />

            <Text
              style={styles.flower}
            >
              🌸
            </Text>

            <Text
              style={
                styles.heroTitle
              }
            >
              Create Account
            </Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              Join FLOGRAM and make
              every moment bloom
            </Text>
          </View>

          {/* ============================================
              FORM
          ============================================ */}

          <View
            style={styles.form}
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              PERSONAL INFORMATION
            </Text>

            {/* NAME */}

            <View
              style={
                styles.nameRow
              }
            >
              <View
                style={
                  styles.nameField
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  FIRST NAME
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="Sofia"
                  placeholderTextColor="#B8AFB4"
                  value={
                    firstName
                  }
                  onChangeText={
                    setFirstName
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  maxLength={50}
                  textContentType="givenName"
                  returnKeyType="next"
                />
              </View>

              <View
                style={
                  styles.nameField
                }
              >
                <Text
                  style={
                    styles.label
                  }
                >
                  LAST NAME
                </Text>

                <TextInput
                  style={
                    styles.input
                  }
                  placeholder="Reyes"
                  placeholderTextColor="#B8AFB4"
                  value={
                    lastName
                  }
                  onChangeText={
                    setLastName
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  maxLength={50}
                  textContentType="familyName"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* EMAIL */}

            <Text
              style={styles.label}
            >
              EMAIL ADDRESS
            </Text>

            <TextInput
              style={styles.input}
              placeholder="sofia@email.com"
              placeholderTextColor="#B8AFB4"
              value={email}
              onChangeText={
                setEmail
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              returnKeyType="next"
            />

            {/* PHONE */}

            <Text
              style={styles.label}
            >
              PHONE NUMBER
            </Text>

            <TextInput
              style={styles.input}
              placeholder="09171234567"
              placeholderTextColor="#B8AFB4"
              value={phoneNumber}
              onChangeText={(
                value
              ) => {
                /*
                 * Keep only numbers and
                 * an optional leading +.
                 */

                const cleaned =
                  value.replace(
                    /[^\d+]/g,
                    ""
                  );

                setPhoneNumber(
                  cleaned
                );
              }}
              keyboardType="phone-pad"
              maxLength={13}
              textContentType="telephoneNumber"
              returnKeyType="next"
            />

            <Text
              style={
                styles.fieldHint
              }
            >
              Use 09XXXXXXXXX or
              +639XXXXXXXXX.
            </Text>

            {/* ============================================
                ACCOUNT TYPE
            ============================================ */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              ACCOUNT TYPE
            </Text>

            <View
              style={
                styles.roleContainer
              }
            >
              <RoleButton
                label="Customer"
                icon="🌷"
                selected={
                  role ===
                  "customer"
                }
                onPress={() =>
                  setRole(
                    "customer"
                  )
                }
              />

              <RoleButton
                label="Seller"
                icon="🏪"
                selected={
                  role ===
                  "seller"
                }
                onPress={() =>
                  setRole(
                    "seller"
                  )
                }
              />

              <RoleButton
                label="Rider"
                icon="🛵"
                selected={
                  role ===
                  "rider"
                }
                onPress={() =>
                  setRole(
                    "rider"
                  )
                }
              />
            </View>

            {role !==
              "customer" && (
              <View
                style={
                  styles.verificationNotice
                }
              >
                <View
                  style={
                    styles.verificationHeader
                  }
                >
                  <Text
                    style={
                      styles.verificationIcon
                    }
                  >
                    ⏳
                  </Text>

                  <Text
                    style={
                      styles.verificationTitle
                    }
                  >
                    Verification
                    Required
                  </Text>
                </View>

                <Text
                  style={
                    styles.verificationText
                  }
                >
                  {role ===
                  "seller"
                    ? "Your seller account will be reviewed by an administrator before seller features become available."
                    : "Your rider account will be reviewed by an administrator before delivery features become available."}
                </Text>
              </View>
            )}

            {/* ============================================
                SECURITY
            ============================================ */}

            <Text
              style={
                styles.sectionTitle
              }
            >
              SECURITY
            </Text>

            <Text
              style={styles.label}
            >
              PASSWORD
            </Text>

            <View
              style={
                styles.passwordContainer
              }
            >
              <TextInput
                style={
                  styles.passwordInput
                }
                placeholder="Enter password"
                placeholderTextColor="#B8AFB4"
                value={password}
                onChangeText={
                  setPassword
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="next"
              />

              <Pressable
                hitSlop={10}
                onPress={() =>
                  setShowPassword(
                    (current) =>
                      !current
                  )
                }
              >
                <Text
                  style={
                    styles.showText
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </Text>
              </Pressable>
            </View>

            <View
              style={
                styles.passwordRequirements
              }
            >
              <PasswordRequirement
                met={
                  password.length >=
                  8
                }
                text="At least 8 characters"
              />

              <PasswordRequirement
                met={LOWERCASE_REGEX.test(
                  password
                )}
                text="One lowercase letter"
              />

              <PasswordRequirement
                met={UPPERCASE_REGEX.test(
                  password
                )}
                text="One uppercase letter"
              />

              <PasswordRequirement
                met={NUMBER_REGEX.test(
                  password
                )}
                text="One number"
              />
            </View>

            <Text
              style={styles.label}
            >
              CONFIRM PASSWORD
            </Text>

            <View
              style={
                styles.passwordContainer
              }
            >
              <TextInput
                style={
                  styles.passwordInput
                }
                placeholder="Confirm password"
                placeholderTextColor="#B8AFB4"
                value={
                  confirmPassword
                }
                onChangeText={
                  setConfirmPassword
                }
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (!loading) {
                    void handleRegister();
                  }
                }}
              />

              <Pressable
                hitSlop={10}
                onPress={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
              >
                <Text
                  style={
                    styles.showText
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </Text>
              </Pressable>
            </View>

            {confirmPassword
              .length > 0 && (
              <Text
                style={[
                  styles.confirmationText,

                  password ===
                  confirmPassword
                    ? styles.confirmationSuccess
                    : styles.confirmationError,
                ]}
              >
                {password ===
                confirmPassword
                  ? "✓ Passwords match"
                  : "Passwords do not match"}
              </Text>
            )}

            {/* ============================================
                CREATE ACCOUNT
            ============================================ */}

            <Pressable
              disabled={loading}
              style={({
                pressed,
              }) => [
                styles.createButton,

                pressed &&
                  styles.pressed,

                loading &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                void handleRegister();
              }}
            >
              {loading ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.createButtonText
                    }
                  >
                    Creating
                    Account...
                  </Text>
                </>
              ) : (
                <Text
                  style={
                    styles.createButtonText
                  }
                >
                  Create Account
                </Text>
              )}
            </Pressable>

            {/* ============================================
                LOGIN
            ============================================ */}

            <View
              style={
                styles.loginRow
              }
            >
              <Text
                style={
                  styles.loginPrefix
                }
              >
                Already have an
                account?
              </Text>

              <Pressable
                disabled={loading}
                onPress={() =>
                  router.replace(
                    "/(auth)/login"
                  )
                }
              >
                <Text
                  style={
                    styles.loginLink
                  }
                >
                  Sign In
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={
                styles.backButton
              }
              disabled={loading}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.backText
                }
              >
                ← Back
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/*
 * =========================================================
 * ROLE BUTTON
 * =========================================================
 */

type RoleButtonProps = {
  label: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
};

function RoleButton({
  label,
  icon,
  selected,
  onPress,
}: RoleButtonProps) {
  return (
    <Pressable
      style={({
        pressed,
      }) => [
        styles.roleButton,

        selected &&
          styles.roleButtonSelected,

        pressed &&
          styles.roleButtonPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={styles.roleIcon}
      >
        {icon}
      </Text>

      <Text
        style={[
          styles.roleText,

          selected &&
            styles.roleTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/*
 * =========================================================
 * PASSWORD REQUIREMENT
 * =========================================================
 */

type PasswordRequirementProps = {
  met: boolean;
  text: string;
};

function PasswordRequirement({
  met,
  text,
}: PasswordRequirementProps) {
  return (
    <View
      style={
        styles.requirementRow
      }
    >
      <Text
        style={[
          styles.requirementIcon,

          met &&
            styles.requirementMet,
        ]}
      >
        {met ? "✓" : "○"}
      </Text>

      <Text
        style={[
          styles.requirementText,

          met &&
            styles.requirementTextMet,
        ]}
      >
        {text}
      </Text>
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
        "#FFFFFF",
    },

    scrollContent: {
      flexGrow: 1,
      backgroundColor:
        "#FFFFFF",
      paddingBottom: 35,
    },

    /*
     * HEADER
     */

    hero: {
      height: 215,
      backgroundColor:
        "#DF5A8C",
      alignItems: "center",
      justifyContent:
        "center",
      overflow: "hidden",
      paddingTop: 12,
    },

    decorLeft: {
      position: "absolute",
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      top: -62,
      left: -45,
    },

    decorRight: {
      position: "absolute",
      width: 145,
      height: 145,
      borderRadius: 73,
      backgroundColor:
        "rgba(255,255,255,0.10)",
      bottom: -75,
      right: -45,
    },

    flower: {
      fontSize: 34,
      marginBottom: 8,
    },

    heroTitle: {
      color: "#FFFFFF",
      fontSize: 24,
      fontWeight: "800",
    },

    heroSubtitle: {
      color:
        "rgba(255,255,255,0.90)",
      fontSize: 12,
      marginTop: 6,
      textAlign: "center",
      paddingHorizontal: 20,
    },

    /*
     * FORM
     */

    form: {
      paddingHorizontal: 26,
      paddingTop: 25,
    },

    sectionTitle: {
      color: "#D95888",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.8,
      marginBottom: 14,
      marginTop: 10,
    },

    nameRow: {
      flexDirection: "row",
      gap: 12,
    },

    nameField: {
      flex: 1,
    },

    label: {
      color: "#98909A",
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.6,
      marginBottom: 7,
      marginTop: 5,
    },

    input: {
      height: 50,
      backgroundColor:
        "#F8F7F9",
      borderRadius: 14,
      paddingHorizontal: 16,
      color: "#3F3940",
      fontSize: 14,
      marginBottom: 13,
    },

    fieldHint: {
      color: "#B0A8AD",
      fontSize: 9,
      lineHeight: 14,
      marginTop: -7,
      marginBottom: 15,
      paddingHorizontal: 2,
    },

    /*
     * ACCOUNT TYPE
     */

    roleContainer: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 14,
    },

    roleButton: {
      flex: 1,
      minHeight: 78,
      borderRadius: 15,
      backgroundColor:
        "#F8F7F9",
      borderWidth: 1.5,
      borderColor:
        "#F0ECEF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    roleButtonSelected: {
      backgroundColor:
        "#FFF3F7",
      borderColor:
        "#DF5A8C",
    },

    roleButtonPressed: {
      opacity: 0.8,
    },

    roleIcon: {
      fontSize: 23,
      marginBottom: 5,
    },

    roleText: {
      color: "#91888E",
      fontSize: 11,
      fontWeight: "600",
    },

    roleTextSelected: {
      color: "#D95888",
      fontWeight: "800",
    },

    /*
     * VERIFICATION
     */

    verificationNotice: {
      backgroundColor:
        "#FFF5F8",
      borderRadius: 13,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor:
        "#F9DDE7",
    },

    verificationHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 4,
    },

    verificationIcon: {
      fontSize: 12,
    },

    verificationTitle: {
      color: "#D95888",
      fontSize: 11,
      fontWeight: "800",
    },

    verificationText: {
      color: "#8D858A",
      fontSize: 10,
      lineHeight: 15,
    },

    /*
     * PASSWORD
     */

    passwordContainer: {
      height: 50,
      backgroundColor:
        "#F8F7F9",
      borderRadius: 14,
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: 16,
      paddingRight: 14,
      marginBottom: 8,
    },

    passwordInput: {
      flex: 1,
      color: "#3F3940",
      fontSize: 14,
      padding: 0,
    },

    showText: {
      color: "#D95888",
      fontSize: 11,
      fontWeight: "700",
      paddingLeft: 10,
    },

    passwordRequirements: {
      backgroundColor:
        "#FCFAFB",
      borderRadius: 11,
      paddingHorizontal: 11,
      paddingVertical: 9,
      marginBottom: 13,
    },

    requirementRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 2,
    },

    requirementIcon: {
      width: 18,
      color: "#B8AFB4",
      fontSize: 11,
      fontWeight: "800",
    },

    requirementMet: {
      color: "#4E9A72",
    },

    requirementText: {
      color: "#AAA2A8",
      fontSize: 9,
    },

    requirementTextMet: {
      color: "#6C967B",
    },

    confirmationText: {
      fontSize: 9,
      marginTop: -1,
      paddingHorizontal: 2,
    },

    confirmationSuccess: {
      color: "#4E9A72",
    },

    confirmationError: {
      color: "#D75C73",
    },

    /*
     * CREATE ACCOUNT
     */

    createButton: {
      height: 53,
      backgroundColor:
        "#E65A8D",
      borderRadius: 14,
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
      gap: 8,
      marginTop: 20,
    },

    createButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700",
    },

    disabledButton: {
      opacity: 0.65,
    },

    pressed: {
      opacity: 0.82,
    },

    /*
     * LOGIN / BACK
     */

    loginRow: {
      flexDirection: "row",
      justifyContent:
        "center",
      alignItems: "center",
      marginTop: 20,
      gap: 4,
    },

    loginPrefix: {
      color: "#AAA2A8",
      fontSize: 11,
    },

    loginLink: {
      color: "#D95888",
      fontSize: 12,
      fontWeight: "700",
    },

    backButton: {
      alignSelf: "center",
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },

    backText: {
      color: "#AAA2A8",
      fontSize: 11,
    },
  });