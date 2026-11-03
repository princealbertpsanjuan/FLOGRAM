import { useEffect, useState } from 'react';

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { getShopTaggedPosts, type ShopCommunityRating as Summary, type TaggedPost } from '../../services/bloomboard';
import { TaggedShopLine } from './shop-tag-picker';

/*
 * =========================================================
 * SHOP COMMUNITY RATING (from BloomBoard tags)
 * =========================================================
 *
 * Average stars from verified buyers who tagged the shop,
 * the 5→1 star distribution, AFINN sentiment of the
 * captions, and the latest tagged posts.
 * =========================================================
 */

const STAR = '#E0A100';

export default function ShopCommunityRating({
  floristId,
  compact = false,
}: {
  floristId?: string | null;
  compact?: boolean;
}) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [posts, setPosts] = useState<TaggedPost[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!floristId) return;

    let active = true;
    setLoading(true);

    getShopTaggedPosts(floristId, compact ? 2 : 5)
      .then(data => {
        if (!active) return;
        setSummary(data.summary);
        setPosts(data.posts || []);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [compact, floristId]);

  if (!floristId) return null;

  if (loading && !summary) {
    return <ActivityIndicator color="#7A1E48" style={{ marginVertical: 10 }} />;
  }

  if (!summary || summary.tagCount === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>BloomBoard community rating</Text>
        <Text style={styles.muted}>No customer has tagged this shop yet.</Text>
      </View>
    );
  }

  const total = summary.ratingCount || 1;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>BloomBoard community rating</Text>

      <View style={styles.headline}>
        <Text style={styles.average}>{summary.averageRating ?? '–'}</Text>
        <View>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={
                  summary.averageRating && star <= Math.round(summary.averageRating) ? 'star' : 'star-outline'
                }
                size={15}
                color={STAR}
              />
            ))}
          </View>
          <Text style={styles.muted}>
            {summary.ratingCount} verified rating{summary.ratingCount === 1 ? '' : 's'} · {summary.tagCount} tag
            {summary.tagCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {!compact && summary.ratingCount ? (
        <View style={{ gap: 3, marginTop: 8 }}>
          {(['5', '4', '3', '2', '1'] as const).map(star => (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}★</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(summary.distribution[star] / total) * 100}%` }]} />
              </View>
              <Text style={styles.barCount}>{summary.distribution[star]}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.sentiment}>
        <Pill color="#166534" background="#DCFCE7" label={`${summary.sentiment.positive} positive`} />
        <Pill color="#374151" background="#F3F4F6" label={`${summary.sentiment.neutral} neutral`} />
        <Pill color="#991B1B" background="#FEE2E2" label={`${summary.sentiment.negative} negative`} />
      </View>

      {posts.map(post => (
        <View key={post._id} style={styles.post}>
          <Text style={styles.author}>
            {post.author?.firstName || 'Customer'} {post.author?.lastName?.[0] ? `${post.author.lastName[0]}.` : ''}
          </Text>
          {post.caption ? (
            <Text style={styles.caption} numberOfLines={3}>
              {post.caption}
            </Text>
          ) : null}
          <TaggedShopLine post={post} />
        </View>
      ))}
    </View>
  );
}

function Pill({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#F0E4EA', backgroundColor: '#FFFFFF' },
  title: { color: '#3D2F36', fontSize: 14, fontWeight: '800' },
  muted: { marginTop: 2, color: '#7A6E74', fontSize: 12 },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  average: { color: '#3D2F36', fontSize: 30, fontWeight: '900' },
  stars: { flexDirection: 'row', gap: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { width: 24, color: '#7A6E74', fontSize: 11, fontWeight: '700' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F3EEF1', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: STAR },
  barCount: { width: 22, color: '#7A6E74', fontSize: 11, textAlign: 'right' },
  sentiment: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: '800' },
  post: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3EEF1' },
  author: { color: '#3D2F36', fontSize: 12.5, fontWeight: '800' },
  caption: { marginTop: 2, color: '#4B3F45', fontSize: 12.5, lineHeight: 18 },
});
