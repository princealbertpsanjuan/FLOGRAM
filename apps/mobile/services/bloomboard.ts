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
