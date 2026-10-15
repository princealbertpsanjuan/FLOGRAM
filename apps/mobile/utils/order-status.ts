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
 * An online (PayMongo) order is only placed once PayMongo
 * confirms the payment. Before that the Seller does not
 * see it (the backend enforces this) and the customer
 * sees "Waiting for payment — not placed yet".
 */
export const isAwaitingOnlinePayment = (order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}) =>
  order.paymentMethod === 'paymongo' &&
  order.paymentStatus !== 'paid' &&
  order.paymentStatus !== 'refunded';

export const NOT_PLACED_STATUS_LABEL =
  'Waiting for payment — not placed yet';

/*
 * Unpaid online order that can still be paid or cancelled.
 */
export const isOnlineOrderNotPlaced = (order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
}) =>
  order.orderStatus === 'pending' &&
  isAwaitingOnlinePayment(order);

/*
 * Customer label for an order, aware of online payment.
 */
export const getCustomerOrderDisplayLabel = (order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  orderStatus?: string | null;
}) =>
  isOnlineOrderNotPlaced(order)
    ? NOT_PLACED_STATUS_LABEL
    : getCustomerOrderStatusLabel(order.orderStatus);

/*
 * Shop product sales for one order: what the customer paid
 * for the bouquet and add-ons.
 *
 *   totalAmount − deliveryFee − preOrderFee
 *
 * The delivery fee goes to the Rider and the pre-order fee
 * goes to FLOGRAM, so neither is the shop's sale (same rule
 * as the server's revenue / payout services).
 */
export const getShopRevenue = (order: {
  totalAmount?: number | null;
  deliveryFee?: number | null;
  preOrderFee?: number | null;
}) =>
  Math.max(
    0,
    Number(order.totalAmount || 0) -
      Number(order.deliveryFee || 0) -
      Number(order.preOrderFee || 0)
  );
