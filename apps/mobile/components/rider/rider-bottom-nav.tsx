import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';

import { getNotifications } from '../../services/notification';

import BottomNavBar, {
  BOTTOM_NAV_HEIGHT,
  useBottomNavExtraInset,
  type BottomNavItem,
} from '../ui/bottom-nav-bar';

/*
 * =========================================================
 * RIDER BOTTOM NAVIGATION
 * =========================================================
 *
 * Dashboard | Deliveries | Wallet | Alerts | Stats
 *
 * Uses the shared bar (Admin layout) in Rider gold.
 * Profile is a secondary screen, not a tab.
 * =========================================================
 */

export type RiderTab =
  | 'dashboard'
  | 'deliveries'
  | 'wallet'
  | 'alerts'
  | 'stats';

export const RIDER_GOLD = '#D2A329';
export const RIDER_GOLD_DARK = '#C49317';
export const RIDER_GOLD_LIGHT = '#F8EECF';

/*
 * Kept for screens that pad their content.
 */
export const RIDER_BOTTOM_NAV_HEIGHT = BOTTOM_NAV_HEIGHT;

const ITEMS: BottomNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/(rider)/rider-dashboard', icon: 'home-outline', activeIcon: 'home' },
  { key: 'deliveries', label: 'Deliveries', route: '/(rider)/rider-deliveries', icon: 'bicycle-outline', activeIcon: 'bicycle' },
  { key: 'wallet', label: 'Wallet', route: '/(rider)/rider-wallet', icon: 'wallet-outline', activeIcon: 'wallet' },
  { key: 'alerts', label: 'Alerts', route: '/(rider)/rider-alerts', icon: 'notifications-outline', activeIcon: 'notifications' },
  { key: 'stats', label: 'Stats', route: '/(rider)/rider-stats', icon: 'stats-chart-outline', activeIcon: 'stats-chart' },
];

type Props = {
  active: RiderTab;
  alertCount?: number;
  onReselect?: () => void;
};

export default function RiderBottomNav({ active, alertCount, onReselect }: Props) {
  /*
   * Every Rider tab shows the unread Alerts count, not only
   * the Alerts screen. It refreshes whenever a tab opens.
   */
  const [unread, setUnread] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      getNotifications()
        .then(data => {
          if (mounted) setUnread(Number(data?.unreadCount) || 0);
        })
        .catch(() => undefined);

      return () => {
        mounted = false;
      };
    }, [])
  );

  const badge = typeof alertCount === 'number' ? alertCount : unread;

  return (
    <BottomNavBar
      floating
      items={ITEMS.map(item => (item.key === 'alerts' ? { ...item, badge } : item))}
      active={active}
      accent={RIDER_GOLD_DARK}
      accentLight={RIDER_GOLD_LIGHT}
      onReselect={onReselect}
    />
  );
}

/*
 * Bottom padding a Rider screen's ScrollView needs so the
 * last card is not hidden behind the floating bar.
 */
export function useRiderBottomNavSpace(extra = 16) {
  return BOTTOM_NAV_HEIGHT + useBottomNavExtraInset() + extra;
}
