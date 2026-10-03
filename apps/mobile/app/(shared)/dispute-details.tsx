import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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
import { ErrorState, ROLE_ACCENT, ScreenLoader, type Role } from '../../components/ui/state-views';
import { getStoredUser } from '../../services/auth';
import {
  DISPUTE_ACTION_LABELS,
  DISPUTE_PARTY_LABELS,
  DISPUTE_REASON_LABELS,
  DISPUTE_STATUS_COLORS,
  DISPUTE_STATUS_LABELS,
  getDispute,
  personName,
  sendDisputeMessage,
  updateDispute,
  type Dispute,
  type DisputeAction,
} from '../../services/disputes';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * DISPUTE DETAILS
 * =========================================================
 *
 * Party view: status, Admin decision, message thread.
 * Admin view: same, plus review / resolve / reject and a
 * shortcut to issue a penalty.
 * =========================================================
 */

const TEXT = '#2D2A2E';
const MUTED = '#6F6A70';
const BORDER = '#E7E3E8';

const ACTIONS: DisputeAction[] = ['refund', 'partial_refund', 'replacement', 'penalty_issued', 'none', 'other'];

const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

export default function DisputeDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ disputeId?: string }>();
  const disputeId = Array.isArray(params.disputeId) ? params.disputeId[0] : params.disputeId;

  const [role, setRole] = useState<Role>('customer');
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<DisputeAction>('none');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!disputeId) return;

    try {
      setError('');
      const [user, data] = await Promise.all([getStoredUser(), getDispute(disputeId)]);
      if (user?.role) setRole(user.role as Role);
      setDispute(data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [disputeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const accent = ROLE_ACCENT[role];
  const isAdmin = role === 'admin';
  const closed = dispute ? ['resolved', 'rejected'].includes(dispute.status) : false;

  const send = async () => {
    if (!dispute || !message.trim()) return;

    try {
      setSending(true);
      setDispute(await sendDisputeMessage(dispute._id, message.trim()));
      setMessage('');
    } catch (sendError) {
      Alert.alert('Could not send', sendError instanceof Error ? sendError.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const decide = async (status: 'under_review' | 'resolved' | 'rejected') => {
    if (!dispute) return;

    if (status !== 'under_review' && resolution.trim().length < 5) {
      Alert.alert('Decision needed', 'Write the decision so both sides understand the outcome.');
      return;
    }

    try {
      setSaving(true);
      setDispute(
        await updateDispute(dispute._id, {
          status,
          resolution: resolution.trim(),
          resolutionAction: status === 'resolved' ? action : 'none',
        })
      );
    } catch (saveError) {
      Alert.alert('Could not update', saveError instanceof Error ? saveError.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ScreenLoader role={role} message="Loading report..." />;
  }

  if (!dispute) {
    return (
      <View style={styles.screen}>
        <ScreenHeader role={role} title="Report" />
        <ErrorState role={role} message={error || 'Report not found.'} onRetry={() => void load()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role={role}
        title={DISPUTE_REASON_LABELS[dispute.reason]}
        subtitle={dispute.order?.productName || 'Order report'}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={accent}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={[styles.badge, { backgroundColor: `${DISPUTE_STATUS_COLORS[dispute.status]}1A` }]}>
              <Text style={[styles.badgeText, { color: DISPUTE_STATUS_COLORS[dispute.status] }]}>
                {DISPUTE_STATUS_LABELS[dispute.status]}
              </Text>
            </View>
            <Text style={styles.muted}>{formatDate(dispute.createdAt)}</Text>
          </View>

          <Info label="Filed by" value={`${personName(dispute.filedBy)} (${dispute.filedByRole})`} />
          <Info
            label="About"
            value={`${DISPUTE_PARTY_LABELS[dispute.against]}${dispute.againstUser ? ` — ${personName(dispute.againstUser)}` : ''}`}
          />
          {dispute.florist?.shopName ? <Info label="Shop" value={dispute.florist.shopName} /> : null}
          {dispute.order ? (
            <Info
              label="Order"
              value={`${dispute.order.productName || 'Order'} · ₱${Number(dispute.order.totalAmount || 0).toFixed(2)} · ${dispute.order.orderStatus || ''}`}
            />
          ) : null}

          <Text style={styles.sectionLabel}>Details</Text>
          <Text style={styles.body}>{dispute.details}</Text>

          {dispute.images.length ? (
            <View style={styles.photos}>
              {dispute.images.map(path => (
                <Image
                  key={path}
                  source={{ uri: getUploadUrl(path) || undefined }}
                  style={styles.photo}
                />
              ))}
            </View>
          ) : null}
        </View>

        {closed ? (
          <View style={[styles.card, { borderColor: DISPUTE_STATUS_COLORS[dispute.status] }]}>
            <Text style={styles.cardTitle}>Admin decision</Text>
            {dispute.status === 'resolved' ? (
              <Info label="Action" value={DISPUTE_ACTION_LABELS[dispute.resolutionAction]} />
            ) : null}
            <Text style={styles.body}>{dispute.resolution}</Text>
            <Text style={[styles.muted, { marginTop: 8 }]}>
              {personName(dispute.resolvedBy)} · {formatDate(dispute.resolvedAt)}
            </Text>
          </View>
        ) : null}

        {isAdmin && !closed ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Decide</Text>

            {dispute.status === 'open' ? (
              <Pressable
                disabled={saving}
                onPress={() => void decide('under_review')}
                style={[styles.outlineButton, { borderColor: accent }]}
              >
                <Text style={[styles.outlineText, { color: accent }]}>Mark as under review</Text>
              </Pressable>
            ) : null}

            <Text style={styles.sectionLabel}>Action taken</Text>
            <View style={styles.chips}>
              {ACTIONS.map(item => {
                const active = action === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setAction(item)}
                    style={[styles.chip, { borderColor: accent }, active && { backgroundColor: accent }]}
                  >
                    <Text style={[styles.chipText, { color: active ? '#FFFFFF' : accent }]}>
                      {DISPUTE_ACTION_LABELS[item]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>Decision (sent to both sides)</Text>
            <TextInput
              value={resolution}
              onChangeText={setResolution}
              placeholder="e.g. Refund approved after checking the delivery photo."
              placeholderTextColor="#A9A3AA"
              multiline
              maxLength={2000}
              style={styles.input}
            />

            <View style={styles.buttonRow}>
              <Pressable
                disabled={saving}
                onPress={() => void decide('rejected')}
                style={[styles.button, { backgroundColor: '#6B7280' }]}
              >
                <Text style={styles.buttonText}>Reject</Text>
              </Pressable>
              <Pressable
                disabled={saving}
                onPress={() => void decide('resolved')}
                style={[styles.button, { backgroundColor: accent }]}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Resolve</Text>}
              </Pressable>
            </View>

            {dispute.againstUser?._id ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(admin)/admin-violations',
                    params: {
                      userId: dispute.againstUser?._id,
                      userName: personName(dispute.againstUser),
                      userRole: dispute.againstUser?.role || dispute.against,
                      disputeId: dispute._id,
                    },
                  } as never)
                }
                style={[styles.outlineButton, { borderColor: '#DC2626', marginTop: 12 }]}
              >
                <Text style={[styles.outlineText, { color: '#DC2626' }]}>
                  Issue penalty to {personName(dispute.againstUser)}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Messages</Text>

          {dispute.messages.length === 0 ? (
            <Text style={styles.muted}>No messages yet.</Text>
          ) : (
            dispute.messages.map(item => (
              <View
                key={item._id}
                style={[styles.message, item.authorRole === 'admin' && { backgroundColor: '#EEEEFB' }]}
              >
                <Text style={styles.messageAuthor}>
                  {item.authorRole === 'admin' ? 'FLOGRAM Admin' : personName(item.author)} · {formatDate(item.createdAt)}
                </Text>
                <Text style={styles.body}>{item.message}</Text>
              </View>
            ))
          )}

          {!closed ? (
            <View style={styles.composer}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={isAdmin ? 'Ask for more details...' : 'Add information for Admin...'}
                placeholderTextColor="#A9A3AA"
                multiline
                maxLength={2000}
                style={[styles.input, { flex: 1, minHeight: 44 }]}
              />
              <Pressable
                disabled={sending || !message.trim()}
                onPress={send}
                style={[styles.sendButton, { backgroundColor: accent }, (sending || !message.trim()) && { opacity: 0.5 }]}
              >
                {sending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Send</Text>}
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F6F8' },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  cardTitle: { marginBottom: 8, color: TEXT, fontSize: 16, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  muted: { color: MUTED, fontSize: 12 },
  info: { flexDirection: 'row', paddingVertical: 6, gap: 10 },
  infoLabel: { width: 72, color: MUTED, fontSize: 13 },
  infoValue: { flex: 1, color: TEXT, fontSize: 13, fontWeight: '600' },
  sectionLabel: { marginTop: 12, marginBottom: 6, color: TEXT, fontSize: 13, fontWeight: '800' },
  body: { color: TEXT, fontSize: 14, lineHeight: 20 },
  photos: { flexDirection: 'row', gap: 8, marginTop: 10 },
  photo: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#EEE' },
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
    backgroundColor: '#FBFAFB',
  },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { flex: 1, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  outlineButton: { height: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  outlineText: { fontSize: 14, fontWeight: '800' },
  message: { marginBottom: 8, padding: 10, borderRadius: 12, backgroundColor: '#F6F4F7' },
  messageAuthor: { marginBottom: 3, color: MUTED, fontSize: 11, fontWeight: '700' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  sendButton: { width: 64, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
