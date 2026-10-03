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
    try {
      await apiRequest(
        '/auth/logout',
        {
          method: 'POST',
          authenticated: true,
        }
      );
    } finally {
      await SecureStore.deleteItem(
        TOKEN_KEY
      );

      await SecureStore.deleteItem(
        USER_KEY
      );
    }
  };