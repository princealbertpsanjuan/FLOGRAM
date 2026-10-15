import * as SecureStore from './storage';

import {
  apiRequest,
} from './api';

export type UserRole =
  | 'customer'
  | 'seller'
  | 'rider'
  | 'admin';

export type VerificationStatus =
  | 'not_required'
  | 'pending'
  | 'approved'
  | 'rejected';

export type AccountStatus =
  | 'active'
  | 'inactive'
  | 'suspended';

export type AuthUser = {
  _id: string;

  firstName: string;

  lastName: string;

  email: string;

  phoneNumber: string;

  role: UserRole;

  accountStatus:
    AccountStatus;

  verificationStatus:
    VerificationStatus;

  profileImage:
    string | null;

  lastLoginAt?:
    string | null;

  createdAt?: string;

  updatedAt?: string;
};

type AuthResponse = {
  success: boolean;

  message: string;

  data: {
    user: AuthUser;

    accessToken: string;
  };
};

type CurrentUserResponse = {
  success: boolean;

  message: string;

  data: {
    user: AuthUser;
  };
};

type BasicResponse = {
  success: boolean;

  message: string;

  data: null;
};

type VerifyResetCodeResponse = {
  success: boolean;

  message: string;

  data: {
    email: string;

    verified: boolean;
  };
};

export type RegisterPayload = {
  firstName: string;

  lastName: string;

  email: string;

  phoneNumber: string;

  password: string;

  confirmPassword: string;

  role:
    | 'customer'
    | 'seller'
    | 'rider';
};

export type LoginPayload = {
  email: string;

  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyResetCodePayload = {
  email: string;

  code: string;
};

export type ResetPasswordPayload = {
  email: string;

  newPassword: string;

  confirmNewPassword: string;
};

const TOKEN_KEY =
  'flogram_access_token';

const USER_KEY =
  'flogram_user';

const saveSession = async (
  user: AuthUser,
  accessToken: string
) => {
  await SecureStore.setItem(
    TOKEN_KEY,
    accessToken
  );

  await SecureStore.setItem(
    USER_KEY,
    JSON.stringify(user)
  );
};

export const register =
  async (
    payload: RegisterPayload
  ) => {
    const response =
      await apiRequest<AuthResponse>(
        '/auth/register',
        {
          method: 'POST',

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    await saveSession(
      response.data.user,
      response.data.accessToken
    );

    return response;
  };

export const login =
  async (
    payload: LoginPayload
  ) => {
    const response =
      await apiRequest<AuthResponse>(
        '/auth/login',
        {
          method: 'POST',

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    await saveSession(
      response.data.user,
      response.data.accessToken
    );

    return response;
  };

export const forgotPassword =
  async (
    payload: ForgotPasswordPayload
  ) => {
    const response =
      await apiRequest<BasicResponse>(
        '/auth/forgot-password',
        {
          method: 'POST',

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    return response;
  };

export const verifyResetCode =
  async (
    payload: VerifyResetCodePayload
  ) => {
    const response =
      await apiRequest<VerifyResetCodeResponse>(
        '/auth/verify-reset-code',
        {
          method: 'POST',

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    return response;
  };

export const resetPassword =
  async (
    payload: ResetPasswordPayload
  ) => {
    const response =
      await apiRequest<BasicResponse>(
        '/auth/reset-password',
        {
          method: 'POST',

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    return response;
  };

export const getCurrentUser =
  async () => {
    const response =
      await apiRequest<CurrentUserResponse>(
        '/auth/me',
        {
          method: 'GET',
          authenticated: true,
        }
      );

    await SecureStore.setItem(
      USER_KEY,
      JSON.stringify(
        response.data.user
      )
    );

    return response.data.user;
  };

export const getStoredUser =
  async () => {
    const value =
      await SecureStore.getItem(
        USER_KEY
      );

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(
        value
      ) as AuthUser;
    } catch {
      return null;
    }
  };

export const getAccessToken =
  () => {
    return SecureStore.getItem(
      TOKEN_KEY
    );
  };

export const logout =
  async () => {
    /*
     * Logging out must always succeed on the phone, even
     * when the server is asleep or offline: tell the server
     * (max 5 s), ignore its errors, then clear the session.
     */
    const controller =
      new AbortController();

    const timer = setTimeout(
      () => controller.abort(),
      5000
    );

    try {
      await apiRequest(
        '/auth/logout',
        {
          method: 'POST',
          authenticated: true,
          signal: controller.signal,
        }
      );
    } catch {
      // Ignored: the local session is cleared below.
    } finally {
      clearTimeout(timer);

      await SecureStore.deleteItem(
        TOKEN_KEY
      );

      await SecureStore.deleteItem(
        USER_KEY
      );
    }
  };

/*
 * =========================================================
 * HOME ROUTE FOR A SIGNED-IN USER
 * =========================================================
 *
 * Shared by Login and the Welcome screen (cold start with
 * a saved session) so both send a user to the same place.
 *
 * Seller / Rider not yet approved
 *   -> their application (upload requirements,
 *      see review status or resubmit)
 *
 * Otherwise each role has its own dashboard.
 *
 * null = unknown role.
 * =========================================================
 */
export const getHomeRouteForUser = (
  user: Pick<
    AuthUser,
    'role' | 'verificationStatus'
  >
): string | null => {
  if (
    (
      user.role === 'seller' ||
      user.role === 'rider'
    ) &&
    user.verificationStatus !==
      'approved'
  ) {
    return '/(auth)/application';
  }

  switch (user.role) {
    case 'customer':
      return '/(customer)/customer-dashboard';

    case 'seller':
      return '/(seller)/seller-dashboard';

    case 'rider':
      return '/(rider)/rider-dashboard';

    case 'admin':
      return '/(admin)/admin-dashboard';

    default:
      return null;
  }
};

/*
 * Reads the JWT "exp" claim without verifying it (the
 * server does that). Returns true only when the token is
 * readable AND already expired, so an unreadable token is
 * left for the server to judge.
 */
const isTokenExpired = (
  token: string
) => {
  try {
    const decode = (
      globalThis as {
        atob?: (value: string) => string;
      }
    ).atob;

    const payload =
      token.split('.')[1];

    if (!decode || !payload) {
      return false;
    }

    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(
        Math.ceil(payload.length / 4) * 4,
        '='
      );

    const { exp } = JSON.parse(
      decode(base64)
    ) as { exp?: number };

    return (
      typeof exp === 'number' &&
      exp * 1000 <= Date.now()
    );
  } catch {
    return false;
  }
};

/*
 * =========================================================
 * SAVED SESSION
 * =========================================================
 *
 * Returns the stored user when a token is saved and has
 * not expired. An expired session is cleared so the app
 * starts signed out instead of on a dashboard whose
 * requests all fail. No network call: this must be fast
 * even while the free-plan server is still waking up.
 * =========================================================
 */
export const getSignedInUser =
  async () => {
    const [token, user] =
      await Promise.all([
        getAccessToken(),
        getStoredUser(),
      ]);

    if (!token || !user) {
      return null;
    }

    if (isTokenExpired(token)) {
      await SecureStore.deleteItem(
        TOKEN_KEY
      );

      await SecureStore.deleteItem(
        USER_KEY
      );

      return null;
    }

    return user;
  };
