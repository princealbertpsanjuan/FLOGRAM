import {
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
 * CUSTOMER BOTTOM NAVIGATION
 * =========================================================
 *
 * One shared bar for all Customer tabs:
 *
 * Home | Discover | Bloom | Cart | AI | Me
 *
 * Same icons, label size, spacing and active state on
 * every page. Sits in the layout flow and pads above the
 * phone's gesture/home area.
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

const INACTIVE = '#9C969A';

const TABS: {
  key: CustomerTab;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
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
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        const color = isActive ? CUSTOMER_PINK : INACTIVE;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [styles.item, pressed && { opacity: 0.7 }]}
            onPress={() => {
              if (isActive) {
                onReselect?.();
                return;
              }

              router.replace(tab.route as never);
            }}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Ionicons
                name={isActive ? tab.activeIcon : tab.icon}
                size={21}
                color={color}
              />
              {tab.key === 'cart' && cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={1}
              style={[styles.label, isActive && styles.labelActive]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EDEF',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: CUSTOMER_PINK_LIGHT,
  },
  label: {
    marginTop: 3,
    color: INACTIVE,
    fontSize: 12,
    fontWeight: '500',
  },
  labelActive: {
    color: CUSTOMER_PINK,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: CUSTOMER_PINK,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
