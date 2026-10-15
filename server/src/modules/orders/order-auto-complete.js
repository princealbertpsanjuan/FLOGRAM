import Order from "./order.model.js";
import Dispute from "../disputes/dispute.model.js";

/*
 * =========================================================
 * AUTO-CONFIRM DELIVERED ORDERS
 * =========================================================
 *
 * Sales count only when an order is completed (the customer
 * taps "Order Received"). If the customer forgets, a paid,
 * delivered order is completed automatically 24 hours after
 * delivery, so sellers still get their earnings and the
 * reports stay complete (the same idea as marketplaces that
 * auto-confirm receipt).
 *
 * completedAt = deliveredAt + 24 h (the moment it would
 * have auto-confirmed), so the sale lands on that day.
 *
 * Runs on a timer (server.js) and before revenue/earnings
 * are calculated. Safe to call often.
 * =========================================================
 */

export const AUTO_COMPLETE_AFTER_MS = 24 * 60 * 60 * 1000;

let running = null;

export const autoCompleteDeliveredOrders = async () => {
  if (running) {
    return running;
  }

  running = (async () => {
    try {
      const cutoff = new Date(Date.now() - AUTO_COMPLETE_AFTER_MS);

      const orders = await Order.find({
        orderStatus: "delivered",
        paymentStatus: "paid",
        deliveredAt: { $ne: null, $lte: cutoff },
      })
        .select("_id deliveredAt")
        .limit(500)
        .lean();

      if (!orders.length) {
        return 0;
      }

      /*
       * An order with an open complaint (e.g. "item not
       * received") is not auto-confirmed while Admin reviews
       * it; it is completed on a later run once the dispute
       * is resolved or rejected.
       */
      const disputed = await Dispute.find({
        order: { $in: orders.map((order) => order._id) },
        status: { $in: ["open", "under_review"] },
      }).distinct("order");

      const disputedIds = new Set(disputed.map(String));

      const toComplete = orders.filter((order) => !disputedIds.has(String(order._id)));

      if (!toComplete.length) {
        return 0;
      }

      await Order.bulkWrite(
        toComplete.map((order) => ({
          updateOne: {
            filter: { _id: order._id, orderStatus: "delivered" },
            update: {
              $set: {
                orderStatus: "completed",
                completedAt: new Date(new Date(order.deliveredAt).getTime() + AUTO_COMPLETE_AFTER_MS),
              },
            },
          },
        }))
      );

      return toComplete.length;
    } catch (error) {
      console.warn(`Auto-complete of delivered orders failed: ${error.message}`);
      return 0;
    } finally {
      running = null;
    }
  })();

  return running;
};
