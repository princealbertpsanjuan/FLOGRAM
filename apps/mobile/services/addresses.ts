import { apiRequest } from './api';

/*
 * =========================================================
 * CUSTOMER ADDRESS BOOK
 * =========================================================
 *
 * GET /users/me/addresses
 * PUT /users/me/addresses   (replaces the whole list, max 5)
 * =========================================================
 */

export type SavedAddress = {
  _id?: string;
  label: string;
  recipientName: string;
  recipientPhoneNumber: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  landmark: string;
  isDefault: boolean;
};

type AddressesResponse = {
  success: boolean;
  message: string;
  data: { addresses: SavedAddress[] };
};

export const MAX_SAVED_ADDRESSES = 5;

export const getSavedAddresses = async () =>
  (
    await apiRequest<AddressesResponse>('/users/me/addresses', {
      method: 'GET',
      authenticated: true,
    })
  ).data.addresses;

export const saveAddresses = async (addresses: SavedAddress[]) =>
  (
    await apiRequest<AddressesResponse>('/users/me/addresses', {
      method: 'PUT',
      authenticated: true,
      body: JSON.stringify({ addresses }),
    })
  ).data.addresses;

export const formatSavedAddress = (address: SavedAddress) =>
  [address.street, address.barangay, address.city, address.province]
    .filter(Boolean)
    .join(', ');
