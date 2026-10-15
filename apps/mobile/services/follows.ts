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

/*
 * SELLER: customers following my shop
 * GET /follows/seller/mine
 */
export type ShopFollower = {
  _id: string;
  followedAt: string;
  customer: {
    _id: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string | null;
  };
};

export type ShopFollowers = {
  count: number;
  followers: ShopFollower[];
};

export const getMyShopFollowers = async () =>
  (
    await apiRequest<Wrapped<ShopFollowers>>('/follows/seller/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data;
