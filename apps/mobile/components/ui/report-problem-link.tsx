import { Pressable, StyleSheet, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { router } from 'expo-router';

/*
 * "Report a problem" link shown on order screens for
 * Customers, Sellers and Riders. Opens the dispute form.
 */
export default function ReportProblemLink({
  orderId,
  productName,
  color = '#8A6D73',
  compact = false,
}: {
  orderId?: string | null;
  productName?: string | null;
  color?: string;
  compact?: boolean;
}) {
  if (!orderId) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={() =>
        router.push({
          pathname: '/(shared)/report-issue',
          params: { orderId, productName: productName || '' },
        } as never)
      }
      style={({ pressed }) => [styles.link, compact && styles.compact, pressed && { opacity: 0.6 }]}
    >
      <Ionicons
        name="flag-outline"
        size={15}
        color={color}
      />
      <Text style={[styles.text, { color }]}>Report a problem</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  compact: { paddingVertical: 6, justifyContent: 'flex-start' },
  text: { fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
});
