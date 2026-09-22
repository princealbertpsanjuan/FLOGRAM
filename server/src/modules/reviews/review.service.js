import Review from "./review.model.js";

import Order from "../orders/order.model.js";
import Delivery from "../deliveries/delivery.model.js";
import User from "../auth/auth.model.js";

import {
  createNotification,
} from "../notifications/notification.service.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const createHttpError =
  (
    message,
    statusCode
  ) => {
    const error =
      new Error(
        message
      );

    error.statusCode =
      statusCode;

    return error;
  };

/*
 * =========================================================
 * SAFE NOTIFICATION
 * =========================================================
 *
 * A review must remain successfully submitted even if a
 * notification cannot be created.
 * =========================================================
 */

const createNotificationSafely =
  async (
    notificationData
  ) => {
    try {
      return await createNotification(
        notificationData
      );
    } catch (error) {
      console.error(
        "Review notification creation failed:",
        error
      );

      return null;
    }
  };

/*
 * =========================================================
 * POPULATE REVIEW
 * =========================================================
 */

const populateReview =
  (
    reviewId
  ) => {
    return Review.findById(
      reviewId
    )
      .populate(
        "customer",
        "firstName lastName profileImage"
      )
      .populate(
        "seller",
        "firstName lastName profileImage"
      )
      .populate(
        "florist",
        "shopName shopLogo"
      )
      .populate(
        "delivery"
      )
      .populate(
        "riderUser",
        "firstName lastName profileImage"
      )
      .populate({
        path:
          "rider",

        populate: {
          path:
            "owner",

          select:
            "firstName lastName profileImage",
        },
      })
      .populate(
        "order"
      );
  };

/*
 * =========================================================
 * FORMAT REVIEW
 * =========================================================
 */

const formatReview =
  (
    review
  ) => {
    if (!review) {
      return null;
    }

    const raw =
      typeof review.toObject ===
      "function"
        ? review.toObject()
        : review;

    return {
      id:
        String(
          raw._id
        ),

      order:
        raw.order ||
        null,

      customer:
        raw.customer ||
        null,

      seller:
        raw.seller ||
        null,

      florist:
        raw.florist ||
        null,

      delivery:
        raw.delivery ||
        null,

      rider:
        raw.rider ||
        null,

      riderUser:
        raw.riderUser ||
        null,

      overallRating:
        raw.overallRating,

      orderRating:
        raw.orderRating,

      sellerRating:
        raw.sellerRating,

      riderRating:
        raw.riderRating ??
        null,

      systemRating:
        raw.systemRating,

      comment:
        raw.comment ||
        null,

      createdAt:
        raw.createdAt ||
        null,

      updatedAt:
        raw.updatedAt ||
        null,
    };
  };

/*
 * =========================================================
 * VERIFY CUSTOMER
 * =========================================================
 */

const getCustomer =
  async (
    customerId
  ) => {
    const customer =
      await User.findById(
        customerId
      )
        .select(
          "_id firstName lastName role accountStatus"
        );

    if (!customer) {
      throw createHttpError(
        "Customer account was not found.",
        404
      );
    }

    if (
      customer.role !==
      "customer"
    ) {
      throw createHttpError(
        "Only customer accounts can submit transaction reviews.",
        403
      );
    }

    if (
      customer.accountStatus !==
      "active"
    ) {
      throw createHttpError(
        "Only active customer accounts can submit reviews.",
        403
      );
    }

    return customer;
  };

/*
 * =========================================================
 * GET CUSTOMER ORDER
 * =========================================================
 */

const getCustomerOrder =
  async (
    orderId,
    customerId
  ) => {
    const order =
      await Order.findOne({
        _id:
          orderId,

        customer:
          customerId,
      });

    if (!order) {
      throw createHttpError(
        "Order was not found or does not belong to this customer.",
        404
      );
    }

    return order;
  };

/*
 * =========================================================
 * CREATE CUSTOMER REVIEW
 * =========================================================
 */

export const createCustomerReview =
  async (
    customerId,
    orderId,
    reviewData = {}
  ) => {
    await getCustomer(
      customerId
    );

    const order =
      await getCustomerOrder(
        orderId,
        customerId
      );

    /*
     * Reviews are only available after the customer
     * successfully confirms receipt and the Order reaches
     * the completed state.
     */

    if (
      order.orderStatus !==
      "completed"
    ) {
      throw createHttpError(
        "You can only review a completed order.",
        400
      );
    }

    /*
     * One review per transaction.
     */

    const existingReview =
      await Review.findOne({
        order:
          order._id,
      })
        .select(
          "_id"
        )
        .lean();

    if (
      existingReview
    ) {
      throw createHttpError(
        "A review has already been submitted for this order.",
        409
      );
    }

    /*
     * =====================================================
     * DELIVERY / RIDER
     * =====================================================
     *
     * We resolve the Rider from Delivery.
     *
     * The frontend is never allowed to submit arbitrary
     * rider, seller, florist, or delivery IDs.
     */

    let delivery =
      null;

    let rider =
      null;

    let riderUser =
      null;

    let riderRating =
      null;

    if (
      order.fulfillmentType ===
      "delivery"
    ) {
      delivery =
        await Delivery.findOne({
          order:
            order._id,
        });

      /*
       * A completed legacy Order could theoretically exist
       * without a Delivery document, so we do not fabricate
       * a Rider relationship.
       *
       * If a real assigned Rider exists, riderRating becomes
       * required.
       */

      if (
        delivery &&
        delivery.rider &&
        delivery.riderUser
      ) {
        rider =
          delivery.rider;

        riderUser =
          delivery.riderUser;

        if (
          reviewData
            .riderRating ===
            undefined ||
          reviewData
            .riderRating ===
            null
        ) {
          throw createHttpError(
            "Rider rating is required for this delivery order.",
            400
          );
        }

        riderRating =
          Number(
            reviewData
              .riderRating
          );
      }
    }

    /*
     * Pickup orders must never create a Rider rating.
     */

    if (
      order.fulfillmentType ===
      "pickup"
    ) {
      riderRating =
        null;

      delivery =
        null;

      rider =
        null;

      riderUser =
        null;
    }

    const cleanComment =
      String(
        reviewData
          .comment ||
          ""
      ).trim();

    let review;

    try {
      review =
        await Review.create({
          order:
            order._id,

          customer:
            customerId,

          seller:
            order.seller,

          florist:
            order.florist,

          delivery:
            delivery
              ? delivery._id
              : null,

          rider,

          riderUser,

          overallRating:
            Number(
              reviewData
                .overallRating
            ),

          orderRating:
            Number(
              reviewData
                .orderRating
            ),

          sellerRating:
            Number(
              reviewData
                .sellerRating
            ),

          riderRating,

          systemRating:
            Number(
              reviewData
                .systemRating
            ),

          comment:
            cleanComment ||
            null,
        });
    } catch (error) {
      /*
       * MongoDB duplicate protection.
       *
       * This protects against two simultaneous submissions
       * even if both requests pass the earlier existence
       * check.
       */

      if (
        error?.code ===
        11000
      ) {
        throw createHttpError(
          "A review has already been submitted for this order.",
          409
        );
      }

      throw error;
    }

    /*
     * =====================================================
     * SELLER NOTIFICATION
     * =====================================================
     */

    await createNotificationSafely({
      recipient:
        order.seller,

      role:
        "seller",

      type:
        "rating_received",

      title:
        "New Rating Received",

      message:
        "A customer reviewed a completed order.",

      order:
        order._id,

      delivery:
        delivery
          ? delivery._id
          : null,

      metadata: {
        screen:
          "review",

        reviewId:
          String(
            review._id
          ),

        overallRating:
          review.overallRating,

        sellerRating:
          review.sellerRating,
      },
    });

    /*
     * =====================================================
     * RIDER NOTIFICATION
     * =====================================================
     *
     * Only delivery transactions with an actual Rider.
     */

    if (
      riderUser
    ) {
      await createNotificationSafely({
        recipient:
          riderUser,

        role:
          "rider",

        type:
          "rating_received",

        title:
          "New Rating Received",

        message:
          "A customer rated your completed delivery.",

        order:
          order._id,

        delivery:
          delivery
            ? delivery._id
            : null,

        metadata: {
          screen:
            "review",

          reviewId:
            String(
              review._id
            ),

          riderRating:
            review.riderRating,
        },
      });
    }

    const populated =
      await populateReview(
        review._id
      );

    return formatReview(
      populated
    );
  };

/*
 * =========================================================
 * CUSTOMER
 * GET REVIEW FOR ONE ORDER
 * =========================================================
 */

export const getCustomerOrderReview =
  async (
    customerId,
    orderId
  ) => {
    await getCustomer(
      customerId
    );

    /*
     * Verify that the Order belongs to the authenticated
     * customer even when there is no Review yet.
     */

    const order =
      await getCustomerOrder(
        orderId,
        customerId
      );

    const review =
      await Review.findOne({
        order:
          order._id,

        customer:
          customerId,
      });

    /*
     * Returning reviewed:false is useful for the mobile app.
     *
     * The Completed Orders screen can call this endpoint
     * without treating "no review yet" as an HTTP error.
     */

    if (!review) {
      let delivery =
        null;

      if (
        order.fulfillmentType ===
        "delivery"
      ) {
        delivery =
          await Delivery.findOne({
            order:
              order._id,
          })
            .select(
              "_id rider riderUser status"
            )
            .lean();
      }

      return {
        reviewed:
          false,

        canReview:
          order.orderStatus ===
          "completed",

        riderRatingRequired:
          Boolean(
            delivery?.rider &&
            delivery?.riderUser
          ),

        review:
          null,
      };
    }

    const populated =
      await populateReview(
        review._id
      );

    return {
      reviewed:
        true,

      canReview:
        false,

      riderRatingRequired:
        populated?.riderUser
          ? true
          : false,

      review:
        formatReview(
          populated
        ),
    };
  };

/*
 * =========================================================
 * CUSTOMER
 * GET MY REVIEWS
 * =========================================================
 */

export const getCustomerReviews =
  async (
    customerId
  ) => {
    await getCustomer(
      customerId
    );

    const reviews =
      await Review.find({
        customer:
          customerId,
      })
        .sort({
          createdAt:
            -1,
        })
        .populate(
          "customer",
          "firstName lastName profileImage"
        )
        .populate(
          "seller",
          "firstName lastName profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo"
        )
        .populate(
          "delivery"
        )
        .populate(
          "riderUser",
          "firstName lastName profileImage"
        )
        .populate({
          path:
            "rider",

          populate: {
            path:
              "owner",

            select:
              "firstName lastName profileImage",
          },
        })
        .populate(
          "order"
        );

    return reviews.map(
      (
        review
      ) =>
        formatReview(
          review
        )
    );
  };

  /*
 * =========================================================
 * SELLER
 * GET REVIEWS RECEIVED
 * =========================================================
 *
 * Returns all reviews received by the authenticated Seller.
 *
 * IMPORTANT:
 *
 * - Seller performance uses sellerRating.
 * - overallRating is the complete FLOGRAM transaction rating.
 * - Reviews are sorted newest first.
 * =========================================================
 */

export const getSellerReviews =
  async (
    sellerId
  ) => {
    /*
     * =====================================================
     * REVIEWS
     * =====================================================
     */

    const reviews =
      await Review.find({
        seller:
          sellerId,
      })
        .sort({
          createdAt:
            -1,
        })
        .populate(
          "customer",
          "firstName lastName profileImage"
        )
        .populate(
          "seller",
          "firstName lastName profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo"
        )
        .populate(
          "delivery"
        )
        .populate(
          "riderUser",
          "firstName lastName profileImage"
        )
        .populate({
          path:
            "rider",

          populate: {
            path:
              "owner",

            select:
              "firstName lastName profileImage",
          },
        })
        .populate(
          "order"
        );

    /*
     * =====================================================
     * FORMAT REVIEWS
     * =====================================================
     */

    const formattedReviews =
      reviews.map(
        (
          review
        ) =>
          formatReview(
            review
          )
      );

    /*
     * =====================================================
     * SELLER RATING SUMMARY
     * =====================================================
     */

    const validRatings =
      formattedReviews
        .map(
          review =>
            Number(
              review
                .sellerRating
            )
        )
        .filter(
          rating =>
            Number.isFinite(
              rating
            ) &&
            rating >= 1 &&
            rating <= 5
        );

    const ratingCount =
      validRatings.length;

    const averageRating =
      ratingCount > 0
        ? validRatings.reduce(
            (
              total,
              rating
            ) =>
              total +
              rating,
            0
          ) /
          ratingCount
        : null;

    /*
     * =====================================================
     * RATING DISTRIBUTION
     * =====================================================
     */

    const distribution = {
      5:
        0,

      4:
        0,

      3:
        0,

      2:
        0,

      1:
        0,
    };

    validRatings.forEach(
      rating => {
        const normalizedRating =
          Math.round(
            rating
          );

        if (
          normalizedRating >= 1 &&
          normalizedRating <= 5
        ) {
          distribution[
            normalizedRating
          ] += 1;
        }
      }
    );

    return {
      averageRating:
        averageRating !== null
          ? Number(
              averageRating.toFixed(
                2
              )
            )
          : null,

      count:
        ratingCount,

      distribution,

      reviews:
        formattedReviews,
    };
  };