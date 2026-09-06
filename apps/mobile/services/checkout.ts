import { apiRequest } from './api';

/*
 * =========================================================
 * SHARED TYPES
 * =========================================================
 */

export type FulfillmentType =
  | 'delivery'
  | 'pickup';

export type PaymentMethod =
  | 'cash_on_delivery'
  | 'cash_on_pickup'
  | 'paymongo';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded';

export type CheckoutStatus =
  | 'created'
  | 'payment_pending'
  | 'paid'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

/*
 * =========================================================
 * LOCATION
 * =========================================================
 */

export type CheckoutLocation = {
  latitude: number | null;
  longitude: number | null;
};

/*
 * =========================================================
 * ADDRESS
 * =========================================================
 */

export type CheckoutAddress = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  landmark?: string;
};

/*
 * =========================================================
 * FLOWER
 * =========================================================
 */

export type CheckoutFlower = {
  _id: string;
  name?: string;
  description?: string;
  price?: number;
  images?: string[];
  isAvailable?: boolean;
  isActive?: boolean;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

export type CheckoutFlorist = {
  _id: string;
  shopName?: string;
  address?: unknown;
  location?: {
    latitude?: number;
    longitude?: number;
  };
  shopLogo?: string | null;
};

/*
 * =========================================================
 * CHILD ORDER
 * =========================================================
 */

export type CheckoutOrder = {
  _id: string;

  productName?: string;
  inspirationImage?: string | null;

  totalAmount?: number;

  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;

  florist?:
    | CheckoutFlorist
    | string
    | null;
};

/*
 * =========================================================
 * CHECKOUT ITEM
 * =========================================================
 */

export type CheckoutItem = {
  _id?: string;

  cartItem?: string | null;

  flower:
    | CheckoutFlower
    | string;

  seller: string;

  florist:
    | CheckoutFlorist
    | string;

  order:
    | CheckoutOrder
    | string
    | null;

  productName: string;

  inspirationImage?: string | null;

  quantity: number;

  unitPrice: number;

  subtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  deliveryDistanceMeters?: number | null;

  deliveryDurationSeconds?: number | null;
};

/*
 * =========================================================
 * SHOP BREAKDOWN
 * =========================================================
 */

export type CheckoutShopBreakdown = {
  florist:
    | CheckoutFlorist
    | string;

  shopName: string;

  itemCount: number;

  totalQuantity: number;

  productsSubtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  orders: (
    | CheckoutOrder
    | string
  )[];
};

/*
 * =========================================================
 * CUSTOMER
 * =========================================================
 */

export type CheckoutCustomer = {
  _id: string;

  firstName?: string;
  lastName?: string;

  email?: string;

  phoneNumber?: string;
};

/*
 * =========================================================
 * CHECKOUT
 * =========================================================
 */

export type CustomerCheckout = {
  _id: string;

  customer:
    | CheckoutCustomer
    | string;

  items: CheckoutItem[];

  orders: CheckoutOrder[];

  shopBreakdown: CheckoutShopBreakdown[];

  fulfillmentType: FulfillmentType;

  recipientName: string;

  recipientPhoneNumber: string;

  deliveryAddress?: CheckoutAddress;

  deliveryLocation?: CheckoutLocation;

  isPreOrder: boolean;

  requestedDeliveryDate?: string | null;

  requestedDeliveryTimeStart?: string | null;

  requestedDeliveryTimeEnd?: string | null;

  customerNotes?: string | null;

  productsSubtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  paymentMethod: PaymentMethod;

  paymentProvider?: 'paymongo' | null;

  paymentStatus: PaymentStatus;

  paymongoCheckoutSessionId?: string | null;

  paymongoPaymentId?: string | null;

  paymentCheckoutUrl?: string | null;

  paymentInitiatedAt?: string | null;

  paidAt?: string | null;

  paymentFailedAt?: string | null;

  lastPaymentEventId?: string | null;

  checkoutStatus: CheckoutStatus;

  createdAt: string;

  updatedAt: string;
};

/*
 * =========================================================
 * CHECKOUT QUOTE
 * =========================================================
 */

export type CheckoutQuoteItem = {
  cartItemId: string;

  flowerId: string;

  seller: string;

  florist: string;

  shopName: string;

  productName: string;

  inspirationImage?: string | null;

  quantity: number;

  unitPrice: number;

  subtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  deliveryDistanceMeters?: number | null;

  deliveryDurationSeconds?: number | null;
};

export type CheckoutQuoteShop = {
  florist: string;

  shopName: string;

  itemCount: number;

  totalQuantity: number;

  productsSubtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  deliveryDistanceMeters?: number | null;

  deliveryDurationSeconds?: number | null;

  items: CheckoutQuoteItem[];
};

export type CheckoutQuote = {
  fulfillmentType: FulfillmentType;

  isPreOrder: boolean;

  requestedDeliveryDate?: string | null;

  requestedDeliveryTimeStart?: string | null;

  requestedDeliveryTimeEnd?: string | null;

  itemCount: number;

  totalQuantity: number;

  shopCount: number;

  productsSubtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  shops: CheckoutQuoteShop[];

  items: CheckoutQuoteItem[];
};

/*
 * =========================================================
 * REQUEST BODY
 * =========================================================
 */

export type CheckoutRequestBody = {
  fulfillmentType: FulfillmentType;

  recipientName: string;

  recipientPhoneNumber: string;

  deliveryAddress?: CheckoutAddress;

  deliveryLocation?: {
    latitude: number;
    longitude: number;
  };

  isPreOrder?: boolean;

  requestedDeliveryDate?: string | null;

  requestedDeliveryTimeStart?: string | null;

  requestedDeliveryTimeEnd?: string | null;

  customerNotes?: string | null;
};

export type CreateCheckoutRequestBody =
  CheckoutRequestBody & {
    paymentMethod: PaymentMethod;
  };

/*
 * =========================================================
 * PAYMONGO RESULT
 * =========================================================
 */

export type PayMongoCheckoutSession = {
  checkoutId: string;

  checkoutSessionId: string;

  checkoutUrl: string;

  paymentStatus: PaymentStatus;

  productsSubtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;
};

/*
 * =========================================================
 * API RESPONSE TYPES
 * =========================================================
 */

type CheckoutQuoteResponse = {
  success: boolean;

  message: string;

  data: {
    quote: CheckoutQuote;
  };
};

type CreateCheckoutResponse = {
  success: boolean;

  message: string;

  data: {
    checkout: CustomerCheckout;
  };
};

type GetMyCheckoutsResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    checkouts: CustomerCheckout[];
  };
};

type GetCheckoutResponse = {
  success: boolean;

  message: string;

  data: {
    checkout: CustomerCheckout;
  };
};

type PayMongoCheckoutResponse = {
  success: boolean;

  message: string;

  data: PayMongoCheckoutSession;
};

/*
 * =========================================================
 * GET LIVE CHECKOUT QUOTE
 *
 * POST /checkout/quote
 * =========================================================
 */

export async function quoteCheckout(
  payload: CheckoutRequestBody
): Promise<CheckoutQuote> {
  const response =
    await apiRequest<CheckoutQuoteResponse>(
      '/checkout/quote',
      {
        method: 'POST',

        authenticated: true,

        body: JSON.stringify(
          payload
        ),
      }
    );

  return response.data.quote;
}

/*
 * =========================================================
 * CREATE CHECKOUT
 *
 * POST /checkout
 * =========================================================
 */

export async function createCheckout(
  payload: CreateCheckoutRequestBody
): Promise<CustomerCheckout> {
  const response =
    await apiRequest<CreateCheckoutResponse>(
      '/checkout',
      {
        method: 'POST',

        authenticated: true,

        body: JSON.stringify(
          payload
        ),
      }
    );

  return response.data.checkout;
}

/*
 * =========================================================
 * GET CUSTOMER CHECKOUT HISTORY
 *
 * GET /checkout/mine
 * =========================================================
 */

export async function getMyCheckouts(): Promise<
  CustomerCheckout[]
> {
  const response =
    await apiRequest<GetMyCheckoutsResponse>(
      '/checkout/mine',
      {
        method: 'GET',

        authenticated: true,
      }
    );

  return response.data.checkouts;
}

/*
 * =========================================================
 * GET ONE CUSTOMER CHECKOUT
 *
 * GET /checkout/:checkoutId
 * =========================================================
 */

export async function getCheckoutById(
  checkoutId: string
): Promise<CustomerCheckout> {
  const response =
    await apiRequest<GetCheckoutResponse>(
      `/checkout/${checkoutId}`,
      {
        method: 'GET',

        authenticated: true,
      }
    );

  return response.data.checkout;
}

/*
 * =========================================================
 * CREATE PAYMONGO SESSION
 *
 * POST /checkout/:checkoutId/paymongo
 * =========================================================
 */

export async function createPayMongoCheckoutSession(
  checkoutId: string
): Promise<PayMongoCheckoutSession> {
  const response =
    await apiRequest<PayMongoCheckoutResponse>(
      `/checkout/${checkoutId}/paymongo`,
      {
        method: 'POST',

        authenticated: true,
      }
    );

  return response.data;
}