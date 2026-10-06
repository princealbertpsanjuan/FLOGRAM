import { apiRequest } from './api';
import { appendImageFile } from '../utils/form-file';

/*
 * =========================================================
 * SELLER / RIDER APPLICATION (verification)
 * =========================================================
 *
 * 1. Shop or rider details  -> POST /florists/profile | /riders/profile
 * 2. Requirement documents  -> POST /verification/seller | /verification/rider
 * 3. Admin approves or rejects (Seller / Rider Verification)
 * =========================================================
 */

type Wrapped<T> = { success: boolean; message: string; data: T };

export type Address = {
  street: string;
  barangay: string;
  city: string;
  province: string;
  postalCode?: string;
};

export type ApplicationRole = 'seller' | 'rider';

export type ApplicationProfile = {
  _id: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verificationRemarks?: string;
  shopName?: string;
};

export type VerificationRecord = {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

export const SELLER_DOCUMENTS = [
  { key: 'validId', label: 'Valid government ID', hint: "Owner's ID (front)" },
  { key: 'dtiRegistration', label: 'DTI business registration', hint: 'Certificate of business name' },
  { key: 'birDocument', label: 'BIR registration', hint: 'Form 2303 / Certificate of Registration' },
  { key: 'bankProof', label: 'Bank account proof', hint: 'Bank certificate or passbook page with your name and account number (for payouts)' },
  { key: 'shopLogo', label: 'Shop logo', hint: 'Shown to customers on your shop page' },
] as const;

export const RIDER_DOCUMENTS = [
  { key: 'driverLicense', label: "Driver's license", hint: 'Front of a valid license' },
  { key: 'orcr', label: 'Vehicle OR/CR', hint: 'Official Receipt and Certificate of Registration' },
  { key: 'policeClearance', label: 'Police clearance', hint: 'Issued within the last 6 months' },
] as const;

export const VEHICLE_TYPES = ['motorcycle', 'bicycle', 'car', 'van', 'other'] as const;

const isNotFound = (error: unknown) =>
  error instanceof Error && /not found|was not found|404/i.test(error.message);

export const getApplicationProfile = async (role: ApplicationRole): Promise<ApplicationProfile | null> => {
  try {
    const response = await apiRequest<Wrapped<Record<string, ApplicationProfile>>>(
      role === 'seller' ? '/florists/profile' : '/riders/profile',
      { method: 'GET', authenticated: true }
    );
    const data = response.data || {};
    return (data.florist || data.rider || data.profile || null) as ApplicationProfile | null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export const getMyVerification = async (): Promise<VerificationRecord | null> => {
  try {
    const response = await apiRequest<Wrapped<Record<string, VerificationRecord>>>('/verification/me', {
      method: 'GET',
      authenticated: true,
    });
    const data = response.data || {};
    return (data.verification || null) as VerificationRecord | null;
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
};

export const createSellerProfile = (input: {
  shopName: string;
  description?: string;
  contactNumber: string;
  businessEmail: string;
  address: Address;
}) =>
  apiRequest<Wrapped<unknown>>('/florists/profile', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  });

export const createRiderProfile = (input: {
  vehicleType: string;
  vehiclePlateNumber?: string;
  driverLicenseNumber: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  address: Address;
}) =>
  apiRequest<Wrapped<unknown>>('/riders/profile', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify(input),
  });

export const submitDocuments = async (role: ApplicationRole, files: Record<string, string>) => {
  const formData = new FormData();

  for (const [key, uri] of Object.entries(files)) {
    await appendImageFile(formData, key, uri, `${key}.jpg`);
  }

  return apiRequest<Wrapped<unknown>>(role === 'seller' ? '/verification/seller' : '/verification/rider', {
    method: 'POST',
    authenticated: true,
    body: formData,
  });
};
