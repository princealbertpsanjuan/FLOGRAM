import * as SecureStore from 'expo-secure-store';

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

const TOKEN_KEY =
  'flogram_access_token';

const USER_KEY =
  'flogram_user';

const saveSession = async (
  user: AuthUser,
  accessToken: string
) => {
  await SecureStore.setItemAsync(
    TOKEN_KEY,
    accessToken
  );

  await SecureStore.setItemAsync(
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

    await SecureStore.setItemAsync(
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
      await SecureStore.getItemAsync(
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
    return SecureStore.getItemAsync(
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
      await SecureStore.deleteItemAsync(
        TOKEN_KEY
      );

      await SecureStore.deleteItemAsync(
        USER_KEY
      );
    }
  };