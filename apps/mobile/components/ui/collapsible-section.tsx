import { useState, type ReactNode } from 'react';

import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * DROPDOWN SECTION
 * =========================================================
 *
 * Shows only the title (and a short subtitle). Tapping it
 * opens the content, tapping again closes it — the same
 * pattern as the Rider profile settings.
 * =========================================================
 */

export default function CollapsibleSection({
  title,
  subtitle,
  icon,
  role,
  defaultOpen = false,
  children,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  role: Role;
  defaultOpen?: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const accent = ROLE_ACCENT[role];

  return (
    <View style={[styles.card, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(value => !value)}
        style={({ pressed }) => [styles.header, pressed && { opacity: 0.75 }]}
      >
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={icon} size={19} color={accent} />
          </View>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>

        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={accent} />
      </Pressable>

      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E6E5EC',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  title: { color: '#2E2B33', fontSize: 15, fontWeight: '800' },
  subtitle: { marginTop: 2, color: '#77737B', fontSize: 12 },
  body: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#F0EFF4', paddingTop: 12 },
});
