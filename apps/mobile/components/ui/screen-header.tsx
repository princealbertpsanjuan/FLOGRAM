import type { ReactNode } from 'react';

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
 * SECONDARY SCREEN HEADER (all roles)
 * =========================================================
 *
 * Colored box with the Admin 26px bottom curve and a Back
 * button. Color comes from the role.
 * =========================================================
 */

export const HEADER_COLORS = {
  admin: '#24245D',
  customer: '#DF628F',
  seller: '#5E9874',
  rider: '#D2A329',
} as const;

const FALLBACK_ROUTES = {
  admin: '/(admin)/admin-dashboard',
  customer: '/(customer)/customer-profile',
  seller: '/(seller)/seller-dashboard',
  rider: '/(rider)/rider-dashboard',
} as const;

type Props = {
  role: keyof typeof HEADER_COLORS;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export default function ScreenHeader({ role, title, subtitle, right }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 12, backgroundColor: HEADER_COLORS[role] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace(FALLBACK_ROUTES[role] as never);
          }
        }}
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
      >
        <Ionicons
          name="arrow-back"
          size={22}
          color="#FFFFFF"
        />
      </Pressable>

      <View style={styles.titleArea}>
        <Text
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  titleArea: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
});
