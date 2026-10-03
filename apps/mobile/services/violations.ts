import { apiRequest } from './api';

/*
 * =========================================================
 * POLICY VIOLATIONS & PENALTIES
 * =========================================================
 */

export type ViolationType =
  | 'fraudulent_order'
  | 'fake_or_misleading_listing'
  | 'poor_product_quality'
  | 'repeated_cancellation'
  | 'late_or_failed_delivery'
  | 'cod_remittance_issue'
  | 'abusive_behavior'
  | 'inappropriate_content'
  | 'payment_abuse'
  | 'other';

export type Penalty = 'warning' | 'suspension' | 'ban';

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  fraudulent_order: 'Fraudulent order',
  fake_or_misleading_listing: 'Fake or misleading listing',
  poor_product_quality: 'Poor product quality',
  repeated_cancellation: 'Repeated cancellations',
  late_or_failed_delivery: 'Late or failed delivery',
  cod_remittance_issue: 'COD remittance issue',
  abusive_behavior: 'Abusive behavior',
  inappropriate_content: 'Inappropriate content',
  payment_abuse: 'Payment abuse',
  other: 'Other',
};

export const VIOLATIONS_BY_ROLE: Record<'customer' | 'seller' | 'rider', ViolationType[]> = {
  customer: ['fraudulent_order', 'repeated_cancellation', 'abusive_behavior', 'inappropriate_content', 'payment_abuse', 'other'],
  seller: ['fake_or_misleading_listing', 'poor_product_quality', 'repeated_cancellation', 'abusive_behavior', 'inappropriate_content', 'other'],
  rider: ['late_or_failed_delivery', 'cod_remittance_issue', 'abusive_behavior', 'fraudulent_order', 'other'],
};

export const PENALTY_LABELS: Record<Penalty, string> = {
  warning: 'Warning',
  suspension: 'Temporary suspension',
  ban: 'Permanent ban',
};

export const PENALTY_COLORS: Record<Penalty, string> = {
  warning: '#D97706',
  suspension: '#DC2626',
  ban: '#111827',
};

type Person = { _id: string; firstName?: string; lastName?: string; email?: string; role?: string; accountStatus?: string; suspendedUntil?: string | null };

export type Violation = {
  _id: string;
  user?: Person | null;
  userRole: 'customer' | 'seller' | 'rider';
  violationType: ViolationType;
  description: string;
  penalty: Penalty;
  suspensionDays?: number | null;
  suspendedUntil?: string | null;
  status: 'active' | 'lifted';
  issuedBy?: Person | null;
  liftedBy?: Person | null;
  liftedAt?: string | null;
  liftReason?: string;
  createdAt: string;
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const getViolations = async (filters: { userId?: string; status?: 'active' | 'lifted' } = {}) => {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();

  return (
    await apiRequest<Wrapped<{ violations: Violation[] }>>(`/violations${query ? `?${query}` : ''}`, {
      method: 'GET',
      authenticated: true,
    })
  ).data.violations;
};

export const recordViolation = async (input: {
  userId: string;
  violationType: ViolationType;
  penalty: Penalty;
  description: string;
  suspensionDays?: number;
  disputeId?: string;
}) =>
  (
    await apiRequest<Wrapped<{ violation: Violation }>>('/violations', {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.violation;

export const liftViolation = async (violationId: string, reason: string) =>
  (
    await apiRequest<Wrapped<{ violation: Violation }>>(`/violations/${encodeURIComponent(violationId)}/lift`, {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({ reason }),
    })
  ).data.violation;

export const getMyViolations = async () =>
  (await apiRequest<Wrapped<{ violations: Violation[] }>>('/violations/mine', { method: 'GET', authenticated: true }))
    .data.violations;
