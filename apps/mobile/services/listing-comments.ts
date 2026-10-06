import { apiRequest } from './api';

type Wrapped<T> = { success: boolean; message: string; data: T };

export type ListingFeedback = {
  averageRating: number | null;
  reviewCount: number;
  reviews: { _id: string; rating: number; comment: string; authorName: string; createdAt: string }[];
  comments: {
    _id: string;
    text: string;
    authorId: string | null;
    authorName: string;
    authorRole: 'customer' | 'seller';
    createdAt: string;
  }[];
};

export const getListingFeedback = async (flowerId: string) =>
  (
    await apiRequest<Wrapped<ListingFeedback>>(`/listing-comments/flowers/${encodeURIComponent(flowerId)}`, {
      method: 'GET',
    })
  ).data;

export const postListingComment = (flowerId: string, text: string) =>
  apiRequest<Wrapped<unknown>>(`/listing-comments/flowers/${encodeURIComponent(flowerId)}`, {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify({ text }),
  });

export const deleteListingComment = (commentId: string) =>
  apiRequest<Wrapped<unknown>>(`/listing-comments/${encodeURIComponent(commentId)}`, {
    method: 'DELETE',
    authenticated: true,
  });
