import { useCallback, useEffect, useState } from 'react';

import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ROLE_ACCENT, ScreenLoader, type Role } from '../../components/ui/state-views';
import { getStoredUser } from '../../services/auth';
import {
  DISPUTE_PARTY_LABELS,
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_COLORS,
  DISPUTE_STATUS_LABELS,
  getMyDisputes,
  type Dispute,
} from '../../services/disputes';

/*
 * =========================================================
 * MY REPORTS (Customer / Seller / Rider)
 * =========================================================
 */

const TEXT = '#2D2A2E';
const MUTED = '#6F6A70';

export default function MyReportsScreen() {
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<Role>('customer');
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [user, data] = await Promise.all([getStoredUser(), getMyDisputes()]);
      if (user?.role) setRole(user.role as Role);
      setDisputes(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load your reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <ScreenLoader role={role} message="Loading your reports..." />;
  }

  const accent = ROLE_ACCENT[role];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role={role}
        title="My Reports"
        subtitle="Problems you reported to FLOGRAM"
      />

      <FlatList
        data={disputes}
        keyExtractor={item => item._id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={accent}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          error ? (
            <ErrorState role={role} message={error} onRetry={() => void load()} />
          ) : (
            <EmptyState
              role={role}
              icon="shield-checkmark-outline"
              title="No reports"
              message="To report a problem, open the order and tap “Report a problem”."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/(shared)/dispute-details', params: { disputeId: item._id } } as never)
            }
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{DISPUTE_REASON_LABELS[item.reason]}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {item.order?.productName || 'Order'} · about {DISPUTE_PARTY_LABELS[item.against]}
              </Text>
              <Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString('en-PH')}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${DISPUTE_STATUS_COLORS[item.status]}1A` }]}>
              <Text style={[styles.badgeText, { color: DISPUTE_STATUS_COLORS[item.status] }]}>
                {DISPUTE_STATUS_LABELS[item.status]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={MUTED} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  content: { padding: 16, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E3E8',
    backgroundColor: '#FFFFFF',
  },
  title: { color: TEXT, fontSize: 15, fontWeight: '800' },
  meta: { marginTop: 2, color: MUTED, fontSize: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800' },
});
