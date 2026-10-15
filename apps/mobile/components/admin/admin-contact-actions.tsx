import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import ContactActions from '../ui/contact-actions';
import { ROLE_ACCENT } from '../ui/state-views';
import { normalizePhone } from '../../utils/validation';

/*
 * =========================================================
 * ADMIN – CONTACT NUMBER ACTIONS
 * =========================================================
 *
 * Phone app: Call / Message / Copy (shared ContactActions).
 * Desktop web portal: Copy only — a computer cannot place
 * calls or send SMS, so those buttons are hidden there.
 * =========================================================
 */

const ACCENT = ROLE_ACCENT.admin;

const copyToClipboard = async (phone: string) => {
  try {
    await (globalThis as { navigator?: { clipboard?: { writeText: (text: string) => Promise<void> } } })
      .navigator?.clipboard?.writeText(phone);
    Alert.alert('Copied', `${phone} was copied.`);
  } catch {
    Alert.alert('Contact number', phone);
  }
};

export default function AdminContactActions({
  phone,
  compact = false,
}: {
  phone?: string | null;
  compact?: boolean;
}) {
  if (Platform.OS !== 'web') {
    return <ContactActions phone={phone} role="admin" compact={compact} />;
  }

  const number = normalizePhone(phone);

  if (!number) {
    return null;
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Copy ${number}`}
        onPress={() => void copyToClipboard(number)}
        style={({ pressed }) => [styles.button, compact && styles.compact, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="copy-outline" size={compact ? 15 : 17} color={ACCENT} />
        <Text style={[styles.label, compact && styles.compactLabel]}>Copy number</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${ACCENT}55`,
    backgroundColor: `${ACCENT}12`,
  },
  compact: { paddingVertical: 7, paddingHorizontal: 12 },
  label: { color: ACCENT, fontSize: 13, fontWeight: '800' },
  compactLabel: { fontSize: 12 },
});
