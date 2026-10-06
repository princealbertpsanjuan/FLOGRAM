import { useEffect, useState } from 'react';

import { StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ADD_ON_CATEGORY_LABELS, getShopAddOns, type GiftAddOn } from '../../services/addons';

/*
 * Product page: tells the customer this shop offers gift
 * add-ons, which they choose at checkout.
 */
export default function GiftHint({ floristId }: { floristId?: string | null }) {
  const [addOns, setAddOns] = useState<GiftAddOn[]>([]);

  useEffect(() => {
    if (!floristId) return;

    let active = true;
    getShopAddOns(floristId)
      .then(list => {
        if (active) setAddOns(list);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [floristId]);

  if (!addOns.length) return null;

  const kinds = [...new Set(addOns.map(addOn => ADD_ON_CATEGORY_LABELS[addOn.category] || 'Gifts'))].slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="gift-outline" size={20} color="#DF628F" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Make it extra special</Text>
        <Text style={styles.text}>
          This shop offers {kinds.join(', ').toLowerCase()}. Add them to this bouquet at checkout.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F7D6E3',
    backgroundColor: '#FFF7FA',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCE8F0',
  },
  title: { color: '#3B3438', fontSize: 14, fontWeight: '800' },
  text: { marginTop: 2, color: '#7C7579', fontSize: 12, lineHeight: 17 },
});
