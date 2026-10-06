import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  getRiderEarnings,
  getRiderPayout,
  type RiderEarningsData,
  type RiderPayout,
} from '../../services/delivery';

import { getUploadUrl } from '../../utils/media';

import {
  PAYOUT_STATUS_LABELS,
  formatPayoutPeriod,
  formatPeso,
  formatPhDate,
  formatPhDateTime,
} from '../../utils/rider-format';

import {
  RIDER_GOLD,
  RIDER_GOLD_DARK,
  RIDER_GOLD_LIGHT,
} from './rider-bottom-nav';

/*
 * =========================================================
 * RIDER EARNINGS PANEL (Wallet → Earnings tab)
 * =========================================================
 *
 * Rider income = Order.deliveryFee of delivered orders.
 *
 * COD cash collected from customers is NOT income and is
 * shown only in the COD Remittance tab.
 *
 * Admin pays Riders by external bank transfer; FLOGRAM
 * records the reference number and payment proof, which
 * the Rider can view here.
 * =========================================================
 */

const TEXT = '#171717';
const MUTED = '#6F6F6F';
const GREEN = '#2E9E5B';
const RED = '#D64545';

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#FFF4D6', fg: '#A87B00' },
  paid: { bg: '#E3F5EA', fg: GREEN },
  cancelled: { bg: '#F1F1F1', fg: '#7A7A7A' },
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error && error.message
    ? error.message
    : 'Unable to load earnings.';

type Props = {
  /*
   * Incremented by the Wallet screen on pull-to-refresh.
   */
  refreshKey: number;
};

export default function RiderEarningsPanel({ refreshKey }: Props) {
  const [data, setData] = useState<RiderEarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<RiderPayout | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setData(await getRiderEarnings());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openPayout = useCallback(async (payout: RiderPayout) => {
    setSelected(payout);
    setDetailLoading(true);

    try {
      /*
       * Detail endpoint includes populated order
       * names for each delivery fee item.
       */
      setSelected(await getRiderPayout(payout.id));
    } catch {
      // Keep the summary version already shown.
    } finally {
      setDetailLoading(false);
    }
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={RIDER_GOLD}
        />
      </View>
    );
  }

  const summary = data?.summary;
  const payouts = data?.payouts ?? [];

  return (
    <View>
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

      {/* CURRENT PAYOUT PERIOD */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Current payout period</Text>
        <Text style={styles.heroAmount}>{formatPeso(summary?.unpaid, true)}</Text>
        <Text style={styles.heroHint}>
          Delivery fees earned and not yet included in a payout.
        </Text>
      </View>

      <View style={styles.grid}>
        <StatCard
          icon="today-outline"
          label="Earned Today"
          value={formatPeso(summary?.today)}
        />
        <StatCard
          icon="hourglass-outline"
          label="Awaiting Payment"
          value={formatPeso(
            Number(summary?.unpaid || 0) + Number(summary?.pendingPayout || 0)
          )}
        />
        <StatCard
          icon="checkmark-circle-outline"
          label="Total Paid"
          value={formatPeso(summary?.paid)}
        />
        <StatCard
          icon="trending-up-outline"
          label="Total Earned"
          value={formatPeso(summary?.totalEarned)}
        />
      </View>

      <View style={styles.noteCard}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={RIDER_GOLD_DARK}
        />
        <Text style={styles.noteText}>
          Earnings come only from delivery fees of completed deliveries. COD
          cash you collect belongs to FLOGRAM and is remitted separately.
        </Text>
      </View>

      {/* PAYOUT HISTORY */}
      <Text style={styles.sectionTitle}>Payout History</Text>

      {payouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No payouts yet. Admin creates a payout for each payout period and
            records the bank transfer here once paid.
          </Text>
        </View>
      ) : (
        payouts.map(payout => {
          const colors = STATUS_COLORS[payout.status] ?? STATUS_COLORS.pending;

          return (
            <Pressable
              key={payout.id}
              accessibilityRole="button"
              onPress={() => void openPayout(payout)}
              style={({ pressed }) => [
                styles.payoutRow,
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={styles.payoutText}>
                <Text style={styles.payoutPeriod}>
                  {formatPayoutPeriod(payout.periodStart, payout.periodEnd)}
                </Text>
                <Text style={styles.payoutMeta}>
                  {payout.deliveryCount} deliver
                  {payout.deliveryCount === 1 ? 'y' : 'ies'}
                  {payout.paidAt ? ` · Paid ${formatPhDate(payout.paidAt)}` : ''}
                </Text>
              </View>

              <View style={styles.payoutRight}>
                <Text style={styles.payoutAmount}>
                  {formatPeso(payout.totalAmount, true)}
                </Text>
                <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.badgeText, { color: colors.fg }]}>
                    {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}

      {/* PAYOUT DETAILS */}
      <Modal
        visible={Boolean(selected)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={10}
                onPress={() => setSelected(null)}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={TEXT}
                />
              </Pressable>
            </View>

            {selected ? (
              <ScrollView contentContainerStyle={styles.modalContent}>
                <DetailRow
                  label="Payout Period"
                  value={formatPayoutPeriod(
                    selected.periodStart,
                    selected.periodEnd
                  )}
                />
                <DetailRow
                  label="Amount"
                  value={formatPeso(selected.totalAmount, true)}
                />
                <DetailRow
                  label="Status"
                  value={PAYOUT_STATUS_LABELS[selected.status] ?? selected.status}
                />
                <DetailRow
                  label="Payment Method"
                  value={selected.paymentMethod || '—'}
                />
                <DetailRow
                  label="Reference Number"
                  value={selected.referenceNumber || '—'}
                />
                <DetailRow
                  label="Paid On"
                  value={selected.paidAt ? formatPhDateTime(selected.paidAt) : '—'}
                />
                {selected.adminRemarks ? (
                  <DetailRow
                    label="Admin Remarks"
                    value={selected.adminRemarks}
                  />
                ) : null}
                {selected.status === 'cancelled' && selected.cancellationReason ? (
                  <DetailRow
                    label="Cancellation Reason"
                    value={selected.cancellationReason}
                  />
                ) : null}

                <Text style={styles.modalSection}>Payment Proof</Text>
                {getUploadUrl(selected.proofImageUrl) ? (
                  <Image
                    source={{ uri: getUploadUrl(selected.proofImageUrl) as string }}
                    style={styles.proofImage}
                    resizeMode="contain"
                    accessibilityLabel="Admin payment proof"
                  />
                ) : (
                  <Text style={styles.emptyText}>
                    {selected.status === 'paid'
                      ? 'No proof image attached.'
                      : 'Proof will appear here after Admin records the payment.'}
                  </Text>
                )}

                <Text style={styles.modalSection}>
                  Delivery Fees ({selected.deliveryCount})
                </Text>
                {detailLoading ? (
                  <ActivityIndicator color={RIDER_GOLD} />
                ) : (
                  selected.items.map((item, index) => (
                    <View
                      key={`${item.deliveryId ?? index}`}
                      style={styles.itemRow}
                    >
                      <View style={styles.payoutText}>
                        <Text style={styles.itemName}>
                          {typeof item.order === 'object' && item.order?.productName
                            ? item.order.productName
                            : 'Delivery'}
                        </Text>
                        <Text style={styles.payoutMeta}>
                          {formatPhDateTime(item.deliveredAt)}
                        </Text>
                      </View>
                      <Text style={styles.itemFee}>
                        {formatPeso(item.deliveryFee, true)}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons
        name={icon}
        size={20}
        color={RIDER_GOLD_DARK}
      />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.statValue}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FDECEC',
  },
  errorText: {
    flex: 1,
    color: RED,
    fontSize: 14,
  },
  heroCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: RIDER_GOLD,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroAmount: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  heroHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    width: '48.5%',
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  statValue: {
    marginTop: 8,
    color: TEXT,
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    color: MUTED,
    fontSize: 13,
  },
  noteCard: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: RIDER_GOLD_LIGHT,
  },
  noteText: {
    flex: 1,
    color: '#5C4A12',
    fontSize: 13,
    lineHeight: 19,
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 10,
    color: TEXT,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  payoutText: {
    flex: 1,
    marginRight: 10,
  },
  payoutPeriod: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '700',
  },
  payoutMeta: {
    marginTop: 3,
    color: MUTED,
    fontSize: 13,
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '800',
  },
  modalContent: {
    padding: 18,
    paddingBottom: 40,
  },
  modalSection: {
    marginTop: 18,
    marginBottom: 8,
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  detailLabel: {
    color: MUTED,
    fontSize: 14,
  },
  detailValue: {
    flex: 1,
    marginLeft: 16,
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  proofImage: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  itemName: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  itemFee: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
  },
});
