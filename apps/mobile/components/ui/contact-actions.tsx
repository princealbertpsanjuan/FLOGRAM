import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { normalizePhone } from '../../utils/validation';
import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * CALL / MESSAGE / COPY
 * =========================================================
 *
 * Shown wherever a contact number appears.
 * - Call    → phone dialer (tel:)
 * - Message → SMS app with the number filled in (sms:)
 * - Copy    → web: clipboard; phone: the share sheet,
 *             which has "Copy" (no extra native module).
 * =========================================================
 */

const open = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Not available', 'This phone cannot open that app.');
  }
};

const copyNumber = async (phone: string) => {
  if (Platform.OS === 'web') {
    try {
      await (globalThis as { navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } } })
        .navigator?.clipboard?.writeText(phone);
      Alert.alert('Copied', `${phone} was copied.`);
    } catch {
      Alert.alert('Contact number', phone);
    }

    return;
  }

  try {
    await Share.share({ message: phone });
  } catch {
    Alert.alert('Contact number', phone);
  }
};

export default function ContactActions({
  phone,
  role,
  compact = false,
  showCall = true,
}: {
  phone?: string | null;
  role: Role;
  compact?: boolean;
  showCall?: boolean;
}) {
  const number = normalizePhone(phone);

  if (!number) {
    return null;
  }

  const accent = ROLE_ACCENT[role];

  const actions: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [
    ...(showCall ? [{ key: 'call', label: 'Call', icon: 'call-outline' as const, onPress: () => void open(`tel:${number}`) }] : []),
    { key: 'sms', label: 'Message', icon: 'chatbubble-ellipses-outline', onPress: () => void open(`sms:${number}`) },
    { key: 'copy', label: 'Copy', icon: 'copy-outline', onPress: () => void copyNumber(number) },
  ];

  return (
    <View style={styles.row}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={`${action.label} ${number}`}
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.button,
            compact && styles.compact,
            { borderColor: `${accent}55`, backgroundColor: `${accent}12` },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name={action.icon} size={compact ? 15 : 17} color={accent} />
          <Text style={[styles.label, compact && styles.compactLabel, { color: accent }]}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  compact: { paddingVertical: 7 },
  label: { fontSize: 13, fontWeight: '800' },
  compactLabel: { fontSize: 12 },
});
