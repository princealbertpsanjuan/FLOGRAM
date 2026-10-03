import { apiRequest } from './api';

/*
 * =========================================================
 * FOLLOW FLORIST SHOPS
 * =========================================================
 */

export type FollowStatus = {
  floristId: string;
  isFollowing: boolean;
  followerCount: number;
};

export type FollowedShop = {
  followedAt: string;
  florist: {
    _id: string;
    shopName: string;
    shopLogo?: string | null;
    description?: string;
    address?: { city?: string; province?: string };
  };
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export const getFollowStatus = async (floristId: string) =>
  (
    await apiRequest<Wrapped<FollowStatus>>(`/follows/florists/${encodeURIComponent(floristId)}`, {
      method: 'GET',
      authenticated: true,
    })
  ).data;

export const setFollowing = async (floristId: string, follow: boolean) =>
  (
    await apiRequest<Wrapped<FollowStatus>>(`/follows/florists/${encodeURIComponent(floristId)}`, {
      method: follow ? 'POST' : 'DELETE',
      authenticated: true,
    })
  ).data;

export const getFollowedShops = async () =>
  (
    await apiRequest<Wrapped<{ shops: FollowedShop[] }>>('/follows/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.shops;
