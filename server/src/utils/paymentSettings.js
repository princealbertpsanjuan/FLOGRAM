/*
 * =========================================================
 * ONLINE PAYMENT SWITCH
 * =========================================================
 *
 * ONLINE_PAYMENTS_ENABLED=false on Render turns PayMongo off
 * for everyone (e.g. during a pilot while PayMongo is still
 * in test mode, so no fake "paid" orders can be made):
 *
 *  - checkout only accepts Cash on Delivery / Cash on Pickup
 *  - "Pay Now" on an older unpaid online order is refused
 *  - the app reads GET /api/v1/config and hides PayMongo
 *
 * Not set, or any other value = online payment is ON.
 * =========================================================
 */

export const ONLINE_PAYMENTS_OFF_MESSAGE =
  "Online payment is not available yet. Please choose Cash on Delivery or Cash on Pickup.";

export const isOnlinePaymentEnabled = () =>
  String(process.env.ONLINE_PAYMENTS_ENABLED ?? "true").trim().toLowerCase() !== "false";
