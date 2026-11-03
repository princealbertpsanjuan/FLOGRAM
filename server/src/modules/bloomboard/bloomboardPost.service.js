import mongoose from "mongoose";

import BloomboardPost from "./bloomboardPost.model.js";

import BloomboardComment from "./bloomboardComment.model.js";

import Florist from "../florists/florist.model.js";

import User from "../auth/auth.model.js";

import Order from "../orders/order.model.js";

import { analyzeSentiment } from "../analytics/sentiment.service.js";

import { notifySafely } from "../notifications/notify-helpers.js";

const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

const addPostCounts = async (
  posts
) => {
  return Promise.all(
    posts.map(async (post) => {
      const commentCount =
        await BloomboardComment.countDocuments({
          post: post._id,
          isActive: true,
        });

      return {
        ...post,
        likeCount:
          post.likes?.length || 0,
        commentCount,
      };
    })
  );
};

/*
 * =========================================================
 * SHOP TAG + RATING
 * =========================================================
 *
 * - Only customers tag/rate (a shop cannot rate itself or a
 *   competitor).
 * - The tagged shop must be approved and active.
 * - A star rating needs a delivered/completed order from
 *   that shop; the order is saved as proof.
 * - The caption is scored with AFINN sentiment.
 * =========================================================
 */
const RATED_ORDER_STATUSES = ["delivered", "completed"];

const resolveShopTag = async (user, postData) => {
  const floristId = postData.taggedFlorist || null;
  const rating = postData.shopRating ? Number(postData.shopRating) : null;

  if (!floristId) {
    if (rating) {
      const error = new Error("Tag the shop you want to rate.");
      error.statusCode = 422;
      throw error;
    }
    return { florist: null, rating: null, orderId: null, sentiment: { label: null, score: null } };
  }

  if (!mongoose.isValidObjectId(floristId)) {
    const error = new Error("The tagged shop is not available.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "customer") {
    const error = new Error("Only customers can tag and rate shops.");
    error.statusCode = 403;
    throw error;
  }

  const florist = await Florist.findById(floristId).select("shopName owner verificationStatus isActive");

  if (!florist || florist.verificationStatus !== "approved" || !florist.isActive) {
    const error = new Error("The tagged shop is not available.");
    error.statusCode = 404;
    throw error;
  }

  let orderId = null;

  if (rating) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      const error = new Error("Shop rating must be 1 to 5 stars.");
      error.statusCode = 422;
      throw error;
    }

    const order = await Order.findOne({
      customer: user._id,
      florist: florist._id,
      orderStatus: { $in: RATED_ORDER_STATUSES },
    })
      .sort({ updatedAt: -1 })
      .select("_id")
      .lean();

    if (!order) {
      const error = new Error(
        `You can rate ${florist.shopName} after you receive an order from them. You can still tag the shop without a rating.`
      );
      error.statusCode = 403;
      throw error;
    }

    orderId = order._id;
  }

  const analysis = postData.caption ? analyzeSentiment(postData.caption) : null;

  return {
    florist,
    rating,
    orderId,
    sentiment: analysis ? { label: analysis.label, score: analysis.score } : { label: null, score: null },
  };
};

/*
 * Shops a customer can tag, with whether they can rate it
 * (delivered/completed order).
 */
export const getTaggableShops = async (userId) => {
  const [shops, orders, rated] = await Promise.all([
    Florist.find({ verificationStatus: "approved", isActive: true })
      .select("shopName shopLogo address")
      .sort({ shopName: 1 })
      .lean(),
    Order.find({ customer: userId, orderStatus: { $in: RATED_ORDER_STATUSES } }).distinct("florist"),
    BloomboardPost.find({ author: userId, isActive: true, shopRating: { $ne: null } }).distinct("taggedFlorist"),
  ]);

  const bought = new Set(orders.map(String));
  const alreadyRated = new Set(rated.map(String));

  return shops.map((shop) => ({
    ...shop,
    canRate: bought.has(String(shop._id)) && !alreadyRated.has(String(shop._id)),
    verifiedBuyer: bought.has(String(shop._id)),
    alreadyRated: alreadyRated.has(String(shop._id)),
  }));
};

/*
 * Posts that tag a shop + its community rating.
 */
export const getShopTaggedPosts = async (floristId, limit = 20) => {
  if (!mongoose.isValidObjectId(floristId)) {
    const error = new Error("Florist shop was not found.");
    error.statusCode = 404;
    throw error;
  }

  const florist = await Florist.findById(floristId).select("_id shopName").lean();

  if (!florist) {
    const error = new Error("Florist shop was not found.");
    error.statusCode = 404;
    throw error;
  }

  const [posts, summary] = await Promise.all([
    BloomboardPost.find({ taggedFlorist: florist._id, isActive: true })
      .populate("author", "firstName lastName role profileImage")
      .populate("taggedFlorist", "shopName shopLogo address")
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(Number(limit) || 20, 1), 50))
      .lean(),
    getShopCommunityRating(florist._id),
  ]);

  return { florist, summary, posts: await addPostCounts(posts) };
};

export const getShopCommunityRating = async (floristId) => {
  const [result] = await BloomboardPost.aggregate([
    { $match: { taggedFlorist: floristId, isActive: true } },
    {
      $group: {
        _id: null,
        tagCount: { $sum: 1 },
        ratingCount: { $sum: { $cond: [{ $ne: ["$shopRating", null] }, 1, 0] } },
        averageRating: { $avg: "$shopRating" },
        positive: { $sum: { $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0] } },
        neutral: { $sum: { $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0] } },
        negative: { $sum: { $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0] } },
        five: { $sum: { $cond: [{ $eq: ["$shopRating", 5] }, 1, 0] } },
        four: { $sum: { $cond: [{ $eq: ["$shopRating", 4] }, 1, 0] } },
        three: { $sum: { $cond: [{ $eq: ["$shopRating", 3] }, 1, 0] } },
        two: { $sum: { $cond: [{ $eq: ["$shopRating", 2] }, 1, 0] } },
        one: { $sum: { $cond: [{ $eq: ["$shopRating", 1] }, 1, 0] } },
      },
    },
  ]);

  return {
    tagCount: result?.tagCount || 0,
    ratingCount: result?.ratingCount || 0,
    averageRating: result?.averageRating ? Math.round(result.averageRating * 10) / 10 : null,
    distribution: {
      5: result?.five || 0,
      4: result?.four || 0,
      3: result?.three || 0,
      2: result?.two || 0,
      1: result?.one || 0,
    },
    sentiment: {
      positive: result?.positive || 0,
      neutral: result?.neutral || 0,
      negative: result?.negative || 0,
    },
  };
};

export const createBloomboardPost = async (
  userId,
  postData,
  files = []
) => {
  const user =
    await User.findById(userId);

  if (!user) {
    const error = new Error(
      "User account was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  if (
    ![
      "customer",
      "seller",
    ].includes(user.role)
  ) {
    const error = new Error(
      "Only customers and sellers can create BloomBoard posts."
    );

    error.statusCode = 403;

    throw error;
  }

  let florist = null;

  if (user.role === "seller") {
    florist =
      await Florist.findOne({
        owner: userId,
      });

    if (!florist) {
      const error = new Error(
        "Florist profile was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    if (
      florist.verificationStatus !==
        "approved" ||
      !florist.isActive
    ) {
      const error = new Error(
        "Only approved and active florists can create BloomBoard posts."
      );

      error.statusCode = 403;

      throw error;
    }
  }

  const images = files.map(
    (file) =>
      normalizePath(file.path)
  );

  if (
    !postData.caption &&
    images.length === 0
  ) {
    const error = new Error(
      "A BloomBoard post must contain a caption or at least one image."
    );

    error.statusCode = 400;

    throw error;
  }

  const tag = await resolveShopTag(user, postData);

  let post;

  try {
    post =
      await BloomboardPost.create({
        author: userId,
        authorRole: user.role,

        florist:
          florist?._id || null,

        caption:
          postData.caption || "",

        images,

        postType:
          postData.postType ||
          "general",

        taggedFlorist: tag.florist?._id || null,
        shopRating: tag.rating,
        verifiedOrder: tag.orderId,
        sentiment: tag.sentiment,
      });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = new Error(
        "You already rated this shop on BloomBoard. Delete your earlier rating post to rate again."
      );
      duplicate.statusCode = 409;
      throw duplicate;
    }

    throw error;
  }

  if (tag.florist) {
    await notifySafely({
      recipient: tag.florist.owner,
      role: "seller",
      type: "shop_tagged",
      title: tag.rating ? `New ${tag.rating}★ rating on BloomBoard` : "Your shop was tagged on BloomBoard",
      message: `${user.firstName || "A customer"} tagged ${tag.florist.shopName}${
        tag.rating ? ` and rated it ${tag.rating}/5` : ""
      }: "${String(postData.caption || "").slice(0, 120)}"`,
      metadata: { screen: "bloomboard", postId: String(post._id), floristId: String(tag.florist._id) },
    });
  }

  const populatedPost =
    await BloomboardPost.findById(
      post._id
    )
      .populate(
        "author",
        "firstName lastName role profileImage"
      )
      .populate(
        "florist",
        "shopName shopLogo address"
      )
      .populate(
        "taggedFlorist",
        "shopName shopLogo address"
      )
      .lean();

  return {
    ...populatedPost,
    likeCount: 0,
    commentCount: 0,
  };
};

export const getBloomboardFeed = async (
  filters = {}
) => {
  const query = {
    isActive: true,
  };

  if (filters.postType) {
    query.postType =
      filters.postType;
  }

  if (filters.authorRole) {
    query.authorRole =
      filters.authorRole;
  }

  const limit = Math.min(
    Math.max(
      Number(filters.limit) || 20,
      1
    ),
    50
  );

  const posts =
    await BloomboardPost.find(
      query
    )
      .populate(
        "author",
        "firstName lastName role profileImage"
      )
      .populate(
        "florist",
        "shopName shopLogo address"
      )
      .populate(
        "taggedFlorist",
        "shopName shopLogo address"
      )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

  return addPostCounts(posts);
};

/*
 * =========================================================
 * CURRENT USER'S OWN BLOOMBOARD POSTS
 * =========================================================
 */

export const getMyBloomboardPosts =
  async (userId) => {
    const posts =
      await BloomboardPost.find({
        author: userId,
        isActive: true,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .populate(
          "taggedFlorist",
          "shopName shopLogo address"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return addPostCounts(posts);
  };

export const getBloomboardPostById =
  async (postId) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .populate(
          "taggedFlorist",
          "shopName shopLogo address"
        )
        .lean();

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );

      error.statusCode = 404;

      throw error;
    }

    const commentCount =
      await BloomboardComment.countDocuments({
        post: postId,
        isActive: true,
      });

    return {
      ...post,

      likeCount:
        post.likes?.length || 0,

      commentCount,
    };
  };

export const deleteBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        author: userId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found or does not belong to this user."
      );

      error.statusCode = 404;

      throw error;
    }

    post.isActive = false;

    await post.save();

    await BloomboardComment.updateMany(
      {
        post: postId,
        isActive: true,
      },
      {
        isActive: false,
      }
    );

    return post;
  };

/*
 * =========================================================
 * LIKE / UNLIKE / SAVE / UNSAVE
 * =========================================================
 *
 * Atomic $addToSet / $pull updates. The previous
 * read-modify-save version replaced the whole array, so a
 * like from one user could erase a like another user made
 * at the same moment, and likes could appear to "not stay
 * saved" after a refresh.
 * =========================================================
 */

const updatePostReaction = async (
  postId,
  update
) => {
  const post =
    await BloomboardPost.findOneAndUpdate(
      {
        _id: postId,
        isActive: true,
      },
      update,
      {
        returnDocument: "after",
      }
    )
      .select("likes saves")
      .lean();

  if (!post) {
    const error = new Error(
      "BloomBoard post was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  return post;
};

export const likeBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await updatePostReaction(
        postId,
        { $addToSet: { likes: userId } }
      );

    return {
      liked: true,
      likeCount:
        post.likes?.length || 0,
    };
  };

export const unlikeBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await updatePostReaction(
        postId,
        { $pull: { likes: userId } }
      );

    return {
      liked: false,
      likeCount:
        post.likes?.length || 0,
    };
  };

export const saveBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await updatePostReaction(
        postId,
        { $addToSet: { saves: userId } }
      );

    return {
      saved: true,
      saveCount:
        post.saves?.length || 0,
    };
  };

export const unsaveBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await updatePostReaction(
        postId,
        { $pull: { saves: userId } }
      );

    return {
      saved: false,
      saveCount:
        post.saves?.length || 0,
    };
  };

export const getMySavedBloomboardPosts =
  async (userId) => {
    const posts =
      await BloomboardPost.find({
        isActive: true,
        saves: userId,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .populate(
          "taggedFlorist",
          "shopName shopLogo address"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return addPostCounts(posts);
  };

/*
 * =========================================================
 * CUSTOMER / SELLER
 * GET MY LIKED POSTS
 * =========================================================
 */

export const getMyLikedBloomboardPosts =
  async (userId) => {
    const posts =
      await BloomboardPost.find({
        isActive: true,
        likes: userId,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .populate(
          "taggedFlorist",
          "shopName shopLogo address"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return addPostCounts(posts);
  };
