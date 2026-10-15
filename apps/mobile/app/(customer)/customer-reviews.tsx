import { useCallback, useState } from 'react';

import { Image, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { SeeAllButton, useSeeAll } from '../../components/ui/see-all';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import type { CustomerOrder } from '../../services/orders';
import { getReviewOverview, reviewOrderIdOf, type Review, type ReviewOrder } from '../../services/review';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * CUSTOMER – MY REVIEWS
 * =========================================================
 *
 * Me → Reviews
 *
 * To Review: completed orders without a review yet
 *            (same rule as the backend's canReview).
 * Reviewed:  reviews already written (GET /reviews/mine).
 *
 * tab=to-review | reviewed
 * =========================================================
 */

type Tab = 'to-review' | 'reviewed';

const PINK = '#DF628F';
const TEXT = '#2D2A2E';
const MUTED = '#77717A';
const BORDER = '#F0EAED';
const STAR = '#F2B33D';

const isTab = (value: unknown): value is Tab => value === 'to-review' || value === 'reviewed';

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

const shopNameOf = (florist: unknown) =>
  typeof florist === 'object' && florist && 'shopName' in florist
    ? String((florist as { shopName?: string }).shopName || '')
    : '';

/*
 * Product photo: custom bouquet reference image, else the
 * flower listing's first photo.
 */
const orderImageOf = (order?: CustomerOrder | ReviewOrder | null) => {
  if (!order) {
    return null;
  }

  const flower = order.flower;
  const flowerImage = typeof flower === 'object' && flower ? flower.images?.[0] : null;

  return getUploadUrl(order.inspirationImage || flowerImage || null);
};

const openReview = (orderId: string) =>
  router.push({
    pathname: '/(customer)/customer-review',
    params: { orderId },
  } as never);

export default function CustomerReviewsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();

  const [tab, setTab] = useState<Tab>(isTab(params.tab) ? params.tab : 'to-review');
  const [toReview, setToReview] = useState<CustomerOrder[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ordersById, setOrdersById] = useState<Record<string, CustomerOrder>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const overview = await getReviewOverview();
      setToReview(overview.toReview);
      setReviews(overview.reviews);
      setOrdersById(overview.ordersById);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when coming back from writing a review.
  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const toReviewSeeAll = useSeeAll(toReview, { resetKey: tab });
  const reviewedSeeAll = useSeeAll(reviews, { resetKey: tab });

  if (loading) {
    return <ScreenLoader role="customer" message="Loading your reviews..." />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <ScreenHeader
        role="customer"
        title="My Reviews"
        subtitle={toReview.length > 0 ? `${toReview.length} order${toReview.length === 1 ? '' : 's'} to review` : 'All caught up'}
      />

      <View style={styles.tabs}>
        {(
          [
            ['to-review', 'To Review', toReview.length],
            ['reviewed', 'Reviewed', reviews.length],
          ] as const
        ).map(([key, label, count]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {label} ({count})
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={PINK}
            colors={[PINK]}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {error ? (
          <ErrorState role="customer" message={error} onRetry={() => void load()} />
        ) : tab === 'to-review' ? (
          toReview.length === 0 ? (
            <EmptyState
              role="customer"
              icon="checkmark-done-outline"
              title="All caught up"
              message="Completed orders you haven't reviewed yet will appear here."
              action={{ label: 'View orders', onPress: () => router.push('/(customer)/customer-orders' as never) }}
            />
          ) : (
            <>
              {toReviewSeeAll.visible.map(order => {
                const image = orderImageOf(order);
                const shop = shopNameOf(order.florist);

                return (
                  <View key={order._id} style={styles.card}>
                    <View style={styles.row}>
                      <Thumb uri={image} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title} numberOfLines={2}>
                          {order.productName || 'Bouquet order'}
                        </Text>
                        {shop ? <Text style={styles.meta}>{shop}</Text> : null}
                        <Text style={styles.meta}>
                          Completed {formatDate(order.completedAt || order.deliveredAt || order.createdAt)}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => openReview(order._id)}
                      style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
                    >
                      <Ionicons name="star-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.buttonText}>Write review</Text>
                    </Pressable>
                  </View>
                );
              })}
              <SeeAllButton state={toReviewSeeAll} role="customer" />
            </>
          )
        ) : reviews.length === 0 ? (
          <EmptyState
            role="customer"
            icon="star-outline"
            title="No reviews yet"
            message="Reviews you write for completed orders will appear here."
          />
        ) : (
          <>
            {reviewedSeeAll.visible.map(review => {
              const orderId = reviewOrderIdOf(review);
              const order = review.order && typeof review.order === 'object' ? review.order : null;
              const image = orderImageOf(ordersById[orderId] || order);
              const shop = shopNameOf(review.florist);
              const rating = Math.round(Number(review.overallRating) || 0);

              return (
                <Pressable
                  key={review.id}
                  onPress={() => (orderId ? openReview(orderId) : undefined)}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.row}>
                    <Thumb uri={image} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title} numberOfLines={2}>
                        {order?.productName || ordersById[orderId]?.productName || 'Bouquet order'}
                      </Text>
                      {shop ? <Text style={styles.meta}>{shop}</Text> : null}
                      <View style={styles.stars}>
                        {[1, 2, 3, 4, 5].map(value => (
                          <Ionicons
                            key={value}
                            name={value <= rating ? 'star' : 'star-outline'}
                            size={15}
                            color={STAR}
                          />
                        ))}
                        <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
                      </View>
                    </View>
                  </View>

                  {review.comment ? (
                    <View style={styles.comment}>
                      <Text style={styles.commentText}>“{review.comment}”</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
            <SeeAllButton state={reviewedSeeAll} role="customer" />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Thumb({ uri }: { uri: string | null }) {
  return uri ? (
    <Image source={{ uri }} style={styles.thumb} />
  ) : (
    <View style={[styles.thumb, styles.thumbPlaceholder]}>
      <Ionicons name="flower-outline" size={22} color={PINK} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAF8F9' },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDEF',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: PINK },
  tabText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: PINK, fontWeight: '800' },
  content: { padding: 16, gap: 12 },
  card: { padding: 14, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#F3EEF1' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCE8F0' },
  title: { color: TEXT, fontSize: 15, fontWeight: '800' },
  meta: { marginTop: 3, color: MUTED, fontSize: 12 },
  stars: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  date: { marginLeft: 8, color: MUTED, fontSize: 12 },
  comment: { marginTop: 10, padding: 10, borderRadius: 12, backgroundColor: '#FFF6F9' },
  commentText: { color: TEXT, fontSize: 13, lineHeight: 19, fontStyle: 'italic' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: PINK,
  },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
