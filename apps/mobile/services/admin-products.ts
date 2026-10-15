import { apiRequest } from './api';

/*
 * =========================================================
 * ADMIN – SELLER LISTINGS (PRODUCTS)
 * =========================================================
 *
 * GET   /admin/flowers?search=&florist=&status=
 * PATCH /admin/flowers/:flowerId/visibility
 *
 * Visible = active and available (what customers see).
 * =========================================================
 */

export type AdminProductStatusFilter = 'all' | 'visible' | 'hidden';

export type AdminProductShop = {
  _id: string;
  shopName: string;
};

export type AdminProduct = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  occasion?: string[];
  flowerTypes?: string[];
  colors?: string[];
  images?: string[];
  isActive: boolean;
  isAvailable: boolean;
  isVisible: boolean;
  hiddenByAdmin?: boolean;
  adminHiddenReason?: string;
  orderCount?: number;
  florist?: {
    _id: string;
    shopName?: string;
    contactNumber?: string;
    businessEmail?: string;
    isActive?: boolean;
    verificationStatus?: string;
    address?: {
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
    };
  } | null;
  seller?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProductsResult = {
  flowers: AdminProduct[];
  total: number;
  shops: AdminProductShop[];
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export async function getAdminProducts(
  filters: {
    search?: string;
    florist?: string;
    status?: AdminProductStatusFilter;
  } = {}
): Promise<AdminProductsResult> {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.florist && filters.florist !== 'all') {
    params.set('florist', filters.florist);
  }

  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }

  const query = params.toString();

  const response = await apiRequest<ApiResponse<AdminProductsResult>>(
    `/admin/flowers${query ? `?${query}` : ''}`,
    {
      method: 'GET',
      authenticated: true,
    }
  );

  if (!response?.data) {
    throw new Error(response?.message || 'Seller listings could not be loaded.');
  }

  return {
    flowers: response.data.flowers ?? [],
    total: Number(response.data.total) || 0,
    shops: response.data.shops ?? [],
  };
}

export async function setAdminProductVisibility(
  flowerId: string,
  isActive: boolean,
  reason?: string
): Promise<AdminProduct> {
  const response = await apiRequest<ApiResponse<AdminProduct>>(
    `/admin/flowers/${encodeURIComponent(flowerId)}/visibility`,
    {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({ isActive, reason }),
    }
  );

  if (!response?.data) {
    throw new Error(response?.message || 'The listing could not be updated.');
  }

  return response.data;
}
