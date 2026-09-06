import {
  apiRequest,
} from './api';

/*
 * =========================================================
 * REVIEW TYPES
 * =========================================================
 */

export type ReviewRating =
  | 1
  | 2
  | 3
  | 4
  | 5;

/*
 * =========================================================
 * BASIC USER
 * =========================================================
 */

export type ReviewUser = {
  _id:
    string;

  firstName:
    string;

  lastName:
    string;

  profileImage?:
    string | null;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

export type ReviewFlorist = {
  _id:
    string;

  shopName:
    string;

  shopLogo?:
    string | null;
};

/*
 * =========================================================
 * RIDER
 * =========================================================
 */

export type ReviewRider = {
  _id:
    string;

  owner?:
    ReviewUser | null;

  vehicleType?:
    string | null;

  vehiclePlateNumber?:
    string | null;

  verificationStatus?:
    string | null;

  isAvailable?:
    boolean;

  isActive?:
    boolean;
};

/*
 * =========================================================
 * ORDER
 * =========================================================
 *
 * The backend populates the Order when a Review is returned.
 *
 * We only type the fields currently needed by the Customer
 * Review UI.
 *
 * Additional Order fields can still exist in the response.
 * =========================================================
 */

export type ReviewOrder = {
  _id:
    string;

  customer:
    string | ReviewUser;

  seller:
    string | ReviewUser;

  florist:
    string | ReviewFlorist;

  sourceType:
    'flower_listing' |
    'custom_bouquet';

  flower?:
    string | {
      _id:
        string;

      name?:
        string;

      price?:
        number;

      images?:
        string[];
    } | null;

  customBouquetRequest?:
    string | null;

  productName:
    string;

  productDescription?:
    string | null;

  inspirationImage?:
    string | null;

  unitPrice:
    number;

  quantity:
    number;

  subtotal:
    number;

  deliveryFee:
    number;

  preOrderFee?:
    number;

  totalAmount:
    number;

  fulfillmentType:
    'delivery' |
    'pickup';

  occasion?:
    string | null;

  flowerTypes?:
    string[];

  colors?:
    string[];

  orderStatus:
    string;

  paymentMethod:
    string;

  paymentStatus:
    string;

  deliveredAt?:
    string | null;

  completedAt?:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;
};

/*
 * =========================================================
 * DELIVERY
 * =========================================================
 */

export type ReviewDelivery = {
  _id:
    string;

  order:
    string | ReviewOrder;

  customer:
    string | ReviewUser;

  seller:
    string | ReviewUser;

  florist:
    string | ReviewFlorist;

  rider?:
    string | ReviewRider | null;

  riderUser?:
    string | ReviewUser | null;

  recipientName?:
    string | null;

  recipientPhoneNumber?:
    string | null;

  status:
    string;

  deliveredAt?:
    string | null;

  createdAt?:
    string;

  updatedAt?:
    string;
};

/*
 * =========================================================
 * REVIEW
 * =========================================================
 */

export type Review = {
  id:
    string;

  order:
    ReviewOrder;

  customer:
    ReviewUser;

  seller:
    ReviewUser;

  florist:
    ReviewFlorist;

  delivery:
    ReviewDelivery | null;

  rider:
    ReviewRider | null;

  riderUser:
    ReviewUser | null;

  overallRating:
    number;

  orderRating:
    number;

  sellerRating:
    number;

  riderRating:
    number | null;

  systemRating:
    number;

  comment:
    string | null;

  createdAt:
    string | null;

  updatedAt:
    string | null;
};

/*
 * =========================================================
 * CREATE REVIEW PAYLOAD
 * =========================================================
 *
 * IMPORTANT:
 *
 * Do NOT send:
 *
 * - customer
 * - seller
 * - florist
 * - delivery
 * - rider
 * - riderUser
 *
 * The backend resolves those from the real Order and
 * Delivery records.
 * =========================================================
 */

export type CreateReviewPayload = {
  overallRating:
    ReviewRating;

  orderRating:
    ReviewRating;

  sellerRating:
    ReviewRating;

  /*
   * Required only when the backend reports:
   *
   * riderRatingRequired: true
   */
  riderRating?:
    ReviewRating | null;

  systemRating:
    ReviewRating;

  comment?:
    string | null;
};

/*
 * =========================================================
 * ORDER REVIEW STATUS
 * =========================================================
 */

export type OrderReviewStatus = {
  reviewed:
    boolean;

  canReview:
    boolean;

  riderRatingRequired:
    boolean;

  review:
    Review | null;
};

/*
 * =========================================================
 * MY REVIEWS
 * =========================================================
 */

export type MyReviewsData = {
  count:
    number;

  reviews:
    Review[];
};

/*
 * =========================================================
 * API RESPONSE TYPES
 * =========================================================
 */

type CreateReviewResponse = {
  success:
    boolean;

  message:
    string;

  data: {
    review:
      Review;
  };
};

type OrderReviewResponse = {
  success:
    boolean;

  message:
    string;

  data:
    OrderReviewStatus;
};

type MyReviewsResponse = {
  success:
    boolean;

  message:
    string;

  data:
    MyReviewsData;
};

/*
 * =========================================================
 * CUSTOMER
 * CREATE REVIEW
 * =========================================================
 *
 * POST
 * /api/v1/reviews/orders/:orderId
 * =========================================================
 */

export const createReview =
  async (
    orderId:
      string,

    payload:
      CreateReviewPayload
  ): Promise<Review> => {
    const cleanOrderId =
      String(
        orderId || ''
      ).trim();

    if (!cleanOrderId) {
      throw new Error(
        'Order ID is required.'
      );
    }

    /*
     * Do not include riderRating when it is null or
     * undefined.
     *
     * Pickup orders do not require it.
     */

    const body: {
      overallRating:
        ReviewRating;

      orderRating:
        ReviewRating;

      sellerRating:
        ReviewRating;

      riderRating?:
        ReviewRating;

      systemRating:
        ReviewRating;

      comment?:
        string | null;
    } = {
      overallRating:
        payload
          .overallRating,

      orderRating:
        payload
          .orderRating,

      sellerRating:
        payload
          .sellerRating,

      systemRating:
        payload
          .systemRating,
    };

    if (
      payload.riderRating !==
        undefined &&
      payload.riderRating !==
        null
    ) {
      body.riderRating =
        payload.riderRating;
    }

    const cleanComment =
      String(
        payload.comment ||
        ''
      ).trim();

    if (cleanComment) {
      body.comment =
        cleanComment;
    }

    const response =
      await apiRequest<CreateReviewResponse>(
        `/reviews/orders/${cleanOrderId}`,
        {
          method:
            'POST',

          authenticated:
            true,

          body:
            JSON.stringify(
              body
            ),
        }
      );

    return response.data
      .review;
  };

/*
 * =========================================================
 * CUSTOMER
 * GET REVIEW STATUS FOR ONE ORDER
 * =========================================================
 *
 * GET
 * /api/v1/reviews/orders/:orderId
 *
 * Example before review:
 *
 * {
 *   reviewed: false,
 *   canReview: true,
 *   riderRatingRequired: true,
 *   review: null
 * }
 *
 * Example after review:
 *
 * {
 *   reviewed: true,
 *   canReview: false,
 *   riderRatingRequired: true,
 *   review: {...}
 * }
 * =========================================================
 */

export const getOrderReview =
  async (
    orderId:
      string
  ): Promise<OrderReviewStatus> => {
    const cleanOrderId =
      String(
        orderId || ''
      ).trim();

    if (!cleanOrderId) {
      throw new Error(
        'Order ID is required.'
      );
    }

    const response =
      await apiRequest<OrderReviewResponse>(
        `/reviews/orders/${cleanOrderId}`,
        {
          method:
            'GET',

          authenticated:
            true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * CUSTOMER
 * GET MY REVIEWS
 * =========================================================
 *
 * GET
 * /api/v1/reviews/mine
 * =========================================================
 */

export const getMyReviews =
  async (): Promise<MyReviewsData> => {
    const response =
      await apiRequest<MyReviewsResponse>(
        '/reviews/mine',
        {
          method:
            'GET',

          authenticated:
            true,
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * HELPER
 * CHECK WHETHER ORDER CAN BE REVIEWED
 * =========================================================
 *
 * Useful in:
 *
 * customer-orders.tsx
 * customer-order-details.tsx
 * =========================================================
 */

export const canReviewOrder =
  async (
    orderId:
      string
  ): Promise<boolean> => {
    const result =
      await getOrderReview(
        orderId
      );

    return (
      result.canReview ===
        true &&
      result.reviewed ===
        false
    );
  };

/*
 * =========================================================
 * HELPER
 * CHECK WHETHER ORDER HAS BEEN REVIEWED
 * =========================================================
 */

export const hasReviewedOrder =
  async (
    orderId:
      string
  ): Promise<boolean> => {
    const result =
      await getOrderReview(
        orderId
      );

    return (
      result.reviewed ===
      true
    );
  };