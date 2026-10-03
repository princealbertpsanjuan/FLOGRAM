import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  PENALTY_COLORS,
  PENALTY_LABELS,
  VIOLATIONS_BY_ROLE,
  VIOLATION_LABELS,
  getViolations,
  liftViolation,
  recordViolation,
  type Penalty,
  type Violation,
  type ViolationType,
} from '../../services/violations';

/*
 * =========================================================
 * ADMIN – POLICY VIOLATIONS & PENALTIES
 * =========================================================
 *
 * Opened from User Details or a Dispute with ?userId=...
 * to record a violation, or from Platform Tools to see all
 * penalties. Penalties: warning, temporary suspension
 * (blocks login until the end date) or permanent ban.
 * =========================================================
 */

const ACCENT = '#5552B9';
const TEXT = '#3B3940';
const MUTED = '#77737B';
const BORDER = '#ECECF0';

const PENALTIES: Penalty[] = ['warning', 'suspension', 'ban'];

const one = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

const fullName = (person?: Violation['user']) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.email || 'User';

export default function AdminViolationsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ userId?: string; userName?: string; userRole?: string; disputeId?: string }>();

  const userId = one(params.userId);
  const userName = one(params.userName);
  const rawRole = one(params.userRole);
  const userRole = rawRole === 'seller' || rawRole === 'rider' ? rawRole : 'customer';
  const disputeId = one(params.disputeId);

  const [violations, setViolations] = useState<Violation[]>([]);
  const [filter, setFilter] = useState<'active' | 'lifted' | 'all'>('active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [violationType, setViolationType] = useState<ViolationType | null>(null);
  const [penalty, setPenalty] = useState<Penalty>('warning');
  const [days, setDays] = useState('3');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setViolations(
        await getViolations({
          userId: userId || undefined,
          status: userId || filter === 'all' ? undefined : filter,
        })
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load violations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = () => {
    if (!userId) return;

    if (!violationType) {
      Alert.alert('Violation type', 'Choose what policy was violated.');
      return;
    }

    if (description.trim().length < 5) {
      Alert.alert('Description', 'Describe what happened (shown to the user).');
      return;
    }

    const suspensionDays = Number(days);

    if (penalty === 'suspension' && (!Number.isInteger(suspensionDays) || suspensionDays < 1 || suspensionDays > 365)) {
      Alert.alert('Suspension length', 'Enter 1 to 365 days.');
      return;
    }

    const summary =
      penalty === 'warning'
        ? 'send a warning to'
        : penalty === 'suspension'
          ? `suspend for ${suspensionDays} day(s)`
          : 'permanently ban';

    Alert.alert('Confirm penalty', `This will ${summary} ${userName || 'this user'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: penalty === 'warning' ? 'default' : 'destructive',
        onPress: async () => {
          try {
            setSaving(true);
            await recordViolation({
              userId,
              violationType,
              penalty,
              description: description.trim(),
              suspensionDays: penalty === 'suspension' ? suspensionDays : undefined,
              disputeId,
            });
            setDescription('');
            setViolationType(null);
            setPenalty('warning');
            await load();
            Alert.alert('Penalty applied', 'The user was notified.');
          } catch (saveError) {
            Alert.alert('Could not apply penalty', saveError instanceof Error ? saveError.message : 'Please try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const lift = async (violation: Violation) => {
    try {
      await liftViolation(violation._id, liftReason.trim());
      setLiftingId(null);
      setLiftReason('');
      await load();
    } catch (liftError) {
      Alert.alert('Could not lift penalty', liftError instanceof Error ? liftError.message : 'Please try again.');
    }
  };

  if (loading) {
    return <ScreenLoader role="admin" message="Loading violations..." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="admin"
        title={userId ? 'Record Violation' : 'Policy Violations'}
        subtitle={userId ? `${userName || 'User'} · ${userRole}` : 'Warnings, suspensions and bans'}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={ACCENT}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {userId ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New penalty</Text>

            <Text style={styles.label}>Violation</Text>
            <View style={styles.chips}>
              {VIOLATIONS_BY_ROLE[userRole].map(type => (
                <Chip
                  key={type}
                  label={VIOLATION_LABELS[type]}
                  active={violationType === type}
                  onPress={() => setViolationType(type)}
                />
              ))}
            </View>

            <Text style={styles.label}>Penalty</Text>
            <View style={styles.chips}>
              {PENALTIES.map(item => (
                <Chip
                  key={item}
                  label={PENALTY_LABELS[item]}
                  active={penalty === item}
                  color={PENALTY_COLORS[item]}
                  onPress={() => setPenalty(item)}
                />
              ))}
            </View>

            {penalty === 'suspension' ? (
              <>
                <Text style={styles.label}>Suspension length (days)</Text>
                <TextInput
                  value={days}
                  onChangeText={value => setDays(value.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[styles.input, { minHeight: 44, width: 100 }]}
                />
              </>
            ) : null}

            <Text style={styles.label}>Description (sent to the user)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What happened and what the user must do."
              placeholderTextColor={MUTED}
              multiline
              maxLength={1000}
              style={styles.input}
            />

            <Pressable
              disabled={saving}
              onPress={submit}
              style={[styles.button, { backgroundColor: PENALTY_COLORS[penalty] }, saving && { opacity: 0.6 }]}
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Apply {PENALTY_LABELS[penalty]}</Text>}
            </Pressable>

            <Text style={styles.hint}>
              Suspended and banned users cannot log in. A suspension ends automatically on its end date.
            </Text>
          </View>
        ) : (
          <View style={styles.chips}>
            {(['active', 'lifted', 'all'] as const).map(item => (
              <Chip
                key={item}
                label={item === 'active' ? 'Active' : item === 'lifted' ? 'Lifted' : 'All'}
                active={filter === item}
                onPress={() => setFilter(item)}
              />
            ))}
          </View>
        )}

        <Text style={styles.section}>{userId ? 'History for this user' : 'Records'}</Text>

        {error ? (
          <ErrorState role="admin" message={error} onRetry={() => void load()} />
        ) : violations.length === 0 ? (
          <EmptyState
            role="admin"
            icon="shield-checkmark-outline"
            title="No violations"
            message={userId ? 'This user has a clean record.' : 'To issue a penalty, open a user in Users or a dispute.'}
          />
        ) : (
          violations.map(violation => (
            <View
              key={violation._id}
              style={[styles.card, violation.status === 'lifted' && { opacity: 0.65 }]}
            >
              <View style={styles.rowBetween}>
                <Text style={[styles.penalty, { color: PENALTY_COLORS[violation.penalty] }]}>
                  {PENALTY_LABELS[violation.penalty]}
                  {violation.penalty === 'suspension' && violation.suspensionDays ? ` · ${violation.suspensionDays}d` : ''}
                </Text>
                <Text style={styles.meta}>{violation.status === 'lifted' ? 'LIFTED' : 'ACTIVE'}</Text>
              </View>

              {!userId ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(admin)/admin-violations',
                      params: {
                        userId: violation.user?._id,
                        userName: fullName(violation.user),
                        userRole: violation.userRole,
                      },
                    } as never)
                  }
                >
                  <Text style={styles.userLink}>
                    {fullName(violation.user)} ({violation.userRole})
                  </Text>
                </Pressable>
              ) : null}

              <Text style={styles.type}>{VIOLATION_LABELS[violation.violationType]}</Text>
              <Text style={styles.body}>{violation.description}</Text>
              <Text style={styles.meta}>
                Issued {formatDate(violation.createdAt)}
                {violation.suspendedUntil ? ` · until ${formatDate(violation.suspendedUntil)}` : ''}
              </Text>
              {violation.status === 'lifted' ? (
                <Text style={styles.meta}>
                  Lifted {formatDate(violation.liftedAt)}
                  {violation.liftReason ? ` · ${violation.liftReason}` : ''}
                </Text>
              ) : null}

              {violation.status === 'active' && violation.penalty !== 'warning' ? (
                liftingId === violation._id ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    <TextInput
                      value={liftReason}
                      onChangeText={setLiftReason}
                      placeholder="Reason for lifting (optional)"
                      placeholderTextColor={MUTED}
                      style={[styles.input, { minHeight: 44 }]}
                    />
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable onPress={() => setLiftingId(null)} style={[styles.smallButton, styles.ghost]}>
                        <Text style={[styles.smallText, { color: ACCENT }]}>Cancel</Text>
                      </Pressable>
                      <Pressable onPress={() => void lift(violation)} style={styles.smallButton}>
                        <Text style={styles.smallText}>Lift penalty</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => setLiftingId(violation._id)}>
                    <Text style={[styles.userLink, { marginTop: 8 }]}>Lift penalty</Text>
                  </Pressable>
                )
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function Chip({ label, active, onPress, color = ACCENT }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: color }, active && { backgroundColor: color }]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F8' },
  content: { padding: 16, gap: 10 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  cardTitle: { color: TEXT, fontSize: 16, fontWeight: '800' },
  label: { marginTop: 14, marginBottom: 8, color: TEXT, fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 90,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 14,
    textAlignVertical: 'top',
    backgroundColor: '#FAFAFC',
  },
  button: { height: 48, marginTop: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  hint: { marginTop: 10, color: MUTED, fontSize: 12, lineHeight: 17 },
  section: { marginTop: 8, color: TEXT, fontSize: 16, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  penalty: { fontSize: 14, fontWeight: '900' },
  userLink: { marginTop: 4, color: ACCENT, fontSize: 14, fontWeight: '800' },
  type: { marginTop: 6, color: TEXT, fontSize: 14, fontWeight: '700' },
  body: { marginTop: 4, color: TEXT, fontSize: 13, lineHeight: 19 },
  meta: { marginTop: 4, color: MUTED, fontSize: 12 },
  smallButton: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  ghost: { borderWidth: 1, borderColor: ACCENT, backgroundColor: '#FFFFFF' },
  smallText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
});
