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