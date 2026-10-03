import { useCallback, useEffect, useState } from 'react';

import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenHeader from '../../components/ui/screen-header';
import { EmptyState, ErrorState, ScreenLoader } from '../../components/ui/state-views';
import {
  PAYMENT_METHOD_LABELS,
  getMyEarnings,
  getMySellerPayout,
  type SellerEarnings,
  type SellerPayout,
} from '../../services/seller-payouts';
import { getUploadUrl } from '../../utils/media';

/*
 * =========================================================
 * SELLER EARNINGS & PAYOUTS
 * =========================================================
 *
 * Earnings = product sales − platform commission.
 * Admin pays the unpaid balance per payout period.
 * =========================================================
 */

const GREEN = '#5E9874';
const TEXT = '#2F3A33';
const MUTED = '#6F7A73';
const BORDER = '#E3EAE5';

const STATUS_COLORS: Record<SellerPayout['status'], string> = {
  pending: '#D97706',
  paid: '#15803D',
  cancelled: '#6B7280',
};

const peso = (value?: number | null) =>
  `₱${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const shortDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function SellerEarningsScreen() {
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SellerEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [openPayout, setOpenPayout] = useState<SellerPayout | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setData(await getMyEarnings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load earnings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePayout = async (payout: SellerPayout) => {
    if (openPayout?._id === payout._id) {
      setOpenPayout(null);
      return;
    }

    try {
      setOpenPayout(await getMySellerPayout(payout._id));
    } catch {
      setOpenPayout(payout);
    }
  };

  if (loading) {
    return <ScreenLoader role="seller" message="Loading earnings..." />;
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader
        role="seller"
        title="Earnings & Payouts"
        subtitle={data ? `Platform commission ${(data.commissionRate * 100).toFixed(1)}%` : undefined}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={GREEN}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
      >
        {error || !data ? (
          <ErrorState role="seller" message={error || 'No data.'} onRetry={() => void load()} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Unpaid balance</Text>
              <Text style={styles.heroValue}>{peso(data.unpaidBalance)}</Text>
              <Text style={styles.heroNote}>
                {data.unpaidOrders} order(s) ready for the next payout
                {data.pendingPayoutAmount > 0 ? ` · ${peso(data.pendingPayoutAmount)} payout being prepared` : ''}
              </Text>
            </View>

            <View style={styles.grid}>
              <Stat label="Product sales" value={peso(data.lifetime.grossSales)} />
              <Stat label="Commission" value={`− ${peso(data.lifetime.commission)}`} />
              <Stat label="Net earnings" value={peso(data.lifetime.netEarnings)} />
              <Stat label="Paid out" value={peso(data.paidOutTotal)} />
            </View>

            {data.awaitingCodRemittance.orders > 0 ? (
              <View style={styles.notice}>
                <Text style={styles.noticeText}>
                  {data.awaitingCodRemittance.orders} Cash-on-Delivery order(s) ({peso(data.awaitingCodRemittance.netAmount)} net)
                  will be added once the Rider’s cash remittance is verified by Admin.
                </Text>
              </View>
            ) : null}

            <Text style={styles.section}>Payouts</Text>

            {data.payouts.length === 0 ? (
              <EmptyState
                role="seller"
                icon="wallet-outline"
                title="No payouts yet"
                message="Admin sends payouts for completed orders by bank transfer with proof."
              />
            ) : (
              data.payouts.map(payout => {
                const open = openPayout?._id === payout._id;

                return (
                  <Pressable
                    key={payout._id}
                    onPress={() => void togglePayout(payout)}
                    style={styles.card}
                  >
                    <View style={styles.rowBetween}>
                      <View>
                        <Text style={styles.cardTitle}>{peso(payout.totalAmount)}</Text>
                        <Text style={styles.meta}>
                          {shortDate(payout.periodStart)} – {shortDate(payout.periodEnd)} · {payout.itemCount ?? payout.items?.length ?? 0} order(s)
                        </Text>
                      </View>
                      <Text style={[styles.status, { color: STATUS_COLORS[payout.status] }]}>
                        {payout.status.toUpperCase()}
                      </Text>
                    </View>

                    {open && openPayout ? (
                      <View style={styles.details}>
                        <Line label="Product sales" value={peso(openPayout.grossSales)} />
                        <Line label="Commission" value={`− ${peso(openPayout.totalCommission)}`} />
                        <Line label="Payout" value={peso(openPayout.totalAmount)} strong />
                        {openPayout.status === 'paid' ? (
                          <>
                            <Line label="Paid on" value={shortDate(openPayout.paidAt)} />
                            <Line label="Method" value={openPayout.paymentMethod || 'Bank Transfer'} />
                            <Line label="Reference" value={openPayout.referenceNumber || '—'} />
                            {openPayout.proofImageUrl ? (
                              <Image
                                source={{ uri: getUploadUrl(openPayout.proofImageUrl) || undefined }}
                                style={styles.proof}
                                resizeMode="cover"
                              />
                            ) : null}
                          </>
                        ) : null}
                        {openPayout.status === 'cancelled' && openPayout.cancellationReason ? (
                          <Line label="Reason" value={openPayout.cancellationReason} />
                        ) : null}

                        {(openPayout.items || []).map(item => (
                          <View
                            key={item.order}
                            style={styles.item}
                          >
                            <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
                            <Text style={styles.meta}>
                              {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod} · sales {peso(item.grossAmount)} · fee {peso(item.commission)}
                            </Text>
                            <Text style={[styles.itemNet, item.netAmount < 0 && { color: '#B45309' }]}>
                              {item.netAmount < 0 ? `− ${peso(-item.netAmount)} (cash already with you)` : peso(item.netAmount)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })
            )}

            <Text style={styles.section}>Not yet paid out</Text>

            {data.recentItems.length === 0 ? (
              <Text style={styles.meta}>Nothing waiting. Completed orders appear here.</Text>
            ) : (
              data.recentItems.map(item => (
                <View
                  key={item.order}
                  style={[styles.card, styles.item]}
                >
                  <View style={styles.rowBetween}>
                    <Text style={[styles.itemName, { flex: 1 }]} numberOfLines={1}>{item.productName}</Text>
                    <Text style={[styles.itemNet, item.netAmount < 0 && { color: '#B45309' }]}>
                      {item.netAmount < 0 ? `− ${peso(-item.netAmount)}` : peso(item.netAmount)}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {shortDate(item.completedAt)} · {PAYMENT_METHOD_LABELS[item.paymentMethod] || item.paymentMethod}
                    {item.awaitingCodRemittance ? ' · waiting for COD remittance' : ''}
                    {item.collectedBySeller ? ' · commission only' : ''}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.footnote}>
              Product sales = order total minus delivery fee (the delivery fee goes to the Rider). For Cash on Pickup you
              already received the cash, so only the commission is deducted from your next payout.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={[styles.lineValue, strong && { fontWeight: '800', color: GREEN }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16 },
  hero: { padding: 18, borderRadius: 20, backgroundColor: GREEN },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '700' },
  heroValue: { marginTop: 4, color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  heroNote: { marginTop: 4, color: 'rgba(255,255,255,0.9)', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  statLabel: { color: MUTED, fontSize: 12, fontWeight: '700' },
  statValue: { marginTop: 4, color: TEXT, fontSize: 17, fontWeight: '800' },
  notice: { marginTop: 12, padding: 12, borderRadius: 14, backgroundColor: '#FEF3C7' },
  noticeText: { color: '#92400E', fontSize: 12, lineHeight: 17 },
  section: { marginTop: 20, marginBottom: 8, color: TEXT, fontSize: 16, fontWeight: '800' },
  card: { marginBottom: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FFFFFF' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardTitle: { color: TEXT, fontSize: 17, fontWeight: '800' },
  meta: { marginTop: 2, color: MUTED, fontSize: 12 },
  status: { fontSize: 11, fontWeight: '900' },
  details: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: BORDER },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  lineValue: { color: TEXT, fontSize: 13, fontWeight: '600' },
  proof: { width: '100%', height: 180, marginTop: 8, borderRadius: 12, backgroundColor: '#EEE' },
  item: { paddingVertical: 8 },
  itemName: { color: TEXT, fontSize: 14, fontWeight: '700' },
  itemNet: { color: GREEN, fontSize: 14, fontWeight: '800' },
  footnote: { marginTop: 16, color: MUTED, fontSize: 11, lineHeight: 16 },
});
