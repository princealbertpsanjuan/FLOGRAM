/*
 * =========================================================
 * STANDARD ORDER / PAYMENT TERMINOLOGY
 * =========================================================
 *
 * One vocabulary for Customer, Seller and Admin screens.
 * =========================================================
 */

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'New Order',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for Pickup',
  ready_for_delivery: 'Ready for Delivery',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/*
 * Customer-facing wording for the same statuses.
 */
export const CUSTOMER_ORDER_STATUS_LABELS: Record<string, string> = {
  ...ORDER_STATUS_LABELS,
  pending: 'Waiting for Shop',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash_on_delivery: 'Cash on Delivery',
  cash_on_pickup: 'Cash on Pickup',
  paymongo: 'Online Payment (PayMongo)',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Awaiting Payment',
  paid: 'Paid',
  failed: 'Payment Failed',
  refunded: 'Refunded',
};

const titleCase = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

export const getOrderStatusLabel = (status?: string | null) =>
  status ? ORDER_STATUS_LABELS[status] ?? titleCase(status) : 'Unknown';

export const getCustomerOrderStatusLabel = (status?: string | null) =>
  status
    ? CUSTOMER_ORDER_STATUS_LABELS[status] ?? titleCase(status)
    : 'Unknown';

export const getPaymentMethodLabel = (method?: string | null) =>
  method ? PAYMENT_METHOD_LABELS[method] ?? titleCase(method) : '—';

export const getPaymentStatusLabel = (status?: string | null) =>
  status ? PAYMENT_STATUS_LABELS[status] ?? titleCase(status) : '—';

/*
 * An online (PayMongo) order may only be accepted by the
 * Seller after PayMongo confirms the payment. The backend
 * enforces this; the UI must not offer "Accept" before it.
 */
export const isAwaitingOnlinePayment = (order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}) => order.paymentMethod === 'paymongo' && order.paymentStatus !== 'paid';

/*
 * Shop revenue for one order: what the customer paid for
 * the bouquet (and any pre-order fee). The delivery fee is
 * excluded because it is paid out to the Rider.
 */
export const getShopRevenue = (order: {
  totalAmount?: number | null;
  deliveryFee?: number | null;
}) =>
  Math.max(
    0,
    Number(order.totalAmount || 0) - Number(order.deliveryFee || 0)
  );
