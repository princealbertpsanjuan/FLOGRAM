import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddressAutocomplete from '../../components/ui/address-autocomplete';
import { ScreenLoader } from '../../components/ui/state-views';
import ShopLocationPicker, { type ShopCoordinate } from '../../components/seller/shop-location-picker';
import {
  RIDER_DOCUMENTS,
  SELLER_DOCUMENTS,
  VEHICLE_TYPES,
  createRiderProfile,
  createSellerProfile,
  getApplicationProfile,
  getMyVerification,
  submitDocuments,
  type ApplicationProfile,
  type ApplicationRole,
  type VerificationRecord,
} from '../../services/application';
import { getCurrentUser, getStoredUser, logout } from '../../services/auth';
import type { AddressSuggestion } from '../../services/geo';
import { replaceHistory } from '../../services/navigation';
import {
  LICENSE_ERROR,
  PHONE_ERROR,
  formatLicenseInput,
  isValidLicense,
  isValidPhone,
  normalizeLicense,
  normalizePhone,
  sanitizePhoneInput,
} from '../../utils/validation';

/*
 * =========================================================
 * SELLER / RIDER APPLICATION
 * =========================================================
 *
 * Shown right after a Seller or Rider signs up, and every
 * time they log in until Admin approves them.
 *
 * Step 1  Shop details (Seller) or rider details (Rider)
 * Step 2  Upload requirements
 * Step 3  Waiting for Admin review (or fix and resubmit
 *         if rejected)
 * =========================================================
 */

const COLORS = {
  seller: '#5E9874',
  rider: '#C49317',
  text: '#2D2A2E',
  muted: '#6F6A70',
  border: '#E7E3E8',
  danger: '#C2413B',
};

type Stage = 'details' | 'documents' | 'review' | 'rejected';

// Plate number: letters and digits, 2-8 characters (e.g. ABC1234)
const PLATE_ERROR = 'Enter a valid plate number: 2 to 8 letters and numbers (e.g. ABC1234).';
const formatPlateInput = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
const isValidPlate = (value: string) => /^[A-Z0-9]{2,8}$/.test(formatPlateInput(value));

export default function ApplicationScreen() {
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<ApplicationRole | null>(null);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<ApplicationProfile | null>(null);
  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);

  // Step 1 form
  const [form, setForm] = useState({
    shopName: '',
    description: '',
    contactNumber: '',
    businessEmail: '',
    vehicleType: 'motorcycle',
    vehiclePlateNumber: '',
    driverLicenseNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    postalCode: '',
  });

  // Seller shop map pin (needed for delivery checkout)
  const [shopLocation, setShopLocation] = useState<ShopCoordinate | null>(null);
  const [shopLocationError, setShopLocationError] = useState<string | null>(null);

  // Step 2 files
  const [files, setFiles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const stored = await getStoredUser();
      const user = await getCurrentUser().catch(() => stored);

      if (!user || (user.role !== 'seller' && user.role !== 'rider')) {
        router.replace('/(auth)/login');
        return;
      }

      if (user.verificationStatus === 'approved') {
        replaceHistory(user.role === 'seller' ? '/(seller)/seller-dashboard' : '/(rider)/rider-dashboard');
        return;
      }

      setRole(user.role);
      setName(user.firstName || '');

      const [nextProfile, nextVerification] = await Promise.all([
        getApplicationProfile(user.role),
        getMyVerification(),
      ]);

      setProfile(nextProfile);
      setVerification(nextVerification);
    } catch (error) {
      Alert.alert('Could not load your application', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !role) {
    return <ScreenLoader role={role || 'seller'} message="Loading your application..." />;
  }

  const accent = COLORS[role];
  const documents = role === 'seller' ? SELLER_DOCUMENTS : RIDER_DOCUMENTS;

  const stage: Stage = !profile
    ? 'details'
    : verification?.status === 'rejected' || profile.verificationStatus === 'rejected'
      ? resubmitting
        ? 'documents'
        : 'rejected'
      : !verification
        ? 'documents'
        : 'review';

  const set = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));

  /*
   * Seller shop address: fill street / barangay / city /
   * province / postal from an address suggestion or from
   * the map pin. Empty parts keep what was typed.
   */
  const fillShopAddress = (address: AddressSuggestion) =>
    setForm(current => ({
      ...current,
      street: address.street || current.street,
      barangay: address.barangay || current.barangay,
      city: address.city || current.city,
      province: address.province || current.province,
      postalCode: address.postalCode || current.postalCode,
    }));

  const signOut = async () => {
    try {
      await logout();
    } finally {
      router.replace('/(auth)/login');
    }
  };

  /*
   * STEP 1
   */
  const saveDetails = async () => {
    const address = {
      street: form.street.trim(),
      barangay: form.barangay.trim(),
      city: form.city.trim(),
      province: form.province.trim(),
      postalCode: form.postalCode.trim(),
    };

    if (!address.street || !address.barangay || !address.city || !address.province) {
      Alert.alert('Address needed', 'Fill in street, barangay, city and province.');
      return;
    }

    try {
      setSaving(true);

      if (role === 'seller') {
        if (!form.shopName.trim()) throw new Error('Enter your shop name.');
        if (!isValidPhone(form.contactNumber)) throw new Error(PHONE_ERROR);
        if (!/^\S+@\S+\.\S+$/.test(form.businessEmail.trim())) throw new Error('Enter a valid business email.');
        if (!shopLocation) {
          setShopLocationError('Place your shop pin on the map so customers can order with delivery.');
          throw new Error(
            "Pin your shop on the map (tap the map or use your current location). Customers need it to order with delivery."
          );
        }

        await createSellerProfile({
          shopName: form.shopName.trim(),
          description: form.description.trim(),
          contactNumber: normalizePhone(form.contactNumber),
          businessEmail: form.businessEmail.trim(),
          address,
          location: shopLocation,
        });
      } else {
        if (form.vehiclePlateNumber.trim() && !isValidPlate(form.vehiclePlateNumber)) throw new Error(PLATE_ERROR);
        if (!form.driverLicenseNumber.trim()) throw new Error("Enter your driver's license number.");
        if (!isValidLicense(form.driverLicenseNumber)) throw new Error(LICENSE_ERROR);
        if (!form.emergencyContactName.trim()) throw new Error('Enter an emergency contact name.');
        if (!isValidPhone(form.emergencyContactNumber)) throw new Error(PHONE_ERROR);

        await createRiderProfile({
          vehicleType: form.vehicleType,
          vehiclePlateNumber: formatPlateInput(form.vehiclePlateNumber),
          driverLicenseNumber: normalizeLicense(form.driverLicenseNumber),
          emergencyContactName: form.emergencyContactName.trim(),
          emergencyContactNumber: normalizePhone(form.emergencyContactNumber),
          address,
        });
      }

      await load();
    } catch (error) {
      Alert.alert('Please check your details', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /*
   * STEP 2
   */
  const pickDocument = async (key: string) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to upload your documents.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (!result.canceled && result.assets?.[0]) {
      setFiles(current => ({ ...current, [key]: result.assets[0].uri }));
    }
  };

  const sendDocuments = async () => {
    const missing = documents.filter(doc => !files[doc.key]);

    if (missing.length) {
      Alert.alert('Missing requirements', `Please add: ${missing.map(doc => doc.label).join(', ')}.`);
      return;
    }

    try {
      setSaving(true);
      await submitDocuments(role, files);
      setResubmitting(false);
      setFiles({});
      await load();
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const steps = ['Details', 'Requirements', 'Admin review'];
  const stepIndex = stage === 'details' ? 0 : stage === 'review' || stage === 'rejected' ? 2 : 1;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
    >
      <View style={[styles.screen]}>
        <View style={[styles.header, { paddingTop: insets.top + 14, backgroundColor: accent }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>{role === 'seller' ? 'SELLER APPLICATION' : 'RIDER APPLICATION'}</Text>
              <Text style={styles.headerTitle}>Hi{name ? `, ${name}` : ''}! 🌸</Text>
              <Text style={styles.headerSubtitle}>
                Your account stays pending until FLOGRAM Admin verifies your requirements.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Log out"
              onPress={() => void signOut()}
              style={styles.headerButton}
            >
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <View style={styles.steps}>
            {steps.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={[styles.stepDot, index <= stepIndex && styles.stepDotActive]}>
                  {index < stepIndex ? (
                    <Ionicons name="checkmark" size={13} color={accent} />
                  ) : (
                    <Text style={[styles.stepNumber, index <= stepIndex && { color: accent }]}>{index + 1}</Text>
                  )}
                </View>
                <Text style={styles.stepLabel}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={accent}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
        >
          {stage === 'details' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{role === 'seller' ? 'Shop details' : 'Rider details'}</Text>

              {role === 'seller' ? (
                <>
                  <Field label="Shop name" value={form.shopName} onChangeText={set('shopName')} />
                  <Field
                    label="Short description (optional)"
                    value={form.description}
                    onChangeText={set('description')}
                    multiline
                  />
                  <Field
                    label="Shop contact number"
                    value={form.contactNumber}
                    onChangeText={value => set('contactNumber')(sanitizePhoneInput(value))}
                    keyboardType="phone-pad"
                    placeholder="09XXXXXXXXX"
                  />
                  {form.contactNumber && !isValidPhone(form.contactNumber) ? (
                    <Text style={styles.fieldError}>{PHONE_ERROR}</Text>
                  ) : null}
                  <Field
                    label="Business email"
                    value={form.businessEmail}
                    onChangeText={set('businessEmail')}
                    keyboardType="email-address"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>Vehicle type</Text>
                  <View style={styles.chips}>
                    {VEHICLE_TYPES.map(type => {
                      const active = form.vehicleType === type;
                      return (
                        <Pressable
                          key={type}
                          onPress={() => set('vehicleType')(type)}
                          style={[styles.chip, { borderColor: accent }, active && { backgroundColor: accent }]}
                        >
                          <Text style={[styles.chipText, { color: active ? '#FFFFFF' : accent }]}>
                            {type[0].toUpperCase() + type.slice(1)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Field
                    label="Plate number (optional)"
                    value={form.vehiclePlateNumber}
                    onChangeText={value => set('vehiclePlateNumber')(formatPlateInput(value))}
                    autoCapitalize="characters"
                    maxLength={8}
                    placeholder="ABC1234"
                  />
                  {form.vehiclePlateNumber && !isValidPlate(form.vehiclePlateNumber) ? (
                    <Text style={styles.fieldError}>{PLATE_ERROR}</Text>
                  ) : null}
                  <Field
                    label="Driver's license number"
                    value={form.driverLicenseNumber}
                    onChangeText={value => set('driverLicenseNumber')(formatLicenseInput(value))}
                    autoCapitalize="characters"
                    maxLength={13}
                    placeholder="A01-23-456789"
                  />
                  {form.driverLicenseNumber && !isValidLicense(form.driverLicenseNumber) ? (
                    <Text style={styles.fieldError}>{LICENSE_ERROR}</Text>
                  ) : null}
                  <Field
                    label="Emergency contact name"
                    value={form.emergencyContactName}
                    onChangeText={set('emergencyContactName')}
                  />
                  <Field
                    label="Emergency contact number"
                    value={form.emergencyContactNumber}
                    onChangeText={value => set('emergencyContactNumber')(sanitizePhoneInput(value))}
                    keyboardType="phone-pad"
                    maxLength={11}
                    placeholder="09XXXXXXXXX"
                  />
                  {form.emergencyContactNumber && !isValidPhone(form.emergencyContactNumber) ? (
                    <Text style={styles.fieldError}>{PHONE_ERROR}</Text>
                  ) : null}
                </>
              )}

              <Text style={[styles.cardTitle, { marginTop: 18 }]}>
                {role === 'seller' ? 'Shop address' : 'Home address'}
              </Text>
              {role === 'seller' ? (
                <>
                  <Text style={styles.label}>Street / building</Text>
                  <AddressAutocomplete
                    role="seller"
                    value={form.street}
                    onChangeText={set('street')}
                    onSelect={suggestion => {
                      fillShopAddress(suggestion);
                      // What was typed was only the search text
                      set('street')(suggestion.street);

                      if (suggestion.latitude != null && suggestion.longitude != null) {
                        setShopLocation({ latitude: suggestion.latitude, longitude: suggestion.longitude });
                        setShopLocationError(null);
                      }
                    }}
                    placeholder="Start typing, e.g. Tabuco"
                    placeholderTextColor="#A9A3AA"
                    style={styles.input}
                  />
                </>
              ) : (
                <Field label="Street / building" value={form.street} onChangeText={set('street')} />
              )}
              <Field label="Barangay" value={form.barangay} onChangeText={set('barangay')} />
              <Field label="City" value={form.city} onChangeText={set('city')} />
              <Field label="Province" value={form.province} onChangeText={set('province')} />
              <Field
                label="Postal code (optional)"
                value={form.postalCode}
                onChangeText={set('postalCode')}
                keyboardType="number-pad"
              />

              {role === 'seller' ? (
                <>
                  <Text style={[styles.cardTitle, { marginTop: 18 }]}>Shop map pin</Text>
                  <ShopLocationPicker
                    value={shopLocation}
                    onChange={next => {
                      setShopLocation(next);
                      setShopLocationError(null);
                    }}
                    disabled={saving}
                    error={shopLocationError}
                    onAddressResolved={fillShopAddress}
                  />
                </>
              ) : null}

              <PrimaryButton color={accent} loading={saving} label="Next: Upload requirements" onPress={saveDetails} />
            </View>
          ) : null}

          {stage === 'rejected' ? (
            <View style={[styles.card, { borderColor: '#F2C2C0' }]}>
              <View style={styles.statusIcon}>
                <Ionicons name="alert-circle" size={34} color={COLORS.danger} />
              </View>
              <Text style={styles.statusTitle}>Your application needs changes</Text>
              <Text style={styles.statusText}>
                {verification?.remarks || profile?.verificationRemarks || 'Admin asked you to update your requirements.'}
              </Text>
              <PrimaryButton
                color={accent}
                label="Upload requirements again"
                onPress={() => setResubmitting(true)}
              />
            </View>
          ) : null}

          {stage === 'documents' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Upload your requirements</Text>
              <Text style={styles.statusText}>
                Take a clear photo of each document. Admin checks them before your account is activated.
              </Text>

              {documents.map(doc => {
                const uri = files[doc.key];

                return (
                  <Pressable
                    key={doc.key}
                    onPress={() => void pickDocument(doc.key)}
                    style={[styles.docRow, uri && { borderColor: accent }]}
                  >
                    {uri ? (
                      <Image source={{ uri }} style={styles.docThumb} />
                    ) : (
                      <View style={[styles.docThumb, styles.docThumbEmpty]}>
                        <Ionicons name="camera-outline" size={22} color={accent} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docLabel}>{doc.label}</Text>
                      <Text style={styles.docHint}>{doc.hint}</Text>
                    </View>
                    <Ionicons
                      name={uri ? 'checkmark-circle' : 'add-circle-outline'}
                      size={22}
                      color={uri ? accent : COLORS.muted}
                    />
                  </Pressable>
                );
              })}

              <PrimaryButton
                color={accent}
                loading={saving}
                label={`Submit ${Object.keys(files).length}/${documents.length} for review`}
                onPress={sendDocuments}
              />
            </View>
          ) : null}

          {stage === 'review' ? (
            <View style={styles.card}>
              <View style={styles.statusIcon}>
                <Ionicons name="hourglass-outline" size={32} color={accent} />
              </View>
              <Text style={styles.statusTitle}>Waiting for Admin review</Text>
              <Text style={styles.statusText}>
                Your {role === 'seller' ? 'shop details' : 'rider details'} and requirements were sent
                {verification?.updatedAt ? ` on ${new Date(verification.updatedAt).toLocaleDateString('en-PH')}` : ''}. You will
                get a notification once Admin approves your account. Pull down to check again.
              </Text>
              <PrimaryButton
                color={accent}
                loading={refreshing}
                label="Check status"
                onPress={() => {
                  setRefreshing(true);
                  void load();
                }}
              />
            </View>
          ) : null}

          <Pressable onPress={() => void signOut()} style={styles.logoutLink}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  multiline,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        autoCapitalize={props.autoCapitalize ?? (props.keyboardType === 'email-address' ? 'none' : 'sentences')}
        placeholderTextColor="#A9A3AA"
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </>
  );
}

function PrimaryButton({
  label,
  onPress,
  color,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  color: string;
  loading?: boolean;
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: color }, loading && { opacity: 0.6 }]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  header: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  headerTitle: { marginTop: 4, color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { marginTop: 4, color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 18 },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  steps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: { backgroundColor: '#FFFFFF' },
  stepNumber: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  stepLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  content: { padding: 16 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: '#FFFFFF' },
  cardTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  label: { marginTop: 12, marginBottom: 6, color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  fieldError: { marginTop: 4, color: COLORS.danger, fontSize: 12, fontWeight: '600' },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 15,
    backgroundColor: '#FBFAFB',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  primaryButton: { height: 50, marginTop: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  docThumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: '#EEE' },
  docThumbEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F4F7' },
  docLabel: { color: COLORS.text, fontSize: 14, fontWeight: '800' },
  docHint: { marginTop: 2, color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  statusIcon: { alignItems: 'center', marginBottom: 8 },
  statusTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  statusText: { marginTop: 6, color: COLORS.muted, fontSize: 13, lineHeight: 19 },
  logoutLink: { alignItems: 'center', paddingVertical: 18 },
  logoutText: { color: COLORS.muted, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
