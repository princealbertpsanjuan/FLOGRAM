import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * =========================================================
 * SHARED BOTTOM NAVIGATION BAR
 * =========================================================
 *
 * One bar for every role (Customer, Seller, Rider, Admin).
 * The size, padding, icon pill and label position copy the
 * original Admin bar, which sits correctly on the phone.
 * Only the accent color changes per role.
 *
 * Android: fixed 9px bottom padding (same as Admin).
 * iOS: extra room for the home indicator only.
 * =========================================================
 */

export type BottomNavItem = {
  key: string;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

type Props = {
  items: BottomNavItem[];
  active: string;
  accent: string;
  accentLight: string;
  onReselect?: () => void;
  /*
   * Rider screens overlay the bar on top of the content.
   */
  floating?: boolean;
};

export const BOTTOM_NAV_HEIGHT = 76;

export const useBottomNavExtraInset = () => {
  const insets = useSafeAreaInsets();

  return Platform.OS === 'ios' ? Math.max(0, insets.bottom - 14) : 0;
};

export default function BottomNavBar({
  items,
  active,
  accent,
  accentLight,
  onReselect,
  floating = false,
}: Props) {
  const extraInset = useBottomNavExtraInset();

  return (
    <View
      style={[
        styles.bar,
        floating && styles.floating,
        { paddingBottom: 9 + extraInset },
      ]}
    >
      {items.map(item => {
        const isActive = item.key === active;
        const color = isActive ? accent : MUTED;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
            style={styles.item}
            onPress={() => {
              if (isActive) {
                onReselect?.();
                return;
              }

              router.replace(item.route as never);
            }}
          >
            <View style={[styles.iconWrap, isActive && { backgroundColor: accentLight }]}>
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={19}
                color={color}
              />

              {item.badge && item.badge > 0 ? (
                <View style={[styles.badge, { backgroundColor: accent }]}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? '99+' : item.badge}</Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              style={[styles.label, isActive && { color: accent, fontWeight: '700' }]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const MUTED = '#AAA7AC';

const styles = StyleSheet.create({
  bar: {
    minHeight: BOTTOM_NAV_HEIGHT,
    paddingTop: 7,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECF0',
  },
  floating: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  item: {
    flex: 1,
    minHeight: 57,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 31,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '500',
    color: MUTED,
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
