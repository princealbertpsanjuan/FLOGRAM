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
  register,
  type UserRole,
} from '../../services/auth';

type RegistrationRole = Exclude<UserRole, 'admin'>;

export default function RegisterScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [role, setRole] =
    useState<RegistrationRole>('customer');

  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !phoneNumber.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert(
        'Missing Information',
        'Please complete all required fields.'
      );

      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        'Password Mismatch',
        'Your password confirmation does not match.'
      );

      return;
    }

    try {
      setLoading(true);

      const response = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim(),
        password,
        confirmPassword,
        role,
      });

      const user = response.data.user;

      /*
       * Customers don't require administrator verification.
       */
      if (user.role === 'customer') {
        Alert.alert(
          'Account Created',
          `Welcome to FLOGRAM, ${user.firstName}!`,
          [
            {
              text: 'Continue',
              onPress: () => {
                /*
                 * Customer home will replace this
                 * destination once we build its UI.
                 */
                router.replace('/(tabs)');
              },
            },
          ]
        );

        return;
      }

      /*
       * Seller and rider accounts are created with
       * verificationStatus = "pending".
       */
      if (user.verificationStatus === 'pending') {
        Alert.alert(
          'Account Created',
          'Your account was created successfully and is awaiting administrator verification.',
          [
            {
              text: 'OK',
              onPress: () => {
                router.replace('/(auth)/login');
              },
            },
          ]
        );

        return;
      }

      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error instanceof Error
          ? error.message
          : 'Unable to create your account.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}

          <View style={styles.hero}>
            <View style={styles.decorLeft} />
            <View style={styles.decorRight} />

            <Text style={styles.flower}>🌸</Text>

            <Text style={styles.heroTitle}>
              Create Account
            </Text>

            <Text style={styles.heroSubtitle}>
              Join FLOGRAM and make every moment bloom
            </Text>
          </View>

          {/* FORM */}

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>
              PERSONAL INFORMATION
            </Text>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.label}>
                  FIRST NAME
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Sofia"
                  placeholderTextColor="#B8AFB4"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.nameField}>
                <Text style={styles.label}>
                  LAST NAME
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Reyes"
                  placeholderTextColor="#B8AFB4"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <Text style={styles.label}>
              EMAIL ADDRESS
            </Text>

            <TextInput
              style={styles.input}
              placeholder="sofia@email.com"
              placeholderTextColor="#B8AFB4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>
              PHONE NUMBER
            </Text>

            <TextInput
              style={styles.input}
              placeholder="09171234567"
              placeholderTextColor="#B8AFB4"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={13}
            />

            {/* ACCOUNT TYPE */}

            <Text style={styles.sectionTitle}>
              ACCOUNT TYPE
            </Text>

            <View style={styles.roleContainer}>
              <RoleButton
                label="Customer"
                icon="🌷"
                selected={role === 'customer'}
                onPress={() => setRole('customer')}
              />

              <RoleButton
                label="Seller"
                icon="🏪"
                selected={role === 'seller'}
                onPress={() => setRole('seller')}
              />

              <RoleButton
                label="Rider"
                icon="🛵"
                selected={role === 'rider'}
                onPress={() => setRole('rider')}
              />
            </View>

            {role !== 'customer' && (
              <View style={styles.verificationNotice}>
                <Text style={styles.verificationTitle}>
                  Verification Required
                </Text>

                <Text style={styles.verificationText}>
                  {role === 'seller'
                    ? 'Seller accounts require administrator verification before full seller features become available.'
                    : 'Rider accounts require administrator verification before delivery features become available.'}
                </Text>
              </View>
            )}

            {/* PASSWORD */}

            <Text style={styles.sectionTitle}>
              SECURITY
            </Text>

            <Text style={styles.label}>
              PASSWORD
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter password"
                placeholderTextColor="#B8AFB4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />

              <Pressable
                onPress={() =>
                  setShowPassword((current) => !current)
                }
              >
                <Text style={styles.showText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.passwordHint}>
              At least 8 characters with uppercase, lowercase and a number.
            </Text>

            <Text style={styles.label}>
              CONFIRM PASSWORD
            </Text>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm password"
                placeholderTextColor="#B8AFB4"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />

              <Pressable
                onPress={() =>
                  setShowConfirmPassword(
                    (current) => !current
                  )
                }
              >
                <Text style={styles.showText}>
                  {showConfirmPassword
                    ? 'Hide'
                    : 'Show'}
                </Text>
              </Pressable>
            </View>

            {/* CREATE */}

            <Pressable
              disabled={loading}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.pressed,
                loading && styles.disabledButton,
              ]}
              onPress={handleRegister}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>
                  Create Account
                </Text>
              )}
            </Pressable>

            {/* LOGIN */}

            <View style={styles.loginRow}>
              <Text style={styles.loginPrefix}>
                Already have an account?
              </Text>

              <Pressable
                onPress={() =>
                  router.replace('/(auth)/login')
                }
              >
                <Text style={styles.loginLink}>
                  Sign In
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>
                ← Back
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
      style={[
        styles.roleButton,
        selected && styles.roleButtonSelected,
      ]}
      onPress={onPress}
    >
      <Text style={styles.roleIcon}>
        {icon}
      </Text>

      <Text
        style={[
          styles.roleText,
          selected && styles.roleTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 35,
  },

  hero: {
    height: 215,
    backgroundColor: '#DF5A8C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 12,
  },

  decorLeft: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -62,
    left: -45,
  },

  decorRight: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
    backgroundColor: 'rgba(255,255,255,0.10)',
    bottom: -75,
    right: -45,
  },

  flower: {
    fontSize: 34,
    marginBottom: 8,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },

  heroSubtitle: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 12,
    marginTop: 6,
  },

  form: {
    paddingHorizontal: 26,
    paddingTop: 25,
  },

  sectionTitle: {
    color: '#D95888',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 14,
    marginTop: 7,
  },

  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },

  nameField: {
    flex: 1,
  },

  label: {
    color: '#98909A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 7,
    marginTop: 5,
  },

  input: {
    height: 50,
    backgroundColor: '#F8F7F9',
    borderRadius: 14,
    paddingHorizontal: 16,
    color: '#3F3940',
    fontSize: 14,
    marginBottom: 13,
  },

  roleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  roleButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: 15,
    backgroundColor: '#F8F7F9',
    borderWidth: 1.5,
    borderColor: '#F0ECEF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  roleButtonSelected: {
    backgroundColor: '#FFF3F7',
    borderColor: '#DF5A8C',
  },

  roleIcon: {
    fontSize: 23,
    marginBottom: 5,
  },

  roleText: {
    color: '#91888E',
    fontSize: 11,
    fontWeight: '600',
  },

  roleTextSelected: {
    color: '#D95888',
    fontWeight: '800',
  },

  verificationNotice: {
    backgroundColor: '#FFF5F8',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },

  verificationTitle: {
    color: '#D95888',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 3,
  },

  verificationText: {
    color: '#8D858A',
    fontSize: 10,
    lineHeight: 15,
  },

  passwordContainer: {
    height: 50,
    backgroundColor: '#F8F7F9',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 14,
    marginBottom: 8,
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
    fontWeight: '600',
  },

  passwordHint: {
    color: '#B0A8AD',
    fontSize: 9,
    lineHeight: 14,
    marginBottom: 11,
    paddingHorizontal: 2,
  },

  createButton: {
    height: 53,
    backgroundColor: '#E65A8D',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  createButtonText: {
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

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 4,
  },

  loginPrefix: {
    color: '#AAA2A8',
    fontSize: 11,
  },

  loginLink: {
    color: '#D95888',
    fontSize: 12,
    fontWeight: '700',
  },

  backButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  backText: {
    color: '#AAA2A8',
    fontSize: 11,
  },
});