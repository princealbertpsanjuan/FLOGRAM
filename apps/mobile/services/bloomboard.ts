import { apiRequest } from './api';

/*
 * =========================================================
 * BLOOMBOARD – CUSTOMER ACTIVITY
 * =========================================================
 *
 * GET /bloomboard/liked/mine     posts I liked
 * GET /bloomboard/saved/mine     posts I saved
 * GET /bloomboard/comments/mine  my comments (with post)
 * =========================================================
 */

export type BloomboardAuthor = {
  _id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  profileImage?: string | null;
};

export type BloomboardPost = {
  _id: string;
  author?: BloomboardAuthor | null;
  authorRole?: 'customer' | 'seller';
  florist?: { _id: string; shopName?: string } | null;
  caption?: string;
  images?: string[];
  postType?: 'general' | 'bouquet_inspiration';
  likeCount?: number;
  commentCount?: number;
  saveCount?: number;
  createdAt?: string;
};

export type BloomboardMyComment = {
  _id: string;
  content: string;
  createdAt?: string;
  post: BloomboardPost;
};

type PostsResponse = {
  success: boolean;
  message: string;
  data: { count: number; posts: BloomboardPost[] };
};

type CommentsResponse = {
  success: boolean;
  message: string;
  data: { count: number; comments: BloomboardMyComment[] };
};

export const getMyLikedPosts = async () =>
  (
    await apiRequest<PostsResponse>('/bloomboard/liked/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.posts;

export const getMySavedPosts = async () =>
  (
    await apiRequest<PostsResponse>('/bloomboard/saved/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.posts;

export const getMyBloomboardComments = async () =>
  (
    await apiRequest<CommentsResponse>('/bloomboard/comments/mine', {
      method: 'GET',
      authenticated: true,
    })
  ).data.comments;

/*
 * =========================================================
 * FEED + LIKE / SAVE
 * =========================================================
 */

export type BloomboardFeedPost = BloomboardPost & {
  likes?: string[];
  saves?: string[];
};

type FeedResponse = {
  success: boolean;
  message: string;
  data: { count: number; posts: BloomboardFeedPost[] };
};

type MutationResponse = {
  success: boolean;
  message: string;
  data?: { liked?: boolean; saved?: boolean; likeCount?: number };
};

export const getBloomboardFeed = async (limit = 50) =>
  (
    await apiRequest<FeedResponse>(`/bloomboard?limit=${limit}`, {
      method: 'GET',
    })
  ).data.posts;

export const setPostLiked = async (postId: string, liked: boolean) =>
  (
    await apiRequest<MutationResponse>(
      `/bloomboard/${encodeURIComponent(postId)}/like`,
      { method: liked ? 'POST' : 'DELETE', authenticated: true }
    )
  ).data;

export const setPostSaved = async (postId: string, saved: boolean) =>
  (
    await apiRequest<MutationResponse>(
      `/bloomboard/${encodeURIComponent(postId)}/save`,
      { method: saved ? 'POST' : 'DELETE', authenticated: true }
    )
  ).data;

/*
 * =========================================================
 * SHOP TAGS + RATINGS
 * =========================================================
 */

export type TaggableShop = {
  _id: string;
  shopName: string;
  shopLogo?: string | null;
  canRate: boolean;
  verifiedBuyer: boolean;
  alreadyRated: boolean;
};

export type ShopCommunityRating = {
  tagCount: number;
  ratingCount: number;
  averageRating: number | null;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  sentiment: { positive: number; neutral: number; negative: number };
};

export type TaggedPost = BloomboardPost & {
  taggedFlorist?: { _id: string; shopName?: string; shopLogo?: string | null } | null;
  shopRating?: number | null;
  verifiedOrder?: string | null;
  sentiment?: { label?: 'positive' | 'neutral' | 'negative' | null; score?: number | null } | null;
};

export const getTaggableShops = async () =>
  (
    await apiRequest<{ success: boolean; message: string; data: { count: number; shops: TaggableShop[] } }>(
      '/bloomboard/shops/taggable',
      { method: 'GET', authenticated: true }
    )
  ).data.shops;

export const getShopTaggedPosts = async (floristId: string, limit = 10) =>
  (
    await apiRequest<{
      success: boolean;
      message: string;
      data: { florist: { _id: string; shopName: string }; summary: ShopCommunityRating; posts: TaggedPost[] };
    }>(`/bloomboard/shops/${encodeURIComponent(floristId)}/tagged?limit=${limit}`, { method: 'GET' })
  ).data;
