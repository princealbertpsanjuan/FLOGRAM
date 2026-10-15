import { useMemo, useState } from 'react';

import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { ROLE_ACCENT, type Role } from './state-views';

/*
 * =========================================================
 * CUSTOM DATE RANGE (calendar)
 * =========================================================
 *
 * Pure JavaScript calendar (works on phone and the Admin
 * web portal, no native module).
 *
 * <DateRangeButton value onChange role />
 *   a chip with a clickable calendar icon; opens the picker.
 *
 * Dates are "YYYY-MM-DD" strings (Manila calendar days).
 * Tap a start day, then an end day (tap the same day twice
 * for a single day), then Apply.
 * =========================================================
 */

export type DateRange = { start: string; end: string };

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (value: number) => String(value).padStart(2, '0');

export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const fromKey = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const formatDateKey = (key: string) =>
  fromKey(key).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

export const formatRange = (range: DateRange | null) => {
  if (!range) {
    return 'Custom dates';
  }

  return range.start === range.end ? formatDateKey(range.start) : `${formatDateKey(range.start)} – ${formatDateKey(range.end)}`;
};

/*
 * Start of the first day / end of the last day, local time.
 * Use for client-side filtering of ISO date strings.
 */
export const rangeToDates = (range: DateRange) => {
  const start = fromKey(range.start);
  const end = fromKey(range.end);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const isInRange = (value: string | Date | null | undefined, range: DateRange | null) => {
  if (!range) {
    return true;
  }

  if (!value) {
    return false;
  }

  // Plain calendar day ("YYYY-MM-DD", e.g. shiftDate): compare as a day,
  // not as UTC midnight (which shifts a day in negative-offset time zones).
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value >= range.start && value <= range.end;
  }

  const time = new Date(value).getTime();
  const { start, end } = rangeToDates(range);
  return time >= start.getTime() && time <= end.getTime();
};

export function DateRangePickerModal({
  visible,
  value,
  role,
  maxDate,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: DateRange | null;
  role: Role;
  maxDate?: Date;
  onClose: () => void;
  onApply: (range: DateRange) => void;
}) {
  const accent = ROLE_ACCENT[role];
  const today = new Date();

  const [month, setMonth] = useState(() => {
    const base = value ? fromKey(value.end) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const [start, setStart] = useState<string | null>(value?.start ?? null);
  const [end, setEnd] = useState<string | null>(value?.end ?? null);

  const maxKey = maxDate ? toDateKey(maxDate) : null;

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);

    for (let day = 1; day <= count; day += 1) {
      cells.push(toDateKey(new Date(month.getFullYear(), month.getMonth(), day)));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [month]);

  const pick = (key: string) => {
    if (!start || end) {
      setStart(key);
      setEnd(null);
      return;
    }

    if (key < start) {
      setEnd(start);
      setStart(key);
    } else {
      setEnd(key);
    }
  };

  const apply = () => {
    if (!start) {
      return;
    }

    onApply({ start, end: end ?? start });
    onClose();
  };

  const shiftMonth = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => shiftMonth(-1)} hitSlop={10} accessibilityLabel="Previous month">
              <Ionicons name="chevron-back" size={22} color={accent} />
            </Pressable>
            <Text style={styles.monthText}>
              {month.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
            </Text>
            <Pressable onPress={() => shiftMonth(1)} hitSlop={10} accessibilityLabel="Next month">
              <Ionicons name="chevron-forward" size={22} color={accent} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map(day => (
              <Text key={day} style={styles.weekday}>{day}</Text>
            ))}

            {days.map((key, index) => {
              if (!key) {
                return <View key={`blank-${index}`} style={styles.cell} />;
              }

              const disabled = Boolean(maxKey && key > maxKey);
              const isEdge = key === start || key === (end ?? start);
              const inside = Boolean(start && end && key > start && key < end);

              return (
                <Pressable
                  key={key}
                  disabled={disabled}
                  onPress={() => pick(key)}
                  style={[
                    styles.cell,
                    inside && { backgroundColor: `${accent}1F` },
                    isEdge && { backgroundColor: accent, borderRadius: 10 },
                  ]}
                >
                  <Text style={[styles.dayText, disabled && styles.disabled, isEdge && styles.edgeText]}>
                    {Number(key.slice(8))}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>
            {start ? formatRange({ start, end: end ?? start }) : 'Tap a start date, then an end date.'}
          </Text>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.actionButton, styles.cancel]}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={apply}
              disabled={!start}
              style={[styles.actionButton, { backgroundColor: accent }, !start && { opacity: 0.5 }]}
            >
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/*
 * Chip with a clickable calendar icon.
 * Pass value=null when another period is selected.
 */
export function DateRangeButton({
  value,
  onChange,
  role,
  active,
  maxDate,
}: {
  value: DateRange | null;
  onChange: (range: DateRange) => void;
  role: Role;
  active?: boolean;
  maxDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const accent = ROLE_ACCENT[role];
  const selected = active ?? Boolean(value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose custom dates"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.chip,
          { borderColor: accent },
          selected && { backgroundColor: accent },
          pressed && { opacity: 0.75 },
        ]}
      >
        <Ionicons name="calendar-outline" size={16} color={selected ? '#FFFFFF' : accent} />
        <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : accent }]} numberOfLines={1}>
          {selected ? formatRange(value) : 'Custom'}
        </Text>
      </Pressable>

      {open ? (
        <DateRangePickerModal
          visible={open}
          value={value}
          role={role}
          maxDate={maxDate}
          onClose={() => setOpen(false)}
          onApply={onChange}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,18,28,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 380, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthText: { color: '#2E2B33', fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#8A8691', fontSize: 12, fontWeight: '700', paddingVertical: 6 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { color: '#2E2B33', fontSize: 14, fontWeight: '600' },
  disabled: { color: '#CFCCD6' },
  edgeText: { color: '#FFFFFF', fontWeight: '800' },
  hint: { marginTop: 10, textAlign: 'center', color: '#5F5B66', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14 },
  cancel: { borderWidth: 1, borderColor: '#DDDAE3' },
  cancelText: { color: '#5F5B66', fontWeight: '800' },
  applyText: { color: '#FFFFFF', fontWeight: '800' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 260,
  },
  chipText: { fontSize: 13, fontWeight: '800' },
});
