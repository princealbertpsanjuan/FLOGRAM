import { Ionicons } from '@expo/vector-icons';
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
  forgotPassword,
  verifyResetCode,
} from '../../services/auth';

type Step = 'email' | 'code';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const getErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Something went wrong. Please try again.';
  };

  const handleSendCode = async () => {
    if (!normalizedEmail) {
      Alert.alert(
        'Email Required',
        'Please enter your registered email address.'
      );
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setSendingCode(true);

      const response = await forgotPassword({
        email: normalizedEmail,
      });

      setStep('code');

      Alert.alert(
        'Reset Code Sent',
        response.message ||
          'If an account exists for this email address, a password reset code has been sent.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Send Code',
        getErrorMessage(error)
      );
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedCode = code.trim();

    if (!normalizedCode) {
      Alert.alert(
        'Code Required',
        'Please enter the 6-digit password reset code.'
      );
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      Alert.alert(
        'Invalid Code',
        'The password reset code must contain exactly 6 digits.'
      );
      return;
    }

    try {
      setVerifyingCode(true);

      const response = await verifyResetCode({
        email: normalizedEmail,
        code: normalizedCode,
      });

      if (!response.data?.verified) {
        Alert.alert(
          'Verification Failed',
          'The password reset code could not be verified.'
        );
        return;
      }

      router.push({
        pathname: '/(auth)/reset-password',
        params: {
          email: normalizedEmail,
        },
      });
    } catch (error) {
      Alert.alert(
        'Invalid Code',
        getErrorMessage(error)
      );
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (resendingCode) {
      return;
    }

    try {
      setResendingCode(true);

      const response = await forgotPassword({
        email: normalizedEmail,
      });

      setCode('');

      Alert.alert(
        'New Code Sent',
        response.message ||
          'If an account exists for this email address, a new password reset code has been sent.'
      );
    } catch (error) {
      Alert.alert(
        'Unable to Resend Code',
        getErrorMessage(error)
      );
    } finally {
      setResendingCode(false);
    }
  };

  const handleChangeEmail = () => {
    setCode('');
    setStep('email');
  };

  const handleBack = () => {
    if (step === 'code') {
      handleChangeEmail();
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}
            onPress={handleBack}
            hitSlop={10}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#18181B"
            />
          </Pressable>

          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={
                  step === 'email'
                    ? 'lock-closed-outline'
                    : 'mail-outline'
                }
                size={34}
                color="#E91E63"
              />
            </View>

            <Text style={styles.brand}>FLOGRAM</Text>

            <Text style={styles.title}>
              {step === 'email'
                ? 'Forgot Password?'
                : 'Check Your Email'}
            </Text>

            <Text style={styles.subtitle}>
              {step === 'email'
                ? 'Enter the email address associated with your account and we will send you a verification code.'
                : `Enter the 6-digit verification code sent to ${normalizedEmail}.`}
            </Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Text style={styles.label}>
                Email Address
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#8A8A93"
                />

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor="#A1A1AA"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!sendingCode}
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                />
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  sendingCode && styles.disabledButton,
                ]}
                onPress={handleSendCode}
                disabled={sendingCode}
              >
                {sendingCode ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Send Reset Code
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.loginLink}
                onPress={() =>
                  router.replace('/(auth)/login')
                }
                disabled={sendingCode}
              >
                <Ionicons
                  name="arrow-back-outline"
                  size={17}
                  color="#E91E63"
                />

                <Text style={styles.loginLinkText}>
                  Back to Login
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>
                Verification Code
              </Text>

              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(value) =>
                  setCode(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 6)
                  )
                }
                placeholder="000000"
                placeholderTextColor="#C4C4CA"
                keyboardType="number-pad"
                maxLength={6}
                editable={!verifyingCode}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />

              <Text style={styles.codeHint}>
                The verification code expires in 10 minutes.
              </Text>

              <Pressable
                style={[
                  styles.primaryButton,
                  verifyingCode && styles.disabledButton,
                ]}
                onPress={handleVerifyCode}
                disabled={verifyingCode}
              >
                {verifyingCode ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Verify Code
                  </Text>
                )}
              </Pressable>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didnt receive the code?
                </Text>

                <Pressable
                  onPress={handleResendCode}
                  disabled={
                    resendingCode ||
                    verifyingCode
                  }
                >
                  {resendingCode ? (
                    <ActivityIndicator
                      size="small"
                      color="#E91E63"
                    />
                  ) : (
                    <Text style={styles.resendLink}>
                      Resend Code
                    </Text>
                  )}
                </Pressable>
              </View>

              <Pressable
                style={styles.changeEmailButton}
                onPress={handleChangeEmail}
                disabled={
                  verifyingCode ||
                  resendingCode
                }
              >
                <Text style={styles.changeEmailText}>
                  Use a different email address
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 36,
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

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#27272A',
    marginBottom: 8,
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
    marginBottom: 20,
  },

  input: {
    flex: 1,
    minHeight: 52,
    marginLeft: 11,
    fontSize: 15,
    color: '#18181B',
  },

  codeInput: {
    height: 64,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    color: '#18181B',
  },

  codeHint: {
    fontSize: 13,
    color: '#8A8A93',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },

  primaryButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
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

  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 5,
  },

  resendText: {
    fontSize: 14,
    color: '#777783',
  },

  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E91E63',
  },

  changeEmailButton: {
    alignItems: 'center',
    marginTop: 18,
  },

  changeEmailText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#777783',
    textDecorationLine: 'underline',
  },
});