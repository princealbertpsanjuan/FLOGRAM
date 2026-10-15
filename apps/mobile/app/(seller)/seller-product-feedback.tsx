import { useCallback, useEffect, useState } from 'react';

import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ListingComments from '../../components/customer/listing-comments';
import KeyboardSafeView from '../../components/ui/keyboard-safe-view';
import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState } from '../../components/ui/state-views';
import { getFlowerImageUrl, getSellerFlowers, type FlowerListing } from '../../services/flower';
import type { ListingFeedback } from '../../services/listing-comments';

/*
 * =========================================================
 * SELLER — REVIEWS & COMMENTS FOR ONE PRODUCT
 * =========================================================
 *
 * Opened from a product card (Products tab) or from a
 * "New comment on your listing" notification.
 *
 * Shows the bouquet, its average rating, every review and
 * comment, and a reply box for the shop.
 *
 * Params: flowerId (required), name (optional, shown while
 * the listing loads).
 * =========================================================
 */

const TEXT = '#2F3A33';
const MUTED = '#6F7A73';
const BORDER = '#E3EAE5';

const firstParam = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value) || '';

export default function SellerProductFeedbackScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ flowerId?: string | string[]; name?: string | string[] }>();

  const flowerId = firstParam(params.flowerId);
  const nameParam = firstParam(params.name);

  const [flower, setFlower] = useState<FlowerListing | null>(null);
  const [summary, setSummary] = useState<ListingFeedback | null>(null);

  useEffect(() => {
    if (!flowerId) return;

    let active = true;

    // Header details only; the feedback below loads on its own.
    void getSellerFlowers()
      .then(flowers => {
        if (active) setFlower(flowers.find(item => item._id === flowerId) || null);
      })
      .catch(() => {
        // Fall back to the name passed in the params.
      });

    return () => {
      active = false;
    };
  }, [flowerId]);

  const handleLoaded = useCallback((data: ListingFeedback) => setSummary(data), []);

  const name = flower?.name || nameParam || 'Bouquet listing';
  const imageUrl = flower?.images?.[0] ? getFlowerImageUrl(flower.images[0]) : null;

  return (
    <View style={styles.screen}>
      <ScreenHeader role="seller" title="Reviews & Comments" subtitle={name} />

      {!flowerId ? (
        <View style={styles.content}>
          <EmptyState
            role="seller"
            icon="chatbubbles-outline"
            title="Listing not found"
            message="Open Reviews & Comments from one of your products."
          />
        </View>
      ) : (
        <KeyboardSafeView>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.productCard}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]}>
                  <Text style={{ fontSize: 26 }}>🌸</Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {name}
                </Text>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#E0A31A" />
                  <Text style={styles.ratingText}>
                    {summary?.averageRating ? summary.averageRating.toFixed(1) : 'No rating yet'}
                  </Text>
                </View>

                <Text style={styles.meta}>
                  {summary
                    ? `${summary.reviewCount} review${summary.reviewCount === 1 ? '' : 's'} · ${
                        summary.comments.length
                      } comment${summary.comments.length === 1 ? '' : 's'}`
                    : 'Loading…'}
                </Text>
              </View>
            </View>

            <ListingComments flowerId={flowerId} role="seller" onLoaded={handleLoaded} style={styles.feed} />
          </ScrollView>
        </KeyboardSafeView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  image: { width: 72, height: 72, borderRadius: 14, backgroundColor: '#E8F2EC' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  name: { color: TEXT, fontSize: 16, fontWeight: '800' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { color: TEXT, fontSize: 14, fontWeight: '800' },
  meta: { marginTop: 3, color: MUTED, fontSize: 12 },
  feed: { marginHorizontal: 0, borderWidth: 1, borderColor: BORDER },
});
