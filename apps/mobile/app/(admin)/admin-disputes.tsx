import { useCallback, useEffect, useState } from 'react';

import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  DISPUTE_PARTY_LABELS,
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_COLORS,
  DISPUTE_STATUS_LABELS,
  getAdminDisputes,
  personName,
  type Dispute,
  type DisputeStatus,
} from '../../services/disputes';

/*
 * =========================================================
 * ADMIN – DISPUTES
 * =========================================================
 */

const ACCENT = '#5552B9';
const TEXT = '#3B3940';
const MUTED = '#77737B';

const FILTERS: (DisputeStatus | 'all')[] = ['open', 'under_review', 'resolved', 'rejected', 'all'];

export default function AdminDisputesScreen() {
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<DisputeStatus | 'all'>('open');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [counts, setCounts] = useState<Partial<Record<DisputeStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const data = await getAdminDisputes(filter);
      setDisputes(data.disputes);
      setCounts(data.counts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load disputes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <ScreenLoader role="admin" message="Loading disputes..." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="admin"
        title="Disputes"
        subtitle={`${counts.open || 0} open · ${counts.under_review || 0} under review`}
      />

      <View style={styles.filters}>
        {FILTERS.map(item => {
          const active = filter === item;
          const count = item === 'all' ? undefined : counts[item];
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && { color: '#FFFFFF' }]}>
                {item === 'all' ? 'All' : DISPUTE_STATUS_LABELS[item]}
                {count ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={disputes}
        keyExtractor={item => item._id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={ACCENT}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          error ? (
            <ErrorState role="admin" message={error} onRetry={() => void load()} />
          ) : (
            <EmptyState role="admin" icon="checkmark-done-outline" title="Nothing here" message="No disputes with this status." />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/(shared)/dispute-details', params: { disputeId: item._id } } as never)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.title}>{DISPUTE_REASON_LABELS[item.reason]}</Text>
                <Text style={[styles.status, { color: DISPUTE_STATUS_COLORS[item.status] }]}>
                  {DISPUTE_STATUS_LABELS[item.status]}
                </Text>
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {personName(item.filedBy)} ({item.filedByRole}) → {DISPUTE_PARTY_LABELS[item.against]}
                {item.againstUser ? ` ${personName(item.againstUser)}` : ''}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.order?.productName || 'Order'}
                {item.florist?.shopName ? ` · ${item.florist.shopName}` : ''} · {new Date(item.createdAt).toLocaleDateString('en-PH')}
              </Text>
              <Text style={styles.details} numberOfLines={2}>{item.details}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F8' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: ACCENT },
  chipActive: { backgroundColor: ACCENT },
  chipText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  content: { padding: 16, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECECF0',
    backgroundColor: '#FFFFFF',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '800' },
  status: { fontSize: 11, fontWeight: '900' },
  meta: { marginTop: 2, color: MUTED, fontSize: 12 },
  details: { marginTop: 6, color: TEXT, fontSize: 13, lineHeight: 18 },
});
