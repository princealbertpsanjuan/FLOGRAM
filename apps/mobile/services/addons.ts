import { apiRequest } from './api';

/*
 * =========================================================
 * GIFT ADD-ONS
 * =========================================================
 */

export type AddOnCategory =
  | 'chocolate'
  | 'teddy_bear'
  | 'balloon'
  | 'greeting_card'
  | 'other';

export const ADD_ON_CATEGORY_LABELS: Record<AddOnCategory, string> = {
  chocolate: 'Chocolates',
  teddy_bear: 'Teddy Bear',
  balloon: 'Balloons',
  greeting_card: 'Greeting Card',
  other: 'Other Gift',
};

export const ADD_ON_CATEGORY_ICONS: Record<AddOnCategory, string> = {
  chocolate: 'gift-outline',
  teddy_bear: 'happy-outline',
  balloon: 'balloon-outline',
  greeting_card: 'mail-outline',
  other: 'sparkles-outline',
};

export type GiftAddOn = {
  _id: string;
  florist: string;
  name: string;
  description: string;
  category: AddOnCategory;
  price: number;
  isAvailable: boolean;
};

export type AddOnSelection = {
  addOnId: string;
  quantity: number;
};

/*
 * Snapshot stored on carts/orders.
 */
export type OrderAddOn = {
  addOn?: string;
  addOnId?: string;
  name: string;
  category?: string;
  price: number;
  quantity: number;
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const getShopAddOns = async (floristId: string) =>
  (
    await apiRequest<Wrapped<{ addOns: GiftAddOn[] }>>(
      `/addons/florist/${encodeURIComponent(floristId)}`,
      { method: 'GET' }
    )
  ).data.addOns;

export const getMyAddOns = async () =>
  (
    await apiRequest<Wrapped<{ addOns: GiftAddOn[] }>>('/addons/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.addOns;

export type AddOnInput = {
  name: string;
  description?: string;
  category: AddOnCategory;
  price: number;
  isAvailable?: boolean;
};

export const createAddOn = async (input: AddOnInput) =>
  (
    await apiRequest<Wrapped<{ addOn: GiftAddOn }>>('/addons', {
      method: 'POST',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.addOn;

export const updateAddOn = async (addOnId: string, input: Partial<AddOnInput>) =>
  (
    await apiRequest<Wrapped<{ addOn: GiftAddOn }>>(`/addons/${encodeURIComponent(addOnId)}`, {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify(input),
    })
  ).data.addOn;

export const deleteAddOn = async (addOnId: string) =>
  (
    await apiRequest<Wrapped<{ addOn: GiftAddOn }>>(`/addons/${encodeURIComponent(addOnId)}`, {
      method: 'DELETE',
      authenticated: true,
    })
  ).data.addOn;

export const setCartItemAddOns = async (cartItemId: string, addOns: AddOnSelection[]) =>
  apiRequest<Wrapped<{ cart: unknown }>>(`/cart/items/${encodeURIComponent(cartItemId)}/add-ons`, {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify({ addOns }),
  });

export const formatAddOnsLine = (addOns?: OrderAddOn[] | null) =>
  (addOns || [])
    .map(addOn => `${addOn.name}${addOn.quantity > 1 ? ` ×${addOn.quantity}` : ''}`)
    .join(', ');

export const addOnsTotalOf = (addOns?: OrderAddOn[] | null) =>
  (addOns || []).reduce((sum, addOn) => sum + Number(addOn.price || 0) * Number(addOn.quantity || 1), 0);
