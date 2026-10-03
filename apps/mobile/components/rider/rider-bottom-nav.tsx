import type { ReactNode } from 'react';

import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * =========================================================
 * RIDER BOTTOM NAVIGATION
 * =========================================================
 *
 * One shared navigation bar for every Rider tab so the
 * labels, icons, sizes and active state are identical:
 *
 * Dashboard | Deliveries | Wallet | Alerts | Stats
 *
 * Profile is NOT a tab. It opens from the Dashboard
 * header as a secondary screen with Back navigation.
 *
 * The bar sits above the system gesture/home area using
 * safe-area insets. Screens should add
 * RIDER_BOTTOM_NAV_HEIGHT + insets.bottom of bottom
 * padding to their scroll content.
 * =========================================================
 */

export type RiderTab =
  | 'dashboard'
  | 'deliveries'
  | 'wallet'
  | 'alerts'
  | 'stats';

export const RIDER_BOTTOM_NAV_HEIGHT = 64;

export const RIDER_GOLD = '#D2A329';
export const RIDER_GOLD_DARK = '#C49317';
export const RIDER_GOLD_LIGHT = '#F8EECF';

const INACTIVE = '#9A9A9A';

type TabConfig = {
  key: RiderTab;
  label: string;
  route: string;
  icon: (color: string, active: boolean) => ReactNode;
};

const TABS: TabConfig[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    route: '/(rider)/rider-dashboard',
    icon: (color, active) => (
      <Ionicons
        name={active ? 'home' : 'home-outline'}
        size={22}
        color={color}
      />
    ),
  },
  {
    key: 'deliveries',
    label: 'Deliveries',
    route: '/(rider)/rider-deliveries',
    icon: (color, active) => (
      <MaterialCommunityIcons
        name={active ? 'truck-delivery' : 'truck-delivery-outline'}
        size={23}
        color={color}
      />
    ),
  },
  {
    key: 'wallet',
    label: 'Wallet',
    route: '/(rider)/rider-wallet',
    icon: (color, active) => (
      <Ionicons
        name={active ? 'wallet' : 'wallet-outline'}
        size={22}
        color={color}
      />
    ),
  },
  {
    key: 'alerts',
    label: 'Alerts',
    route: '/(rider)/rider-alerts',
    icon: (color, active) => (
      <Ionicons
        name={active ? 'notifications' : 'notifications-outline'}
        size={22}
        color={color}
      />
    ),
  },
  {
    key: 'stats',
    label: 'Stats',
    route: '/(rider)/rider-stats',
    icon: (color, active) => (
      <Ionicons
        name={active ? 'stats-chart' : 'stats-chart-outline'}
        size={21}
        color={color}
      />
    ),
  },
];

type RiderBottomNavProps = {
  active: RiderTab;

  /*
   * Optional badge, e.g. unread alert count.
   */
  alertCount?: number;

  /*
   * Called when the already-active tab is pressed,
   * e.g. to refresh or scroll to top.
   */
  onReselect?: () => void;
};

export default function RiderBottomNav({
  active,
  alertCount = 0,
  onReselect,
}: RiderBottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          height: RIDER_BOTTOM_NAV_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {TABS.map(tab => {
        const isActive = tab.key === active;
        const color = isActive ? RIDER_GOLD_DARK : INACTIVE;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => [
              styles.item,
              pressed && styles.itemPressed,
            ]}
            onPress={() => {
              if (isActive) {
                onReselect?.();
                return;
              }

              router.replace(tab.route as never);
            }}
          >
            <View
              style={[
                styles.iconWrap,
                isActive && styles.iconWrapActive,
              ]}
            >
              {tab.icon(color, isActive)}

              {tab.key === 'alerts' && alertCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {alertCount > 99 ? '99+' : alertCount}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.label,
                isActive && styles.labelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/*
 * Bottom padding a screen's ScrollView needs so the last
 * card is never hidden behind the navigation bar.
 */
export function useRiderBottomNavSpace(extra = 16) {
  const insets = useSafeAreaInsets();

  return RIDER_BOTTOM_NAV_HEIGHT + insets.bottom + extra;
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  itemPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  label: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '500',
    color: INACTIVE,
  },
  labelActive: {
    color: RIDER_GOLD_DARK,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#E5484D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
