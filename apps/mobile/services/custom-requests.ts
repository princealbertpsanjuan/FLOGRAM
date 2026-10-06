import { apiRequest } from './api';

/*
 * =========================================================
 * CUSTOM BOUQUET REQUESTS — SELLER SIDE
 * =========================================================
 *
 * Customers send a custom request (from the AI assistant or
 * Custom Request screen). Every approved shop can send one
 * price offer (proposal). The customer picks one and pays.
 * =========================================================
 */

const BASE = '/bloomboard/custom-bouquet-requests';

type Wrapped<T> = { success: boolean; message: string; data: T };

export type CustomRequest = {
  _id: string;
  customer?: { firstName?: string; lastName?: string } | null;
  florist?: { _id: string; shopName?: string } | string | null;
  inspirationImage?: string | null;
  occasion?: string | null;
  budget?: number | null;
  quantity?: number | null;
  requestedDate?: string | null;
  flowerTypes?: string[];
  colors?: string[];
  styles?: string[];
  theme?: string | null;
  bouquetSize?: string | null;
  wrapping?: string | null;
  specialInstructions?: string | null;
  customerMessage?: string | null;
  status: string;
  quotedPrice?: number | null;
  createdAt: string;
};

export type SellerProposal = {
  _id: string;
  request?: CustomRequest | string | null;
  quotedPrice: number;
  sellerResponse?: string;
  status: 'submitted' | 'selected' | 'not_selected' | 'withdrawn';
  createdAt: string;
};

export const getSellerCustomRequests = async () =>
  (await apiRequest<Wrapped<{ requests: CustomRequest[] }>>(`${BASE}/seller/mine`, { method: 'GET', authenticated: true }))
    .data.requests || [];

export const getMyProposals = async () =>
  (
    await apiRequest<Wrapped<{ proposals: SellerProposal[] }>>(`${BASE}/proposals/seller/mine`, {
      method: 'GET',
      authenticated: true,
    })
  ).data.proposals || [];

export const sendProposal = async (requestId: string, input: { quotedPrice: number; sellerResponse: string }) =>
  (
    await apiRequest<Wrapped<{ proposal: SellerProposal }>>(`${BASE}/${encodeURIComponent(requestId)}/proposals`, {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.proposal;

export const withdrawProposal = async (proposalId: string) =>
  apiRequest<Wrapped<unknown>>(`${BASE}/proposals/${encodeURIComponent(proposalId)}/withdraw`, {
    method: 'PATCH',
    authenticated: true,
  });

export const requestIdOf = (proposal: SellerProposal) =>
  typeof proposal.request === 'string' ? proposal.request : proposal.request?._id || '';
