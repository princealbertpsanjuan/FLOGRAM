import { useCallback, useState, type ReactNode } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { logout } from '../../services/auth';

import {
  getMyRiderProfile,
  updateMyRiderProfile,
  type RiderProfile,
} from '../../services/delivery';

import { VEHICLE_TYPES } from '../../services/application';

import RiderScreenHeader from '../../components/rider/rider-screen-header';

import CollapsibleSection from '../../components/ui/collapsible-section';

import KeyboardSafeView from '../../components/ui/keyboard-safe-view';

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

import {
  RIDER_GOLD,
  RIDER_GOLD_DARK,
  RIDER_GOLD_LIGHT,
} from '../../components/rider/rider-bottom-nav';

import { formatPhDate } from '../../utils/rider-format';

/*
 * =========================================================
 * RIDER PROFILE
 * =========================================================
 *
 * Secondary screen opened from the Dashboard header.
 * It is NOT a bottom-navigation tab and has Back
 * navigation. Logout lives here (moved out of the
 * Dashboard header).
 * =========================================================
 */

const BACKGROUND = '#F8F7FA';
const TEXT = '#171717';
const MUTED = '#6F6F6F';
const RED = '#D64545';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';

const formatAddress = (address?: RiderProfile['address']) => {
  if (!address) {
    return 'Not provided';
  }

  const text = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  return text || 'Not provided';
};

const formatVehicle = (value?: string) => {
  if (!value) {
    return 'Not provided';
  }

  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

/*
 * Plate number: letters and digits, 2-8 characters,
 * uppercase (e.g. ABC1234). Same rule as the server.
 */
const PLATE_ERROR =
  'Enter a valid plate number: 2 to 8 letters and numbers (e.g. ABC1234).';

const formatPlateInput = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);

const isValidPlate = (value: string) =>
  /^[A-Z0-9]{2,8}$/.test(formatPlateInput(value));

const VERIFICATION_LABELS: Record<string, string> = {
  approved: 'Verified Rider',
  pending: 'Verification Pending',
  rejected: 'Verification Rejected',
};

export default function RiderProfileScreen() {
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  /*
   * Editable settings: Contact Information and
   * Vehicle & License. Each section has its own
   * Edit → Save / Cancel.
   */
  const [editingContact, setEditingContact] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [savingContact, setSavingContact] = useState(false);

  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({
    vehicleType: 'motorcycle',
    vehiclePlateNumber: '',
    driverLicenseNumber: '',
  });
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      setProfile(await getMyRiderProfile());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
      return undefined;
    }, [loadProfile])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadProfile();
    } finally {
      setRefreshing(false);
    }
  }, [loadProfile]);

  const performLogout = useCallback(async () => {
    setLoggingOut(true);

    try {
      await logout();
    } catch {
      /*
       * logout() always clears the local session in
       * its finally block, so continue to Login even
       * if the server call fails.
       */
    } finally {
      setLoggingOut(false);
      router.replace('/(auth)/login' as never);
    }
  }, []);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out of FLOGRAM?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            void performLogout();
          },
        },
      ]
    );
  }, [performLogout]);

  const startContactEdit = () => {
    setPhoneDraft(sanitizePhoneInput(normalizePhone(profile?.owner?.phoneNumber)));
    setContactError(null);
    setEditingContact(true);
  };

  const saveContact = async () => {
    if (!isValidPhone(phoneDraft)) {
      setContactError(PHONE_ERROR);
      return;
    }

    try {
      setSavingContact(true);
      setContactError(null);

      const updated = await updateMyRiderProfile({
        phoneNumber: normalizePhone(phoneDraft),
      });

      setProfile(updated);
      setEditingContact(false);
      Alert.alert('Saved', 'Your contact number was updated.');
    } catch (saveError) {
      setContactError(getErrorMessage(saveError));
    } finally {
      setSavingContact(false);
    }
  };

  const startVehicleEdit = () => {
    setVehicleDraft({
      vehicleType: profile?.vehicleType || 'motorcycle',
      vehiclePlateNumber: formatPlateInput(profile?.vehiclePlateNumber || ''),
      driverLicenseNumber: formatLicenseInput(profile?.driverLicenseNumber || ''),
    });
    setVehicleError(null);
    setEditingVehicle(true);
  };

  const saveVehicle = async () => {
    const plate = formatPlateInput(vehicleDraft.vehiclePlateNumber);

    if (plate && !isValidPlate(plate)) {
      setVehicleError(PLATE_ERROR);
      return;
    }

    if (!isValidLicense(vehicleDraft.driverLicenseNumber)) {
      setVehicleError(LICENSE_ERROR);
      return;
    }

    try {
      setSavingVehicle(true);
      setVehicleError(null);

      const updated = await updateMyRiderProfile({
        vehicleType: vehicleDraft.vehicleType,
        vehiclePlateNumber: plate,
        driverLicenseNumber: normalizeLicense(vehicleDraft.driverLicenseNumber),
      });

      setProfile(updated);
      setEditingVehicle(false);
      Alert.alert(
        'Saved',
        'Your vehicle and license details were updated. FLOGRAM Admin has been notified and may re-check them.'
      );
    } catch (saveError) {
      setVehicleError(getErrorMessage(saveError));
    } finally {
      setSavingVehicle(false);
    }
  };

  const owner = profile?.owner;

  const fullName =
    [owner?.firstName, owner?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Rider';

  const initials =
    fullName
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'R';

  const verificationLabel =
    VERIFICATION_LABELS[profile?.verificationStatus || ''] ||
    'Verification status unavailable';

  return (
    <KeyboardSafeView style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={RIDER_GOLD}
      />

      <RiderScreenHeader
        title="My Profile"
        subtitle="Rider account"
      />

      {loading && !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={RIDER_GOLD}
          />
          <Text style={styles.mutedText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={RIDER_GOLD}
              colors={[RIDER_GOLD]}
            />
          }
        >
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={RED}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* IDENTITY */}
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>

            <Text style={styles.name}>{fullName}</Text>

            <View style={styles.verificationBadge}>
              <Ionicons
                name={
                  profile?.verificationStatus === 'approved'
                    ? 'shield-checkmark'
                    : 'shield-outline'
                }
                size={15}
                color={RIDER_GOLD_DARK}
              />
              <Text style={styles.verificationText}>
                {verificationLabel}
              </Text>
            </View>

            {profile?.createdAt ? (
              <Text style={styles.mutedText}>
                Rider since {formatPhDate(profile.createdAt)}
              </Text>
            ) : null}
          </View>

          {/* CONTACT (editable dropdown) */}
          <View style={styles.section}>
            <CollapsibleSection
              title="Contact Information"
              subtitle={owner?.phoneNumber || 'Add your contact number'}
              icon="call-outline"
              role="rider"
              style={styles.collapsible}
            >
              <InfoRow
                icon="mail-outline"
                label="Email (cannot be changed here)"
                value={owner?.email || 'Not provided'}
              />

              {editingContact ? (
                <View style={[styles.editBlock, styles.rowDivider]}>
                  <Text style={styles.rowLabel}>Phone Number</Text>
                  <TextInput
                    style={[styles.input, contactError ? styles.inputError : null]}
                    value={phoneDraft}
                    onChangeText={value => {
                      setPhoneDraft(sanitizePhoneInput(value));
                      setContactError(null);
                    }}
                    placeholder="09171234567"
                    placeholderTextColor="#B5B5B5"
                    keyboardType="phone-pad"
                    maxLength={11}
                    editable={!savingContact}
                  />
                  {phoneDraft && !isValidPhone(phoneDraft) && !contactError ? (
                    <Text style={styles.fieldError}>{PHONE_ERROR}</Text>
                  ) : null}
                </View>
              ) : (
                <InfoRow
                  icon="call-outline"
                  label="Phone Number"
                  value={owner?.phoneNumber || 'Not provided'}
                />
              )}

              <InfoRow
                icon="home-outline"
                label="Address"
                value={formatAddress(profile?.address)}
                last
              />

              <EditActions
                editing={editingContact}
                saving={savingContact}
                error={contactError}
                disabled={!profile}
                onEdit={startContactEdit}
                onCancel={() => {
                  setEditingContact(false);
                  setContactError(null);
                }}
                onSave={() => void saveContact()}
              />
            </CollapsibleSection>
          </View>

          {/* VEHICLE (editable dropdown) */}
          <View style={styles.sectionTight}>
            <CollapsibleSection
              title="Vehicle & License"
              subtitle={[
                formatVehicle(profile?.vehicleType),
                profile?.vehiclePlateNumber,
              ]
                .filter(Boolean)
                .join(' · ')}
              icon="bicycle-outline"
              role="rider"
              style={styles.collapsible}
            >
              {editingVehicle ? (
                <View style={styles.editBlock}>
                  <Text style={styles.rowLabel}>Vehicle Type</Text>
                  <View style={styles.chips}>
                    {VEHICLE_TYPES.map(type => {
                      const active = vehicleDraft.vehicleType === type;

                      return (
                        <Pressable
                          key={type}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                          disabled={savingVehicle}
                          onPress={() =>
                            setVehicleDraft(current => ({ ...current, vehicleType: type }))
                          }
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {formatVehicle(type)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.rowLabel, styles.fieldGap]}>Plate Number</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleDraft.vehiclePlateNumber}
                    onChangeText={value => {
                      setVehicleDraft(current => ({
                        ...current,
                        vehiclePlateNumber: formatPlateInput(value),
                      }));
                      setVehicleError(null);
                    }}
                    placeholder="ABC1234"
                    placeholderTextColor="#B5B5B5"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={8}
                    editable={!savingVehicle}
                  />
                  {vehicleDraft.vehiclePlateNumber && !isValidPlate(vehicleDraft.vehiclePlateNumber) ? (
                    <Text style={styles.fieldError}>{PLATE_ERROR}</Text>
                  ) : null}

                  <Text style={[styles.rowLabel, styles.fieldGap]}>Driver's License No.</Text>
                  <TextInput
                    style={styles.input}
                    value={vehicleDraft.driverLicenseNumber}
                    onChangeText={value => {
                      setVehicleDraft(current => ({
                        ...current,
                        driverLicenseNumber: formatLicenseInput(value),
                      }));
                      setVehicleError(null);
                    }}
                    placeholder="A01-23-456789"
                    placeholderTextColor="#B5B5B5"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={13}
                    editable={!savingVehicle}
                  />
                  {vehicleDraft.driverLicenseNumber && !isValidLicense(vehicleDraft.driverLicenseNumber) ? (
                    <Text style={styles.fieldError}>{LICENSE_ERROR}</Text>
                  ) : null}

                  <Text style={styles.editNote}>
                    FLOGRAM Admin is notified when you change these details and may re-check your documents.
                  </Text>
                </View>
              ) : (
                <>
                  <InfoRow
                    icon="bicycle-outline"
                    label="Vehicle Type"
                    value={formatVehicle(profile?.vehicleType)}
                  />
                  <InfoRow
                    icon="card-outline"
                    label="Plate Number"
                    value={profile?.vehiclePlateNumber || 'Not provided'}
                  />
                  <InfoRow
                    icon="document-text-outline"
                    label="Driver's License No."
                    value={profile?.driverLicenseNumber || 'Not provided'}
                    last
                  />
                </>
              )}

              <EditActions
                editing={editingVehicle}
                saving={savingVehicle}
                error={vehicleError}
                disabled={!profile}
                onEdit={startVehicleEdit}
                onCancel={() => {
                  setEditingVehicle(false);
                  setVehicleError(null);
                }}
                onSave={() => void saveVehicle()}
              />
            </CollapsibleSection>
          </View>

          {/* EMERGENCY */}
          <Section title="Emergency Contact">
            <InfoRow
              icon="person-outline"
              label="Name"
              value={profile?.emergencyContactName || 'Not provided'}
            />
            <InfoRow
              icon="call-outline"
              label="Contact Number"
              value={profile?.emergencyContactNumber || 'Not provided'}
              last
            />
          </Section>

          {/* SHORTCUTS */}
          <Section title="Work">
            <LinkRow
              icon="time-outline"
              label="Work Shifts"
              onPress={() => router.push('/(rider)/rider-shifts' as never)}
            />
            <LinkRow
              icon="wallet-outline"
              label="Earnings & COD Remittance"
              onPress={() => router.replace('/(rider)/rider-wallet' as never)}
            />
            <LinkRow
              icon="sparkles-outline"
              label="AI Rider Assistant"
              onPress={() => router.push('/(shared)/work-assistant' as never)}
            />
            <LinkRow
              icon="flag-outline"
              label="My Reports"
              onPress={() => router.push('/(shared)/my-reports' as never)}
              last
            />
          </Section>

          {/* SUPPORT */}
          <Section title="Support">
            <LinkRow
              icon="help-circle-outline"
              label="Help Center"
              onPress={() =>
                router.push({
                  pathname: '/(shared)/help-center',
                  params: { role: 'rider' },
                } as never)
              }
            />
            <LinkRow
              icon="document-text-outline"
              label="Terms and Policies"
              onPress={() => router.push('/(shared)/terms-policies' as never)}
              last
            />
          </Section>

          {/* LOGOUT */}
          <Pressable
            accessibilityRole="button"
            disabled={loggingOut}
            onPress={confirmLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && { opacity: 0.85 },
              loggingOut && { opacity: 0.6 },
            ]}
          >
            {loggingOut ? (
              <ActivityIndicator
                size="small"
                color={RED}
              />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={RED}
                />
                <Text style={styles.logoutText}>Log out</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardSafeView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function EditActions({
  editing,
  saving,
  error,
  disabled,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  error: string | null;
  disabled?: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View>
      {error ? (
        <View style={[styles.errorCard, styles.inlineError]}>
          <Ionicons
            name="alert-circle-outline"
            size={18}
            color={RED}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {editing ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={onSave}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && { opacity: 0.85 },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Text style={styles.primaryButtonText}>Save</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            pressed && { opacity: 0.8 },
            disabled && { opacity: 0.5 },
          ]}
        >
          <Ionicons
            name="create-outline"
            size={17}
            color={RIDER_GOLD_DARK}
          />
          <Text style={styles.editButtonText}>Edit</Text>
        </Pressable>
      )}
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={RIDER_GOLD_DARK}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  label,
  onPress,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !last && styles.rowDivider,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.rowIcon}>
        <Ionicons
          name={icon}
          size={18}
          color={RIDER_GOLD_DARK}
        />
      </View>
      <Text style={[styles.rowValue, styles.linkLabel]}>{label}</Text>
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#B5B5B5"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mutedText: {
    marginTop: 8,
    color: MUTED,
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  errorText: {
    flex: 1,
    color: RED,
    fontSize: 14,
  },
  identityCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RIDER_GOLD_LIGHT,
    borderWidth: 2,
    borderColor: RIDER_GOLD,
  },
  avatarText: {
    color: RIDER_GOLD_DARK,
    fontSize: 26,
    fontWeight: '800',
  },
  name: {
    marginTop: 12,
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  verificationText: {
    color: RIDER_GOLD_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 4,
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowLabel: {
    color: MUTED,
    fontSize: 13,
  },
  rowValue: {
    marginTop: 2,
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
  },
  linkLabel: {
    flex: 1,
    marginTop: 0,
    marginLeft: 12,
  },
  sectionTight: {
    marginTop: 0,
  },
  collapsible: {
    marginBottom: 12,
    borderColor: '#EFEDE6',
  },
  editBlock: {
    paddingVertical: 12,
  },
  input: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7E3E8',
    backgroundColor: '#FBFAFB',
    color: TEXT,
    fontSize: 15,
  },
  inputError: {
    borderColor: RED,
  },
  fieldError: {
    marginTop: 4,
    color: RED,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGap: {
    marginTop: 14,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RIDER_GOLD,
  },
  chipActive: {
    backgroundColor: RIDER_GOLD,
  },
  chipText: {
    color: RIDER_GOLD_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  editNote: {
    marginTop: 12,
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  inlineError: {
    marginTop: 10,
    marginBottom: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RIDER_GOLD,
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  editButtonText: {
    color: RIDER_GOLD_DARK,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RIDER_GOLD,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E7E3E8',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F3C9C9',
    backgroundColor: '#FFFFFF',
  },
  logoutText: {
    color: RED,
    fontSize: 16,
    fontWeight: '800',
  },
});
