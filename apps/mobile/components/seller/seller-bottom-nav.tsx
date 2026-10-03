import BottomNavBar, { type BottomNavItem } from '../ui/bottom-nav-bar';

/*
 * =========================================================
 * SELLER BOTTOM NAVIGATION
 * =========================================================
 *
 * Dashboard | Products | Orders | Reports | Profile
 *
 * Uses the shared bar (Admin layout) in Seller green.
 * =========================================================
 */

export type SellerTab =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'reports'
  | 'profile';

export const SELLER_GREEN = '#5E9874';
export const SELLER_GREEN_LIGHT = '#EAF4ED';

const ITEMS: BottomNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', route: '/(seller)/seller-dashboard', icon: 'home-outline', activeIcon: 'home' },
  { key: 'products', label: 'Products', route: '/(seller)/seller-products', icon: 'flower-outline', activeIcon: 'flower' },
  { key: 'orders', label: 'Orders', route: '/(seller)/seller-orders', icon: 'receipt-outline', activeIcon: 'receipt' },
  { key: 'reports', label: 'Reports', route: '/(seller)/seller-reports', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { key: 'profile', label: 'Profile', route: '/(seller)/seller-profile', icon: 'person-outline', activeIcon: 'person' },
];

type Props = {
  active: SellerTab;
  onReselect?: () => void;
};

export default function SellerBottomNav({ active, onReselect }: Props) {
  return (
    <BottomNavBar
      items={ITEMS}
      active={active}
      accent={SELLER_GREEN}
      accentLight={SELLER_GREEN_LIGHT}
      onReselect={onReselect}
    />
  );
}
