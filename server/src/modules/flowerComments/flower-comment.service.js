import mongoose from "mongoose";

import Flower from "../flowers/flower.model.js";
import Order from "../orders/order.model.js";
import Review from "../reviews/review.model.js";
import { notifySafely } from "../notifications/notify-helpers.js";

import FlowerComment from "./flower-comment.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const assertFlowerId = (flowerId) => {
  if (!mongoose.Types.ObjectId.isValid(String(flowerId || ""))) {
    throw createError("A valid bouquet listing is required.");
  }
};

const displayName = (user) => {
  const first = user?.firstName || "";
  const last = user?.lastName ? `${user.lastName[0]}.` : "";
  return `${first} ${last}`.trim() || "Customer";
};

/*
 * Reviews from customers who bought this bouquet + public
 * comments on the listing.
 */
export const getListingFeedback = async (flowerId) => {
  assertFlowerId(flowerId);

  const flower = await Flower.findById(flowerId).select("_id florist seller").lean();

  if (!flower) {
    throw createError("Bouquet listing was not found.", 404);
  }

  const orderIds = await Order.find({ flower: flower._id }).distinct("_id");

  const [reviews, comments] = await Promise.all([
    orderIds.length
      ? Review.find({ order: { $in: orderIds } })
          .select("overallRating orderRating comment customer createdAt")
          .populate("customer", "firstName lastName profileImage")
          .sort({ createdAt: -1 })
          .limit(30)
          .lean()
      : [],
    FlowerComment.find({ flower: flower._id, isDeleted: false })
      .populate("author", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const ratings = reviews.map((review) => Number(review.orderRating || review.overallRating || 0)).filter(Boolean);

  return {
    averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    reviewCount: reviews.length,
    reviews: reviews.map((review) => ({
      _id: String(review._id),
      rating: Number(review.orderRating || review.overallRating || 0),
      comment: review.comment || "",
      authorName: displayName(review.customer),
      createdAt: review.createdAt,
    })),
    comments: comments.map((comment) => ({
      _id: String(comment._id),
      text: comment.text,
      authorId: comment.author?._id ? String(comment.author._id) : null,
      authorName: comment.authorRole === "seller" ? "Shop" : displayName(comment.author),
      authorRole: comment.authorRole,
      createdAt: comment.createdAt,
    })),
  };
};

export const addListingComment = async (user, flowerId, text) => {
  assertFlowerId(flowerId);

  const clean = String(text || "").trim();

  if (!clean) throw createError("Write a comment first.");
  if (clean.length > 500) throw createError("Comments can be up to 500 characters.");

  const flower = await Flower.findById(flowerId).select("_id name seller isActive").lean();

  if (!flower || flower.isActive === false) {
    throw createError("Bouquet listing was not found.", 404);
  }

  if (user.role === "seller" && String(flower.seller) !== String(user.userId)) {
    throw createError("Shops can only reply on their own listings.", 403);
  }

  const comment = await FlowerComment.create({
    flower: flower._id,
    author: user.userId,
    authorRole: user.role,
    text: clean,
  });

  if (user.role === "customer" && flower.seller) {
    await notifySafely({
      recipient: flower.seller,
      role: "seller",
      type: "system",
      title: "New comment on your listing",
      message: `Someone commented on ${flower.name}: "${clean.slice(0, 120)}"`,
      metadata: { screen: "product", flowerId: String(flower._id) },
    });
  }

  return comment;
};

export const deleteListingComment = async (user, commentId) => {
  if (!mongoose.Types.ObjectId.isValid(String(commentId || ""))) {
    throw createError("A valid comment is required.");
  }

  const comment = await FlowerComment.findById(commentId);

  if (!comment || comment.isDeleted) throw createError("Comment was not found.", 404);

  if (String(comment.author) !== String(user.userId) && user.role !== "admin") {
    throw createError("You can only delete your own comment.", 403);
  }

  comment.isDeleted = true;
  await comment.save();

  return { deleted: true };
};
