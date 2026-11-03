/*
 * =========================================================
 * STATUS COLOR SYSTEM (color psychology)
 * =========================================================
 *
 * One meaning per color across every role and screen, so a
 * user learns it once:
 *
 *   RED     danger / final        permanent ban, rejected,
 *                                  failed check, high risk
 *   ORANGE  serious, time-limited  temporary suspension
 *   YELLOW  caution / attention    warning, pending review,
 *                                  medium risk
 *   BLUE    in progress / info     under review, processing
 *   GREEN   safe / done            active, approved, passed,
 *                                  low risk
 *   GRAY    neutral / closed       lifted, archived, n/a
 *
 * Every tone has a solid color (buttons, icons), a dark
 * text color that stays readable on its light background
 * (WCAG AA contrast), and a border. Each tone also has its
 * own icon so meaning never depends on color alone (for
 * color-blind users).
 * =========================================================
 */

export type StatusTone = 'danger' | 'serious' | 'caution' | 'info' | 'success' | 'neutral';

export type ToneColors = {
  solid: string;
  text: string;
  background: string;
  border: string;
  icon: string;
  label: string;
};

export const STATUS_TONES: Record<StatusTone, ToneColors> = {
  danger: {
    solid: '#DC2626',
    text: '#991B1B',
    background: '#FEE2E2',
    border: '#FCA5A5',
    icon: 'ban',
    label: 'Red',
  },
  serious: {
    solid: '#EA580C',
    text: '#9A3412',
    background: '#FFEDD5',
    border: '#FDBA74',
    icon: 'time',
    label: 'Orange',
  },
  caution: {
    solid: '#CA8A04',
    text: '#854D0E',
    background: '#FEF9C3',
    border: '#FDE047',
    icon: 'alert-circle',
    label: 'Yellow',
  },
  info: {
    solid: '#2563EB',
    text: '#1E40AF',
    background: '#DBEAFE',
    border: '#93C5FD',
    icon: 'information-circle',
    label: 'Blue',
  },
  success: {
    solid: '#16A34A',
    text: '#166534',
    background: '#DCFCE7',
    border: '#86EFAC',
    icon: 'checkmark-circle',
    label: 'Green',
  },
  neutral: {
    solid: '#6B7280',
    text: '#374151',
    background: '#F3F4F6',
    border: '#D1D5DB',
    icon: 'remove-circle',
    label: 'Gray',
  },
};

/*
 * Status word -> tone. Covers account status, penalties,
 * verification, automated checks, risk, disputes and
 * remittances.
 */
const STATUS_TO_TONE: Record<string, StatusTone> = {
  // account + penalties
  banned: 'danger',
  ban: 'danger',
  suspended: 'serious',
  suspension: 'serious',
  warning: 'caution',
  active: 'success',
  lifted: 'neutral',
  inactive: 'neutral',

  // verification
  approved: 'success',
  verified: 'success',
  pending: 'caution',
  rejected: 'danger',
  needs_resubmission: 'danger',
  accepted: 'success',

  // automated checks
  pass: 'success',
  fail: 'danger',

  // risk
  low: 'success',
  medium: 'caution',
  high: 'danger',

  // disputes / remittances
  open: 'caution',
  under_review: 'info',
  submitted: 'info',
  resolved: 'success',
  closed: 'neutral',
};

export const getStatusTone = (status?: string | null): StatusTone =>
  STATUS_TO_TONE[String(status || '').toLowerCase()] || 'neutral';

export const getStatusColors = (status?: string | null): ToneColors => STATUS_TONES[getStatusTone(status)];

/*
 * Penalties in increasing severity, used for legends.
 */
export const PENALTY_LEGEND = [
  { status: 'warning', title: 'Warning', meaning: 'First notice. The account still works.' },
  { status: 'suspension', title: 'Temporary suspension', meaning: 'Cannot log in until the end date.' },
  { status: 'ban', title: 'Permanent ban', meaning: 'Account closed for good.' },
] as const;

/*
 * Penalty notifications carry metadata.penalty
 * ("warning" | "suspension" | "ban" | "lifted").
 */
export const getPenaltyNotificationColors = (notification: {
  type?: string;
  title?: string;
  metadata?: Record<string, unknown> | null;
}): ToneColors | null => {
  if (notification.type !== 'account_penalty') return null;

  const penalty = String(notification.metadata?.penalty || '');

  if (penalty === 'lifted' || /lifted/i.test(String(notification.title || ''))) return STATUS_TONES.success;
  if (penalty) return getStatusColors(penalty);

  // Older notifications without metadata: read the title
  if (/banned/i.test(String(notification.title || ''))) return STATUS_TONES.danger;
  if (/suspended/i.test(String(notification.title || ''))) return STATUS_TONES.serious;
  return STATUS_TONES.caution;
};
