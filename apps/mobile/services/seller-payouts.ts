import { apiRequest } from './api';
import { appendImageFile } from '../utils/form-file';

/*
 * =========================================================
 * SELLER EARNINGS & ADMIN SELLER PAYOUTS
 * =========================================================
 */

export type SellerPayoutItem = {
  order: string;
  productName: string;
  paymentMethod: string;
  collectedBySeller: boolean;
  grossAmount: number;
  commissionRate: number;
  commission: number;
  netAmount: number;
  completedAt: string | null;
  awaitingCodRemittance?: boolean;
};

export type SellerPayout = {
  _id: string;
  florist?: { _id: string; shopName?: string } | string;
  sellerUser?: { _id: string; firstName?: string; lastName?: string; email?: string; phoneNumber?: string } | string;
  periodStart: string;
  periodEnd: string;
  items?: SellerPayoutItem[];
  itemCount?: number;
  grossSales: number;
  totalCommission: number;
  totalAmount: number;
  status: 'pending' | 'paid' | 'cancelled';
  paymentMethod?: string;
  referenceNumber?: string;
  proofImageUrl?: string | null;
  paidAt?: string | null;
  adminRemarks?: string;
  cancellationReason?: string;
  createdAt: string;
};

export type SellerEarnings = {
  shopName: string;
  commissionRate: number;
  lifetime: { grossSales: number; commission: number; netEarnings: number; orders: number };
  unpaidBalance: number;
  unpaidOrders: number;
  awaitingCodRemittance: { orders: number; netAmount: number };
  pendingPayoutAmount: number;
  paidOutTotal: number;
  recentItems: SellerPayoutItem[];
  payouts: SellerPayout[];
};

export type SellerBalance = {
  floristId: string;
  shopName: string;
  isActive: boolean;
  seller: { id: string; firstName: string; lastName: string; email: string; phoneNumber: string } | null;
  unpaidOrderCount: number;
  grossSales: number;
  heldSales?: number;
  pickupSales?: number;
  commissionRate?: number | null;
  commission: number;
  amountOwed: number;
  awaitingCodOrders: number;
  oldestUnpaidAt: string | null;
  latestUnpaidAt: string | null;
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paymongo: 'Online (PayMongo)',
  cash_on_delivery: 'Cash on Delivery',
  cash_on_pickup: 'Cash on Pickup',
};

export const getMyEarnings = async () =>
  (await apiRequest<Wrapped<SellerEarnings>>('/seller-payouts/me', { method: 'GET', authenticated: true })).data;

export const getMySellerPayout = async (payoutId: string) =>
  (
    await apiRequest<Wrapped<{ payout: SellerPayout }>>(`/seller-payouts/me/${encodeURIComponent(payoutId)}`, {
      method: 'GET',
      authenticated: true,
    })
  ).data.payout;

export const getSellerBalances = async () =>
  (await apiRequest<Wrapped<{ balances: SellerBalance[] }>>('/seller-payouts/balances', { method: 'GET', authenticated: true }))
    .data.balances;

export const getSellerPayouts = async (status?: 'pending' | 'paid' | 'cancelled') =>
  (
    await apiRequest<Wrapped<{ payouts: SellerPayout[] }>>(`/seller-payouts${status ? `?status=${status}` : ''}`, {
      method: 'GET',
      authenticated: true,
    })
  ).data.payouts;

export const createSellerPayout = async (floristId: string, input: { periodStart?: string; periodEnd?: string } = {}) =>
  (
    await apiRequest<Wrapped<{ payout: SellerPayout }>>(`/seller-payouts/florist/${encodeURIComponent(floristId)}`, {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.payout;

export const markSellerPayoutPaid = async (
  payoutId: string,
  input: { referenceNumber: string; paymentMethod?: string; adminRemarks?: string; proofImageUri: string }
) => {
  const formData = new FormData();
  formData.append('referenceNumber', input.referenceNumber.trim());
  formData.append('paymentMethod', (input.paymentMethod || 'Bank Transfer').trim());
  formData.append('adminRemarks', (input.adminRemarks || '').trim());
  await appendImageFile(formData, 'proofImage', input.proofImageUri, 'seller-payout-proof.jpg');

  return (
    await apiRequest<Wrapped<{ payout: SellerPayout }>>(`/seller-payouts/${encodeURIComponent(payoutId)}/pay`, {
      method: 'PATCH',
      authenticated: true,
      body: formData,
    })
  ).data.payout;
};

export const cancelSellerPayout = async (payoutId: string, reason: string) =>
  (
    await apiRequest<Wrapped<{ payout: SellerPayout }>>(`/seller-payouts/${encodeURIComponent(payoutId)}/cancel`, {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({ reason }),
    })
  ).data.payout;
