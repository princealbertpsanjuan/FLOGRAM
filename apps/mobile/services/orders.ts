import { apiRequest } from './api';

import type {
  CheckoutFlorist,
  FulfillmentType,
  PaymentMethod,
  PaymentStatus,
} from './checkout';

/*
 * =========================================================
 * ORDER STATUS
 * =========================================================
 */

export type CustomerOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'ready_for_delivery'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type OrderSourceType =
  | 'flower_listing'
  | 'custom_bouquet';

/*
 * =========================================================
 * USER
 * =========================================================
 */

export type OrderUser = {
  _id: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  phoneNumber?: string;

  profileImage?: string | null;
};

/*
 * =========================================================
 * FLOWER
 * =========================================================
 */

export type OrderFlower = {
  _id: string;

  name?: string;

  images?: string[];

  price?: number;
};

/*
 * =========================================================
 * DELIVERY ADDRESS
 * =========================================================
 */

export type OrderDeliveryAddress = {
  street?: string | null;

  barangay?: string | null;

  city?: string | null;

  province?: string | null;

  postalCode?: string | null;

  landmark?: string | null;
};

/*
 * =========================================================
 * LOCATION
 * =========================================================
 */

export type OrderLocation = {
  latitude: number | null;

  longitude: number | null;
};

/*
 * =========================================================
 * CUSTOMER ORDER
 * =========================================================
 */

export type CustomerOrder = {
  _id: string;

  /*
   * Seller order list only: the latest delivery request.
   */
  delivery?: {
    _id: string;
    status: 'available' | 'accepted' | 'picked_up' | 'out_for_delivery' | 'delivered' | 'cancelled';
    acceptedAt?: string | null;
    rider?: { firstName?: string; lastName?: string; phoneNumber?: string } | null;
  } | null;

  /*
   * Gift add-ons bought with this bouquet (snapshot).
   */
  addOns?: {
    addOn?: string;
    name: string;
    category?: string;
    price: number;
    quantity: number;
  }[];

  addOnsTotal?: number;

  customer:
    | OrderUser
    | string;

  seller:
    | OrderUser
    | string;

  florist:
    | CheckoutFlorist
    | string;

  sourceType: OrderSourceType;

  flower?:
    | OrderFlower
    | string
    | null;

  customBouquetRequest?:
    | unknown
    | string
    | null;

  /*
   * Product snapshot
   */

  productName: string;

  productDescription?: string | null;

  inspirationImage?: string | null;

  unitPrice: number;

  quantity: number;

  subtotal: number;

  deliveryFee: number;

  preOrderFee: number;

  totalAmount: number;

  /*
   * Fulfillment
   */

  fulfillmentType: FulfillmentType;

  deliveryAddress?: OrderDeliveryAddress;

  deliveryLocation?: OrderLocation;

  pickupLocation?: OrderLocation;

  deliveryDistanceMeters?: number | null;

  deliveryDurationSeconds?: number | null;

  recipientName?: string | null;

  recipientPhoneNumber?: string | null;

  /*
   * Pre-order
   */

  requestedDeliveryDate?: string | null;

  isPreOrder: boolean;

  requestedDeliveryTimeStart?: string | null;

  requestedDeliveryTimeEnd?: string | null;

  customerNotes?: string | null;

  /*
   * Bouquet details
   */

  occasion?: string | null;

  flowerTypes?: string[];

  colors?: string[];

  styles?: string[];

  wrapping?: string | null;

  specialInstructions?: string[];

  /*
   * Order lifecycle
   */

  orderStatus: CustomerOrderStatus;

  /*
   * Payment
   */

  paymentMethod?: PaymentMethod | null;

  paymentStatus: PaymentStatus;

  paymentProvider?: 'paymongo' | null;

  paymentChannel?: string | null;

  paymongoCheckoutSessionId?: string | null;

  paymongoPaymentIntentId?: string | null;

  paymongoPaymentId?: string | null;

  paymentCheckoutUrl?: string | null;

  paymentInitiatedAt?: string | null;

  paidAt?: string | null;

  paymentFailedAt?: string | null;

  refundedAt?: string | null;

  lastPaymentEventId?: string | null;

  /*
   * Seller / lifecycle details
   */

  sellerNotes?: string | null;

  confirmedAt?: string | null;

  preparingAt?: string | null;

  readyAt?: string | null;

  deliveredAt?: string | null;

  completedAt?: string | null;

  cancelledAt?: string | null;

  cancellationReason?: string | null;

  createdAt: string;

  updatedAt: string;
};

/*
 * =========================================================
 * FILTERS
 * =========================================================
 */

export type CustomerOrderFilters = {
  status?: CustomerOrderStatus;

  paymentStatus?: PaymentStatus;
};

/*
 * =========================================================
 * API RESPONSE TYPES
 * =========================================================
 */

type GetMyOrdersResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    orders: CustomerOrder[];
  };
};

type GetOrderResponse = {
  success: boolean;

  message: string;

  data: {
    order: CustomerOrder;
  };
};

type CancelOrderResponse = {
  success: boolean;

  message: string;

  data: {
    order: CustomerOrder;
  };
};

type CompleteOrderResponse = {
  success: boolean;

  message: string;

  data: {
    order: CustomerOrder;
  };
};

/*
 * =========================================================
 * BUILD QUERY
 * =========================================================
 */

function buildOrderQuery(
  filters?: CustomerOrderFilters
): string {
  if (!filters) {
    return '';
  }

  const params =
    new URLSearchParams();

  if (filters.status) {
    params.append(
      'status',
      filters.status
    );
  }

  if (filters.paymentStatus) {
    params.append(
      'paymentStatus',
      filters.paymentStatus
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : '';
}

/*
 * =========================================================
 * GET MY ORDERS
 *
 * GET /orders/mine
 * =========================================================
 */

export async function getMyOrders(
  filters?: CustomerOrderFilters
): Promise<CustomerOrder[]> {
  const query =
    buildOrderQuery(
      filters
    );

  const response =
    await apiRequest<GetMyOrdersResponse>(
      `/orders/mine${query}`,
      {
        method: 'GET',

        authenticated: true,
      }
    );

  return response.data.orders;
}

/*
 * =========================================================
 * GET ONE ORDER
 *
 * GET /orders/:orderId
 * =========================================================
 */

export async function getOrderById(
  orderId: string
): Promise<CustomerOrder> {
  const response =
    await apiRequest<GetOrderResponse>(
      `/orders/${orderId}`,
      {
        method: 'GET',

        authenticated: true,
      }
    );

  return response.data.order;
}

/*
 * =========================================================
 * CANCEL CUSTOMER ORDER
 *
 * PATCH /orders/:orderId/cancel
 * =========================================================
 */

export async function cancelOrder(
  orderId: string,
  reason?: string
): Promise<CustomerOrder> {
  const response =
    await apiRequest<CancelOrderResponse>(
      `/orders/${orderId}/cancel`,
      {
        method: 'PATCH',

        authenticated: true,

        body: JSON.stringify({
          reason:
            reason?.trim() ||
            null,
        }),
      }
    );

  return response.data.order;
}

/*
 * =========================================================
 * COMPLETE DELIVERED ORDER
 *
 * PATCH /orders/:orderId/complete
 * =========================================================
 */

export async function completeOrder(
  orderId: string
): Promise<CustomerOrder> {
  const response =
    await apiRequest<CompleteOrderResponse>(
      `/orders/${orderId}/complete`,
      {
        method: 'PATCH',

        authenticated: true,
      }
    );

  return response.data.order;
}

/*
 * =========================================================
 * PAY NOW (online payment not finished)
 *
 * POST /payments/orders/:orderId/pay
 *
 * Reuses the open PayMongo page when it is still active,
 * or creates a new one when it expired. Cart orders are
 * paid together with the rest of their checkout.
 * =========================================================
 */

export type OrderPaymentSession = {
  orderId: string;

  checkoutId?: string;

  checkoutSessionId?: string;

  checkoutUrl: string | null;

  alreadyPaid?: boolean;

  paymentStatus: PaymentStatus;

  totalAmount?: number;
};

type OrderPaymentResponse = {
  success: boolean;

  message: string;

  data: OrderPaymentSession;
};

export async function payOrderOnline(
  orderId: string
): Promise<OrderPaymentSession> {
  const response =
    await apiRequest<OrderPaymentResponse>(
      `/payments/orders/${encodeURIComponent(orderId.trim())}/pay`,
      {
        method: 'POST',

        authenticated: true,
      }
    );

  return response.data;
}

/*
 * =========================================================
 * ONLINE PAYMENT RESULT (after closing PayMongo)
 *
 * GET /payments/orders/:orderId/status
 *
 * The server also asks PayMongo directly, so a payment is
 * found even when the webhook is late. Checks a few times
 * and returns true once the order is paid (= placed).
 * =========================================================
 */

type OrderPaymentStatusResponse = {
  success: boolean;

  message: string;

  data: {
    order: {
      _id: string;
      paymentStatus: PaymentStatus;
      orderStatus?: string;
    };
  };
};

export async function waitForOrderPayment(
  orderId: string,
  attempts = 4
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    try {
      const response =
        await apiRequest<OrderPaymentStatusResponse>(
          `/payments/orders/${encodeURIComponent(orderId.trim())}/status`,
          {
            authenticated: true,
          }
        );

      if (response.data.order.paymentStatus === 'paid') {
        return true;
      }
    } catch {
      // try again
    }
  }

  return false;
}

/*
 * Shown when the customer closes PayMongo without paying.
 */
export const PAYMENT_NOT_COMPLETED_TITLE =
  'Payment not completed';

export const PAYMENT_NOT_COMPLETED_MESSAGE =
  "Your order hasn't been placed yet. You can pay with Pay Now in My Orders within 30 minutes, or cancel it there. Unpaid orders are cancelled automatically.";

/*
 * Online payment started but not finished, and the
 * order can still be paid.
 */
export const canPayOrderOnline = (order: {
  paymentMethod?: PaymentMethod | null;
  paymentStatus?: PaymentStatus | null;
  orderStatus?: string | null;
}) =>
  order.paymentMethod === 'paymongo' &&
  order.paymentStatus !== 'paid' &&
  order.paymentStatus !== 'refunded' &&
  !['cancelled', 'completed', 'delivered'].includes(String(order.orderStatus || ''));

/*
 * =========================================================
 * SELLER ORDER FILTERS
 * =========================================================
 */

export type SellerOrderFilters = {
  status?: CustomerOrderStatus;
  paymentStatus?: PaymentStatus;
};

/*
 * =========================================================
 * GET SELLER ORDERS
 *
 * GET /orders/seller/mine
 * =========================================================
 */

export async function getSellerOrders(
  filters?: SellerOrderFilters
): Promise<CustomerOrder[]> {
  const query = buildOrderQuery(filters);

  const response =
    await apiRequest<GetMyOrdersResponse>(
      `/orders/seller/mine${query}`,
      {
        method: 'GET',
        authenticated: true,
      }
    );

  return response.data.orders;
}

/*
 * =========================================================
 * SELLER
 * UPDATE ORDER STATUS
 *
 * PATCH /orders/:orderId/status
 * =========================================================
 */

type UpdateSellerOrderStatusResponse = {
  success: boolean;

  message: string;

  data: {
    order: CustomerOrder;
  };
};

export type SellerUpdateOrderStatus =
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'ready_for_delivery';

export async function updateSellerOrderStatus(
  orderId: string,
  status: SellerUpdateOrderStatus,
  sellerNotes?: string
): Promise<CustomerOrder> {
  if (!orderId.trim()) {
    throw new Error(
      'Order ID is required.'
    );
  }

  const response =
    await apiRequest<UpdateSellerOrderStatusResponse>(
      `/orders/${encodeURIComponent(
        orderId.trim()
      )}/status`,
      {
        method: 'PATCH',

        authenticated: true,

        body: JSON.stringify({
          status,

          sellerNotes:
            sellerNotes?.trim() ||
            null,
        }),
      }
    );

  return response.data.order;
}

/*
 * =========================================================
 * SELLER
 * PICKUP HANDOVER / CANCEL ORDER
 * =========================================================
 */

export async function markPickupOrderCollected(orderId: string): Promise<CustomerOrder> {
  const response = await apiRequest<UpdateSellerOrderStatusResponse>(
    `/orders/${encodeURIComponent(orderId.trim())}/picked-up`,
    { method: 'PATCH', authenticated: true }
  );

  return response.data.order;
}

export async function cancelOrderAsSeller(orderId: string, reason: string): Promise<CustomerOrder> {
  const response = await apiRequest<UpdateSellerOrderStatusResponse>(
    `/orders/${encodeURIComponent(orderId.trim())}/seller-cancel`,
    { method: 'PATCH', authenticated: true, body: JSON.stringify({ reason: reason.trim() }) }
  );

  return response.data.order;
}
