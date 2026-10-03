import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  ADD_ON_CATEGORY_ICONS,
  ADD_ON_CATEGORY_LABELS,
  createAddOn,
  deleteAddOn,
  getMyAddOns,
  updateAddOn,
  type AddOnCategory,
  type GiftAddOn,
} from '../../services/addons';

/*
 * =========================================================
 * SELLER GIFT ADD-ONS
 * =========================================================
 *
 * Sellers manage the extras customers can attach to a
 * bouquet: chocolates, teddy bears, balloons, cards.
 * =========================================================
 */

const GREEN = '#5E9874';
const TEXT = '#2F3A33';
const MUTED = '#6F7A73';
const BORDER = '#E3EAE5';

const CATEGORIES = Object.keys(ADD_ON_CATEGORY_LABELS) as AddOnCategory[];

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

type FormState = {
  id: string | null;
  name: string;
  description: string;
  category: AddOnCategory;
  price: string;
};

const EMPTY_FORM: FormState = {
  id: null,
  name: '',
  description: '',
  category: 'chocolate',
  price: '',
};

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.';

export default function SellerAddOnsScreen() {
  const insets = useSafeAreaInsets();

  const [addOns, setAddOns] = useState<GiftAddOn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setAddOns(await getMyAddOns());
    } catch (loadError) {
      setError(errorText(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form) return;

    const price = Number(form.price);

    if (!form.name.trim()) {
      Alert.alert('Missing name', 'Enter the add-on name.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Invalid price', 'Enter a valid price.');
      return;
    }

    const input = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price,
    };

    try {
      setSaving(true);

      if (form.id) {
        await updateAddOn(form.id, input);
      } else {
        await createAddOn({ ...input, isAvailable: true });
      }

      setForm(null);
      await load();
    } catch (saveError) {
      Alert.alert('Could not save', errorText(saveError));
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailable = async (addOn: GiftAddOn) => {
    setAddOns(current =>
      current.map(item => (item._id === addOn._id ? { ...item, isAvailable: !addOn.isAvailable } : item))
    );

    try {
      await updateAddOn(addOn._id, { isAvailable: !addOn.isAvailable });
    } catch (toggleError) {
      Alert.alert('Could not update', errorText(toggleError));
      await load();
    }
  };

  const remove = (addOn: GiftAddOn) => {
    Alert.alert('Remove add-on', `Remove "${addOn.name}" from your shop?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddOn(addOn._id);
            await load();
          } catch (deleteError) {
            Alert.alert('Could not remove', errorText(deleteError));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ScreenLoader role="seller" message="Loading gift add-ons..." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="seller"
        title="Gift Add-ons"
        subtitle="Extras customers can add to a bouquet"
        right={
          form ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add a gift add-on"
              onPress={() => setForm(EMPTY_FORM)}
              style={styles.headerButton}
            >
              <Ionicons
                name="add"
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
          )
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={GREEN}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {form ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{form.id ? 'Edit add-on' : 'New add-on'}</Text>

            <Text style={styles.label}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(category => {
                const active = form.category === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setForm({ ...form, category })}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={ADD_ON_CATEGORY_ICONS[category] as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color={active ? '#FFFFFF' : GREEN}
                    />
                    <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>
                      {ADD_ON_CATEGORY_LABELS[category]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              value={form.name}
              onChangeText={name => setForm({ ...form, name })}
              placeholder="e.g. Ferrero Rocher (3 pcs)"
              placeholderTextColor="#A2ABA5"
              maxLength={80}
              style={styles.input}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              value={form.description}
              onChangeText={description => setForm({ ...form, description })}
              placeholder="Short description"
              placeholderTextColor="#A2ABA5"
              maxLength={200}
              multiline
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top' }]}
            />

            <Text style={styles.label}>Price (₱)</Text>
            <TextInput
              value={form.price}
              onChangeText={price => setForm({ ...form, price: price.replace(/[^0-9.]/g, '') })}
              placeholder="0.00"
              placeholderTextColor="#A2ABA5"
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <View style={styles.formActions}>
              <Pressable
                disabled={saving}
                onPress={() => setForm(null)}
                style={[styles.button, styles.buttonGhost]}
              >
                <Text style={[styles.buttonText, { color: GREEN }]}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={saving}
                onPress={save}
                style={[styles.button, saving && { opacity: 0.6 }]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {error ? (
          <ErrorState
            role="seller"
            message={error}
            onRetry={() => void load()}
          />
        ) : addOns.length === 0 && !form ? (
          <EmptyState
            role="seller"
            icon="gift-outline"
            title="No gift add-ons yet"
            message="Add chocolates, teddy bears, balloons or greeting cards that customers can include with a bouquet."
            action={{ label: 'Add an add-on', onPress: () => setForm(EMPTY_FORM) }}
          />
        ) : (
          addOns.map(addOn => (
            <View
              key={addOn._id}
              style={[styles.card, styles.row, !addOn.isAvailable && { opacity: 0.6 }]}
            >
              <View style={styles.iconCircle}>
                <Ionicons
                  name={(ADD_ON_CATEGORY_ICONS[addOn.category] || 'gift-outline') as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={GREEN}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{addOn.name}</Text>
                <Text style={styles.meta}>
                  {ADD_ON_CATEGORY_LABELS[addOn.category] || 'Gift'} · {peso(addOn.price)}
                </Text>
                {addOn.description ? <Text style={styles.description}>{addOn.description}</Text> : null}

                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() =>
                      setForm({
                        id: addOn._id,
                        name: addOn.name,
                        description: addOn.description || '',
                        category: addOn.category,
                        price: String(addOn.price),
                      })
                    }
                  >
                    <Text style={styles.link}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => remove(addOn)}>
                    <Text style={[styles.link, { color: '#C2413B' }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ alignItems: 'center' }}>
                <Switch
                  value={addOn.isAvailable}
                  onValueChange={() => void toggleAvailable(addOn)}
                  trackColor={{ true: '#A9CDB6', false: '#D7DCD9' }}
                  thumbColor={addOn.isAvailable ? GREEN : '#F4F4F4'}
                />
                <Text style={styles.switchLabel}>{addOn.isAvailable ? 'Available' : 'Hidden'}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  content: { padding: 16 },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
  label: { marginTop: 14, marginBottom: 6, color: MUTED, fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GREEN,
  },
  chipActive: { backgroundColor: GREEN },
  chipText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 15,
    backgroundColor: '#FAFCFB',
  },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GREEN,
  },
  buttonGhost: { borderWidth: 1, borderColor: GREEN, backgroundColor: '#FFFFFF' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F2EC',
  },
  name: { color: TEXT, fontSize: 15, fontWeight: '800' },
  meta: { marginTop: 2, color: MUTED, fontSize: 13 },
  description: { marginTop: 4, color: MUTED, fontSize: 13, lineHeight: 18 },
  rowActions: { flexDirection: 'row', gap: 18, marginTop: 8 },
  link: { color: GREEN, fontSize: 13, fontWeight: '800' },
  switchLabel: { marginTop: 2, color: MUTED, fontSize: 11 },
});
