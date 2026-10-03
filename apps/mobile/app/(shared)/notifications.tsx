import { useCallback, useEffect, useState } from 'react';

import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ROLE_ACCENT, ScreenLoader, type Role } from '../../components/ui/state-views';
import { getStoredUser } from '../../services/auth';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type FlogramNotification,
} from '../../services/notification';

/*
 * =========================================================
 * NOTIFICATIONS (Seller and Admin)
 * =========================================================
 *
 * Customers and Riders keep their own styled screens.
 * =========================================================
 */

const TEXT = '#2D2A2E';
const MUTED = '#6F6A70';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  dispute_update: 'flag-outline',
  account_penalty: 'warning-outline',
  payout_update: 'wallet-outline',
  order_created: 'receipt-outline',
  order_updated: 'refresh-circle-outline',
  order_cancelled: 'close-circle-outline',
  verification_approved: 'shield-checkmark-outline',
  verification_rejected: 'shield-outline',
  rating_received: 'star-outline',
};

const timeAgo = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [role, setRole] = useState<Role>('seller');
  const [items, setItems] = useState<FlogramNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [user, data] = await Promise.all([getStoredUser(), getNotifications()]);
      if (user?.role) setRole(user.role as Role);
      setItems(data.notifications || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (item: FlogramNotification) => {
    if (!item.isRead) {
      try {
        const updated = await markNotificationAsRead(item.id);
        setItems(current => current.map(entry => (entry.id === item.id ? updated : entry)));
      } catch {
        // Still navigate.
      }
    }

    const disputeId = typeof item.metadata?.disputeId === 'string' ? item.metadata.disputeId : null;

    if (disputeId) {
      router.push({ pathname: '/(shared)/dispute-details', params: { disputeId } } as never);
    } else if (item.type === 'payout_update' && role === 'seller') {
      router.push('/(seller)/seller-earnings' as never);
    } else if (item.orderId && role === 'admin') {
      router.push({ pathname: '/(admin)/admin-order-details', params: { orderId: item.orderId } } as never);
    } else if (item.orderId && role === 'seller') {
      router.push('/(seller)/seller-orders' as never);
    }
  };

  const markAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setItems(current => current.map(item => ({ ...item, isRead: true })));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <ScreenLoader role={role} message="Loading notifications..." />;
  }

  const accent = ROLE_ACCENT[role];
  const unread = items.filter(item => !item.isRead).length;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role={role}
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'All caught up'}
        right={
          unread ? (
            <Pressable onPress={() => void markAll()} style={styles.markAll}>
              <Text style={styles.markAllText}>Read all</Text>
            </Pressable>
          ) : null
        }
      />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
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
            <EmptyState role={role} icon="notifications-off-outline" title="No notifications yet" />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void open(item)}
            style={({ pressed }) => [styles.card, !item.isRead && { borderColor: accent }, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.icon, { backgroundColor: `${accent}1A` }]}>
              <Ionicons name={ICONS[item.type] || 'notifications-outline'} size={19} color={accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, !item.isRead && { fontWeight: '900' }]}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.isRead ? <View style={[styles.dot, { backgroundColor: accent }]} /> : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  content: { padding: 16, gap: 10, flexGrow: 1 },
  markAll: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' },
  markAllText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECE8ED',
    backgroundColor: '#FFFFFF',
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { color: TEXT, fontSize: 14, fontWeight: '700' },
  message: { marginTop: 2, color: MUTED, fontSize: 13, lineHeight: 18 },
  time: { marginTop: 4, color: MUTED, fontSize: 11 },
  dot: { width: 9, height: 9, marginTop: 4, borderRadius: 5 },
});
