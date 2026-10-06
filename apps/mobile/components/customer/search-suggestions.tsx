import { useEffect, useState } from 'react';

import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { getSearchSuggestions, type SearchSuggestions as Suggestions } from '../../services/analytics';
import { getFlowerImageUrl } from '../../services/flower';

/*
 * =========================================================
 * SEARCH SUGGESTIONS (Customer Dashboard + Discover)
 * =========================================================
 *
 * Shown while the search box is focused and empty:
 * - Popular searches (keywords from top bouquets)
 * - Popular bouquets (FP-Growth frequent items)
 * - Often bought together (FP-Growth association rules)
 * =========================================================
 */

const PINK = '#DF628F';
const TEXT = '#3B3438';
const MUTED = '#7C7579';

const peso = (value: number) => `₱${Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;

export default function SearchSuggestions({
  visible,
  onPickKeyword,
}: {
  visible: boolean;
  onPickKeyword: (keyword: string) => void;
}) {
  const [data, setData] = useState<Suggestions | null>(null);

  useEffect(() => {
    if (!visible || data) return;

    let active = true;
    getSearchSuggestions()
      .then(result => {
        if (active) setData(result);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [visible, data]);

  if (!visible || !data || (!data.popular.length && !data.keywords.length)) {
    return null;
  }

  const openFlower = (flowerId: string) =>
    router.push({ pathname: '/(customer)/customer-product-details', params: { flowerId } } as never);

  return (
    <View style={styles.panel}>
      {data.keywords.length ? (
        <>
          <Text style={styles.heading}>Popular searches</Text>
          <View style={styles.chips}>
            {data.keywords.map(keyword => (
              <Pressable key={keyword} onPress={() => onPickKeyword(keyword)} style={styles.chip}>
                <Ionicons name="trending-up" size={13} color={PINK} />
                <Text style={styles.chipText}>{keyword}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {data.popular.length ? (
        <>
          <Text style={styles.heading}>
            {data.basedOn === 'fp-growth' ? 'Customers frequently buy' : 'New bouquets'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {data.popular.map(flower => {
              const image = getFlowerImageUrl(flower.image);

              return (
                <Pressable key={flower._id} onPress={() => openFlower(flower._id)} style={styles.card}>
                  {image ? (
                    <Image source={{ uri: image }} style={styles.image} />
                  ) : (
                    <View style={[styles.image, styles.imageEmpty]}>
                      <Ionicons name="flower-outline" size={20} color={PINK} />
                    </View>
                  )}
                  <Text style={styles.name} numberOfLines={1}>{flower.name}</Text>
                  <Text style={styles.price}>{peso(flower.price)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {data.boughtTogether.length ? (
        <>
          <Text style={styles.heading}>Often bought together</Text>
          {data.boughtTogether.map((bundle, index) => (
            <Pressable
              key={index}
              onPress={() => {
                const first = bundle.items.find(item => item.type === 'bouquet' && item.id);
                if (first?.id) openFlower(first.id);
              }}
              style={styles.bundle}
            >
              <Ionicons name="gift-outline" size={16} color={PINK} />
              <Text style={styles.bundleText} numberOfLines={2}>
                {bundle.items.map(item => item.name).join(' + ')}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3E3EA',
    backgroundColor: '#FFFFFF',
  },
  heading: { marginTop: 4, marginBottom: 8, color: TEXT, fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#FCE8F0',
  },
  chipText: { color: PINK, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  row: { gap: 10, paddingBottom: 8 },
  card: { width: 104 },
  image: { width: 104, height: 104, borderRadius: 12, backgroundColor: '#F6EEF2' },
  imageEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { marginTop: 5, color: TEXT, fontSize: 12, fontWeight: '700' },
  price: { color: PINK, fontSize: 12, fontWeight: '800' },
  bundle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F6EEF2',
  },
  bundleText: { flex: 1, color: MUTED, fontSize: 13 },
});
