import Delivery from "../deliveries/delivery.model.js";
import Florist from "../florists/florist.model.js";
import Flower from "../flowers/flower.model.js";
import GiftAddOn from "../addons/addon.model.js";
import Order from "../orders/order.model.js";
import Rider from "../riders/rider.model.js";
import RiderPayout from "../riders/rider-payout.model.js";
import RiderRemittance from "../riders/rider-remittance.model.js";
import { getActiveApprovedShiftForRider, getNextApprovedShiftForRider } from "../riders/rider-shift.service.js";
import { getReviewSentiment, getBuyingPatterns } from "../analytics/analytics.service.js";
import { getSellerEarnings } from "../sellerPayouts/seller-payout.service.js";
import { generateGrokResponse } from "../../services/grok.service.js";

/*
 * =========================================================
 * AI ASSISTANT — SELLER MODE AND RIDER MODE
 * =========================================================
 *
 * The Customer mode (bouquet recommendation, Grok Imagine
 * inspiration images) lives in bloomboard/ai.
 *
 * Seller mode: helps run the shop — reads the shop's live
 * numbers (orders waiting, products, earnings, review
 * sentiment, frequently bought together items).
 *
 * Rider mode: helps with the current work — active
 * deliveries, shift, COD remittance and payouts.
 *
 * The assistant only explains and advises. It never
 * changes data; the user still acts through the app.
 * =========================================================
 */

const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 1500;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const peso = (value) => `PHP ${Number(value || 0).toFixed(2)}`;

const manila = (date) =>
  date
    ? new Date(date).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })
    : "none";

const startOfManilaDay = () => {
  const now = new Date();
  const manilaNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const offset = now.getTime() - manilaNow.getTime();
  manilaNow.setHours(0, 0, 0, 0);
  return new Date(manilaNow.getTime() + offset);
};

const settle = async (promise, fallback = null) => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

/*
 * =========================================================
 * SELLER CONTEXT
 * =========================================================
 */
const buildSellerContext = async (sellerUserId) => {
  const florist = await Florist.findOne({ owner: sellerUserId }).select("_id shopName verificationStatus").lean();

  if (!florist) {
    return "The seller has no florist shop profile yet.";
  }

  const [statusCounts, todayOrders, products, addOnCount, earnings, sentiment, patterns] = await Promise.all([
    Order.aggregate([{ $match: { florist: florist._id } }, { $group: { _id: "$orderStatus", count: { $sum: 1 } } }]),
    Order.countDocuments({ florist: florist._id, createdAt: { $gte: startOfManilaDay() } }),
    Flower.find({ florist: florist._id, isActive: true }).select("name price isAvailable").lean(),
    GiftAddOn.countDocuments({ florist: florist._id, isActive: true }),
    settle(getSellerEarnings(sellerUserId)),
    settle(getReviewSentiment({ floristId: florist._id, limit: 3 })),
    settle(getBuyingPatterns({ floristId: florist._id, limit: 3 })),
  ]);

  const counts = Object.fromEntries(statusCounts.map((entry) => [entry._id, entry.count]));
  const unavailable = products.filter((product) => !product.isAvailable);

  const lines = [
    `Shop: ${florist.shopName} (verification: ${florist.verificationStatus}).`,
    `Orders today: ${todayOrders}.`,
    `Orders by status: pending ${counts.pending || 0}, confirmed ${counts.confirmed || 0}, preparing ${counts.preparing || 0}, ready for pickup ${counts.ready_for_pickup || 0}, ready for delivery ${counts.ready_for_delivery || 0}, out for delivery ${counts.out_for_delivery || 0}, delivered/completed ${(counts.delivered || 0) + (counts.completed || 0)}, cancelled ${counts.cancelled || 0}.`,
    `Active products: ${products.length} (${unavailable.length} marked unavailable${unavailable.length ? `: ${unavailable.slice(0, 5).map((p) => p.name).join(", ")}` : ""}).`,
    `Gift add-ons offered: ${addOnCount}.`,
  ];

  if (earnings) {
    lines.push(
      `Earnings: platform commission ${(earnings.commissionRate * 100).toFixed(1)}%. Lifetime product sales ${peso(earnings.lifetime.grossSales)}, commission ${peso(earnings.lifetime.commission)}, net ${peso(earnings.lifetime.netEarnings)}. Unpaid balance ready for payout ${peso(earnings.unpaidBalance)}. Pending payout ${peso(earnings.pendingPayoutAmount)}. Paid out so far ${peso(earnings.paidOutTotal)}. COD orders still waiting for Rider remittance: ${earnings.awaitingCodRemittance.orders}.`
    );
  }

  if (sentiment) {
    lines.push(
      `Review sentiment (AFINN): ${sentiment.analyzedReviews} reviews analysed, positive ${sentiment.counts.positive}, neutral ${sentiment.counts.neutral}, negative ${sentiment.counts.negative}. Frequent negative words: ${sentiment.topNegativeWords.slice(0, 5).map((w) => w.word).join(", ") || "none"}. Frequent positive words: ${sentiment.topPositiveWords.slice(0, 5).map((w) => w.word).join(", ") || "none"}.`
    );

    sentiment.recentNegative.slice(0, 2).forEach((review) => {
      lines.push(`Recent negative review (${review.rating}/5): "${String(review.comment).slice(0, 160)}"`);
    });
  }

  if (patterns?.rules?.length) {
    patterns.rules.slice(0, 3).forEach((rule) => {
      lines.push(
        `Bought together (FP-Growth): ${rule.antecedent.map((i) => i.name).join(" + ")} -> ${rule.consequent.map((i) => i.name).join(" + ")} (confidence ${(rule.confidence * 100).toFixed(0)}%).`
      );
    });
  } else if (patterns) {
    lines.push(`Buying patterns: not enough multi-item orders yet (${patterns.transactionCount} successful transactions).`);
  }

  return lines.join("\n");
};

const SELLER_GUIDE = `
You are the FLOGRAM Seller Assistant inside the FLOGRAM mobile app, helping a florist shop owner in Naga City, Philippines.
How FLOGRAM works for Sellers:
- Orders move: pending -> confirmed (accept) -> preparing -> ready for pickup / ready for delivery -> (Rider) out for delivery -> delivered -> completed. Sellers accept or decline in Orders.
- Online orders reach the shop only after PayMongo confirms payment. COD money is collected by the Rider and remitted to FLOGRAM. Cash on Pickup is collected by the shop.
- Seller earnings = product sales (order total minus delivery fee) minus the platform commission set by Admin. Admin pays sellers out per period with a bank reference and proof; the Earnings screen shows the unpaid balance and payout history. For Cash on Pickup the shop already has the cash, so only the commission is deducted from the next payout.
- Products: add/edit in Products; mark unavailable instead of deleting when flowers run out. Gift add-ons (chocolates, teddy bears, balloons, cards) are managed in Gift Add-ons.
- Shop Insights shows review sentiment (AFINN lexicon) and frequently-bought-together items (FP-Growth). Use them for bundles and promotions.
- Disputes: a Seller can report a problem with an order (e.g. customer unavailable) from the order; Admin decides. Policy violations can lead to a warning, suspension or ban.
Rules: Answer in clear, friendly English (Taglish is fine if the user writes Taglish). Be concise (under 180 words unless asked). Use the live shop data below; never invent numbers that are not in it. You cannot change anything in the app — tell the seller which screen to use. If asked something outside running the shop, briefly redirect.
`.trim();

/*
 * =========================================================
 * RIDER CONTEXT
 * =========================================================
 */
const buildRiderContext = async (riderUserId) => {
  const rider = await Rider.findOne({ owner: riderUserId }).select("_id verificationStatus isActive vehicleType").lean();

  if (!rider) {
    return "The rider has no rider profile yet.";
  }

  const [active, availableCount, deliveredToday, activeShift, nextShift, pendingPayouts, remittances] =
    await Promise.all([
      Delivery.find({ riderUser: riderUserId, status: { $in: ["accepted", "picked_up", "out_for_delivery"] } })
        .populate("order", "productName paymentMethod totalAmount deliveryFee")
        .populate("florist", "shopName")
        .select("status order florist recipientName deliveryAddress acceptedAt")
        .lean(),
      Delivery.countDocuments({ status: "available" }),
      Delivery.countDocuments({ riderUser: riderUserId, status: "delivered", deliveredAt: { $gte: startOfManilaDay() } }),
      settle(getActiveApprovedShiftForRider(rider._id)),
      settle(getNextApprovedShiftForRider(rider._id)),
      RiderPayout.find({ riderUser: riderUserId, status: "pending" }).select("totalAmount").lean(),
      RiderRemittance.find({ riderUser: riderUserId, status: { $in: ["pending", "submitted", "rejected"] } })
        .select("status totalAmount")
        .lean(),
    ]);

  const lines = [
    `Rider verification: ${rider.verificationStatus}; active: ${rider.isActive !== false}.`,
    `Current shift: ${activeShift ? `${manila(activeShift.startAt)} to ${manila(activeShift.endAt)}` : "not on an approved shift right now"}.`,
    `Next approved shift: ${nextShift ? `${manila(nextShift.startAt)} to ${manila(nextShift.endAt)}` : "none booked"}.`,
    `Delivery requests currently available to accept: ${availableCount}.`,
    `Delivered today: ${deliveredToday}.`,
    `Active deliveries: ${active.length}.`,
  ];

  active.slice(0, 5).forEach((delivery, index) => {
    lines.push(
      `  ${index + 1}. ${delivery.order?.productName || "Bouquet"} from ${delivery.florist?.shopName || "shop"} — status ${delivery.status}; payment ${delivery.order?.paymentMethod || "n/a"}${delivery.order?.paymentMethod === "cash_on_delivery" ? ` (collect ${peso(delivery.order?.totalAmount)})` : ""}; recipient ${delivery.recipientName || "n/a"}.`
    );
  });

  lines.push(
    `Pending payouts from Admin: ${pendingPayouts.length} totalling ${peso(pendingPayouts.reduce((s, p) => s + Number(p.totalAmount || 0), 0))}.`,
    `COD remittances not yet verified: ${remittances.length}${remittances.length ? ` (${remittances.map((r) => `${r.status} ${peso(r.totalAmount)}`).join(", ")})` : ""}.`
  );

  return lines.join("\n");
};

const RIDER_GUIDE = `
You are the FLOGRAM Rider Assistant inside the FLOGRAM mobile app, helping a delivery rider in Naga City, Philippines.
How FLOGRAM works for Riders:
- Riders accept delivery requests only during an Admin-approved work shift. Request shifts in Work Shifts; Admin approves them and each shift has a slot limit.
- Delivery steps: accept -> picked up at the shop -> out for delivery -> delivered. A proof-of-delivery photo is required before completing. Live location is shared only while a delivery is active.
- Cash on Delivery: collect the exact order total. That cash belongs to FLOGRAM (not Rider income) and must be remitted with a reference number and proof in Wallet; Admin verifies it.
- Rider income = delivery fees of completed deliveries. Admin pays riders per payout period by bank transfer with proof (Wallet shows payouts).
- If something goes wrong (customer unavailable, wrong address, unsafe situation) the Rider can report the order; Admin reviews disputes. Policy violations can lead to a warning, suspension or ban.
Rules: Answer in clear, friendly English (Taglish is fine if the user writes Taglish). Be short and practical — the rider may be on the road (under 120 words unless asked). Put safety first; never encourage using the phone while driving. Use the live data below; never invent numbers. You cannot change anything in the app — tell the rider which screen to use.
`.trim();

/*
 * =========================================================
 * CHAT
 * =========================================================
 */
const cleanHistory = (history) =>
  (Array.isArray(history) ? history : [])
    .filter((entry) => entry && ["user", "assistant"].includes(entry.role) && String(entry.content || "").trim())
    .slice(-MAX_HISTORY)
    .map((entry) => ({ role: entry.role, content: String(entry.content).slice(0, MAX_MESSAGE_LENGTH) }));

export const chatWithWorkAssistant = async (user, input = {}) => {
  const message = String(input.message || "").trim();

  if (!message) {
    throw createError("Type a question for the assistant.");
  }

  if (!["seller", "rider"].includes(user.role)) {
    throw createError("The work assistant is for Sellers and Riders.", 403);
  }

  const context =
    user.role === "seller" ? await buildSellerContext(user.userId) : await buildRiderContext(user.userId);

  const guide = user.role === "seller" ? SELLER_GUIDE : RIDER_GUIDE;

  const result = await generateGrokResponse([
    {
      role: "system",
      content: `${guide}\n\nCurrent time (Asia/Manila): ${manila(new Date())}\n\nLIVE DATA:\n${context}`,
    },
    ...cleanHistory(input.history),
    { role: "user", content: message.slice(0, MAX_MESSAGE_LENGTH) },
  ]);

  return {
    mode: user.role,
    reply: result.content,
    model: result.model,
  };
};
