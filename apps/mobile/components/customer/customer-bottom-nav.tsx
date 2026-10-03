import BottomNavBar, { type BottomNavItem } from '../ui/bottom-nav-bar';

/*
 * =========================================================
 * CUSTOMER BOTTOM NAVIGATION
 * =========================================================
 *
 * Home | Discover | Bloom | Cart | AI | Me
 *
 * Uses the shared bar (Admin layout) in Customer pink.
 * =========================================================
 */

export type CustomerTab =
  | 'home'
  | 'discover'
  | 'bloom'
  | 'cart'
  | 'ai'
  | 'me';

export const CUSTOMER_PINK = '#DF628F';
export const CUSTOMER_PINK_LIGHT = '#FCE8F0';

const ITEMS: BottomNavItem[] = [
  { key: 'home', label: 'Home', route: '/(customer)/customer-dashboard', icon: 'home-outline', activeIcon: 'home' },
  { key: 'discover', label: 'Discover', route: '/(customer)/customer-discover', icon: 'compass-outline', activeIcon: 'compass' },
  { key: 'bloom', label: 'Bloom', route: '/(customer)/customer-bloomboard', icon: 'flower-outline', activeIcon: 'flower' },
  { key: 'cart', label: 'Cart', route: '/(customer)/customer-cart', icon: 'bag-outline', activeIcon: 'bag' },
  { key: 'ai', label: 'AI', route: '/(customer)/customer-ai', icon: 'sparkles-outline', activeIcon: 'sparkles' },
  { key: 'me', label: 'Me', route: '/(customer)/customer-profile', icon: 'person-outline', activeIcon: 'person' },
];

type Props = {
  active: CustomerTab;
  cartCount?: number;
  onReselect?: () => void;
};

export default function CustomerBottomNav({ active, cartCount = 0, onReselect }: Props) {
  return (
    <BottomNavBar
      items={ITEMS.map(item => (item.key === 'cart' ? { ...item, badge: cartCount } : item))}
      active={active}
      accent={CUSTOMER_PINK}
      accentLight={CUSTOMER_PINK_LIGHT}
      onReselect={onReselect}
    />
  );
}
