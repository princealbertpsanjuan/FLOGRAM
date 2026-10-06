import { useCallback, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createAdminRiderShift,
  getAdminRiderShifts,
  reviewAdminShiftRequest,
  updateAdminRiderShift,
  type RiderShift,
} from '../../services/admin';

import type { RiderShiftReservation } from '../../services/delivery';

import AdminScreenHeader, {
  ADMIN_COLORS as C,
} from '../../components/admin/admin-screen-header';

import {
  formatPhDateTime,
  formatShiftWindow,
} from '../../utils/rider-format';

/*
 * =========================================================
 * ADMIN – RIDER WORK SHIFTS
 * =========================================================
 *
 * - Post work shifts with a slot limit
 * - See Rider reservation requests per shift
 * - Approve / reject requests (backend never lets
 *   approvals exceed the slot limit)
 * - See filled slots, close/reopen or cancel a shift
 *
 * Times are entered and shown in Philippine time (UTC+8).
 * =========================================================
 */

type Filter = 'upcoming' | 'past';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';

/*
 * Philippine calendar date (YYYY-MM-DD) offset by N days.
 */
const phDateKey = (offsetDays = 0) => {
  const ph = new Date(Date.now() + 8 * 60 * 60 * 1000);
  ph.setUTCDate(ph.getUTCDate() + offsetDays);
  return ph.toISOString().slice(0, 10);
};

const quickDates = () =>
  [0, 1, 2, 3, 4, 5, 6].map(offset => {
    const key = phDateKey(offset);
    const label =
      offset === 0
        ? 'Today'
        : offset === 1
          ? 'Tomorrow'
          : new Date(`${key}T00:00:00+08:00`).toLocaleDateString('en-PH', {
              timeZone: 'Asia/Manila',
              weekday: 'short',
              day: 'numeric',
            });
    return { key, label };
  });

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const toPhIso = (date: string, time: string) => {
  const [hour, minute] = time.split(':');
  return new Date(
    `${date}T${hour.padStart(2, '0')}:${minute}:00+08:00`
  );
};

const personName = (value: RiderShiftReservation['riderUser']) => {
  if (value && typeof value === 'object') {
    return (
      [value.firstName, value.lastName].filter(Boolean).join(' ') ||
      value.email ||
      'Rider'
    );
  }
  return 'Rider';
};

const SHIFT_STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  open: { bg: C.greenLight, fg: C.green, label: 'Open' },
  closed: { bg: C.yellowLight, fg: C.yellow, label: 'Closed' },
  cancelled: { bg: C.redLight, fg: C.red, label: 'Cancelled' },
};

export default function AdminRiderShiftsScreen() {
  const insets = useSafeAreaInsets();

  const [shifts, setShifts] = useState<RiderShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // Post shift form
  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState(phDateKey(1));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotLimit, setSlotLimit] = useState('3');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setShifts(await getAdminRiderShifts());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const replaceShift = (updated: RiderShift) =>
    setShifts(previous =>
      previous.map(item => (item._id === updated._id ? updated : item))
    );

  const visibleShifts = useMemo(() => {
    const list = shifts.filter(shift =>
      filter === 'upcoming'
        ? shift.timeStatus !== 'ended'
        : shift.timeStatus === 'ended'
    );

    return filter === 'upcoming'
      ? [...list].sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )
      : list;
  }, [shifts, filter]);

  const pendingTotal = useMemo(
    () =>
      shifts
        .filter(shift => shift.timeStatus === 'upcoming')
        .reduce(
          (sum, shift) =>
            sum +
            shift.reservations.filter(item => item.status === 'pending').length,
          0
        ),
    [shifts]
  );

  /*
   * -------------------------------------------------------
   * POST SHIFT
   * -------------------------------------------------------
   */
  const handlePost = useCallback(async () => {
    if (!DATE_PATTERN.test(date)) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DD.');
      return;
    }

    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      Alert.alert('Invalid time', 'Use 24-hour time, e.g. 08:00 or 17:30.');
      return;
    }

    const slots = Number(slotLimit);

    if (!Number.isInteger(slots) || slots < 1) {
      Alert.alert('Invalid slot limit', 'Enter a whole number of at least 1.');
      return;
    }

    const start = toPhIso(date, startTime);
    const end = toPhIso(date, endTime);

    // Overnight shift: end time is on the next day.
    if (end <= start) {
      end.setUTCDate(end.getUTCDate() + 1);
    }

    if (start.getTime() <= Date.now()) {
      Alert.alert(
        'Shift already started',
        'Choose a start time in the future so Riders can request it.'
      );
      return;
    }

    setPosting(true);

    try {
      const created = await createAdminRiderShift({
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        slotLimit: slots,
      });

      setShifts(previous => [created, ...previous]);
      setFormOpen(false);
      setFilter('upcoming');

      Alert.alert(
        'Shift Posted',
        `${formatShiftWindow(created.startAt, created.endAt)}\n${slots} Rider slot${
          slots === 1 ? '' : 's'
        } are now open for requests.`
      );
    } catch (postError) {
      Alert.alert('Unable to Post Shift', getErrorMessage(postError));
    } finally {
      setPosting(false);
    }
  }, [date, startTime, endTime, slotLimit]);

  /*
   * -------------------------------------------------------
   * REVIEW REQUEST
   * -------------------------------------------------------
   */
  const handleReview = useCallback(
    async (
      shift: RiderShift,
      reservation: RiderShiftReservation,
      decision: 'approved' | 'rejected'
    ) => {
      const key = `${reservation._id}:${decision}`;
      setBusyKey(key);

      try {
        await reviewAdminShiftRequest(shift._id, reservation._id, decision);
        /*
         * Reload so the list has populated Rider names
         * and the latest filled-slot count.
         */
        await load();
      } catch (reviewError) {
        Alert.alert(
          decision === 'approved' ? 'Unable to Approve' : 'Unable to Reject',
          getErrorMessage(reviewError)
        );
        await load();
      } finally {
        setBusyKey(null);
      }
    },
    [load]
  );

  /*
   * -------------------------------------------------------
   * SHIFT STATUS
   * -------------------------------------------------------
   */
  const changeStatus = useCallback(
    (shift: RiderShift, status: 'open' | 'closed' | 'cancelled') => {
      const run = async () => {
        setBusyKey(`${shift._id}:${status}`);
        try {
          replaceShift(await updateAdminRiderShift(shift._id, { status }));
          await load();
        } catch (statusError) {
          Alert.alert('Unable to Update Shift', getErrorMessage(statusError));
        } finally {
          setBusyKey(null);
        }
      };

      if (status === 'cancelled') {
        Alert.alert(
          'Cancel this shift?',
          'Riders will no longer be able to work this shift. Approved Riders lose their slot.',
          [
            { text: 'Keep Shift', style: 'cancel' },
            { text: 'Cancel Shift', style: 'destructive', onPress: () => void run() },
          ]
        );
        return;
      }

      void run();
    },
    [load]
  );

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.purple}
      />

      <AdminScreenHeader
        title="Rider Work Shifts"
        subtitle={
          pendingTotal > 0
            ? `${pendingTotal} request${pendingTotal === 1 ? '' : 's'} awaiting review`
            : 'Post shifts and review Rider requests'
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purpleAccent}
            colors={[C.purpleAccent]}
          />
        }
      >
        {/* POST SHIFT */}
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setFormOpen(open => !open)}
            style={styles.formToggle}
          >
            <View style={styles.formIcon}>
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.formToggleText}>Post a Work Shift</Text>
            <Ionicons
              name={formOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={C.secondaryText}
            />
          </Pressable>

          {formOpen ? (
            <View style={styles.form}>
              <Text style={styles.label}>Date</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {quickDates().map(item => (
                  <Pressable
                    key={item.key}
                    onPress={() => setDate(item.key)}
                    style={[styles.chip, date === item.key && styles.chipActive]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        date === item.key && styles.chipTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                autoCapitalize="none"
                style={styles.input}
              />

              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Start (24h)</Text>
                  <TextInput
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="08:00"
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>End (24h)</Text>
                  <TextInput
                    value={endTime}
                    onChangeText={setEndTime}
                    placeholder="17:00"
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.label}>Rider slot limit</Text>
              <TextInput
                value={slotLimit}
                onChangeText={setSlotLimit}
                keyboardType="number-pad"
                style={styles.input}
              />

              <Text style={styles.hint}>
                Philippine time. An end time earlier than the start time is
                treated as an overnight shift.
              </Text>

              <Pressable
                accessibilityRole="button"
                disabled={posting}
                onPress={() => void handlePost()}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && { opacity: 0.85 },
                  posting && { opacity: 0.6 },
                ]}
              >
                {posting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Post Shift</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* FILTER */}
        <View style={styles.tabs}>
          {(['upcoming', 'past'] as Filter[]).map(key => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.tab, filter === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === key && styles.tabTextActive]}>
                {key === 'upcoming' ? 'Upcoming & Active' : 'Past'}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            style={{ marginTop: 30 }}
            size="large"
            color={C.purpleAccent}
          />
        ) : visibleShifts.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>
              {filter === 'upcoming'
                ? 'No upcoming shifts. Post a shift so Riders can request slots.'
                : 'No past shifts yet.'}
            </Text>
          </View>
        ) : (
          visibleShifts.map(shift => {
            const statusStyle = SHIFT_STATUS_STYLE[shift.status];
            const pending = shift.reservations.filter(r => r.status === 'pending');
            const expanded = expandedId === shift._id;
            const reviewable =
              shift.timeStatus === 'upcoming' && shift.status !== 'cancelled';
            const full = shift.approvedCount >= shift.slotLimit;

            return (
              <View
                key={shift._id}
                style={styles.card}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setExpandedId(expanded ? null : shift._id)}
                >
                  <View style={styles.shiftTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.shiftTitle}>
                        {formatShiftWindow(shift.startAt, shift.endAt)}
                      </Text>
                      <Text style={styles.shiftMeta}>
                        {shift.timeStatus === 'active'
                          ? 'In progress'
                          : shift.timeStatus === 'ended'
                            ? 'Ended'
                            : 'Upcoming'}
                        {pending.length > 0 ? ` · ${pending.length} pending` : ''}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.fg }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                  </View>

                  {/* FILLED SLOTS */}
                  <View style={styles.slotRow}>
                    <View style={styles.slotTrack}>
                      <View
                        style={[
                          styles.slotFill,
                          {
                            width: `${Math.min(
                              100,
                              (shift.approvedCount / Math.max(1, shift.slotLimit)) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.slotText}>
                      {shift.approvedCount}/{shift.slotLimit} filled
                    </Text>
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.expanded}>
                    <Text style={styles.subheading}>Rider Requests</Text>

                    {shift.reservations.length === 0 ? (
                      <Text style={styles.emptyText}>No Rider has requested this shift yet.</Text>
                    ) : (
                      shift.reservations.map(reservation => (
                        <View
                          key={reservation._id}
                          style={styles.requestRow}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.requestName}>
                              {personName(reservation.riderUser)}
                            </Text>
                            <Text style={styles.shiftMeta}>
                              Requested {formatPhDateTime(reservation.requestedAt)}
                            </Text>
                          </View>

                          {reservation.status === 'pending' && reviewable ? (
                            <View style={styles.requestActions}>
                              <SmallButton
                                label="Reject"
                                tone="red"
                                loading={busyKey === `${reservation._id}:rejected`}
                                disabled={Boolean(busyKey)}
                                onPress={() =>
                                  void handleReview(shift, reservation, 'rejected')
                                }
                              />
                              <SmallButton
                                label={full ? 'Full' : 'Approve'}
                                tone="green"
                                loading={busyKey === `${reservation._id}:approved`}
                                disabled={Boolean(busyKey) || full}
                                onPress={() =>
                                  void handleReview(shift, reservation, 'approved')
                                }
                              />
                            </View>
                          ) : (
                            <ReservationBadge status={reservation.status} />
                          )}
                        </View>
                      ))
                    )}

                    {shift.timeStatus === 'upcoming' && shift.status !== 'cancelled' ? (
                      <View style={styles.shiftActions}>
                        {shift.status === 'open' ? (
                          <SmallButton
                            label="Close Requests"
                            tone="neutral"
                            loading={busyKey === `${shift._id}:closed`}
                            disabled={Boolean(busyKey)}
                            onPress={() => changeStatus(shift, 'closed')}
                          />
                        ) : (
                          <SmallButton
                            label="Reopen Requests"
                            tone="neutral"
                            loading={busyKey === `${shift._id}:open`}
                            disabled={Boolean(busyKey)}
                            onPress={() => changeStatus(shift, 'open')}
                          />
                        )}
                        <SmallButton
                          label="Cancel Shift"
                          tone="red"
                          loading={busyKey === `${shift._id}:cancelled`}
                          disabled={Boolean(busyKey)}
                          onPress={() => changeStatus(shift, 'cancelled')}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function ReservationBadge({ status }: { status: RiderShiftReservation['status'] }) {
  const style =
    status === 'approved'
      ? { bg: C.greenLight, fg: C.green, label: 'Approved' }
      : status === 'rejected'
        ? { bg: C.redLight, fg: C.red, label: 'Rejected' }
        : { bg: C.yellowLight, fg: C.yellow, label: 'Pending' };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

function SmallButton({
  label,
  tone,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  tone: 'green' | 'red' | 'neutral';
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const palette =
    tone === 'green'
      ? { bg: C.green, fg: '#FFFFFF', border: C.green }
      : tone === 'red'
        ? { bg: '#FFFFFF', fg: C.red, border: '#F2C3CC' }
        : { bg: '#FFFFFF', fg: C.purpleAccent, border: C.border };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { opacity: 0.85 },
        disabled && !loading && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={palette.fg}
        />
      ) : (
        <Text style={[styles.smallButtonText, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  card: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: C.card,
  },
  formToggle: { flexDirection: 'row', alignItems: 'center' },
  formIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleAccent,
  },
  formToggleText: {
    flex: 1,
    marginLeft: 12,
    color: C.text,
    fontSize: 16,
    fontWeight: '800',
  },
  form: { marginTop: 14 },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: C.secondaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  chips: { gap: 8, paddingBottom: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.background,
  },
  chipActive: { backgroundColor: C.purpleLight },
  chipText: { color: C.secondaryText, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: C.purpleAccent, fontWeight: '800' },
  input: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 15,
    backgroundColor: '#FAFAFC',
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  hint: { marginTop: 10, color: C.secondaryText, fontSize: 12, lineHeight: 17 },
  primaryButton: {
    height: 48,
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleAccent,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#E9E9F0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: C.secondaryText, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: C.purpleAccent, fontWeight: '800' },
  errorCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.redLight,
  },
  errorText: { color: C.red, fontSize: 14 },
  emptyText: { color: C.secondaryText, fontSize: 14, lineHeight: 20 },
  shiftTop: { flexDirection: 'row', alignItems: 'center' },
  shiftTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  shiftMeta: { marginTop: 3, color: C.secondaryText, fontSize: 13 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  slotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  slotTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: C.purpleLight,
  },
  slotFill: { height: 8, borderRadius: 4, backgroundColor: C.purpleAccent },
  slotText: {
    marginLeft: 10,
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  expanded: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  subheading: {
    marginBottom: 8,
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F8',
  },
  requestName: { color: C.text, fontSize: 14, fontWeight: '700' },
  requestActions: { flexDirection: 'row', gap: 8 },
  shiftActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  smallButton: {
    minWidth: 78,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: { fontSize: 13, fontWeight: '800' },
});
