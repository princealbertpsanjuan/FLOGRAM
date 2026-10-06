import { useEffect, useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  ADD_ON_CATEGORY_ICONS,
  getShopAddOns,
  type AddOnSelection,
  type GiftAddOn,
} from '../../services/addons';

const PINK = '#DF628F';
const TEXT = '#3B3438';
const MUTED = '#7C7579';

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

/*
 * =========================================================
 * GIFT ADD-ON PICKER (product page)
 * =========================================================
 *
 * Lists the shop's available add-ons. Tap to add, use
 * − / + to change quantity. Renders nothing when the shop
 * has no add-ons.
 * =========================================================
 */
export default function AddOnPicker({
  floristId,
  value,
  onChange,
  onAddOnsLoaded,
  compact = false,
  disabled = false,
}: {
  floristId?: string | null;
  value: AddOnSelection[];
  onChange: (next: AddOnSelection[]) => void;
  onAddOnsLoaded?: (addOns: GiftAddOn[]) => void;
  /*
   * Checkout: smaller card inside the order summary.
   */
  compact?: boolean;
  disabled?: boolean;
}) {
  const [addOns, setAddOns] = useState<GiftAddOn[]>([]);

  useEffect(() => {
    if (!floristId) {
      return;
    }

    let active = true;

    getShopAddOns(floristId)
      .then(list => {
        if (active) {
          setAddOns(list);
          onAddOnsLoaded?.(list);
        }
      })
      .catch(() => {
        if (active) {
          setAddOns([]);
        }
      });

    return () => {
      active = false;
    };
  }, [floristId, onAddOnsLoaded]);

  if (addOns.length === 0) {
    return null;
  }

  const quantityOf = (id: string) => value.find(item => item.addOnId === id)?.quantity ?? 0;

  const setQuantity = (id: string, quantity: number) => {
    if (disabled) return;

    const rest = value.filter(item => item.addOnId !== id);
    onChange(quantity > 0 ? [...rest, { addOnId: id, quantity: Math.min(10, quantity) }] : rest);
  };

  return (
    <View style={[styles.card, compact && styles.compactCard, disabled && { opacity: 0.6 }]}>
      <Text style={[styles.title, compact && { fontSize: 14 }]}>Add a gift</Text>
      <Text style={styles.caption}>Optional extras from this shop, delivered with this bouquet.</Text>

      {addOns.map(addOn => {
        const quantity = quantityOf(addOn._id);
        const selected = quantity > 0;

        return (
          <View
            key={addOn._id}
            style={[styles.row, selected && styles.rowSelected]}
          >
            <View style={styles.icon}>
              <Ionicons
                name={(ADD_ON_CATEGORY_ICONS[addOn.category] || 'gift-outline') as keyof typeof Ionicons.glyphMap}
                size={18}
                color={PINK}
              />
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>{addOn.name}</Text>
              {addOn.description ? (
                <Text
                  style={styles.description}
                  numberOfLines={2}
                >
                  {addOn.description}
                </Text>
              ) : null}
              <Text style={styles.price}>{peso(addOn.price)}</Text>
            </View>

            {selected ? (
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel={`Remove one ${addOn.name}`}
                  hitSlop={6}
                  onPress={() => setQuantity(addOn._id, quantity - 1)}
                  style={styles.stepButton}
                >
                  <Ionicons
                    name="remove"
                    size={16}
                    color={PINK}
                  />
                </Pressable>
                <Text style={styles.quantity}>{quantity}</Text>
                <Pressable
                  accessibilityLabel={`Add one ${addOn.name}`}
                  hitSlop={6}
                  onPress={() => setQuantity(addOn._id, quantity + 1)}
                  style={styles.stepButton}
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color={PINK}
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => setQuantity(addOn._id, 1)}
                style={styles.addButton}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  compactCard: {
    marginHorizontal: 0,
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3E3EA',
    backgroundColor: '#FFFBFD',
  },
  title: { color: TEXT, fontSize: 16, fontWeight: '800' },
  caption: { marginTop: 3, marginBottom: 6, color: MUTED, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1E8EC',
  },
  rowSelected: { borderColor: PINK, backgroundColor: '#FFF7FA' },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8F0',
  },
  info: { flex: 1 },
  name: { color: TEXT, fontSize: 14, fontWeight: '700' },
  description: { marginTop: 2, color: MUTED, fontSize: 12 },
  price: { marginTop: 3, color: PINK, fontSize: 13, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PINK,
  },
  quantity: { minWidth: 16, color: TEXT, fontSize: 14, fontWeight: '800', textAlign: 'center' },
  addButton: {
    paddingHorizontal: 14,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PINK,
  },
  addText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
