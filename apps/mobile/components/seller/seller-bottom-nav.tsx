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
 * SELLER BOTTOM NAVIGATION
 * =========================================================
 *
 * One shared bar for every Seller tab so labels, icons,
 * font sizes, spacing and the active state are identical:
 *
 * Dashboard | Products | Orders | Reports | Profile
 *
 * It sits in the normal layout flow (not absolute) at the
 * bottom of the screen and pads itself above the phone's
 * gesture/home area.
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

const INACTIVE = '#9A9B9C';

const TABS: {
  key: SellerTab;
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    route: '/(seller)/seller-dashboard',
    icon: 'home-outline',
    activeIcon: 'home',
  },
  {
    key: 'products',
    label: 'Products',
    route: '/(seller)/seller-products',
    icon: 'flower-outline',
    activeIcon: 'flower',
  },
  {
    key: 'orders',
    label: 'Orders',
    route: '/(seller)/seller-orders',
    icon: 'receipt-outline',
    activeIcon: 'receipt',
  },
  {
    key: 'reports',
    label: 'Reports',
    route: '/(seller)/seller-reports',
    icon: 'bar-chart-outline',
    activeIcon: 'bar-chart',
  },
  {
    key: 'profile',
    label: 'Profile',
    route: '/(seller)/seller-profile',
    icon: 'person-outline',
    activeIcon: 'person',
  },
];

type Props = {
  active: SellerTab;
  onReselect?: () => void;
};

export default function SellerBottomNav({ active, onReselect }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {TABS.map(tab => {
        const isActive = tab.key === active;
        const color = isActive ? SELLER_GREEN : INACTIVE;

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
    borderTopColor: '#ECEEEC',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: SELLER_GREEN_LIGHT,
  },
  label: {
    marginTop: 3,
    color: INACTIVE,
    fontSize: 12,
    fontWeight: '500',
  },
  labelActive: {
    color: SELLER_GREEN,
    fontWeight: '700',
  },
});
