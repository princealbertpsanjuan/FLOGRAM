import { apiRequest } from './api';

/*
 * =========================================================
 * PRICE HISTORY
 * =========================================================
 *
 * GET /pricing/flowers/:flowerId   timeline (+ sales for the
 *                                  owner seller / Admin)
 * GET /pricing/seller/mine         all changes in my shop
 * GET /pricing/admin?flagged=true  Admin: large increases
 * =========================================================
 */

export type PriceHistoryEntry = {
  _id: string;
  event: 'created' | 'updated';
  oldPrice: number | null;
  newPrice: number;
  change: number;
  changePercent: number;
  flags?: string[];
  createdAt: string;
  itemType?: 'flower' | 'addon';
  itemName?: string;
  florist?: { _id: string; shopName?: string } | null;
  changedBy?: { firstName?: string; lastName?: string; role?: string } | null;
};

export type PriceSales = {
  unitPrice: number;
  orders: number;
  quantity: number;
  revenue: number;
  firstOrderAt: string;
  lastOrderAt: string;
};

export type FlowerPriceHistory = {
  flower: { _id: string; name: string; price: number };
  summary: {
    currentPrice: number | null;
    lowestPrice: number | null;
    highestPrice: number | null;
    changeCount: number;
    firstRecordedAt: string | null;
    lastChangedAt: string | null;
  };
  entries: PriceHistoryEntry[];
  sales: PriceSales[] | null;
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const getFlowerPriceHistory = async (flowerId: string, authenticated = false) =>
  (
    await apiRequest<Wrapped<FlowerPriceHistory>>(`/pricing/flowers/${encodeURIComponent(flowerId)}`, {
      method: 'GET',
      authenticated,
    })
  ).data;

export const getMyShopPriceHistory = async () =>
  (
    await apiRequest<Wrapped<{ count: number; entries: PriceHistoryEntry[] }>>('/pricing/seller/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.entries;

export const getAdminPriceHistory = async (flaggedOnly = false) =>
  (
    await apiRequest<Wrapped<{ count: number; entries: PriceHistoryEntry[] }>>(
      `/pricing/admin${flaggedOnly ? '?flagged=true' : ''}`,
      { method: 'GET', authenticated: true }
    )
  ).data.entries;
