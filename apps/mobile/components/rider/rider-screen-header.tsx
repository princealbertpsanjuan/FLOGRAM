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

import { RIDER_GOLD } from './rider-bottom-nav';

/*
 * =========================================================
 * RIDER SECONDARY SCREEN HEADER
 * =========================================================
 *
 * Gold header with a Back button, used by secondary
 * Rider screens (Profile, Work Shifts, Payout details)
 * that are not bottom-navigation tabs.
 * =========================================================
 */

type Props = {
  title: string;

  subtitle?: string;

  /*
   * Route used when there is no screen to go back to
   * (e.g. opened from a notification).
   */
  fallbackRoute?: string;

  right?: ReactNode;
};

export default function RiderScreenHeader({
  title,
  subtitle,
  fallbackRoute = '/(rider)/rider-dashboard',
  right,
}: Props) {
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRoute as never);
  };

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 10 },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={goBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={24}
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

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 16,
    backgroundColor: RIDER_GOLD,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  backButton: {
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
    fontSize: 19,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
