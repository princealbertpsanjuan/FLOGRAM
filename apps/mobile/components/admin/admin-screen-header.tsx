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
 * ADMIN SECONDARY SCREEN HEADER
 * =========================================================
 *
 * Purple header with Back, matching the existing Admin
 * screens (Remittances, Verification).
 * =========================================================
 */

export const ADMIN_COLORS = {
  background: '#F5F5F8',
  card: '#FFFFFF',
  purple: '#24245D',
  purpleAccent: '#5552B9',
  purpleLight: '#ECECFF',
  text: '#3B3940',
  secondaryText: '#77737B',
  mutedText: '#AAA7AC',
  border: '#ECECF0',
  green: '#3E9B62',
  greenLight: '#EAF7EF',
  yellow: '#B7801E',
  yellowLight: '#FFF2D8',
  red: '#D04A5F',
  redLight: '#FFF0F3',
};

type Props = {
  title: string;
  subtitle?: string;
};

export default function AdminScreenHeader({ title, subtitle }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={10}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(admin)/admin-dashboard' as never);
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
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 18,
    backgroundColor: ADMIN_COLORS.purple,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  titleArea: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
});
