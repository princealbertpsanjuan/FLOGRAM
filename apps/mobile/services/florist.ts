import { apiRequest } from './api';

/*
 * =========================================================
 * FLORIST ADDRESS
 * =========================================================
 */

export type FloristAddress = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

/*
 * =========================================================
 * FLORIST LOCATION
 * =========================================================
 */

export type FloristLocation = {
  latitude?: number | null;
  longitude?: number | null;
};

/*
 * =========================================================
 * FLORIST OWNER
 * =========================================================
 */

export type FloristOwner = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  verificationStatus?: string;
};

/*
 * =========================================================
 * FLORIST PROFILE
 * =========================================================
 */

export type FloristProfile = {
  _id: string;

  owner?: FloristOwner | string;

  shopName: string;

  description?: string;

  address?: FloristAddress;

  location?: FloristLocation;

  contactNumber?: string;

  businessEmail?: string;

  shopLogo?: string | null;

  verificationStatus?:
    | 'pending'
    | 'approved'
    | 'rejected';

  verificationRemarks?: string;

  verifiedAt?: string | null;

  verifiedBy?: string | null;

  isActive?: boolean;

  createdAt?: string;

  updatedAt?: string;
};

/*
 * =========================================================
 * FLORIST RESPONSE
 * =========================================================
 */

type FloristResponse = {
  success: boolean;

  message: string;

  data: {
    florist: FloristProfile;
  };
};

/*
 * =========================================================
 * GET MY FLORIST PROFILE
 *
 * GET /florists/profile
 * =========================================================
 */

export async function getMyFloristProfile(): Promise<FloristProfile> {
  const response =
    await apiRequest<FloristResponse>(
      '/florists/profile',
      {
        method: 'GET',
        authenticated: true,
      }
    );

  return response.data.florist;
}

/*
 * =========================================================
 * UPDATE MY FLORIST PROFILE
 *
 * PATCH /florists/profile
 * =========================================================
 */

export async function updateMyFloristProfile(
  payload: Partial<
    Pick<
      FloristProfile,
      | 'shopName'
      | 'description'
      | 'address'
      | 'location'
      | 'contactNumber'
      | 'businessEmail'
    >
  >
): Promise<FloristProfile> {
  const response =
    await apiRequest<FloristResponse>(
      '/florists/profile',
      {
        method: 'PATCH',
        authenticated: true,
        body: JSON.stringify(payload),
      }
    );

  return response.data.florist;
}

