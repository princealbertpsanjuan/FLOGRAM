import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { PENALTY_LEGEND, STATUS_TONES, getStatusColors, getStatusTone } from '../../constants/status-colors';

/*
 * =========================================================
 * STATUS BADGE + LEGEND
 * =========================================================
 *
 * <StatusBadge status="ban" label="Permanent ban" />
 *
 * Color AND icon AND text, so the meaning is clear even
 * for color-blind users (see constants/status-colors.ts).
 * =========================================================
 */

export default function StatusBadge({
  status,
  label,
  size = 'md',
  style,
}: {
  status?: string | null;
  label?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const colors = getStatusColors(status);
  const text = label || String(status || '').replaceAll('_', ' ').toUpperCase();
  const small = size === 'sm';

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Status: ${text}`}
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: colors.background, borderColor: colors.border },
        style,
      ]}
    >
      <Ionicons name={colors.icon as never} size={small ? 12 : 14} color={colors.solid} />
      <Text style={[styles.text, small && styles.textSmall, { color: colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/*
 * Penalty color legend: yellow -> orange -> red.
 */
export function PenaltyLegend() {
  return (
    <View style={styles.legend}>
      {PENALTY_LEGEND.map(item => {
        const tone = STATUS_TONES[getStatusTone(item.status)];

        return (
          <View key={item.status} style={[styles.legendRow, { backgroundColor: tone.background, borderColor: tone.border }]}>
            <Ionicons name={tone.icon as never} size={18} color={tone.solid} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.legendTitle, { color: tone.text }]}>
                {tone.label} · {item.title}
              </Text>
              <Text style={styles.legendText}>{item.meaning}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeSmall: { paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
  text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  textSmall: { fontSize: 10.5 },
  legend: { gap: 6, marginTop: 10 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendTitle: { fontSize: 13, fontWeight: '800' },
  legendText: { marginTop: 1, color: '#4B5563', fontSize: 12 },
});
