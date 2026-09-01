import { router } from 'expo-router';
import { useState } from 'react';

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
  login,
  type AuthUser,
} from '../../services/auth';

export default function LoginScreen() {
  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  /*
   * =========================================================
   * ROLE-BASED REDIRECTION
   * =========================================================
   *
   * Each stakeholder has a completely
   * separate mobile interface.
   *
   * customer
   *   -> Customer Dashboard
   *
   * seller
   *   -> Seller Dashboard
   *
   * rider
   *   -> Rider Dashboard
   *
   * admin
   *   -> Admin Dashboard
   * =========================================================
   */
  const redirectUser = (
    user: AuthUser
  ) => {
    switch (user.role) {
      case 'customer':
        router.replace(
          '/(customer)/customer-dashboard'
        );
        break;

      case 'seller':
        router.replace(
          '/(seller)/seller-dashboard'
        );
        break;

      case 'rider':
        router.replace(
          '/(rider)/rider-dashboard'
        );
        break;

      case 'admin':
        router.replace(
          '/(admin)/admin-dashboard'
        );
        break;

      default:
        Alert.alert(
          'Login Error',
          'Unable to determine the account role.'
        );
    }
  };

  /*
   * =========================================================
   * LOGIN
   * =========================================================
   */
  const handleLogin =
    async () => {
      if (
        !email.trim() ||
        !password
      ) {
        Alert.alert(
          'Missing Information',
          'Please enter your email and password.'
        );

        return;
      }

      try {
        setLoading(true);

        /*
         * Calls:
         *
         * POST
         * /api/v1/auth/login
         *
         * through:
         *
         * services/auth.ts
         * services/api.ts
         */
        const response =
          await login({
            email:
              email
                .trim()
                .toLowerCase(),

            password,
          });

        const user =
          response.data.user;

        /*
         * =====================================================
         * SELLER / RIDER VERIFICATION
         * =====================================================
         *
         * Customers do not require
         * verification.
         *
         * Admin accounts are created
         * internally.
         *
         * Seller and rider accounts must
         * be approved before accessing
         * their stakeholder interface.
         * =====================================================
         */
        if (
          (
            user.role === 'seller' ||
            user.role === 'rider'
          ) &&
          user.verificationStatus !==
            'approved'
        ) {
          if (
            user.verificationStatus ===
            'pending'
          ) {
            Alert.alert(
              'Account Verification',
              'Your account is still waiting for administrator approval.'
            );

            return;
          }

          if (
            user.verificationStatus ===
            'rejected'
          ) {
            Alert.alert(
              'Account Verification',
              'Your account verification was rejected. Please contact the administrator.'
            );

            return;
          }

          Alert.alert(
            'Account Verification',
            'Your account has not been approved yet.'
          );

          return;
        }

        /*
         * Authentication succeeded and
         * stakeholder access requirements
         * have been satisfied.
         */
        redirectUser(
          user
        );
      } catch (error) {
        Alert.alert(
          'Login Failed',
          error instanceof Error
            ? error.message
            : 'Unable to sign in.'
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <SafeAreaView
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={
            false
          }
        >
          {/* ===================================================
              HEADER
          =================================================== */}

          <View style={styles.hero}>
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
              style={styles.brand}
            >
              FLOGRAM
            </Text>

            <Text
              style={styles.tagline}
            >
              Where every bloom tells a story
            </Text>
          </View>

          {/* ===================================================
              LOGIN FORM
          =================================================== */}

          <View style={styles.form}>
            <Text
              style={styles.title}
            >
              Welcome Back!
            </Text>

            <Text
              style={styles.subtitle}
            >
              Sign in to continue to FLOGRAM
            </Text>

            {/* EMAIL */}

            <Text
              style={styles.label}
            >
              EMAIL ADDRESS
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#B8AFB4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              returnKeyType="next"
            />

            {/* PASSWORD */}

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
                placeholder="Enter your password"
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
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={
                  handleLogin
                }
              />

              <Pressable
                disabled={loading}
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
                    ? 'Hide'
                    : 'Show'}
                </Text>
              </Pressable>
            </View>

            {/* FORGOT PASSWORD */}

            <Pressable
              style={
                styles.forgotButton
              }
              disabled={loading}
              onPress={() => {
                Alert.alert(
                  'Forgot Password',
                  'Password recovery will be connected later.'
                );
              }}
            >
              <Text
                style={
                  styles.forgotText
                }
              >
                Forgot Password?
              </Text>
            </Pressable>

            {/* ===================================================
                SIGN IN
            =================================================== */}

            <Pressable
              disabled={loading}
              style={({
                pressed,
              }) => [
                styles.loginButton,

                pressed &&
                  styles.pressed,

                loading &&
                  styles.disabledButton,
              ]}
              onPress={
                handleLogin
              }
            >
              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.loginButtonText
                  }
                >
                  Sign In
                </Text>
              )}
            </Pressable>

            {/* ===================================================
                REGISTER
            =================================================== */}

            <View
              style={
                styles.registerRow
              }
            >
              <Text
                style={
                  styles.registerPrefix
                }
              >
                {"Don't have an account?"}
              </Text>

              <Pressable
                disabled={loading}
                onPress={() =>
                  router.push(
                    '/(auth)/register'
                  )
                }
              >
                <Text
                  style={
                    styles.registerLink
                  }
                >
                  Sign Up
                </Text>
              </Pressable>
            </View>

            {/* ===================================================
                BACK
            =================================================== */}

            <Pressable
              disabled={loading}
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={styles.backText}
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

const styles =
  StyleSheet.create({
    /*
     * =========================================================
     * SCREEN
     * =========================================================
     */

    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },

    scrollContent: {
      flexGrow: 1,
      backgroundColor: '#FFFFFF',
    },

    /*
     * =========================================================
     * HERO
     * =========================================================
     */

    hero: {
      height: 280,
      backgroundColor: '#DF5A8C',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      paddingTop: 20,
    },

    decorLeft: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        'rgba(255,255,255,0.12)',
      top: -80,
      left: -60,
    },

    decorRight: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor:
        'rgba(255,255,255,0.10)',
      bottom: -90,
      right: -55,
    },

    flower: {
      fontSize: 46,
      marginBottom: 10,
    },

    brand: {
      color: '#FFFFFF',
      fontSize: 28,
      fontWeight: '900',
      letterSpacing: 3,
    },

    tagline: {
      color:
        'rgba(255,255,255,0.90)',
      fontSize: 12,
      marginTop: 8,
    },

    /*
     * =========================================================
     * FORM
     * =========================================================
     */

    form: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 35,
      paddingBottom: 30,
    },

    title: {
      color: '#40383E',
      fontSize: 25,
      fontWeight: '800',
      textAlign: 'center',
    },

    subtitle: {
      color: '#A39BA0',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 7,
      marginBottom: 31,
    },

    label: {
      color: '#98909A',
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: 8,
    },

    /*
     * =========================================================
     * EMAIL
     * =========================================================
     */

    input: {
      height: 53,
      backgroundColor: '#F8F7F9',
      borderRadius: 15,
      paddingHorizontal: 17,
      color: '#3F3940',
      fontSize: 14,
      marginBottom: 19,
    },

    /*
     * =========================================================
     * PASSWORD
     * =========================================================
     */

    passwordContainer: {
      height: 53,
      backgroundColor: '#F8F7F9',
      borderRadius: 15,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 17,
      paddingRight: 15,
    },

    passwordInput: {
      flex: 1,
      color: '#3F3940',
      fontSize: 14,
      padding: 0,
    },

    showText: {
      color: '#D95888',
      fontSize: 11,
      fontWeight: '700',
    },

    /*
     * =========================================================
     * FORGOT PASSWORD
     * =========================================================
     */

    forgotButton: {
      alignSelf: 'flex-end',
      paddingVertical: 12,
    },

    forgotText: {
      color: '#D95888',
      fontSize: 11,
      fontWeight: '600',
    },

    /*
     * =========================================================
     * LOGIN BUTTON
     * =========================================================
     */

    loginButton: {
      height: 54,
      backgroundColor: '#E65A8D',
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },

    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },

    disabledButton: {
      opacity: 0.65,
    },

    pressed: {
      opacity: 0.82,
    },

    /*
     * =========================================================
     * REGISTER
     * =========================================================
     */

    registerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
      gap: 5,
    },

    registerPrefix: {
      color: '#AAA2A8',
      fontSize: 11,
    },

    registerLink: {
      color: '#D95888',
      fontSize: 12,
      fontWeight: '700',
    },

    /*
     * =========================================================
     * BACK
     * =========================================================
     */

    backButton: {
      alignSelf: 'center',
      marginTop: 15,
      paddingHorizontal: 18,
      paddingVertical: 8,
    },

    backText: {
      color: '#AAA2A8',
      fontSize: 11,
    },
  });