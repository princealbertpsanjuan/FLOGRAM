import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { useMemo, useState } from 'react';
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
  resetPassword,
} from '../../services/auth';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    email?: string | string[];
  }>();

  const email = useMemo(() => {
    const value = params.email;

    if (Array.isArray(value)) {
      return value[0]?.trim().toLowerCase() || '';
    }

    return value?.trim().toLowerCase() || '';
  }, [params.email]);

  const [newPassword, setNewPassword] =
    useState('');

  const [
    confirmNewPassword,
    setConfirmNewPassword,
  ] = useState('');

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const hasMinimumLength =
    newPassword.length >= 8;

  const hasLowercase =
    /[a-z]/.test(newPassword);

  const hasUppercase =
    /[A-Z]/.test(newPassword);

  const hasNumber =
    /[0-9]/.test(newPassword);

  const passwordsMatch =
    newPassword.length > 0 &&
    newPassword === confirmNewPassword;

  const passwordIsValid =
    hasMinimumLength &&
    hasLowercase &&
    hasUppercase &&
    hasNumber;

  const getErrorMessage = (
    error: unknown
  ) => {
    if (
      error instanceof Error &&
      error.message
    ) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  };

  const handleResetPassword =
    async () => {
      if (!email) {
        Alert.alert(
          'Invalid Reset Request',
          'Your password reset session is missing. Please request a new verification code.'
        );

        router.replace(
          '/(auth)/forgot-password'
        );

        return;
      }

      if (!newPassword) {
        Alert.alert(
          'Password Required',
          'Please enter your new password.'
        );
        return;
      }

      if (!passwordIsValid) {
        Alert.alert(
          'Invalid Password',
          'Your new password must contain at least 8 characters, including a lowercase letter, an uppercase letter, and a number.'
        );
        return;
      }

      if (!confirmNewPassword) {
        Alert.alert(
          'Confirmation Required',
          'Please confirm your new password.'
        );
        return;
      }

      if (!passwordsMatch) {
        Alert.alert(
          'Passwords Do Not Match',
          'New password confirmation does not match.'
        );
        return;
      }

      try {
        setSubmitting(true);

        const response =
          await resetPassword({
            email,
            newPassword,
            confirmNewPassword,
          });

        Alert.alert(
          'Password Reset Successful',
          response.message ||
            'Your password has been reset successfully.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                router.replace(
                  '/(auth)/login'
                );
              },
            },
          ],
          {
            cancelable: false,
          }
        );
      } catch (error) {
        Alert.alert(
          'Unable to Reset Password',
          getErrorMessage(error)
        );
      } finally {
        setSubmitting(false);
      }
    };

  const renderRequirement = (
    met: boolean,
    label: string
  ) => {
    return (
      <View
        style={
          styles.requirementRow
        }
      >
        <Ionicons
          name={
            met
              ? 'checkmark-circle'
              : 'ellipse-outline'
          }
          size={17}
          color={
            met
              ? '#4E9A72'
              : '#A1A1AA'
          }
        />

        <Text
          style={[
            styles.requirementText,
            met &&
              styles.requirementMet,
          ]}
        >
          {label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
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
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace(
                '/(auth)/forgot-password'
              )
            }
            hitSlop={10}
            disabled={submitting}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#18181B"
            />
          </Pressable>

          <View
            style={styles.header}
          >
            <View
              style={
                styles.iconContainer
              }
            >
              <Ionicons
                name="key-outline"
                size={34}
                color="#E91E63"
              />
            </View>

            <Text
              style={styles.brand}
            >
              FLOGRAM
            </Text>

            <Text
              style={styles.title}
            >
              Create New Password
            </Text>

            <Text
              style={styles.subtitle}
            >
              Enter a new password
              for your FLOGRAM
              account.
            </Text>

            {email ? (
              <Text
                style={
                  styles.emailText
                }
              >
                {email}
              </Text>
            ) : null}
          </View>

          <View style={styles.form}>
            <Text
              style={styles.label}
            >
              New Password
            </Text>

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8A8A93"
              />

              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={
                  setNewPassword
                }
                placeholder="Enter new password"
                placeholderTextColor="#A1A1AA"
                secureTextEntry={
                  !showNewPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                textContentType="newPassword"
              />

              <Pressable
                onPress={() =>
                  setShowNewPassword(
                    (current) =>
                      !current
                  )
                }
                hitSlop={10}
                disabled={submitting}
              >
                <Ionicons
                  name={
                    showNewPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={21}
                  color="#777783"
                />
              </Pressable>
            </View>

            <View
              style={
                styles.requirements
              }
            >
              {renderRequirement(
                hasMinimumLength,
                'At least 8 characters'
              )}

              {renderRequirement(
                hasLowercase,
                'One lowercase letter'
              )}

              {renderRequirement(
                hasUppercase,
                'One uppercase letter'
              )}

              {renderRequirement(
                hasNumber,
                'One number'
              )}
            </View>

            <Text
              style={[
                styles.label,
                styles.confirmLabel,
              ]}
            >
              Confirm New Password
            </Text>

            <View
              style={
                styles.inputContainer
              }
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#8A8A93"
              />

              <TextInput
                style={styles.input}
                value={
                  confirmNewPassword
                }
                onChangeText={
                  setConfirmNewPassword
                }
                placeholder="Confirm new password"
                placeholderTextColor="#A1A1AA"
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={
                  handleResetPassword
                }
              />

              <Pressable
                onPress={() =>
                  setShowConfirmPassword(
                    (current) =>
                      !current
                  )
                }
                hitSlop={10}
                disabled={submitting}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={21}
                  color="#777783"
                />
              </Pressable>
            </View>

            {confirmNewPassword
              .length > 0 ? (
              <View
                style={
                  styles.matchContainer
                }
              >
                <Ionicons
                  name={
                    passwordsMatch
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={17}
                  color={
                    passwordsMatch
                      ? '#4E9A72'
                      : '#D75C73'
                  }
                />

                <Text
                  style={[
                    styles.matchText,
                    {
                      color:
                        passwordsMatch
                          ? '#4E9A72'
                          : '#D75C73',
                    },
                  ]}
                >
                  {passwordsMatch
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </Text>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.primaryButton,
                submitting &&
                  styles.disabledButton,
              ]}
              onPress={
                handleResetPassword
              }
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Reset Password
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.loginLink}
              onPress={() =>
                router.replace(
                  '/(auth)/login'
                )
              }
              disabled={submitting}
            >
              <Ionicons
                name="arrow-back-outline"
                size={17}
                color="#E91E63"
              />

              <Text
                style={
                  styles.loginLinkText
                }
              >
                Back to Login
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
    safeArea: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },

    keyboardView: {
      flex: 1,
    },

    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingTop: 18,
      paddingBottom: 40,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F7F7FA',
      marginBottom: 30,
    },

    header: {
      alignItems: 'center',
      marginBottom: 32,
    },

    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FCE7F3',
      marginBottom: 18,
    },

    brand: {
      fontSize: 15,
      fontWeight: '800',
      color: '#E91E63',
      letterSpacing: 2,
      marginBottom: 14,
    },

    title: {
      fontSize: 28,
      fontWeight: '800',
      color: '#18181B',
      textAlign: 'center',
      marginBottom: 12,
    },

    subtitle: {
      maxWidth: 330,
      fontSize: 15,
      lineHeight: 22,
      color: '#777783',
      textAlign: 'center',
    },

    emailText: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '700',
      color: '#E91E63',
      textAlign: 'center',
    },

    form: {
      width: '100%',
    },

    label: {
      fontSize: 14,
      fontWeight: '700',
      color: '#27272A',
      marginBottom: 8,
    },

    confirmLabel: {
      marginTop: 24,
    },

    inputContainer: {
      minHeight: 54,
      borderWidth: 1,
      borderColor: '#E4E4E7',
      borderRadius: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },

    input: {
      flex: 1,
      minHeight: 52,
      marginLeft: 11,
      marginRight: 10,
      fontSize: 15,
      color: '#18181B',
    },

    requirements: {
      marginTop: 14,
      paddingHorizontal: 2,
      gap: 7,
    },

    requirementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },

    requirementText: {
      fontSize: 13,
      color: '#8A8A93',
    },

    requirementMet: {
      color: '#4E9A72',
    },

    matchContainer: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    matchText: {
      fontSize: 13,
      fontWeight: '600',
    },

    primaryButton: {
      height: 54,
      borderRadius: 14,
      backgroundColor: '#E91E63',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 28,
    },

    disabledButton: {
      opacity: 0.65,
    },

    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },

    loginLink: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },

    loginLinkText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#E91E63',
    },
  });