import { useEffect, useMemo, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getTaggableShops, type TaggableShop } from '../../services/bloomboard';

/*
 * =========================================================
 * TAG + RATE A SHOP (BloomBoard post composer)
 * =========================================================
 *
 * The customer may tag the florist shop that made the
 * bouquet. Stars are enabled only for shops the customer
 * received an order from ("Verified buyer"); the server
 * checks this again.
 * =========================================================
 */

export type ShopTag = { floristId: string; shopName: string; rating: number | null } | null;

const PRIMARY = '#7A1E48';
const STAR = '#E0A100';

export default function ShopTagPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ShopTag;
  onChange: (value: ShopTag) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [shops, setShops] = useState<TaggableShop[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open || shops || loading) return;

    setLoading(true);
    getTaggableShops()
      .then(setShops)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load shops.'))
      .finally(() => setLoading(false));
  }, [loading, open, shops]);

  const selected = useMemo(
    () => (value && shops ? shops.find(shop => shop._id === value.floristId) || null : null),
    [shops, value]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (shops || []).filter(shop => !term || shop.shopName.toLowerCase().includes(term)).slice(0, 8);
  }, [query, shops]);

  if (value) {
    const canRate = selected ? selected.canRate : false;

    return (
      <View style={styles.box}>
        <View style={styles.rowBetween}>
          <View style={styles.tagChip}>
            <Ionicons name="pricetag" size={14} color={PRIMARY} />
            <Text style={styles.tagText}>@{value.shopName}</Text>
          </View>
          <Pressable accessibilityLabel="Remove tag" disabled={disabled} onPress={() => onChange(null)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color="#9A8F95" />
          </Pressable>
        </View>

        {canRate ? (
          <>
            <Text style={styles.label}>Rate this shop (optional)</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable
                  key={star}
                  accessibilityRole="button"
                  accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                  disabled={disabled}
                  onPress={() => onChange({ ...value, rating: value.rating === star ? null : star })}
                  hitSlop={4}
                >
                  <Ionicons name={value.rating && star <= value.rating ? 'star' : 'star-outline'} size={28} color={STAR} />
                </Pressable>
              ))}
              {value.rating ? <Text style={styles.ratingText}>{value.rating}/5</Text> : null}
            </View>
            <View style={styles.verified}>
              <Ionicons name="shield-checkmark" size={13} color="#166534" />
              <Text style={styles.verifiedText}>Verified buyer — you received an order from this shop</Text>
            </View>
          </>
        ) : (
          <Text style={styles.hint}>
            {selected?.alreadyRated
              ? 'You already rated this shop. Your post will tag it without a new rating.'
              : 'Ratings unlock after you receive an order from this shop. You can still tag it.'}
          </Text>
        )}
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable disabled={disabled} onPress={() => setOpen(true)} style={styles.openButton}>
        <Ionicons name="pricetag-outline" size={17} color={PRIMARY} />
        <Text style={styles.openText}>Tag a flower shop</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      <View style={styles.rowBetween}>
        <Text style={styles.label}>Which shop made this bouquet?</Text>
        <Pressable onPress={() => setOpen(false)} hitSlop={8}>
          <Ionicons name="close" size={20} color="#9A8F95" />
        </Pressable>
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search shop name"
        placeholderTextColor="#A59CA1"
        style={styles.search}
      />

      {loading ? (
        <ActivityIndicator color={PRIMARY} style={{ marginVertical: 10 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : filtered.length === 0 ? (
        <Text style={styles.hint}>No matching shops.</Text>
      ) : (
        filtered.map(shop => (
          <Pressable
            key={shop._id}
            onPress={() => {
              onChange({ floristId: shop._id, shopName: shop.shopName, rating: null });
              setOpen(false);
              setQuery('');
            }}
            style={styles.shopRow}
          >
            <Ionicons name="storefront-outline" size={17} color={PRIMARY} />
            <Text style={styles.shopName}>{shop.shopName}</Text>
            {shop.verifiedBuyer ? (
              <View style={styles.buyerPill}>
                <Text style={styles.buyerText}>{shop.alreadyRated ? 'Rated' : 'Can rate'}</Text>
              </View>
            ) : null}
          </Pressable>
        ))
      )}
    </View>
  );
}

/*
 * Tag + stars shown on a post card.
 */
export function TaggedShopLine({
  post,
}: {
  post: {
    taggedFlorist?: { shopName?: string } | null;
    shopRating?: number | null;
    verifiedOrder?: string | null;
  };
}) {
  if (!post.taggedFlorist?.shopName) return null;

  return (
    <View style={styles.line}>
      <View style={styles.tagChip}>
        <Ionicons name="pricetag" size={12} color={PRIMARY} />
        <Text style={styles.tagTextSmall}>@{post.taggedFlorist.shopName}</Text>
      </View>
      {post.shopRating ? (
        <View style={styles.inlineStars}>
          {[1, 2, 3, 4, 5].map(star => (
            <Ionicons key={star} name={star <= (post.shopRating || 0) ? 'star' : 'star-outline'} size={13} color={STAR} />
          ))}
        </View>
      ) : null}
      {post.verifiedOrder ? (
        <View style={styles.verifiedSmall}>
          <Ionicons name="shield-checkmark" size={11} color="#166534" />
          <Text style={styles.verifiedSmallText}>Verified buyer</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#EFD9E3', backgroundColor: '#FFF8FB', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EFD9E3',
    backgroundColor: '#FFF8FB',
  },
  openText: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
  label: { color: '#3D2F36', fontSize: 13, fontWeight: '800' },
  hint: { color: '#7A6E74', fontSize: 12, lineHeight: 17 },
  error: { color: '#B91C1C', fontSize: 12 },
  search: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFD9E3',
    backgroundColor: '#FFFFFF',
    color: '#3D2F36',
    fontSize: 14,
  },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  shopName: { flex: 1, color: '#3D2F36', fontSize: 14, fontWeight: '700' },
  buyerPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#DCFCE7' },
  buyerText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F8E7EF',
  },
  tagText: { color: PRIMARY, fontSize: 14, fontWeight: '800' },
  tagTextSmall: { color: PRIMARY, fontSize: 12, fontWeight: '800' },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { marginLeft: 6, color: '#3D2F36', fontSize: 14, fontWeight: '800' },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { color: '#166534', fontSize: 11.5, fontWeight: '700' },
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  inlineStars: { flexDirection: 'row', gap: 1 },
  verifiedSmall: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  verifiedSmallText: { color: '#166534', fontSize: 11, fontWeight: '700' },
});
