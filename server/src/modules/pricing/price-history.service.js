import mongoose from "mongoose";

import PriceHistory from "./price-history.model.js";
import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";
import Order from "../orders/order.model.js";
import { notifyAdmins } from "../notifications/notify-helpers.js";

/*
 * =========================================================
 * PRICE HISTORY SERVICE
 * =========================================================
 */

export const LARGE_INCREASE_PERCENT = 50;

const round2 = (value) => Math.round(Number(value) * 100) / 100;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/*
 * Call after an item is created, or after an update whose
 * price may have changed. Does nothing when the price is
 * the same. Never throws: pricing logs must not block the
 * seller's save.
 */
export const recordPriceChange = async ({
  itemType,
  item,
  oldPrice = null,
  changedBy = null,
}) => {
  try {
    const newPrice = round2(item.price);
    const previous = oldPrice === null || oldPrice === undefined ? null : round2(oldPrice);

    if (previous !== null && previous === newPrice) return null;

    const change = previous === null ? 0 : round2(newPrice - previous);
    const changePercent = previous ? round2((change / previous) * 100) : 0;
    const flags = changePercent >= LARGE_INCREASE_PERCENT ? ["large_increase"] : [];

    const entry = await PriceHistory.create({
      itemType,
      item: item._id,
      itemModel: itemType === "flower" ? "Flower" : "GiftAddOn",
      itemName: item.name || "",
      florist: item.florist,
      changedBy,
      event: previous === null ? "created" : "updated",
      oldPrice: previous,
      newPrice,
      change,
      changePercent,
      flags,
    });

    if (flags.includes("large_increase")) {
      const florist = await Florist.findById(item.florist).select("shopName").lean();

      await notifyAdmins({
        type: "system",
        title: "Large price increase",
        message: `${florist?.shopName || "A shop"} raised "${item.name}" from ₱${previous.toFixed(2)} to ₱${newPrice.toFixed(
          2
        )} (+${changePercent}%). Check for price gouging.`,
        metadata: { screen: "products", itemId: String(item._id), itemType },
      });
    }

    return entry;
  } catch (error) {
    console.error("Price history record failed:", error.message);
    return null;
  }
};

const summarize = (entries, currentPrice) => {
  const prices = entries.map((entry) => entry.newPrice);
  const changes = entries.filter((entry) => entry.event === "updated");

  return {
    currentPrice: currentPrice ?? prices[0] ?? null,
    lowestPrice: prices.length ? Math.min(...prices) : null,
    highestPrice: prices.length ? Math.max(...prices) : null,
    changeCount: changes.length,
    firstRecordedAt: entries.length ? entries[entries.length - 1].createdAt : null,
    lastChangedAt: changes.length ? changes[0].createdAt : null,
  };
};

/*
 * Orders grouped by the price the customer actually paid
 * (unitPrice snapshot). Cancelled orders are excluded.
 */
const salesByPrice = async (flowerId) =>
  Order.aggregate([
    {
      $match: {
        flower: new mongoose.Types.ObjectId(String(flowerId)),
        orderStatus: { $ne: "cancelled" },
      },
    },
    {
      $group: {
        _id: "$unitPrice",
        orders: { $sum: 1 },
        quantity: { $sum: "$quantity" },
        firstOrderAt: { $min: "$createdAt" },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
    { $sort: { lastOrderAt: -1 } },
    {
      $project: {
        _id: 0,
        unitPrice: "$_id",
        orders: 1,
        quantity: 1,
        revenue: { $multiply: ["$_id", "$quantity"] },
        firstOrderAt: 1,
        lastOrderAt: 1,
      },
    },
  ]);

/*
 * One bouquet's price timeline.
 *
 * Public: timeline + summary.
 * Owner seller / Admin: also sales at each price.
 */
export const getFlowerPriceHistory = async (flowerId, viewer = null) => {
  if (!mongoose.isValidObjectId(flowerId)) {
    throw createError("Flower listing was not found.", 404);
  }

  const flower = await Flower.findById(flowerId).select("name price seller florist").lean();

  if (!flower) {
    throw createError("Flower listing was not found.", 404);
  }

  const entries = await PriceHistory.find({ item: flower._id })
    .select("event oldPrice newPrice change changePercent flags createdAt")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const canSeeSales =
    viewer && (viewer.role === "admin" || String(viewer.userId) === String(flower.seller));

  return {
    flower: { _id: flower._id, name: flower.name, price: flower.price },
    summary: summarize(entries, flower.price),
    entries,
    sales: canSeeSales ? await salesByPrice(flower._id) : null,
  };
};

/*
 * Every price change in the seller's shop (bouquets and
 * add-ons), newest first.
 */
export const getSellerPriceHistory = async (sellerUserId, { limit = 100 } = {}) => {
  const florist = await Florist.findOne({ owner: sellerUserId }).select("_id").lean();

  if (!florist) {
    throw createError("Florist profile was not found.", 404);
  }

  return PriceHistory.find({ florist: florist._id })
    .populate("changedBy", "firstName lastName role")
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 300))
    .lean();
};

/*
 * Admin: platform-wide changes, optionally only flagged.
 */
export const getAdminPriceHistory = async ({ flaggedOnly = false, limit = 100 } = {}) =>
  PriceHistory.find(flaggedOnly ? { flags: "large_increase" } : {})
    .populate("florist", "shopName")
    .populate("changedBy", "firstName lastName role")
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 300))
    .lean();
