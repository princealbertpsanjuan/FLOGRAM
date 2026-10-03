import { apiRequest } from './api';

/*
 * =========================================================
 * ANALYTICS
 * =========================================================
 *
 * AFINN-165 review sentiment and FP-Growth buying patterns.
 * =========================================================
 */

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type SentimentReview = {
  id: string;
  comment: string;
  rating: number;
  shopName: string;
  customerName: string;
  createdAt: string;
  sentiment: {
    score: number;
    comparative: number;
    label: SentimentLabel;
    positiveWords: string[];
    negativeWords: string[];
  };
};

export type SentimentReport = {
  method: string;
  totalReviews: number;
  analyzedReviews: number;
  counts: Record<SentimentLabel, number>;
  averageScore: number;
  positiveShare: number;
  negativeShare: number;
  topPositiveWords: { word: string; count: number }[];
  topNegativeWords: { word: string; count: number }[];
  recentNegative: SentimentReview[];
  recentPositive: SentimentReview[];
  byShop: {
    shopName: string;
    positive: number;
    neutral: number;
    negative: number;
    count: number;
    averageScore: number;
  }[];
};

export type PatternItem = {
  key: string;
  type: 'bouquet' | 'addon';
  id: string | null;
  name: string;
  shopName: string;
  image: string | null;
};

export type BuyingPatternReport = {
  algorithm: string;
  transactionCount: number;
  multiItemTransactions: number;
  minSupportCount: number;
  minConfidence: number;
  topItems: { item: PatternItem; count: number; support: number }[];
  frequentItemsets: { items: PatternItem[]; count: number; support: number }[];
  rules: {
    antecedent: PatternItem[];
    consequent: PatternItem[];
    count: number;
    support: number;
    confidence: number;
    lift: number;
  }[];
};

type Wrapped<T> = { success: boolean; message: string; data: T };

export type AnalyticsScope = 'admin' | 'seller';

export const getSentimentReport = async (scope: AnalyticsScope) =>
  (
    await apiRequest<Wrapped<SentimentReport>>(`/analytics/${scope}/sentiment`, {
      method: 'GET',
      authenticated: true,
    })
  ).data;

export const getBuyingPatternReport = async (scope: AnalyticsScope) =>
  (
    await apiRequest<Wrapped<BuyingPatternReport>>(`/analytics/${scope}/buying-patterns`, {
      method: 'GET',
      authenticated: true,
    })
  ).data;

export const getAlsoBought = async <T = unknown>(flowerId: string) =>
  (
    await apiRequest<Wrapped<{ basedOn: string; flowers: T[] }>>(
      `/analytics/flowers/${encodeURIComponent(flowerId)}/also-bought`,
      { method: 'GET' }
    )
  ).data;
