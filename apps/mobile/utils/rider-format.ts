/*
 * =========================================================
 * RIDER FORMAT HELPERS
 * =========================================================
 *
 * Shared formatting for Rider screens so money, dates,
 * shift times and status labels read the same everywhere.
 * All times are shown in Philippine time.
 * =========================================================
 */

const PH_LOCALE = 'en-PH';
const PH_TIME_ZONE = 'Asia/Manila';

export const formatPeso = (
  amount?: number | null,
  withDecimals = false
) => {
  const value =
    typeof amount === 'number' && Number.isFinite(amount)
      ? amount
      : 0;

  return `₱${value.toLocaleString(PH_LOCALE, {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
};

const toDate = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatPhDate = (
  value?: string | Date | null
) => {
  const date = toDate(value);

  if (!date) {
    return 'Date unavailable';
  }

  return date.toLocaleDateString(PH_LOCALE, {
    timeZone: PH_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatPhTime = (
  value?: string | Date | null
) => {
  const date = toDate(value);

  if (!date) {
    return '--';
  }

  return date.toLocaleTimeString(PH_LOCALE, {
    timeZone: PH_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatPhDateTime = (
  value?: string | Date | null
) => {
  const date = toDate(value);

  if (!date) {
    return 'Date unavailable';
  }

  return `${formatPhDate(date)}, ${formatPhTime(date)}`;
};

/*
 * "Mon, Oct 5 · 8:00 AM – 5:00 PM"
 */
export const formatShiftWindow = (
  startAt?: string | null,
  endAt?: string | null
) => {
  const start = toDate(startAt);
  const end = toDate(endAt);

  if (!start || !end) {
    return 'Schedule unavailable';
  }

  const day = start.toLocaleDateString(PH_LOCALE, {
    timeZone: PH_TIME_ZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return `${day} · ${formatPhTime(start)} – ${formatPhTime(end)}`;
};

export const formatPayoutPeriod = (
  periodStart?: string | null,
  periodEnd?: string | null
) => `${formatPhDate(periodStart)} – ${formatPhDate(periodEnd)}`;

/*
 * =========================================================
 * STANDARD DELIVERY LIFECYCLE LABELS
 * =========================================================
 *
 * Accept → Bouquet Pickup → Start Delivery →
 * Proof of Delivery → Delivery Completed
 * =========================================================
 */

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  available: 'Awaiting Rider',
  accepted: 'Accepted',
  picked_up: 'Bouquet Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivery Completed',
  cancelled: 'Cancelled',
};

export const getDeliveryStatusLabel = (status?: string | null) =>
  (status && DELIVERY_STATUS_LABELS[status]) || 'Unknown';

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

export const SHIFT_REQUEST_LABELS: Record<string, string> = {
  pending: 'Awaiting Approval',
  approved: 'Approved',
  rejected: 'Not Approved',
};
