import ShopFollow from "./follow.model.js";
import Florist from "../florists/florist.model.js";
import { createNotification } from "../notifications/notification.service.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireFlorist = async (floristId) => {
  const florist = await Florist.findById(floristId).select("_id shopName owner");

  if (!florist) {
    throw createError("Florist shop was not found.", 404);
  }

  return florist;
};

export const getFollowStatus = async (customerId, floristId) => {
  const [following, followerCount] = await Promise.all([
    customerId ? ShopFollow.exists({ customer: customerId, florist: floristId }) : null,
    ShopFollow.countDocuments({ florist: floristId }),
  ]);

  return { floristId: String(floristId), isFollowing: Boolean(following), followerCount };
};

export const followShop = async (customerId, floristId) => {
  await requireFlorist(floristId);

  // Upsert = idempotent, safe against double taps.
  await ShopFollow.updateOne(
    { customer: customerId, florist: floristId },
    { $setOnInsert: { customer: customerId, florist: floristId } },
    { upsert: true }
  );

  return getFollowStatus(customerId, floristId);
};

export const unfollowShop = async (customerId, floristId) => {
  await ShopFollow.deleteOne({ customer: customerId, florist: floristId });

  return getFollowStatus(customerId, floristId);
};

export const getFollowedShops = async (customerId) => {
  const follows = await ShopFollow.find({ customer: customerId })
    .populate("florist", "shopName shopLogo address description isActive")
    .sort({ createdAt: -1 })
    .lean();

  return follows
    .filter((follow) => follow.florist)
    .map((follow) => ({ followedAt: follow.createdAt, florist: follow.florist }));
};

/*
 * Tell every follower that the shop posted a new bouquet.
 * Never blocks product creation.
 */
export const notifyFollowersOfNewProduct = async (flower) => {
  try {
    const florist = await Florist.findById(flower.florist).select("shopName");
    const follows = await ShopFollow.find({ florist: flower.florist }).select("customer").lean();

    await Promise.allSettled(
      follows.map((follow) =>
        createNotification({
          recipient: follow.customer,
          role: "customer",
          type: "shop_new_product",
          title: `New from ${florist?.shopName || "a shop you follow"}`,
          message: `${flower.name} is now available.`,
          metadata: { screen: "product", flowerId: String(flower._id) },
        })
      )
    );
  } catch (error) {
    console.error("Unable to notify shop followers:", error.message);
  }
};
