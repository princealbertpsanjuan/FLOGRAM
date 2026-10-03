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

import { Ionicons } from '@expo/vector-icons';

import * as ImagePicker from 'expo-image-picker';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  PAYMENT_METHOD_LABELS,
  cancelSellerPayout,
  createSellerPayout,
  getSellerBalances,
  getSellerPayouts,
  markSellerPayoutPaid,
  type SellerBalance,
  type SellerPayout,
} from '../../services/seller-payouts';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * ADMIN – SELLER PAYOUTS
 * =========================================================
 *
 * Seller earnings = product sales − platform commission.
 * Same flow as Rider Payouts: create a payout for a shop's
 * unpaid orders, send the bank transfer outside FLOGRAM,
 * then record the reference number and proof.
 * =========================================================
 */

const ACCENT = '#5552B9';
const TEXT = '#3B3940';
const MUTED = '#77737B';
const BORDER = '#ECECF0';

type Tab = 'balances' | 'pending' | 'paid' | 'cancelled';

const STATUS_COLORS: Record<SellerPayout['status'], string> = {
  pending: '#B7801E',
  paid: '#3E9B62',
  cancelled: '#77737B',
};

const peso = (value?: number | null) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const shopOf = (payout: SellerPayout) =>
  typeof payout.florist === 'object' && payout.florist ? payout.florist.shopName || 'Shop' : 'Shop';

const sellerOf = (payout: SellerPayout) =>
  typeof payout.sellerUser === 'object' && payout.sellerUser
    ? [payout.sellerUser.firstName, payout.sellerUser.lastName].filter(Boolean).join(' ')
    : '';

export default function AdminSellerPayoutsScreen() {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('balances');
  const [balances, setBalances] = useState<SellerBalance[]>([]);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [remarks, setRemarks] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');

      if (tab === 'balances') {
        setBalances(await getSellerBalances());
      } else {
        setPayouts(await getSellerPayouts(tab));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load seller payouts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const create = (balance: SellerBalance) => {
    Alert.alert(
      'Create payout',
      `Create a payout of ${peso(balance.amountOwed)} for ${balance.shopName} (${balance.unpaidOrderCount} orders)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              setBusyId(balance.floristId);
              await createSellerPayout(balance.floristId);
              setTab('pending');
            } catch (createError) {
              Alert.alert('Could not create payout', createError instanceof Error ? createError.message : 'Please try again.');
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  };

  const pickProof = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach the transfer screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });

    if (!result.canceled && result.assets?.[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const markPaid = async (payout: SellerPayout) => {
    if (!referenceNumber.trim()) {
      Alert.alert('Reference required', 'Enter the bank transfer reference number.');
      return;
    }

    if (!proofUri) {
      Alert.alert('Proof required', 'Attach a screenshot or photo of the transfer.');
      return;
    }

    try {
      setBusyId(payout._id);
      await markSellerPayoutPaid(payout._id, { referenceNumber, paymentMethod, adminRemarks: remarks, proofImageUri: proofUri });
      setPayingId(null);
      setReferenceNumber('');
      setRemarks('');
      setProofUri(null);
      await load();
    } catch (payError) {
      Alert.alert('Could not mark as paid', payError instanceof Error ? payError.message : 'Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = (payout: SellerPayout) => {
    Alert.alert('Cancel payout', `Cancel the pending payout for ${shopOf(payout)}? Its orders return to the unpaid balance.`, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel payout',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(payout._id);
            await cancelSellerPayout(payout._id, 'Cancelled by Admin');
            await load();
          } catch (cancelError) {
            Alert.alert('Could not cancel', cancelError instanceof Error ? cancelError.message : 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const owedTotal = balances.reduce((sum, balance) => sum + Math.max(0, balance.amountOwed), 0);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="admin"
        title="Seller Payouts"
        subtitle="Sales − commission · external bank transfer"
      />

      <View style={styles.tabs}>
        {(['balances', 'pending', 'paid', 'cancelled'] as Tab[]).map(item => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === item && { color: '#FFFFFF' }]}>
              {item === 'balances' ? 'Owed' : item[0].toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ScreenLoader role="admin" />
      ) : (
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
          {error ? (
            <ErrorState role="admin" message={error} onRetry={() => void load()} />
          ) : tab === 'balances' ? (
            <>
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>Total owed to sellers</Text>
                <Text style={styles.summaryValue}>{peso(owedTotal)}</Text>
              </View>

              {balances.filter(balance => balance.unpaidOrderCount > 0 || balance.awaitingCodOrders > 0).length === 0 ? (
                <EmptyState role="admin" icon="wallet-outline" title="Nothing owed" message="All seller earnings are paid out." />
              ) : (
                balances
                  .filter(balance => balance.unpaidOrderCount > 0 || balance.awaitingCodOrders > 0)
                  .map(balance => (
                    <View key={balance.floristId} style={styles.card}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.title}>{balance.shopName}</Text>
                          <Text style={styles.meta}>
                            {balance.seller ? `${balance.seller.firstName} ${balance.seller.lastName}` : ''}
                            {balance.seller?.phoneNumber ? ` · ${balance.seller.phoneNumber}` : ''}
                          </Text>
                        </View>
                        <Text style={[styles.amount, balance.amountOwed <= 0 && { color: MUTED }]}>
                          {peso(balance.amountOwed)}
                        </Text>
                      </View>
                      <Text style={styles.meta}>
                        {balance.unpaidOrderCount} unpaid order(s) · sales {peso(balance.grossSales)} · commission {peso(balance.commission)}
                      </Text>
                      {balance.oldestUnpaidAt ? (
                        <Text style={styles.meta}>
                          {shortDate(balance.oldestUnpaidAt)} – {shortDate(balance.latestUnpaidAt)}
                        </Text>
                      ) : null}
                      {balance.awaitingCodOrders ? (
                        <Text style={styles.warn}>{balance.awaitingCodOrders} COD order(s) waiting for Rider remittance</Text>
                      ) : null}

                      {balance.amountOwed > 0 ? (
                        <Pressable
                          disabled={busyId === balance.floristId}
                          onPress={() => create(balance)}
                          style={[styles.button, busyId === balance.floristId && { opacity: 0.6 }]}
                        >
                          {busyId === balance.floristId ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <Text style={styles.buttonText}>Create payout</Text>
                          )}
                        </Pressable>
                      ) : null}
                    </View>
                  ))
              )}
            </>
          ) : payouts.length === 0 ? (
            <EmptyState role="admin" icon="document-text-outline" title={`No ${tab} payouts`} />
          ) : (
            payouts.map(payout => (
              <View key={payout._id} style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{shopOf(payout)}</Text>
                    <Text style={styles.meta}>{sellerOf(payout)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>{peso(payout.totalAmount)}</Text>
                    <Text style={[styles.status, { color: STATUS_COLORS[payout.status] }]}>{payout.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.meta}>
                  {shortDate(payout.periodStart)} – {shortDate(payout.periodEnd)} · {payout.items?.length ?? 0} order(s)
                </Text>
                <Text style={styles.meta}>
                  Sales {peso(payout.grossSales)} − commission {peso(payout.totalCommission)}
                </Text>

                {(payout.items || []).slice(0, 6).map(item => (
                  <Text key={item.order} style={styles.item} numberOfLines={1}>
                    • {item.productName} · {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod} ·{' '}
                    {item.netAmount < 0 ? `− ${peso(-item.netAmount)}` : peso(item.netAmount)}
                  </Text>
                ))}
                {(payout.items?.length || 0) > 6 ? (
                  <Text style={styles.meta}>+ {(payout.items?.length || 0) - 6} more</Text>
                ) : null}

                {payout.status === 'paid' ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.meta}>
                      Paid {shortDate(payout.paidAt)} · {payout.paymentMethod} · Ref {payout.referenceNumber}
                    </Text>
                    {payout.proofImageUrl ? (
                      <Image source={{ uri: getUploadUrl(payout.proofImageUrl) || undefined }} style={styles.proof} />
                    ) : null}
                  </View>
                ) : null}

                {payout.status === 'pending' ? (
                  payingId === payout._id ? (
                    <View style={styles.payForm}>
                      <TextInput
                        value={referenceNumber}
                        onChangeText={setReferenceNumber}
                        placeholder="Bank / e-wallet reference number"
                        placeholderTextColor={MUTED}
                        style={styles.input}
                      />
                      <TextInput
                        value={paymentMethod}
                        onChangeText={setPaymentMethod}
                        placeholder="Payment method"
                        placeholderTextColor={MUTED}
                        style={styles.input}
                      />
                      <TextInput
                        value={remarks}
                        onChangeText={setRemarks}
                        placeholder="Remarks (optional)"
                        placeholderTextColor={MUTED}
                        style={styles.input}
                      />
                      <Pressable onPress={() => void pickProof()} style={styles.proofPicker}>
                        {proofUri ? (
                          <Image source={{ uri: proofUri }} style={styles.proof} />
                        ) : (
                          <>
                            <Ionicons name="image-outline" size={22} color={ACCENT} />
                            <Text style={styles.link}>Attach transfer proof</Text>
                          </>
                        )}
                      </Pressable>
                      <View style={styles.row}>
                        <Pressable onPress={() => setPayingId(null)} style={[styles.button, styles.ghost, { flex: 1 }]}>
                          <Text style={[styles.buttonText, { color: ACCENT }]}>Close</Text>
                        </Pressable>
                        <Pressable
                          disabled={busyId === payout._id}
                          onPress={() => void markPaid(payout)}
                          style={[styles.button, { flex: 1 }, busyId === payout._id && { opacity: 0.6 }]}
                        >
                          {busyId === payout._id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Mark as paid</Text>}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.row}>
                      <Pressable onPress={() => cancel(payout)} style={[styles.button, styles.ghost, { flex: 1 }]}>
                        <Text style={[styles.buttonText, { color: '#D04A5F' }]}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setPayingId(payout._id);
                          setReferenceNumber('');
                          setProofUri(null);
                        }}
                        style={[styles.button, { flex: 1 }]}
                      >
                        <Text style={styles.buttonText}>Record payment</Text>
                      </Pressable>
                    </View>
                  )
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F8' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 },
  tab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, borderWidth: 1, borderColor: ACCENT },
  tabActive: { backgroundColor: ACCENT },
  tabText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  content: { padding: 16, gap: 10 },
  summary: { padding: 16, borderRadius: 18, backgroundColor: '#24245D' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' },
  summaryValue: { marginTop: 4, color: '#FFFFFF', fontSize: 26, fontWeight: '900' },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  title: { color: TEXT, fontSize: 15, fontWeight: '800' },
  meta: { marginTop: 3, color: MUTED, fontSize: 12 },
  warn: { marginTop: 4, color: '#B7801E', fontSize: 12, fontWeight: '600' },
  amount: { color: '#3E9B62', fontSize: 16, fontWeight: '900' },
  status: { marginTop: 2, fontSize: 10, fontWeight: '900' },
  item: { marginTop: 3, color: TEXT, fontSize: 12 },
  button: { height: 44, marginTop: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  ghost: { borderWidth: 1, borderColor: ACCENT, backgroundColor: '#FFFFFF' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  payForm: { marginTop: 10, gap: 8 },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    fontSize: 14,
    backgroundColor: '#FAFAFC',
  },
  proofPicker: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ACCENT,
  },
  proof: { width: '100%', height: 160, marginTop: 6, borderRadius: 12, backgroundColor: '#EEE' },
  link: { color: ACCENT, fontSize: 13, fontWeight: '800' },
});
