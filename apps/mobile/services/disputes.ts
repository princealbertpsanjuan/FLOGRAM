import { apiRequest } from './api';
import { appendImageFile } from '../utils/form-file';

/*
 * =========================================================
 * DISPUTES (report a problem with an order)
 * =========================================================
 */

export type DisputeReason =
  | 'item_not_received'
  | 'wrong_item'
  | 'damaged_or_wilted'
  | 'not_as_described'
  | 'late_delivery'
  | 'payment_issue'
  | 'rude_behavior'
  | 'customer_unavailable'
  | 'other';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export type DisputeParty = 'customer' | 'seller' | 'rider' | 'platform';

export type DisputeAction = 'none' | 'refund' | 'partial_refund' | 'replacement' | 'penalty_issued' | 'other';

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  item_not_received: 'Item not received',
  wrong_item: 'Wrong item',
  damaged_or_wilted: 'Damaged or wilted flowers',
  not_as_described: 'Not as described',
  late_delivery: 'Late delivery',
  payment_issue: 'Payment issue',
  rude_behavior: 'Rude or unsafe behavior',
  customer_unavailable: 'Customer unavailable',
  other: 'Other',
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
  rejected: 'Closed',
};

export const DISPUTE_STATUS_COLORS: Record<DisputeStatus, string> = {
  open: '#D97706',
  under_review: '#2563EB',
  resolved: '#15803D',
  rejected: '#6B7280',
};

export const DISPUTE_ACTION_LABELS: Record<DisputeAction, string> = {
  none: 'No action',
  refund: 'Full refund',
  partial_refund: 'Partial refund',
  replacement: 'Replacement',
  penalty_issued: 'Penalty issued',
  other: 'Other',
};

export const DISPUTE_PARTY_LABELS: Record<DisputeParty, string> = {
  customer: 'Customer',
  seller: 'Florist shop',
  rider: 'Rider',
  platform: 'FLOGRAM / app',
};

/*
 * Reasons offered to each role.
 */
export const REASONS_BY_ROLE: Record<'customer' | 'seller' | 'rider', DisputeReason[]> = {
  customer: ['item_not_received', 'wrong_item', 'damaged_or_wilted', 'not_as_described', 'late_delivery', 'payment_issue', 'rude_behavior', 'other'],
  seller: ['customer_unavailable', 'payment_issue', 'rude_behavior', 'late_delivery', 'other'],
  rider: ['customer_unavailable', 'wrong_item', 'payment_issue', 'rude_behavior', 'other'],
};

export const PARTIES_BY_ROLE: Record<'customer' | 'seller' | 'rider', DisputeParty[]> = {
  customer: ['seller', 'rider', 'platform'],
  seller: ['customer', 'rider', 'platform'],
  rider: ['customer', 'seller', 'platform'],
};

type Person = { _id: string; firstName?: string; lastName?: string; email?: string; role?: string; accountStatus?: string };

export type Dispute = {
  _id: string;
  order?: { _id: string; productName?: string; orderStatus?: string; totalAmount?: number; paymentMethod?: string; createdAt?: string } | null;
  florist?: { _id: string; shopName?: string } | null;
  filedBy?: Person | null;
  filedByRole: 'customer' | 'seller' | 'rider';
  against: DisputeParty;
  againstUser?: Person | null;
  reason: DisputeReason;
  details: string;
  images: string[];
  status: DisputeStatus;
  resolutionAction: DisputeAction;
  resolution: string;
  resolvedBy?: Person | null;
  resolvedAt?: string | null;
  messages: { _id: string; author?: Person | null; authorRole: string; message: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const personName = (person?: Person | null) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.email || '—';

export const fileDispute = async (input: {
  orderId: string;
  against: DisputeParty;
  reason: DisputeReason;
  details: string;
  imageUris: string[];
}) => {
  const formData = new FormData();
  formData.append('orderId', input.orderId);
  formData.append('against', input.against);
  formData.append('reason', input.reason);
  formData.append('details', input.details);

  for (const [index, uri] of input.imageUris.slice(0, 3).entries()) {
    await appendImageFile(formData, 'images', uri, `evidence-${index + 1}.jpg`);
  }

  return (
    await apiRequest<Wrapped<{ dispute: Dispute }>>('/disputes', {
      method: 'POST',
      authenticated: true,
      body: formData,
    })
  ).data.dispute;
};

export const getMyDisputes = async () =>
  (await apiRequest<Wrapped<{ disputes: Dispute[] }>>('/disputes/mine', { method: 'GET', authenticated: true })).data
    .disputes;

export const getDispute = async (disputeId: string) =>
  (
    await apiRequest<Wrapped<{ dispute: Dispute }>>(`/disputes/${encodeURIComponent(disputeId)}`, {
      method: 'GET',
      authenticated: true,
    })
  ).data.dispute;

export const sendDisputeMessage = async (disputeId: string, message: string) =>
  (
    await apiRequest<Wrapped<{ dispute: Dispute }>>(`/disputes/${encodeURIComponent(disputeId)}/messages`, {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify({ message }),
    })
  ).data.dispute;

export const getAdminDisputes = async (status?: DisputeStatus | 'all') =>
  (
    await apiRequest<Wrapped<{ disputes: Dispute[]; counts: Partial<Record<DisputeStatus, number>> }>>(
      `/disputes/admin${status && status !== 'all' ? `?status=${status}` : ''}`,
      { method: 'GET', authenticated: true }
    )
  ).data;

export const updateDispute = async (
  disputeId: string,
  input: { status: 'under_review' | 'resolved' | 'rejected'; resolution?: string; resolutionAction?: DisputeAction }
) =>
  (
    await apiRequest<Wrapped<{ dispute: Dispute }>>(`/disputes/admin/${encodeURIComponent(disputeId)}`, {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.dispute;
