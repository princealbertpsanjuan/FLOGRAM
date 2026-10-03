import { useCallback, useEffect, useState } from 'react';

import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getBuyingPatternReport,
  getSentimentReport,
  type AnalyticsScope,
  type BuyingPatternReport,
  type PatternItem,
  type SentimentReport,
} from '../../services/analytics';

import {
  EmptyState,
  ErrorState,
  InlineLoader,
  ROLE_ACCENT,
} from '../ui/state-views';

/*
 * =========================================================
 * CUSTOMER INSIGHTS (Admin: all shops, Seller: own shop)
 * =========================================================
 *
 * Tab 1  Review Sentiment  – AFINN-165 lexicon scoring
 * Tab 2  Buying Patterns   – FP-Growth association rules
 * =========================================================
 */

const TEXT = '#3B3940';
const MUTED = '#77737B';
const GREEN = '#3E9B62';
const GRAY = '#B9B4BA';
const RED = '#D04A5F';

type Tab = 'sentiment' | 'patterns';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message ? error.message : 'Unable to load insights.';

const itemLabel = (items: PatternItem[]) => items.map(item => item.name).join(' + ');

export default function InsightsView({ scope }: { scope: AnalyticsScope }) {
  const insets = useSafeAreaInsets();
  const role = scope === 'admin' ? 'admin' : 'seller';
  const accent = ROLE_ACCENT[role];

  const [tab, setTab] = useState<Tab>('sentiment');
  const [sentiment, setSentiment] = useState<SentimentReport | null>(null);
  const [patterns, setPatterns] = useState<BuyingPatternReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [sentimentData, patternData] = await Promise.all([
        getSentimentReport(scope),
        getBuyingPatternReport(scope),
      ]);
      setSentiment(sentimentData);
      setPatterns(patternData);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={accent}
          colors={[accent]}
        />
      }
    >
      <View style={styles.tabs}>
        {(
          [
            ['sentiment', 'Review Sentiment'],
            ['patterns', 'Buying Patterns'],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === key && { color: accent, fontWeight: '800' }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <InlineLoader role={role} />
      ) : error ? (
        <ErrorState
          role={role}
          message={error}
          onRetry={() => void load()}
        />
      ) : tab === 'sentiment' && sentiment ? (
        <SentimentSection
          report={sentiment}
          role={role}
          showShops={scope === 'admin'}
        />
      ) : patterns ? (
        <PatternSection
          report={patterns}
          role={role}
        />
      ) : null}
    </ScrollView>
  );
}

function SentimentSection({
  report,
  role,
  showShops,
}: {
  report: SentimentReport;
  role: 'admin' | 'seller';
  showShops: boolean;
}) {
  if (report.analyzedReviews === 0) {
    return (
      <EmptyState
        role={role}
        icon="chatbubbles-outline"
        title="No written reviews yet"
        message="Sentiment appears once customers leave comments with their ratings."
      />
    );
  }

  const total = report.analyzedReviews;
  const segments = [
    { key: 'positive', label: 'Positive', value: report.counts.positive, color: GREEN },
    { key: 'neutral', label: 'Neutral', value: report.counts.neutral, color: GRAY },
    { key: 'negative', label: 'Negative', value: report.counts.negative, color: RED },
  ];

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {report.positiveShare}% of reviews are positive
        </Text>
        <Text style={styles.caption}>
          {total} written review{total === 1 ? '' : 's'} scored with the AFINN-165 lexicon ·
          average score {report.averageScore > 0 ? '+' : ''}
          {report.averageScore}
        </Text>

        <View style={styles.stackBar}>
          {segments
            .filter(segment => segment.value > 0)
            .map(segment => (
              <View
                key={segment.key}
                style={{ flex: segment.value, backgroundColor: segment.color }}
              />
            ))}
        </View>

        <View style={styles.legend}>
          {segments.map(segment => (
            <View
              key={segment.key}
              style={styles.legendItem}
            >
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <Text style={styles.legendText}>
                {segment.label} {segment.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <WordCard
        title="Most common praise"
        words={report.topPositiveWords}
        color={GREEN}
      />
      <WordCard
        title="Most common complaints"
        words={report.topNegativeWords}
        color={RED}
      />

      {showShops && report.byShop.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shops by sentiment</Text>
          <Text style={styles.caption}>Lowest average score first</Text>
          {report.byShop.map(shop => (
            <View
              key={shop.shopName}
              style={styles.row}
            >
              <Text
                style={styles.rowTitle}
                numberOfLines={1}
              >
                {shop.shopName || 'Unknown shop'}
              </Text>
              <Text style={styles.rowMeta}>
                {shop.positive}+ / {shop.negative}− · avg {shop.averageScore}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent negative reviews</Text>
        {report.recentNegative.length === 0 ? (
          <Text style={styles.caption}>None. Keep it up.</Text>
        ) : (
          report.recentNegative.map(review => (
            <View
              key={review.id}
              style={styles.review}
            >
              <Text style={styles.reviewText}>“{review.comment}”</Text>
              <Text style={styles.rowMeta}>
                {review.shopName ? `${review.shopName} · ` : ''}score {review.sentiment.score} ·{' '}
                {review.rating}★
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function WordCard({
  title,
  words,
  color,
}: {
  title: string;
  words: { word: string; count: number }[];
  color: string;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {words.length === 0 ? (
        <Text style={styles.caption}>No words found yet.</Text>
      ) : (
        <View style={styles.chips}>
          {words.map(entry => (
            <View
              key={entry.word}
              style={[styles.chip, { borderColor: color }]}
            >
              <Text style={[styles.chipText, { color }]}>
                {entry.word} · {entry.count}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PatternSection({
  report,
  role,
}: {
  report: BuyingPatternReport;
  role: 'admin' | 'seller';
}) {
  if (report.transactionCount === 0) {
    return (
      <EmptyState
        role={role}
        icon="git-network-outline"
        title="No completed orders yet"
        message="Buying patterns appear after customers complete orders."
      />
    );
  }

  const maxCount = Math.max(1, ...report.topItems.map(item => item.count));

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {report.rules.length
            ? `${report.rules.length} buying pattern${report.rules.length === 1 ? '' : 's'} found`
            : 'No repeated combinations yet'}
        </Text>
        <Text style={styles.caption}>
          FP-Growth over {report.transactionCount} completed checkout
          {report.transactionCount === 1 ? '' : 's'} ({report.multiItemTransactions} with 2+ items) ·
          minimum support {report.minSupportCount} checkouts · minimum confidence{' '}
          {Math.round(report.minConfidence * 100)}%
        </Text>
      </View>

      {report.rules.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frequently bought together</Text>
          {report.rules.map((rule, index) => (
            <View
              key={`${itemLabel(rule.antecedent)}-${itemLabel(rule.consequent)}-${index}`}
              style={styles.review}
            >
              <Text style={styles.rowTitle}>
                {itemLabel(rule.antecedent)} → {itemLabel(rule.consequent)}
              </Text>
              <Text style={styles.rowMeta}>
                {Math.round(rule.confidence * 100)}% of buyers also bought it · lift{' '}
                {rule.lift} · {rule.count} checkouts
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Most purchased items</Text>
        {report.topItems.map(entry => (
          <View
            key={entry.item.key}
            style={styles.barRow}
          >
            <Text
              style={styles.barLabel}
              numberOfLines={1}
            >
              {entry.item.name}
            </Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(entry.count / maxCount) * 100}%`,
                    backgroundColor: ROLE_ACCENT[role],
                  },
                ]}
              />
            </View>
            <Text style={styles.barValue}>{entry.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#E9E9F0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  card: { marginBottom: 12, padding: 16, borderRadius: 20, backgroundColor: '#FFFFFF' },
  cardTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  caption: { marginTop: 4, color: MUTED, fontSize: 13, lineHeight: 18 },
  stackBar: {
    flexDirection: 'row',
    height: 14,
    marginTop: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: '#F1F1F4',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: TEXT, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F8',
  },
  rowTitle: { flexShrink: 1, color: TEXT, fontSize: 14, fontWeight: '700' },
  rowMeta: { marginTop: 3, color: MUTED, fontSize: 12 },
  review: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F4F4F8' },
  reviewText: { color: TEXT, fontSize: 14, lineHeight: 20 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  barLabel: { width: 110, color: TEXT, fontSize: 13, fontWeight: '600' },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: '#F1F1F4', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barValue: { width: 28, color: MUTED, fontSize: 12, textAlign: 'right' },
});
