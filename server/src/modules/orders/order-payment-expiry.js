import Order from "./order.model.js";
import Checkout from "../checkout/checkout.model.js";
import Cart from "../cart/cart.model.js";
import { notifyAdmins, notifySafely } from "../notifications/notify-helpers.js";
import {
  expirePayMongoCheckoutSession,
  retrievePayMongoCheckoutSession,
} from "../payments/paymongo.service.js";

/*
 * =========================================================
 * ONLINE PAYMENT: NOT PLACED UNTIL PAID
 * =========================================================
 *
 * An order paid online (PayMongo) is only a "placed" order
 * once the payment is confirmed (webhook or "Pay Now"
 * finding the paid session). Until then:
 *
 * - the shop does not see it and is not notified
 * - it is not an active order for Admin
 * - the customer sees "Waiting for payment" with
 *   Pay Now / Cancel
 *
 * If it is not paid within PAYMENT_WINDOW_MS it is
 * cancelled with reason "Payment not completed" (the
 * PayMongo session is closed first, so it can no longer
 * be paid) and the bouquets go back to the cart.
 *
 * Cash on delivery / cash on pickup orders are placed
 * immediately and are not affected.
 *
 * Runs on a timer (server.js) and lazily before order
 * lists are read, like order-auto-complete.js.
 * =========================================================
 */

export const PAYMENT_WINDOW_MS =
  Math.max(Number(process.env.ONLINE_PAYMENT_WINDOW_MINUTES) || 30, 5) * 60 * 1000;

/*
 * If PayMongo cannot be reached we cannot prove the order
 * is unpaid (the session might have been paid), so it is
 * kept until this much later and then cancelled anyway.
 */
export const PAYMONGO_UNREACHABLE_GRACE_MS = 24 * 60 * 60 * 1000;

export const PAYMENT_NOT_COMPLETED_REASON = "Payment not completed";

const PLACED_PAYMENT_STATUSES = ["paid", "refunded"];

/*
 * Mongo match for orders that are really placed:
 * every cash order, and online orders once paid.
 */
export const placedOrderMatch = () => ({
  $or: [
    { paymentMethod: { $ne: "paymongo" } },
    { paymentStatus: { $in: PLACED_PAYMENT_STATUSES } },
  ],
});

export const isAwaitingOnlinePayment = (order) =>
  order?.paymentMethod === "paymongo" &&
  !PLACED_PAYMENT_STATUSES.includes(order?.paymentStatus);

const formatWindow = () => `${Math.round(PAYMENT_WINDOW_MS / 60000)} minutes`;

/*
 * A payment that arrives after the order was auto-cancelled
 * for non-payment still places the order (the customer paid).
 */
export const reviveExpiredOrder = (order) => {
  if (
    order.orderStatus === "cancelled" &&
    order.cancellationReason === PAYMENT_NOT_COMPLETED_REASON
  ) {
    order.orderStatus = "pending";
    order.cancelledAt = null;
    order.cancellationReason = null;
  }
};

export const reviveExpiredOrders = async (orderIds) => {
  await Order.updateMany(
    {
      _id: { $in: orderIds },
      orderStatus: "cancelled",
      cancellationReason: PAYMENT_NOT_COMPLETED_REASON,
    },
    { $set: { orderStatus: "pending", cancelledAt: null, cancellationReason: null } }
  );
};

/*
 * Customer + shop notifications for a single order (custom
 * bouquet) whose online payment was just confirmed.
 * Grouped checkouts notify in checkout.service.js.
 */
export const notifyOrderPlacedAfterPayment = async (order) => {
  /*
   * Cancelled by the customer before paying, but the
   * payment still went through → Admin refunds it.
   */
  if (order.orderStatus === "cancelled") {
    await notifyAdmins({
      type: "order_cancelled",
      title: "Refund needed",
      message: `An online payment arrived for a cancelled order (${order.productName || "order"}). Refund ₱${Number(order.totalAmount || 0).toFixed(2)} to the customer.`,
      order: order._id,
      metadata: { needsRefund: true },
    });
    return;
  }

  await Promise.all([
    notifySafely({
      recipient: order.customer?._id || order.customer,
      role: "customer",
      type: "order_updated",
      title: "Payment received",
      message: `We received your online payment of ₱${Number(order.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}. Your order was placed and sent to the shop.`,
      order: order._id,
      metadata: { screen: "order", orderStatus: order.orderStatus },
    }),
    notifySafely({
      recipient: order.seller?._id || order.seller,
      role: "seller",
      type: "order_created",
      title: "New paid order",
      message: `${order.productName || "A bouquet"} was paid online. Please accept the order.`,
      order: order._id,
      metadata: { screen: "order", orderStatus: order.orderStatus },
    }),
  ]);
};

/*
 * Single order (no grouped checkout) found paid on PayMongo.
 * Shared by "Pay Now" and the expiry check. Runs once.
 */
/*
 * Atomically mark an order paid. The webhook, "Pay Now",
 * the payment-status poll and the expiry check can all
 * find the same payment at the same time: only the caller
 * that wins this claim saves and notifies (no duplicate
 * "Payment received" / "New paid order" notifications).
 */
export const claimOrderPayment = async (orderId) => {
  const result = await Order.updateOne(
    { _id: orderId, paymentStatus: { $nin: PLACED_PAYMENT_STATUSES } },
    { $set: { paymentStatus: "paid" } }
  );

  return result.modifiedCount > 0;
};

export const markSingleOrderPaid = async (order, session, paidPayment) => {
  if (order.paymentStatus === "paid") {
    return false;
  }

  if (!(await claimOrderPayment(order._id))) {
    return false;
  }

  const paymentAttributes = paidPayment?.attributes || {};

  order.paymentStatus = "paid";
  order.paymentProvider = "paymongo";
  order.paymongoCheckoutSessionId = session?.id || order.paymongoCheckoutSessionId;
  order.paymongoPaymentId = paidPayment?.id || order.paymongoPaymentId;
  order.paymentChannel =
    paymentAttributes?.source?.type ||
    paymentAttributes?.payment_method?.type ||
    order.paymentChannel ||
    null;
  order.paidAt = Number.isFinite(Number(paymentAttributes?.paid_at))
    ? new Date(Number(paymentAttributes.paid_at) * 1000)
    : new Date();
  order.paymentFailedAt = null;

  reviveExpiredOrder(order);

  await order.save();

  await notifyOrderPlacedAfterPayment(order);

  return true;
};

/*
 * Put the bouquets of cancelled, never-paid cart orders back
 * in the customer's cart so they can try again. Lines that
 * are already in the cart are left as they are.
 */
const restoreCartItems = async (customerId, orders) => {
  const listings = orders.filter((order) => order.sourceType === "flower_listing" && order.flower);

  if (!listings.length) {
    return 0;
  }

  try {
    let cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      cart = new Cart({ customer: customerId, items: [] });
    }

    const inCart = new Set(cart.items.map((item) => String(item.flower)));
    let restored = 0;

    listings.forEach((order) => {
      const flowerId = String(order.flower?._id || order.flower);

      if (inCart.has(flowerId)) {
        return;
      }

      cart.items.push({
        flower: flowerId,
        quantity: Math.max(Number(order.quantity) || 1, 1),
        addOns: (order.addOns || [])
          .filter((entry) => entry?.addOn)
          .map((entry) => ({
            addOn: entry.addOn,
            quantity: Math.min(Math.max(Number(entry.quantity) || 1, 1), 10),
          })),
      });

      inCart.add(flowerId);
      restored += 1;
    });

    if (restored) {
      await cart.save();
    }

    return restored;
  } catch (error) {
    console.warn(`Restoring cart items failed: ${error.message}`);
    return 0;
  }
};

/*
 * =========================================================
 * CANCEL AN UNPAID ONLINE ORDER (AND ITS CHECKOUT GROUP)
 * =========================================================
 *
 * One PayMongo session pays every order of a cart checkout,
 * so the whole group is cancelled together.
 *
 * Returns:
 * - { placed: true }    PayMongo says it was paid → placed
 * - { unknown: true }   PayMongo unreachable and not forced
 * - { cancelled: [...] } orders that were cancelled
 * =========================================================
 */
/*
 * =========================================================
 * ASK PAYMONGO WHETHER IT WAS PAID
 * =========================================================
 *
 * Covers a late or missing webhook: if PayMongo says the
 * session was paid, the order (or the whole cart checkout)
 * is placed now.
 *
 * Returns { placed, checkout, sessionId, existing } where
 * existing is null when PayMongo could not be reached.
 * =========================================================
 */
export const syncOnlinePayment = async (order) => {
  const checkout = await Checkout.findOne({ orders: order._id });

  const sessionId = checkout
    ? checkout.paymongoCheckoutSessionId
    : order.paymongoCheckoutSessionId;

  if (!sessionId || checkout?.paymentStatus === "paid") {
    return { placed: false, checkout, sessionId, existing: null };
  }

  const existing = await retrievePayMongoCheckoutSession(sessionId);

  if (existing?.paidPayment) {
    if (checkout) {
      const { placePaidCheckout } = await import("../checkout/checkout.service.js");
      await placePaidCheckout(checkout, existing);
    } else {
      const single = await Order.findById(order._id);
      if (single) {
        await markSingleOrderPaid(single, existing.session, existing.paidPayment);
      }
    }

    return { placed: true, checkout, sessionId, existing };
  }

  return { placed: false, checkout, sessionId, existing };
};

/*
 * =========================================================
 * CANCEL AN UNPAID ONLINE ORDER (AND ITS CHECKOUT GROUP)
 * =========================================================
 *
 * One PayMongo session pays every order of a cart checkout,
 * so the whole group is cancelled together.
 *
 * Returns:
 * - { placed: true }    PayMongo says it was paid → placed
 * - { unknown: true }   PayMongo unreachable and not forced
 * - { cancelled: [...] } orders that were cancelled
 * =========================================================
 */
export const cancelUnpaidOnlineOrder = async (
  order,
  { reason = PAYMENT_NOT_COMPLETED_REASON, byCustomer = false, force = false } = {}
) => {
  const { placed, checkout, sessionId, existing } = await syncOnlinePayment(order);

  if (placed) {
    return { placed: true };
  }

  if (sessionId) {
    if (!existing && !force) {
      return { unknown: true };
    }

    if (!existing || existing.status === "active") {
      await expirePayMongoCheckoutSession(sessionId);
    }
  }

  const groupIds = checkout ? (checkout.orders || []).map((id) => id?._id || id) : [order._id];
  const now = new Date();
  const cleanReason = String(reason || PAYMENT_NOT_COMPLETED_REASON).trim().slice(0, 500);

  const toCancel = await Order.find({
    _id: { $in: groupIds },
    orderStatus: "pending",
    paymentMethod: "paymongo",
    paymentStatus: { $nin: PLACED_PAYMENT_STATUSES },
  })
    .select("_id customer sourceType flower quantity addOns productName")
    .lean();

  if (!toCancel.length) {
    return { cancelled: [] };
  }

  await Order.updateMany(
    {
      _id: { $in: toCancel.map((entry) => entry._id) },
      orderStatus: "pending",
      paymentStatus: { $nin: PLACED_PAYMENT_STATUSES },
    },
    {
      $set: {
        orderStatus: "cancelled",
        cancelledAt: now,
        cancellationReason: cleanReason,
        paymentStatus: "failed",
        paymentFailedAt: now,
      },
    }
  );

  if (checkout && checkout.paymentStatus !== "paid") {
    checkout.checkoutStatus = "cancelled";
    checkout.paymentStatus = "failed";
    checkout.paymentFailedAt = now;
    await checkout.save();
  }

  const customerId = order.customer?._id || order.customer;
  const restored = await restoreCartItems(customerId, toCancel);
  const cartNote = restored ? " The bouquets are back in your cart if you want to try again." : "";

  await notifySafely({
    recipient: customerId,
    role: "customer",
    type: "order_cancelled",
    title: "Order not placed",
    message: byCustomer
      ? `You cancelled before paying, so your order was not placed.${cartNote}`
      : `Payment not completed within ${formatWindow()}, so your order was not placed.${cartNote}`,
    order: toCancel[0]._id,
    metadata: { screen: "order", orderStatus: "cancelled", paymentNotCompleted: true },
  });

  return { cancelled: toCancel.map((entry) => entry._id), restoredToCart: restored };
};

/*
 * =========================================================
 * EXPIRE UNPAID ONLINE ORDERS (lazy + timer)
 * =========================================================
 */

const MIN_RUN_GAP_MS = 60 * 1000;

let running = null;
let lastRunAt = 0;

export const expireUnpaidOnlineOrders = async () => {
  if (running) {
    return running;
  }

  if (Date.now() - lastRunAt < MIN_RUN_GAP_MS) {
    return 0;
  }

  lastRunAt = Date.now();

  running = (async () => {
    try {
      const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MS);

      const orders = await Order.find({
        paymentMethod: "paymongo",
        paymentStatus: { $nin: PLACED_PAYMENT_STATUSES },
        orderStatus: "pending",
        createdAt: { $lte: cutoff },
        $or: [{ paymentInitiatedAt: null }, { paymentInitiatedAt: { $lte: cutoff } }],
      })
        .select("_id customer createdAt paymongoCheckoutSessionId")
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();

      const handled = new Set();
      let count = 0;

      for (const order of orders) {
        if (handled.has(String(order._id))) {
          continue;
        }

        handled.add(String(order._id));

        /*
         * One failing order must not stop the others (it
         * would be retried first on every run).
         */
        try {
          const result = await cancelUnpaidOnlineOrder(order, {
            force: Date.now() - new Date(order.createdAt).getTime() > PAYMONGO_UNREACHABLE_GRACE_MS,
          });

          (result.cancelled || []).forEach((id) => handled.add(String(id)));
          count += (result.cancelled || []).length;
        } catch (error) {
          console.warn(`Expiry of unpaid online order ${order._id} failed: ${error.message}`);
        }
      }

      return count;
    } catch (error) {
      console.warn(`Expiry of unpaid online orders failed: ${error.message}`);
      return 0;
    } finally {
      running = null;
    }
  })();

  return running;
};

/*
 * One order (e.g. the customer opens it or taps Pay Now):
 * expire it now if its payment window has ended.
 * Returns true when it was cancelled.
 */
export const expireOrderIfPaymentWindowEnded = async (order) => {
  if (!isAwaitingOnlinePayment(order) || order.orderStatus !== "pending") {
    return false;
  }

  const startedAt = Math.max(
    new Date(order.createdAt).getTime() || 0,
    order.paymentInitiatedAt ? new Date(order.paymentInitiatedAt).getTime() : 0
  );

  if (Date.now() - startedAt < PAYMENT_WINDOW_MS) {
    return false;
  }

  try {
    const result = await cancelUnpaidOnlineOrder(order, {
      force: Date.now() - new Date(order.createdAt).getTime() > PAYMONGO_UNREACHABLE_GRACE_MS,
    });

    return Boolean(result.cancelled?.length);
  } catch (error) {
    /*
     * Never break viewing / paying an order; the timer
     * retries the expiry.
     */
    console.warn(`Expiry of unpaid online order ${order._id} failed: ${error.message}`);
    return false;
  }
};
