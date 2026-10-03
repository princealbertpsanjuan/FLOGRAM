import { useCallback, useState } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router, useFocusEffect } from 'expo-router';

import { getNotifications } from '../../services/notification';

/*
 * =========================================================
 * CUSTOMER NOTIFICATION BELL
 * =========================================================
 *
 * The same bell, in the same upper-right header position,
 * on every main Customer page. Shows the unread count and
 * opens the Notifications screen.
 * =========================================================
 */

export default function NotificationBell() {
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      getNotifications()
        .then(data => {
          if (active) {
            setUnread(Number(data?.unreadCount) || 0);
          }
        })
        .catch(() => {
          // The bell still works without a count.
        });

      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'
      }
      hitSlop={6}
      onPress={() => router.push('/(customer)/customer-notifications' as never)}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
    >
      <Ionicons
        name="notifications-outline"
        size={21}
        color="#DF628F"
      />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F3E3EA',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 3,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DF628F',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
