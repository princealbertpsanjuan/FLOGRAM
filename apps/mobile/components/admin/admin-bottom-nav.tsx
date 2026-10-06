import BottomNavBar, { type BottomNavItem } from '../ui/bottom-nav-bar';
import { useDesktopWeb } from '../../hooks/use-desktop-web';

/*
 * =========================================================
 * ADMIN BOTTOM NAVIGATION
 * =========================================================
 *
 * Dashboard | Users | Orders | Reports | Settings
 * =========================================================
 */

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'orders'
  | 'reports'
  | 'settings';

const ITEMS: BottomNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/(admin)/admin-dashboard', icon: 'home-outline', activeIcon: 'home' },
  { key: 'users', label: 'Users', route: '/(admin)/admin-users', icon: 'people-outline', activeIcon: 'people' },
  { key: 'orders', label: 'Orders', route: '/(admin)/admin-orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  { key: 'reports', label: 'Reports', route: '/(admin)/admin-reports', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'settings', label: 'Settings', route: '/(admin)/admin-settings', icon: 'settings-outline', activeIcon: 'settings' },
];

export default function AdminBottomNav({
  active,
  onReselect,
}: {
  active: AdminTab;
  onReselect?: () => void;
}) {
  /*
   * Desktop web uses the sidebar instead.
   */
  const desktop = useDesktopWeb();

  if (desktop) {
    return null;
  }

  return (
    <BottomNavBar
      items={ITEMS}
      active={active}
      accent="#5552B9"
      accentLight="#ECECFF"
      onReselect={onReselect}
    />
  );
}
