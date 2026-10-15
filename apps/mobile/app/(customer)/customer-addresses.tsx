import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect } from 'expo-router';

import * as Location from 'expo-location';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KeyboardSafeView from '../../components/ui/keyboard-safe-view';
import AddressAutocomplete from '../../components/ui/address-autocomplete';
import { reverseGeocode, type AddressSuggestion } from '../../services/geo';
import { PHONE_ERROR, isValidPhone, normalizePhone, sanitizePhoneInput } from '../../utils/validation';

import {
  MAX_SAVED_ADDRESSES,
  formatSavedAddress,
  getSavedAddresses,
  saveAddresses,
  type SavedAddress,
} from '../../services/addresses';

/*
 * =========================================================
 * CUSTOMER – SAVED ADDRESSES
 * =========================================================
 *
 * Address book stored on the customer's account. Saved
 * addresses can be picked at checkout instead of typing
 * the address every time.
 * =========================================================
 */

const PINK = '#DF628F';
const TEXT = '#2D2A2E';
const MUTED = '#77717A';

const EMPTY: SavedAddress = {
  label: 'Home',
  recipientName: '',
  recipientPhoneNumber: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  landmark: '',
  isDefault: false,
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Something went wrong.';

export default function CustomerAddressesScreen() {
  const insets = useSafeAreaInsets();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<SavedAddress>(EMPTY);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    try {
      setAddresses(await getSavedAddresses());
    } catch (error) {
      Alert.alert('Addresses', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const persist = useCallback(async (next: SavedAddress[]) => {
    setSaving(true);
    try {
      setAddresses(await saveAddresses(next));
      return true;
    } catch (error) {
      Alert.alert('Unable to Save', getErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const openForm = (index: number | null) => {
    setEditingIndex(index === null ? -1 : index);
    setForm(
      index === null
        ? { ...EMPTY, isDefault: addresses.length === 0 }
        : {
            ...addresses[index],
            // Stored +63 numbers → 09… so the 11-digit field can edit them
            recipientPhoneNumber: addresses[index].recipientPhoneNumber
              ? normalizePhone(addresses[index].recipientPhoneNumber)
              : '',
          }
    );
  };

  /*
   * Fill the form from a chosen suggestion or the phone's
   * location. Empty parts never erase typed values; all
   * fields stay editable.
   */
  const applySuggestion = (suggestion: AddressSuggestion, replaceStreet = false) =>
    setForm(previous => ({
      ...previous,
      street: suggestion.street || (replaceStreet ? '' : previous.street),
      barangay: suggestion.barangay || previous.barangay,
      city: suggestion.city || previous.city,
      province: suggestion.province || previous.province,
      postalCode: suggestion.postalCode || previous.postalCode,
    }));

  const fillFromCurrentLocation = async () => {
    setLocating(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Location needed', 'Allow location access to fill in the address, or type it below.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);

      if (!address) {
        Alert.alert('Address not found', 'We could not find an address for your location. Please type it below.');
        return;
      }

      applySuggestion(address);
    } catch (error) {
      Alert.alert('Location', getErrorMessage(error));
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    if (!form.street.trim() || !form.barangay.trim() || !form.city.trim() || !form.province.trim()) {
      Alert.alert('Missing details', 'Street, barangay, city and province are required.');
      return;
    }

    if (form.recipientPhoneNumber.trim() && !isValidPhone(form.recipientPhoneNumber)) {
      Alert.alert('Invalid contact number', PHONE_ERROR);
      return;
    }

    const cleaned: SavedAddress = {
      ...form,
      recipientPhoneNumber: form.recipientPhoneNumber.trim() ? normalizePhone(form.recipientPhoneNumber) : '',
    };

    let next = [...addresses];

    if (editingIndex === -1 || editingIndex === null) {
      next.push(cleaned);
    } else {
      next[editingIndex] = cleaned;
    }

    if (cleaned.isDefault) {
      next = next.map(item => ({ ...item, isDefault: item === cleaned }));
    }

    if (await persist(next)) {
      setEditingIndex(null);
    }
  };

  const handleDelete = (index: number) => {
    Alert.alert('Remove address?', formatSavedAddress(addresses[index]), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void persist(addresses.filter((_, i) => i !== index)),
      },
    ]);
  };

  const setDefault = (index: number) =>
    void persist(addresses.map((item, i) => ({ ...item, isDefault: i === index })));

  // Form inputs; only rendered inside the address sheet's KeyboardSafeView.
  const field = (key: keyof SavedAddress, label: string, placeholder?: string) => {
    const isPhone = key === 'recipientPhoneNumber';
    const phoneInvalid = isPhone && form.recipientPhoneNumber.length > 0 && !isValidPhone(form.recipientPhoneNumber);

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={String(form[key] ?? '')}
          onChangeText={value =>
            setForm(previous => ({ ...previous, [key]: isPhone ? sanitizePhoneInput(value) : value }))
          }
          placeholder={placeholder}
          placeholderTextColor="#B3ADB1"
          style={[styles.input, phoneInvalid && styles.inputError]}
          maxLength={isPhone ? 11 : undefined}
          keyboardType={isPhone || key === 'postalCode' ? 'number-pad' : 'default'}
        />
        {phoneInvalid ? <Text style={styles.errorText}>{PHONE_ERROR}</Text> : null}
      </View>
    );
  };

  // Street / barangay: suggestions while typing (e.g. "TAB" → Tabuco).
  const addressField = (key: 'street' | 'barangay', label: string, placeholder?: string) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <AddressAutocomplete
        role="customer"
        value={form[key]}
        onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))}
        onSelect={suggestion => applySuggestion(suggestion, key === 'street')}
        placeholder={placeholder}
        placeholderTextColor="#B3ADB1"
        style={styles.input}
      />
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(customer)/customer-profile' as never))}
          style={styles.back}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={TEXT}
          />
        </Pressable>
        <Text style={styles.title}>My Addresses</Text>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: 40 }}
          size="large"
          color={PINK}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          {addresses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="location-outline"
                size={30}
                color={PINK}
              />
              <Text style={styles.emptyText}>
                Save your delivery addresses here to fill them in quickly at checkout.
              </Text>
            </View>
          ) : (
            addresses.map((address, index) => (
              <View
                key={address._id ?? index}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardLabel}>{address.label}</Text>
                  {address.isDefault ? (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardAddress}>{formatSavedAddress(address)}</Text>
                {address.landmark ? <Text style={styles.cardMeta}>Landmark: {address.landmark}</Text> : null}
                {address.recipientName ? (
                  <Text style={styles.cardMeta}>
                    {address.recipientName}
                    {address.recipientPhoneNumber ? ` · ${address.recipientPhoneNumber}` : ''}
                  </Text>
                ) : null}
                <View style={styles.actions}>
                  {!address.isDefault ? (
                    <Pressable
                      disabled={saving}
                      onPress={() => setDefault(index)}
                    >
                      <Text style={styles.action}>Set as default</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    disabled={saving}
                    onPress={() => openForm(index)}
                  >
                    <Text style={styles.action}>Edit</Text>
                  </Pressable>
                  <Pressable
                    disabled={saving}
                    onPress={() => handleDelete(index)}
                  >
                    <Text style={[styles.action, { color: '#C64262' }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {addresses.length < MAX_SAVED_ADDRESSES ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => openForm(null)}
              style={styles.addButton}
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.addText}>Add Address</Text>
            </Pressable>
          ) : (
            <Text style={styles.cardMeta}>You can save up to {MAX_SAVED_ADDRESSES} addresses.</Text>
          )}
        </ScrollView>
      )}

      <Modal
        visible={editingIndex !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingIndex(null)}
      >
        <KeyboardSafeView style={styles.backdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingIndex === -1 ? 'New Address' : 'Edit Address'}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => setEditingIndex(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={TEXT}
                />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 16 }}
            >
              {field('label', 'Label', 'Home, Office, Mom’s house')}
              <Pressable
                accessibilityRole="button"
                disabled={locating}
                onPress={() => void fillFromCurrentLocation()}
                style={[styles.locationButton, locating && { opacity: 0.6 }]}
              >
                {locating ? (
                  <ActivityIndicator
                    size="small"
                    color={PINK}
                  />
                ) : (
                  <Ionicons
                    name="locate-outline"
                    size={18}
                    color={PINK}
                  />
                )}
                <Text style={styles.locationButtonText}>
                  {locating ? 'Finding your address…' : 'Use my current location'}
                </Text>
              </Pressable>

              {addressField('street', 'Street / House No. *', 'Type a street or barangay (e.g. Tabuco)')}
              {addressField('barangay', 'Barangay *')}
              {field('city', 'City / Municipality *')}
              {field('province', 'Province *')}
              {field('postalCode', 'Postal Code')}
              {field('landmark', 'Landmark')}
              {field('recipientName', 'Default Recipient Name')}
              {field('recipientPhoneNumber', 'Default Recipient Phone', '09171234567')}

              <Pressable
                onPress={() => setForm(previous => ({ ...previous, isDefault: !previous.isDefault }))}
                style={styles.defaultRow}
              >
                <Ionicons
                  name={form.isDefault ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={PINK}
                />
                <Text style={styles.defaultRowText}>Use as default address</Text>
              </Pressable>

              <Pressable
                disabled={saving}
                onPress={() => void handleSave()}
                style={[styles.addButton, saving && { opacity: 0.6 }]}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.addText}>Save Address</Text>}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardSafeView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { marginLeft: 4, color: TEXT, fontSize: 19, fontWeight: '800' },
  content: { padding: 16 },
  empty: { alignItems: 'center', gap: 10, marginVertical: 30, paddingHorizontal: 30 },
  emptyText: { color: MUTED, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  card: { marginBottom: 10, padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardLabel: { color: TEXT, fontSize: 15, fontWeight: '800' },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#FCE8F0' },
  defaultText: { color: PINK, fontSize: 12, fontWeight: '800' },
  cardAddress: { marginTop: 6, color: TEXT, fontSize: 14, lineHeight: 20 },
  cardMeta: { marginTop: 4, color: MUTED, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  action: { color: PINK, fontSize: 14, fontWeight: '700' },
  addButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: PINK,
  },
  addText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#FFFFFF' },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDEF',
  },
  sheetTitle: { color: TEXT, fontSize: 18, fontWeight: '800' },
  field: { marginBottom: 10 },
  label: { marginBottom: 5, color: MUTED, fontSize: 13, fontWeight: '700' },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE7EB',
    color: TEXT,
    fontSize: 15,
    backgroundColor: '#FCFAFB',
  },
  inputError: { borderColor: '#C64262' },
  errorText: { marginTop: 4, color: '#C64262', fontSize: 12 },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3C7D8',
    backgroundColor: '#FDF1F6',
  },
  locationButtonText: { color: PINK, fontSize: 14, fontWeight: '800' },
  defaultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 10 },
  defaultRowText: { color: TEXT, fontSize: 14 },
});
