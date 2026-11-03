import { useEffect, useState } from 'react';

import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { STATUS_TONES } from '../../constants/status-colors';
import { getFlowerPriceHistory, type FlowerPriceHistory } from '../../services/pricing';
import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * PRICE HISTORY (bouquet listing)
 * =========================================================
 *
 * - Current / lowest / highest price and number of changes
 * - A small step chart of the price over time
 * - Timeline: increases in red ▲, decreases in green ▼,
 *   +50% jumps marked "Large increase"
 * - Seller/Admin only: orders and revenue at each price
 *   (from the price each customer actually paid)
 * =========================================================
 */

const peso = (value?: number | null) =>
  value === null || value === undefined
    ? '–'
    : `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function PriceHistoryView({
  flowerId,
  role,
  showSales = false,
}: {
  flowerId?: string | null;
  role: Role;
  showSales?: boolean;
}) {
  const [data, setData] = useState<FlowerPriceHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accent = ROLE_ACCENT[role];

  useEffect(() => {
    if (!flowerId) return;

    let active = true;
    setLoading(true);
    setError(null);

    getFlowerPriceHistory(flowerId, showSales)
      .then(result => active && setData(result))
      .catch(err => active && setError(err instanceof Error ? err.message : 'Could not load price history.'))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [flowerId, showSales]);

  if (!flowerId) return null;

  if (loading && !data) return <ActivityIndicator color={accent} style={{ marginVertical: 12 }} />;

  if (error) return <Text style={styles.muted}>{error}</Text>;

  if (!data) return null;

  const { summary, entries, sales } = data;

  if (!entries.length) {
    return (
      <Text style={styles.muted}>
        Current price {peso(summary.currentPrice)}. Price changes will be recorded here from now on.
      </Text>
    );
  }

  // Oldest -> newest for the chart
  const points = [...entries].reverse().map(entry => entry.newPrice);
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.statsRow}>
        <Stat label="Current" value={peso(summary.currentPrice)} />
        <Stat label="Lowest" value={peso(summary.lowestPrice)} color={STATUS_TONES.success.text} />
        <Stat label="Highest" value={peso(summary.highestPrice)} color={STATUS_TONES.danger.text} />
        <Stat label="Changes" value={String(summary.changeCount)} />
      </View>

      {points.length > 1 ? (
        <View accessibilityLabel="Price over time chart" style={styles.chart}>
          {points.map((price, index) => (
            <View key={`${price}-${index}`} style={styles.barSlot}>
              <View
                style={[
                  styles.bar,
                  {
                    height: 12 + ((price - min) / span) * 48,
                    backgroundColor: index === points.length - 1 ? accent : `${accent}66`,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : null}

      <View>
        {entries.map(entry => {
          const up = entry.change > 0;
          const down = entry.change < 0;
          const tone = up ? STATUS_TONES.danger : down ? STATUS_TONES.success : STATUS_TONES.neutral;

          return (
            <View key={entry._id} style={styles.entry}>
              <View style={[styles.entryIcon, { backgroundColor: tone.background }]}>
                <Ionicons
                  name={entry.event === 'created' ? 'add' : up ? 'arrow-up' : down ? 'arrow-down' : 'remove'}
                  size={14}
                  color={tone.solid}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle}>
                  {entry.event === 'created'
                    ? `Listed at ${peso(entry.newPrice)}`
                    : `${peso(entry.oldPrice)} → ${peso(entry.newPrice)}`}
                </Text>
                <Text style={styles.entryMeta}>
                  {shortDate(entry.createdAt)}
                  {entry.event === 'updated'
                    ? ` · ${up ? '+' : ''}${peso(entry.change).replace('₱-', '-₱')} (${up ? '+' : ''}${entry.changePercent}%)`
                    : ''}
                </Text>
              </View>
              {entry.flags?.includes('large_increase') ? (
                <View style={[styles.flag, { backgroundColor: STATUS_TONES.serious.background }]}>
                  <Text style={[styles.flagText, { color: STATUS_TONES.serious.text }]}>Large increase</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {showSales && sales ? (
        <View style={styles.salesBox}>
          <Text style={styles.salesTitle}>Sold at each price</Text>
          {sales.length === 0 ? (
            <Text style={styles.muted}>No orders yet.</Text>
          ) : (
            sales.map(row => (
              <View key={row.unitPrice} style={styles.salesRow}>
                <Text style={styles.salesPrice}>{peso(row.unitPrice)}</Text>
                <Text style={styles.salesMeta}>
                  {row.orders} order{row.orders === 1 ? '' : 's'} · {row.quantity} pc · {peso(row.revenue)}
                </Text>
              </View>
            ))
          )}
          <Text style={styles.muted}>Past orders keep the price the customer paid, even after a change.</Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: { color: '#77737B', fontSize: 12, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 8, borderRadius: 10, backgroundColor: '#F7F7FA' },
  statLabel: { color: '#77737B', fontSize: 10.5, fontWeight: '700' },
  statValue: { marginTop: 2, color: '#2D2A2E', fontSize: 13, fontWeight: '900' },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 64,
    gap: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECF0',
  },
  barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', maxWidth: 22, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  entryIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  entryTitle: { color: '#2D2A2E', fontSize: 13, fontWeight: '800' },
  entryMeta: { marginTop: 1, color: '#77737B', fontSize: 11.5 },
  flag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  flagText: { fontSize: 10.5, fontWeight: '800' },
  salesBox: { padding: 10, borderRadius: 12, backgroundColor: '#F7F7FA', gap: 6 },
  salesTitle: { color: '#2D2A2E', fontSize: 13, fontWeight: '800' },
  salesRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  salesPrice: { color: '#2D2A2E', fontSize: 13, fontWeight: '800' },
  salesMeta: { flexShrink: 1, color: '#4B5563', fontSize: 12, textAlign: 'right' },
});
