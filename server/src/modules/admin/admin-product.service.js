import mongoose from "mongoose";

import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";
import Order from "../orders/order.model.js";
import { notifySafely } from "../notifications/notify-helpers.js";

/*
 * =========================================================
 * ADMIN PRODUCT (LISTING) MONITORING
 * =========================================================
 *
 * The Admin can browse every seller listing, filter by
 * shop / visibility, and hide or restore a listing.
 *
 * Visibility follows the public catalogue rule:
 *   visible = isActive && isAvailable
 *   hidden  = everything else (hidden by Admin, removed by
 *             the seller, or marked unavailable).
 *   hiddenByAdmin distinguishes the Admin's own action.
 * =========================================================
 */

const MAX_LISTINGS = 300;

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * GET /api/v1/admin/flowers
 *
 * Query: search, florist, status (all | visible | hidden), limit
 */
export const getAdminFlowers = async (query = {}) => {
  const filter = {};

  const search = String(query.search || "").trim();

  if (search) {
    filter.name = new RegExp(escapeRegex(search), "i");
  }

  const florist = String(query.florist || "").trim();

  if (florist && florist !== "all") {
    if (!mongoose.Types.ObjectId.isValid(florist)) {
      throw createError("Invalid shop filter.");
    }

    filter.florist = florist;
  }

  const status = String(query.status || "all").toLowerCase();

  if (status === "visible") {
    filter.isActive = true;
    filter.isAvailable = true;
  } else if (status === "hidden") {
    filter.$or = [{ isActive: false }, { isAvailable: false }];
  } else if (status === "admin_hidden") {
    filter.hiddenByAdmin = true;
  }

  const limit = Math.min(Math.max(Number(query.limit) || MAX_LISTINGS, 1), MAX_LISTINGS);

  const [flowers, total, shopIds] = await Promise.all([
    Flower.find(filter)
      .select("-imageEmbedding -embeddingModel")
      .populate("florist", "shopName address contactNumber businessEmail isActive verificationStatus")
      .populate("seller", "firstName lastName email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Flower.countDocuments(filter),
    Flower.distinct("florist"),
  ]);

  /*
   * Shops that have at least one listing (for the shop filter).
   */
  const shops = await Florist.find({ _id: { $in: shopIds } })
    .select("shopName")
    .sort({ shopName: 1 })
    .lean();

  /*
   * How many orders each listing received.
   */
  const orderCounts = flowers.length
    ? await Order.aggregate([
        { $match: { flower: { $in: flowers.map((flower) => flower._id) } } },
        { $group: { _id: "$flower", count: { $sum: 1 } } },
      ])
    : [];

  const countByFlower = new Map(orderCounts.map((row) => [String(row._id), row.count]));

  return {
    flowers: flowers.map((flower) => ({
      ...flower,
      isVisible: Boolean(flower.isActive && flower.isAvailable),
      orderCount: countByFlower.get(String(flower._id)) || 0,
    })),
    total,
    shops: shops.map((shop) => ({
      _id: String(shop._id),
      shopName: shop.shopName || "Unnamed shop",
    })),
  };
};

/*
 * PATCH /api/v1/admin/flowers/:flowerId/visibility
 *
 * Body: { isActive: boolean, reason?: string }
 */
export const setAdminFlowerVisibility = async (flowerId, { isActive, reason } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(String(flowerId || ""))) {
    throw createError("A valid listing is required.");
  }

  if (typeof isActive !== "boolean") {
    throw createError("isActive must be true or false.", 422);
  }

  const flower = await Flower.findById(flowerId);

  if (!flower) {
    throw createError("Flower listing was not found.", 404);
  }

  const note = String(reason || "").trim().slice(0, 300);

  if (!isActive) {
    if (!flower.isActive) {
      throw createError(
        flower.hiddenByAdmin
          ? "This listing is already hidden."
          : "The seller already removed this listing.",
        409
      );
    }

    flower.isActive = false;
    flower.hiddenByAdmin = true;
    flower.adminHiddenReason = note;
  } else {
    /*
     * Only listings hidden by the Admin can be restored;
     * a listing the seller deleted stays deleted.
     */
    if (!flower.hiddenByAdmin) {
      throw createError(
        flower.isActive
          ? "This listing is not hidden."
          : "This listing was removed by the seller and can't be restored.",
        409
      );
    }

    flower.isActive = true;
    flower.hiddenByAdmin = false;
    flower.adminHiddenReason = "";
  }

  await flower.save();

  await notifySafely({
    recipient: flower.seller,
    role: "seller",
    type: "system",
    title: isActive ? "Listing restored" : "Listing hidden by FLOGRAM",
    message: isActive
      ? `Your listing "${flower.name}" was restored by the FLOGRAM Admin.${
          flower.isAvailable ? " Customers can see it again." : " Mark it available to show it to customers."
        }`
      : `Your listing "${flower.name}" was hidden from customers by the FLOGRAM Admin.${
          note ? ` Reason: ${note}` : " Please review it against the listing guidelines."
        }`,
    metadata: { flowerId: String(flower._id), action: isActive ? "listing_restored" : "listing_hidden" },
  });

  const updated = await Flower.findById(flower._id)
    .select("-imageEmbedding -embeddingModel")
    .populate("florist", "shopName address contactNumber businessEmail isActive verificationStatus")
    .populate("seller", "firstName lastName email")
    .lean();

  return {
    ...updated,
    isVisible: Boolean(updated.isActive && updated.isAvailable),
  };
};
