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
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useFocusEffect } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getRiderAvailableShifts,
  getRiderShiftHistory,
  requestRiderShift,
  type RiderShift,
} from '../../services/delivery';

import RiderScreenHeader from '../../components/rider/rider-screen-header';

import {
  RIDER_GOLD,
  RIDER_GOLD_DARK,
  RIDER_GOLD_LIGHT,
} from '../../components/rider/rider-bottom-nav';

import {
  SHIFT_REQUEST_LABELS,
  formatPhDateTime,
  formatShiftWindow,
} from '../../utils/rider-format';

/*
 * =========================================================
 * RIDER WORK SHIFTS
 * =========================================================
 *
 * Admin posts shifts with a slot limit. The Rider
 * requests a slot and waits for Admin approval.
 *
 * Rules enforced by the backend:
 * - one request per Rider per shift
 * - approvals never exceed the slot limit
 * - going Online / accepting NEW deliveries only during
 *   an approved shift
 * - an active delivery can still be finished after the
 *   shift ends
 * =========================================================
 */

const BACKGROUND = '#F8F7FA';
const TEXT = '#171717';
const MUTED = '#6F6F6F';
const GREEN = '#2E9E5B';
const RED = '#D64545';

type Tab = 'upcoming' | 'history';

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';

const RESERVATION_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FFF4D6', fg: '#A87B00' },
  approved: { bg: '#E3F5EA', fg: GREEN },
  rejected: { bg: '#FDECEC', fg: RED },
};

export default function RiderShiftsScreen() {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('upcoming');
  const [upcoming, setUpcoming] = useState<RiderShift[]>([]);
  const [history, setHistory] = useState<RiderShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);

      const [available, mine] = await Promise.all([
        getRiderAvailableShifts(),
        getRiderShiftHistory(),
      ]);

      setUpcoming(available);
      setHistory(mine.filter(shift => shift.timeStatus === 'ended'));
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

  const handleRequest = useCallback(
    (shift: RiderShift) => {
      Alert.alert(
        'Request this shift?',
        `${formatShiftWindow(shift.startAt, shift.endAt)}\n\nAdmin will review your request. You can go Online only after it is approved.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Request',
            onPress: async () => {
              setRequestingId(shift._id);

              try {
                const updated = await requestRiderShift(shift._id);

                setUpcoming(previous =>
                  previous.map(item =>
                    item._id === updated._id ? updated : item
                  )
                );

                Alert.alert(
                  'Shift Requested',
                  'Your request was sent and is awaiting Admin approval.'
                );
              } catch (requestError) {
                Alert.alert(
                  'Unable to Request Shift',
                  getErrorMessage(requestError)
                );
                await load();
              } finally {
                setRequestingId(null);
              }
            },
          },
        ]
      );
    },
    [load]
  );

  const myUpcoming = useMemo(
    () => upcoming.filter(shift => shift.myReservation),
    [upcoming]
  );

  const openToRequest = useMemo(
    () => upcoming.filter(shift => !shift.myReservation),
    [upcoming]
  );

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={RIDER_GOLD}
      />

      <RiderScreenHeader
        title="Work Shifts"
        subtitle="Request Admin-posted shifts"
      />

      {/* TABS */}
      <View style={styles.tabs}>
        {(['upcoming', 'history'] as Tab[]).map(key => {
          const active = tab === key;

          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {key === 'upcoming' ? 'Upcoming' : 'Past Shifts'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color={RIDER_GOLD}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 32 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={RIDER_GOLD}
              colors={[RIDER_GOLD]}
            />
          }
        >
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={20}
                color={RED}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {tab === 'upcoming' ? (
            <>
              <Text style={styles.sectionTitle}>My Shift Requests</Text>

              {myUpcoming.length === 0 ? (
                <EmptyCard text="You have no upcoming shift requests." />
              ) : (
                myUpcoming.map(shift => (
                  <ShiftCard
                    key={shift._id}
                    shift={shift}
                  />
                ))
              )}

              <Text style={styles.sectionTitle}>Open Shifts</Text>

              {openToRequest.length === 0 ? (
                <EmptyCard text="No open shifts right now. Check back after Admin posts new shifts." />
              ) : (
                openToRequest.map(shift => (
                  <ShiftCard
                    key={shift._id}
                    shift={shift}
                    requesting={requestingId === shift._id}
                    disabled={Boolean(requestingId)}
                    onRequest={() => handleRequest(shift)}
                  />
                ))
              )}
            </>
          ) : history.length === 0 ? (
            <EmptyCard text="Your completed shifts will appear here." />
          ) : (
            history.map(shift => (
              <ShiftCard
                key={shift._id}
                shift={shift}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons
        name="calendar-outline"
        size={22}
        color={RIDER_GOLD_DARK}
      />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function ShiftCard({
  shift,
  onRequest,
  requesting,
  disabled,
}: {
  shift: RiderShift;
  onRequest?: () => void;
  requesting?: boolean;
  disabled?: boolean;
}) {
  const reservation = shift.myReservation;
  const colors = reservation
    ? RESERVATION_COLORS[reservation.status]
    : null;

  const isLive =
    shift.timeStatus === 'active' && reservation?.status === 'approved';

  return (
    <View style={[styles.card, isLive && styles.cardLive]}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Ionicons
            name="time-outline"
            size={20}
            color={RIDER_GOLD_DARK}
          />
        </View>

        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>
            {formatShiftWindow(shift.startAt, shift.endAt)}
          </Text>
          <Text style={styles.cardMeta}>
            {shift.approvedCount} of {shift.slotLimit} slots filled
            {isLive ? ' · On shift now' : ''}
          </Text>
        </View>

        {reservation && colors ? (
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.fg }]}>
              {SHIFT_REQUEST_LABELS[reservation.status]}
            </Text>
          </View>
        ) : null}
      </View>

      {reservation ? (
        <Text style={styles.cardFootnote}>
          Requested {formatPhDateTime(reservation.requestedAt)}
          {reservation.reviewedAt
            ? ` · Reviewed ${formatPhDateTime(reservation.reviewedAt)}`
            : ''}
        </Text>
      ) : onRequest ? (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onRequest}
          style={({ pressed }) => [
            styles.requestButton,
            pressed && { opacity: 0.85 },
            disabled && !requesting && { opacity: 0.6 },
          ]}
        >
          {requesting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.requestButtonText}>
              Request Shift · {shift.remainingSlots} slot
              {shift.remainingSlots === 1 ? '' : 's'} left
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#EFEDF2',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: RIDER_GOLD_DARK,
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 8,
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  errorText: {
    flex: 1,
    color: RED,
    fontSize: 14,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    flex: 1,
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F1F1',
  },
  cardLive: {
    borderColor: RIDER_GOLD,
    backgroundColor: '#FFFCF3',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  cardText: {
    flex: 1,
    marginHorizontal: 10,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    marginTop: 3,
    color: MUTED,
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardFootnote: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
  },
  requestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: RIDER_GOLD,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
