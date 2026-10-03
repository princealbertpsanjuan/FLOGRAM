import { useCallback, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import * as ImagePicker from 'expo-image-picker';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  cancelAdminRiderPayout,
  createAdminRiderPayout,
  getAdminRiderPayout,
  getAdminRiderPayouts,
  getRiderPayoutBalances,
  markAdminRiderPayoutPaid,
  type RiderPayout,
  type RiderPayoutBalance,
} from '../../services/admin';

import AdminScreenHeader, {
  ADMIN_COLORS as C,
} from '../../components/admin/admin-screen-header';

import { getUploadUrl } from '../../utils/media';

import {
  PAYOUT_STATUS_LABELS,
  formatPayoutPeriod,
  formatPeso,
  formatPhDate,
  formatPhDateTime,
} from '../../utils/rider-format';

/*
 * =========================================================
 * ADMIN – RIDER PAYOUTS
 * =========================================================
 *
 * Rider pay comes only from completed delivery fees
 * (Order.deliveryFee). FLOGRAM has no bank-transfer
 * gateway: Admin sends the money externally, then
 * records the reference number and uploads the proof.
 *
 * COD remittance is a separate flow (Remittances screen)
 * and is never mixed into Rider payouts.
 *
 * Flow:
 * Amount Owed → Create Payout (period) → Pending →
 * Record Bank Transfer (reference + proof) → Paid
 * =========================================================
 */

type Tab = 'owed' | 'pending' | 'paid';

/*
 * Ask iOS for JPEG instead of HEIC so the upload is
 * accepted everywhere.
 */
const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.7,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Something went wrong. Please try again.';

const riderName = (
  value: RiderPayout['riderUser'] | RiderPayoutBalance['riderUser']
) => {
  if (value && typeof value === 'object') {
    return (
      [value.firstName, value.lastName].filter(Boolean).join(' ') ||
      value.email ||
      'Rider'
    );
  }
  return 'Rider';
};

/*
 * End of today in Philippine time, so the payout period
 * covers every delivery completed today.
 */
const endOfTodayPh = () => {
  const ph = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const key = ph.toISOString().slice(0, 10);
  return new Date(`${key}T23:59:59.999+08:00`);
};

const startOfDayPh = (value: string) => {
  const ph = new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000);
  const key = ph.toISOString().slice(0, 10);
  return new Date(`${key}T00:00:00+08:00`);
};

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: C.yellowLight, fg: C.yellow },
  paid: { bg: C.greenLight, fg: C.green },
  cancelled: { bg: '#F1F1F4', fg: C.secondaryText },
};

export default function AdminRiderPayoutsScreen() {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('owed');
  const [balances, setBalances] = useState<RiderPayoutBalance[]>([]);
  const [payouts, setPayouts] = useState<RiderPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  // Detail / mark-paid modal
  const [selected, setSelected] = useState<RiderPayout | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [proof, setProof] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [owed, all] = await Promise.all([
        getRiderPayoutBalances(),
        getAdminRiderPayouts(),
      ]);
      setBalances(owed);
      setPayouts(all);
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

  const owedRiders = balances.filter(item => item.amountOwed > 0);
  const totalOwed = owedRiders.reduce((sum, item) => sum + item.amountOwed, 0);
  const pendingPayouts = payouts.filter(item => item.status === 'pending');
  const totalPending = pendingPayouts.reduce((sum, item) => sum + item.totalAmount, 0);
  const historyPayouts = payouts.filter(item => item.status !== 'pending');

  /*
   * -------------------------------------------------------
   * DETAILS / MARK PAID / CANCEL
   * -------------------------------------------------------
   */
  const openPayout = useCallback(async (payout: RiderPayout) => {
    setSelected(payout);
    setPaymentMethod(payout.paymentMethod || 'Bank Transfer');
    setReferenceNumber('');
    setAdminRemarks('');
    setProof(null);

    try {
      setSelected(await getAdminRiderPayout(payout.id));
    } catch {
      // keep list version
    }
  }, []);

  /*
   * -------------------------------------------------------
   * CREATE PAYOUT
   * -------------------------------------------------------
   */
  const handleCreatePayout = useCallback(
    (balance: RiderPayoutBalance) => {
      if (!balance.oldestUnpaidAt) {
        return;
      }

      const periodStart = startOfDayPh(balance.oldestUnpaidAt);
      const periodEnd = endOfTodayPh();

      Alert.alert(
        'Create payout?',
        `${riderName(balance.riderUser)}\nPeriod: ${formatPayoutPeriod(
          periodStart.toISOString(),
          periodEnd.toISOString()
        )}\n${balance.unpaidDeliveryCount} deliveries · ${formatPeso(
          balance.amountOwed,
          true
        )}\n\nAfter creating it, send the money by bank transfer and record the reference and proof.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Payout',
            onPress: async () => {
              setCreatingFor(balance.riderId);
              try {
                const payout = await createAdminRiderPayout(balance.riderId, {
                  periodStart: periodStart.toISOString(),
                  periodEnd: periodEnd.toISOString(),
                });
                await load();
                setTab('pending');
                void openPayout(payout);
              } catch (createError) {
                Alert.alert('Unable to Create Payout', getErrorMessage(createError));
              } finally {
                setCreatingFor(null);
              }
            },
          },
        ]
      );
    },
    [load, openPayout]
  );

  const pickProof = useCallback(async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Allow camera access to photograph the transfer receipt.'
          : 'Allow photo access to choose the transfer screenshot.'
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);

    if (!result.canceled && result.assets?.[0]) {
      setProof(result.assets[0]);
    }
  }, []);

  const handleMarkPaid = useCallback(async () => {
    if (!selected) {
      return;
    }

    if (!referenceNumber.trim()) {
      Alert.alert('Reference required', 'Enter the bank transfer reference number.');
      return;
    }

    if (!proof?.uri) {
      Alert.alert('Proof required', 'Attach a photo or screenshot of the transfer.');
      return;
    }

    setSaving(true);

    try {
      const updated = await markAdminRiderPayoutPaid(selected.id, {
        referenceNumber,
        paymentMethod,
        adminRemarks,
        proofImageUri: proof.uri,
      });
      setSelected(updated);
      await load();
      Alert.alert('Payout Recorded', 'The Rider can now see this payment and its proof.');
    } catch (payError) {
      Alert.alert('Unable to Record Payment', getErrorMessage(payError));
    } finally {
      setSaving(false);
    }
  }, [selected, referenceNumber, paymentMethod, adminRemarks, proof, load]);

  const handleCancelPayout = useCallback(() => {
    if (!selected) {
      return;
    }

    Alert.alert(
      'Cancel this payout?',
      'Its delivery fees return to the Rider’s amount owed so you can create a corrected payout.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Payout',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              setSelected(
                await cancelAdminRiderPayout(selected.id, 'Cancelled by Admin')
              );
              await load();
            } catch (cancelError) {
              Alert.alert('Unable to Cancel', getErrorMessage(cancelError));
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [selected, load]);

  /*
   * -------------------------------------------------------
   * RENDER
   * -------------------------------------------------------
   */
  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.purple}
      />

      <AdminScreenHeader
        title="Rider Payouts"
        subtitle="Delivery-fee earnings · external bank transfer"
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purpleAccent}
            colors={[C.purpleAccent]}
          />
        }
      >
        {/* SUMMARY */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Owed (no payout yet)</Text>
            <Text style={styles.summaryValue}>{formatPeso(totalOwed)}</Text>
            <Text style={styles.summaryMeta}>
              {owedRiders.length} rider{owedRiders.length === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Pending payment</Text>
            <Text style={styles.summaryValue}>{formatPeso(totalPending)}</Text>
            <Text style={styles.summaryMeta}>
              {pendingPayouts.length} payout{pendingPayouts.length === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={C.purpleAccent}
          />
          <Text style={styles.noteText}>
            Only completed delivery fees are paid to Riders. COD cash is handled in
            Remittances and is not part of payouts.
          </Text>
        </View>

        {/* TABS */}
        <View style={styles.tabs}>
          {(
            [
              ['owed', 'Amount Owed'],
              ['pending', `Pending (${pendingPayouts.length})`],
              ['paid', 'History'],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {label}
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
        ) : tab === 'owed' ? (
          owedRiders.length === 0 ? (
            <Empty text="No Rider is owed delivery fees right now." />
          ) : (
            owedRiders.map(balance => (
              <View
                key={balance.riderId}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{riderName(balance.riderUser)}</Text>
                    <Text style={styles.cardMeta}>
                      {balance.unpaidDeliveryCount} completed deliver
                      {balance.unpaidDeliveryCount === 1 ? 'y' : 'ies'} since{' '}
                      {formatPhDate(balance.oldestUnpaidAt)}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{formatPeso(balance.amountOwed, true)}</Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(creatingFor)}
                  onPress={() => handleCreatePayout(balance)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && { opacity: 0.85 },
                    Boolean(creatingFor) && { opacity: 0.6 },
                  ]}
                >
                  {creatingFor === balance.riderId ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Payout</Text>
                  )}
                </Pressable>
              </View>
            ))
          )
        ) : (tab === 'pending' ? pendingPayouts : historyPayouts).length === 0 ? (
          <Empty
            text={
              tab === 'pending'
                ? 'No payouts are waiting for payment.'
                : 'Paid and cancelled payouts will appear here.'
            }
          />
        ) : (
          (tab === 'pending' ? pendingPayouts : historyPayouts).map(payout => {
            const statusStyle = STATUS_STYLE[payout.status] ?? STATUS_STYLE.pending;
            return (
              <Pressable
                key={payout.id}
                accessibilityRole="button"
                onPress={() => void openPayout(payout)}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{riderName(payout.riderUser)}</Text>
                    <Text style={styles.cardMeta}>
                      {formatPayoutPeriod(payout.periodStart, payout.periodEnd)} ·{' '}
                      {payout.deliveryCount} deliveries
                    </Text>
                    {payout.referenceNumber ? (
                      <Text style={styles.cardMeta}>Ref: {payout.referenceNumber}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>{formatPeso(payout.totalAmount, true)}</Text>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.fg }]}>
                        {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* PAYOUT DETAIL MODAL */}
      <Modal
        visible={Boolean(selected)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.backdrop}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Payout Details</Text>
              <Pressable
                hitSlop={10}
                onPress={() => setSelected(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={C.text}
                />
              </Pressable>
            </View>

            {selected ? (
              <ScrollView
                contentContainerStyle={styles.sheetContent}
                keyboardShouldPersistTaps="handled"
              >
                <Detail
                  label="Rider"
                  value={riderName(selected.riderUser)}
                />
                <Detail
                  label="Payout Period"
                  value={formatPayoutPeriod(selected.periodStart, selected.periodEnd)}
                />
                <Detail
                  label="Deliveries"
                  value={String(selected.deliveryCount)}
                />
                <Detail
                  label="Amount"
                  value={formatPeso(selected.totalAmount, true)}
                />
                <Detail
                  label="Status"
                  value={PAYOUT_STATUS_LABELS[selected.status] ?? selected.status}
                />

                {selected.status === 'paid' ? (
                  <>
                    <Detail
                      label="Payment Method"
                      value={selected.paymentMethod || '—'}
                    />
                    <Detail
                      label="Reference Number"
                      value={selected.referenceNumber || '—'}
                    />
                    <Detail
                      label="Paid On"
                      value={formatPhDateTime(selected.paidAt)}
                    />
                    {selected.adminRemarks ? (
                      <Detail
                        label="Remarks"
                        value={selected.adminRemarks}
                      />
                    ) : null}
                    <Text style={styles.sheetSection}>Payment Proof</Text>
                    {getUploadUrl(selected.proofImageUrl) ? (
                      <Image
                        source={{ uri: getUploadUrl(selected.proofImageUrl) as string }}
                        style={styles.proofImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.cardMeta}>No proof image.</Text>
                    )}
                  </>
                ) : null}

                {selected.status === 'cancelled' ? (
                  <Detail
                    label="Cancellation"
                    value={selected.cancellationReason || 'Cancelled'}
                  />
                ) : null}

                {selected.status === 'pending' ? (
                  <>
                    <Text style={styles.sheetSection}>Record Bank Transfer</Text>
                    <Text style={styles.cardMeta}>
                      Send {formatPeso(selected.totalAmount, true)} to the Rider outside
                      FLOGRAM, then record it here.
                    </Text>

                    <Text style={styles.label}>Payment method</Text>
                    <TextInput
                      value={paymentMethod}
                      onChangeText={setPaymentMethod}
                      placeholder="Bank Transfer / GCash / Maya"
                      style={styles.input}
                    />

                    <Text style={styles.label}>Reference number *</Text>
                    <TextInput
                      value={referenceNumber}
                      onChangeText={setReferenceNumber}
                      placeholder="Transfer reference number"
                      autoCapitalize="characters"
                      style={styles.input}
                    />

                    <Text style={styles.label}>Remarks (optional)</Text>
                    <TextInput
                      value={adminRemarks}
                      onChangeText={setAdminRemarks}
                      placeholder="Notes for the Rider"
                      multiline
                      style={[styles.input, styles.multiline]}
                    />

                    <Text style={styles.label}>Payment proof *</Text>
                    {proof ? (
                      <Image
                        source={{ uri: proof.uri }}
                        style={styles.proofImage}
                        resizeMode="contain"
                      />
                    ) : null}
                    <View style={styles.proofButtons}>
                      <Pressable
                        onPress={() => void pickProof('camera')}
                        style={styles.outlineButton}
                      >
                        <Ionicons
                          name="camera-outline"
                          size={18}
                          color={C.purpleAccent}
                        />
                        <Text style={styles.outlineButtonText}>Take Photo</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void pickProof('library')}
                        style={styles.outlineButton}
                      >
                        <Ionicons
                          name="images-outline"
                          size={18}
                          color={C.purpleAccent}
                        />
                        <Text style={styles.outlineButtonText}>Choose Image</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      disabled={saving}
                      onPress={() => void handleMarkPaid()}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && { opacity: 0.85 },
                        saving && { opacity: 0.6 },
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Mark as Paid</Text>
                      )}
                    </Pressable>

                    <Pressable
                      disabled={saving}
                      onPress={handleCancelPayout}
                      style={styles.cancelLink}
                    >
                      <Text style={styles.cancelLinkText}>Cancel this payout</Text>
                    </Pressable>
                  </>
                ) : null}

                <Text style={styles.sheetSection}>Delivery Fees</Text>
                {selected.items.map((item, index) => (
                  <View
                    key={`${item.deliveryId ?? index}`}
                    style={styles.itemRow}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        {typeof item.order === 'object' && item.order?.productName
                          ? item.order.productName
                          : 'Delivery'}
                      </Text>
                      <Text style={styles.cardMeta}>{formatPhDateTime(item.deliveredAt)}</Text>
                    </View>
                    <Text style={styles.itemName}>{formatPeso(item.deliveryFee, true)}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardMeta}>{text}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },
  content: { paddingHorizontal: 16, paddingTop: 16 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    backgroundColor: C.card,
  },
  summaryLabel: { color: C.secondaryText, fontSize: 13, fontWeight: '600' },
  summaryValue: { marginTop: 6, color: C.text, fontSize: 22, fontWeight: '800' },
  summaryMeta: { marginTop: 2, color: C.secondaryText, fontSize: 12 },
  note: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: C.purpleLight,
  },
  noteText: { flex: 1, color: C.text, fontSize: 13, lineHeight: 19 },
  tabs: {
    flexDirection: 'row',
    marginVertical: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#E9E9F0',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  tabActive: { backgroundColor: '#FFFFFF' },
  tabText: { color: C.secondaryText, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: C.purpleAccent, fontWeight: '800' },
  errorCard: { marginBottom: 12, padding: 12, borderRadius: 12, backgroundColor: C.redLight },
  errorText: { color: C.red, fontSize: 14 },
  card: { marginBottom: 10, padding: 16, borderRadius: 18, backgroundColor: C.card },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  cardMeta: { marginTop: 3, color: C.secondaryText, fontSize: 13, lineHeight: 18 },
  amount: { color: C.text, fontSize: 16, fontWeight: '800' },
  badge: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  primaryButton: {
    height: 46,
    marginTop: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleAccent,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sheetTitle: { color: C.text, fontSize: 18, fontWeight: '800' },
  sheetContent: { padding: 18, paddingBottom: 30 },
  sheetSection: {
    marginTop: 18,
    marginBottom: 6,
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F8',
  },
  detailLabel: { color: C.secondaryText, fontSize: 14 },
  detailValue: {
    flex: 1,
    marginLeft: 16,
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  label: {
    marginTop: 12,
    marginBottom: 6,
    color: C.secondaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text,
    fontSize: 15,
    backgroundColor: '#FAFAFC',
  },
  multiline: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  proofImage: {
    width: '100%',
    height: 220,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F4F4F8',
  },
  proofButtons: { flexDirection: 'row', gap: 10 },
  outlineButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: { color: C.purpleAccent, fontSize: 14, fontWeight: '700' },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelLinkText: { color: C.red, fontSize: 14, fontWeight: '700' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F8',
  },
  itemName: { color: C.text, fontSize: 14, fontWeight: '600' },
});
