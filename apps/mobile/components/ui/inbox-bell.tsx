import { useCallback, useState } from 'react';

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect } from 'expo-router';

import { getNotifications } from '../../services/notification';

/*
 * Notification bell for Seller and Admin headers (dark
 * backgrounds). Opens the shared Notifications screen.
 */
export default function InboxBell({ accent = '#5552B9' }: { accent?: string }) {
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getNotifications()
        .then(data => {
          if (active) setUnread(Number(data?.unreadCount) || 0);
        })
        .catch(() => undefined);

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={6}
      onPress={() => router.push('/(shared)/notifications' as never)}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
      {unread > 0 ? (
        <View style={[styles.badge, { borderColor: accent }]}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5484D',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
