import { useEffect, useState } from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { STATUS_TONES } from '../../constants/status-colors';
import { getAdminPriceHistory, getMyShopPriceHistory, type PriceHistoryEntry } from '../../services/pricing';
import CollapsibleSection from './collapsible-section';
import type { Role } from './state-views';

/*
 * =========================================================
 * PRICE CHANGE LOG
 * =========================================================
 *
 * mode="seller"  every price change in my shop (bouquets
 *                and gift add-ons)
 * mode="admin"   platform-wide; "Large increases" filter
 *                shows +50% jumps (possible price gouging)
 * =========================================================
 */

const peso = (value?: number | null) =>
  value === null || value === undefined
    ? '–'
    : `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PriceChangeLog({ mode }: { mode: 'seller' | 'admin' }) {
  const role: Role = mode;
  const [flaggedOnly, setFlaggedOnly] = useState(mode === 'admin');
  const [entries, setEntries] = useState<PriceHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    setEntries(null);
    setError(null);

    (mode === 'admin' ? getAdminPriceHistory(flaggedOnly) : getMyShopPriceHistory())
      .then(result => active && setEntries(result))
      .catch(err => active && setError(err instanceof Error ? err.message : 'Could not load price changes.'));

    return () => {
      active = false;
    };
  }, [flaggedOnly, mode]);

  const visible = (entries || []).slice(0, showAll ? 100 : 6);

  return (
    <CollapsibleSection
      title={mode === 'admin' ? 'Price changes' : 'Price change log'}
      subtitle={mode === 'admin' ? 'Watch for sudden large increases' : 'Every price change in your shop'}
      icon="pricetags-outline"
      role={role}
      style={{ marginBottom: 14 }}
    >
      {mode === 'admin' ? (
        <View style={styles.filters}>
          {[
            { key: true, label: 'Large increases' },
            { key: false, label: 'All changes' },
          ].map(item => (
            <Pressable
              key={item.label}
              onPress={() => setFlaggedOnly(item.key)}
              style={[styles.filter, flaggedOnly === item.key && styles.filterActive]}
            >
              <Text style={[styles.filterText, flaggedOnly === item.key && styles.filterTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text style={styles.muted}>{error}</Text>
      ) : !entries ? (
        <ActivityIndicator style={{ marginVertical: 10 }} />
      ) : entries.length === 0 ? (
        <Text style={styles.muted}>{flaggedOnly ? 'No large price increases.' : 'No price changes recorded yet.'}</Text>
      ) : (
        <>
          {visible.map(entry => {
            const up = entry.change > 0;
            const down = entry.change < 0;
            const tone = up ? STATUS_TONES.danger : down ? STATUS_TONES.success : STATUS_TONES.neutral;

            return (
              <View key={entry._id} style={styles.row}>
                <View style={[styles.icon, { backgroundColor: tone.background }]}>
                  <Ionicons
                    name={entry.event === 'created' ? 'add' : up ? 'arrow-up' : down ? 'arrow-down' : 'remove'}
                    size={14}
                    color={tone.solid}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {entry.itemName || 'Item'}
                    {entry.itemType === 'addon' ? ' (add-on)' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {mode === 'admin' && entry.florist?.shopName ? `${entry.florist.shopName} · ` : ''}
                    {new Date(entry.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.price}>
                    {entry.event === 'created' ? peso(entry.newPrice) : `${peso(entry.oldPrice)} → ${peso(entry.newPrice)}`}
                  </Text>
                  {entry.event === 'updated' ? (
                    <Text style={[styles.percent, { color: tone.text }]}>
                      {up ? '+' : ''}
                      {entry.changePercent}%
                    </Text>
                  ) : (
                    <Text style={styles.meta}>new listing</Text>
                  )}
                </View>
              </View>
            );
          })}
          {entries.length > 6 ? (
            <Pressable onPress={() => setShowAll(value => !value)}>
              <Text style={styles.more}>{showAll ? 'Show less' : `See all ${entries.length}`}</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  muted: { color: '#77737B', fontSize: 12 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filter: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#D1D5DB' },
  filterActive: { backgroundColor: STATUS_TONES.serious.solid, borderColor: STATUS_TONES.serious.solid },
  filterText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { color: '#2D2A2E', fontSize: 13, fontWeight: '800' },
  meta: { marginTop: 1, color: '#77737B', fontSize: 11.5 },
  price: { color: '#2D2A2E', fontSize: 12.5, fontWeight: '800' },
  percent: { marginTop: 1, fontSize: 11.5, fontWeight: '800' },
  more: { marginTop: 6, color: '#5552B9', fontSize: 13, fontWeight: '800' },
});
