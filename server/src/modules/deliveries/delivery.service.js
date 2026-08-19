import Delivery from "./delivery.model.js";

import Order from "../orders/order.model.js";
import Rider from "../riders/rider.model.js";
import User from "../auth/auth.model.js";
import Florist from "../florists/florist.model.js";

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

const populateDelivery = (
  deliveryId
) => {
  return Delivery.findById(
    deliveryId
  )
    .populate(
      "customer",
      "firstName lastName email phoneNumber profileImage"
    )
    .populate(
      "seller",
      "firstName lastName email phoneNumber"
    )
    .populate(
      "florist",
      "shopName address contactNumber businessEmail shopLogo"
    )
    .populate({
      path: "rider",

      populate: {
        path: "owner",

        select:
          "firstName lastName email phoneNumber role verificationStatus",
      },
    })
    .populate(
      "order"
    );
};

const getSellerFlorist = async (
  sellerId
) => {
  const seller =
    await User.findById(
      sellerId
    );

  if (
    !seller ||
    seller.role !==
      "seller"
  ) {
    const error =
      new Error(
        "Only seller accounts can manage deliveries."
      );

    error.statusCode =
      403;

    throw error;
  }

  const florist =
    await Florist.findOne({
      owner:
        sellerId,
    });

  if (!florist) {
    const error =
      new Error(
        "Florist profile was not found."
      );

    error.statusCode =
      404;

    throw error;
  }

  return florist;
};

const getRiderProfileByUser =
  async (
    riderUserId
  ) => {
    const rider =
      await Rider.findOne({
        owner:
          riderUserId,
      });

    if (!rider) {
      const error =
        new Error(
          "Rider profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    return rider;
  };

/*
 * Validate that a rider may
 * participate in delivery requests.
 */
const validateEligibleRider =
  (
    rider
  ) => {
    if (
      rider.verificationStatus !==
      "approved"
    ) {
      const error =
        new Error(
          "Only approved riders can access delivery requests."
        );

      error.statusCode =
        403;

      throw error;
    }

    if (
      rider.isActive !==
      true
    ) {
      const error =
        new Error(
          "This rider account is not active."
        );

      error.statusCode =
        403;

      throw error;
    }
  };

/*
 * =========================================================
 * SELLER
 * GET AVAILABLE RIDERS
 *
 * Kept as an optional administrative/
 * fallback feature.
 * =========================================================
 */
export const getAvailableRiders =
  async () => {
    return Rider.find({
      verificationStatus:
        "approved",

      isActive:
        true,

      isAvailable:
        true,
    })
      .populate(
        "owner",
        "firstName lastName email phoneNumber"
      )
      .sort({
        updatedAt:
          -1,
      });
  };

/*
 * =========================================================
 * SELLER
 * CREATE AVAILABLE DELIVERY REQUEST
 * =========================================================
 *
 * Normal FLOGRAM flow:
 *
 * ready_for_delivery
 *      ↓
 * available delivery request
 *      ↓
 * visible to approved riders
 *
 * No rider is selected here.
 * =========================================================
 */
export const createDeliveryRequest =
  async (
    orderId,
    sellerId
  ) => {
    const florist =
      await getSellerFlorist(
        sellerId
      );

    const order =
      await Order.findOne({
        _id:
          orderId,

        seller:
          sellerId,

        florist:
          florist._id,
      });

    if (!order) {
      const error =
        new Error(
          "Order was not found or does not belong to this seller."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      order.fulfillmentType !==
      "delivery"
    ) {
      const error =
        new Error(
          "Only delivery orders can create delivery requests."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      order.orderStatus !==
      "ready_for_delivery"
    ) {
      const error =
        new Error(
          "Only orders that are ready for delivery can create a delivery request."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * PayMongo orders must already
     * be paid before delivery.
     */
    if (
      order.paymentMethod ===
        "paymongo" &&
      order.paymentStatus !==
        "paid"
    ) {
      const error =
        new Error(
          "This PayMongo order cannot be sent for delivery until payment is confirmed."
        );

      error.statusCode =
        400;

      throw error;
    }

    const existingDelivery =
      await Delivery.findOne({
        order:
          order._id,

        status: {
          $ne:
            "cancelled",
        },
      });

    if (
      existingDelivery
    ) {
      /*
       * Return existing request instead
       * of creating a duplicate.
       */
      return populateDelivery(
        existingDelivery._id
      );
    }

    const deliveryAddress =
      order.deliveryAddress ||
      {};

    if (
      !deliveryAddress.street ||
      !deliveryAddress.barangay ||
      !deliveryAddress.city ||
      !deliveryAddress.province
    ) {
      const error =
        new Error(
          "The order does not contain a complete delivery address."
        );

      error.statusCode =
        400;

      throw error;
    }

    const pickupAddress =
      florist.address ||
      {};

    if (
      !pickupAddress.street ||
      !pickupAddress.barangay ||
      !pickupAddress.city ||
      !pickupAddress.province
    ) {
      const error =
        new Error(
          "The florist does not contain a complete pickup address."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      !order.recipientName ||
      !order.recipientPhoneNumber
    ) {
      const error =
        new Error(
          "Recipient information is incomplete."
        );

      error.statusCode =
        400;

      throw error;
    }

    const now =
      new Date();

    const delivery =
      await Delivery.create({
        order:
          order._id,

        customer:
          order.customer,

        seller:
          order.seller,

        florist:
          order.florist,

        /*
         * No rider yet.
         */
        rider:
          null,

        riderUser:
          null,

        pickupAddress: {
          street:
            pickupAddress.street,

          barangay:
            pickupAddress.barangay,

          city:
            pickupAddress.city,

          province:
            pickupAddress.province,

          postalCode:
            pickupAddress.postalCode ||
            "",
        },

        deliveryAddress: {
          street:
            deliveryAddress.street,

          barangay:
            deliveryAddress.barangay,

          city:
            deliveryAddress.city,

          province:
            deliveryAddress.province,

          postalCode:
            deliveryAddress.postalCode ||
            "",

          landmark:
            deliveryAddress.landmark ||
            "",
        },

        recipientName:
          order.recipientName,

        recipientPhoneNumber:
          order.recipientPhoneNumber,

        status:
          "available",

        availableAt:
          now,

        assignedAt:
          null,

        acceptedAt:
          null,
      });

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * GET AVAILABLE DELIVERY REQUESTS
 * =========================================================
 */
export const getAvailableDeliveryRequests =
  async (
    riderUserId
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    validateEligibleRider(
      rider
    );

    if (
      rider.isAvailable !==
      true
    ) {
      const error =
        new Error(
          "You must be available to view delivery requests."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * A rider with an active delivery
     * should not receive another request.
     */
    const activeDelivery =
      await Delivery.findOne({
        rider:
          rider._id,

        status: {
          $in: [
            "accepted",
            "picked_up",
            "out_for_delivery",
          ],
        },
      });

    if (activeDelivery) {
      return [];
    }

    return Delivery.find({
      status:
        "available",

      rider:
        null,

      riderUser:
        null,
    })
      .populate(
        "florist",
        "shopName address contactNumber shopLogo"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate"
      )
      .sort({
        availableAt:
          1,
      });
  };

/*
 * =========================================================
 * SELLER
 * GET SELLER DELIVERIES
 * =========================================================
 */
export const getSellerDeliveries =
  async (
    sellerId,
    filters = {}
  ) => {
    const florist =
      await getSellerFlorist(
        sellerId
      );

    const query = {
      florist:
        florist._id,
    };

    if (
      filters.status
    ) {
      query.status =
        filters.status;
    }

    return Delivery.find(
      query
    )
      .populate(
        "customer",
        "firstName lastName phoneNumber"
      )
      .populate({
        path: "rider",

        populate: {
          path: "owner",

          select:
            "firstName lastName phoneNumber",
        },
      })
      .populate(
        "order",
        "productName totalAmount orderStatus fulfillmentType paymentMethod paymentStatus"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * RIDER
 * GET MY ACCEPTED / ACTIVE / OLD DELIVERIES
 * =========================================================
 */
export const getRiderDeliveries =
  async (
    riderUserId,
    filters = {}
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    validateEligibleRider(
      rider
    );

    const query = {
      rider:
        rider._id,
    };

    if (
      filters.status
    ) {
      query.status =
        filters.status;
    }

    return Delivery.find(
      query
    )
      .populate(
        "customer",
        "firstName lastName phoneNumber"
      )
      .populate(
        "florist",
        "shopName address contactNumber"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate paymentMethod paymentStatus"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * CUSTOMER
 * GET MY DELIVERIES
 * =========================================================
 */
export const getCustomerDeliveries =
  async (
    customerId
  ) => {
    return Delivery.find({
      customer:
        customerId,
    })
      .populate({
        path: "rider",

        populate: {
          path: "owner",

          select:
            "firstName lastName phoneNumber",
        },
      })
      .populate(
        "florist",
        "shopName address contactNumber"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus paymentMethod paymentStatus"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * CUSTOMER / SELLER / RIDER
 * GET ONE DELIVERY
 * =========================================================
 */
export const getDeliveryById =
  async (
    deliveryId,
    userId
  ) => {
    const user =
      await User.findById(
        userId
      );

    if (!user) {
      const error =
        new Error(
          "User account was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const delivery =
      await populateDelivery(
        deliveryId
      );

    if (!delivery) {
      const error =
        new Error(
          "Delivery was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    /*
     * CUSTOMER
     */
    if (
      user.role ===
      "customer"
    ) {
      if (
        String(
          delivery.customer._id
        ) !==
        String(
          userId
        )
      ) {
        const error =
          new Error(
            "You do not have permission to view this delivery."
          );

        error.statusCode =
          403;

        throw error;
      }

      return delivery;
    }

    /*
     * SELLER
     */
    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          delivery.seller._id
        ) !==
        String(
          userId
        )
      ) {
        const error =
          new Error(
            "You do not have permission to view this delivery."
          );

        error.statusCode =
          403;

        throw error;
      }

      return delivery;
    }

    /*
     * RIDER
     *
     * Available requests may be viewed
     * by approved active riders before
     * they accept.
     */
    if (
      user.role ===
      "rider"
    ) {
      const rider =
        await getRiderProfileByUser(
          userId
        );

      validateEligibleRider(
        rider
      );

      if (
        delivery.status ===
          "available" &&
        !delivery.rider
      ) {
        return delivery;
      }

      if (
        String(
          delivery.riderUser
        ) !==
        String(
          userId
        )
      ) {
        const error =
          new Error(
            "You do not have permission to view this delivery."
          );

        error.statusCode =
          403;

        throw error;
      }

      return delivery;
    }

    const error =
      new Error(
        "You do not have permission to view this delivery."
      );

    error.statusCode =
      403;

    throw error;
  };

/*
 * =========================================================
 * RIDER
 * ACCEPT AVAILABLE DELIVERY
 * =========================================================
 *
 * IMPORTANT:
 *
 * The delivery itself is claimed using
 * findOneAndUpdate with:
 *
 * status = available
 * rider = null
 *
 * so only ONE rider can successfully
 * claim the request.
 * =========================================================
 */
export const acceptDeliveryAssignment =
  async (
    deliveryId,
    riderUserId
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    validateEligibleRider(
      rider
    );

    /*
     * Atomically reserve this rider.
     *
     * This prevents the same rider from
     * accepting multiple requests at
     * nearly the same time.
     */
    const reservedRider =
      await Rider.findOneAndUpdate(
        {
          _id:
            rider._id,

          verificationStatus:
            "approved",

          isActive:
            true,

          isAvailable:
            true,
        },

        {
          $set: {
            isAvailable:
              false,
          },
        },

        {
          new:
            true,
        }
      );

    if (!reservedRider) {
      const error =
        new Error(
          "You must be available before accepting a delivery."
        );

      error.statusCode =
        409;

      throw error;
    }

    /*
     * Double-check no previous active
     * delivery exists.
     */
    const activeDelivery =
      await Delivery.findOne({
        rider:
          rider._id,

        status: {
          $in: [
            "accepted",
            "picked_up",
            "out_for_delivery",
          ],
        },
      });

    if (activeDelivery) {
      await Rider.findByIdAndUpdate(
        rider._id,
        {
          isAvailable:
            false,
        }
      );

      const error =
        new Error(
          "You already have an active delivery."
        );

      error.statusCode =
        409;

      throw error;
    }

    const now =
      new Date();

    /*
     * Atomic claim.
     *
     * If another rider already claimed
     * it, this returns null.
     */
    const delivery =
      await Delivery.findOneAndUpdate(
        {
          _id:
            deliveryId,

          status:
            "available",

          rider:
            null,

          riderUser:
            null,
        },

        {
          $set: {
            rider:
              rider._id,

            riderUser:
              riderUserId,

            status:
              "accepted",

            assignedAt:
              now,

            acceptedAt:
              now,
          },
        },

        {
          new:
            true,

          runValidators:
            true,
        }
      );

    if (!delivery) {
      /*
       * Rider failed to claim the
       * request, so release them again.
       */
      await Rider.findByIdAndUpdate(
        rider._id,
        {
          isAvailable:
            true,
        }
      );

      const error =
        new Error(
          "This delivery is no longer available. Another rider may have already accepted it."
        );

      error.statusCode =
        409;

      throw error;
    }

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * MARK BOUQUET AS PICKED UP
 * =========================================================
 */
export const markDeliveryPickedUp =
  async (
    deliveryId,
    riderUserId,
    riderNotes = null
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,

        riderUser:
          riderUserId,
      });

    if (!delivery) {
      const error =
        new Error(
          "Delivery was not found or does not belong to this rider."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      delivery.status !==
      "accepted"
    ) {
      const error =
        new Error(
          "Delivery must be accepted before the bouquet can be picked up."
        );

      error.statusCode =
        400;

      throw error;
    }

    delivery.status =
      "picked_up";

    delivery.pickedUpAt =
      new Date();

    if (
      riderNotes !==
        undefined &&
      riderNotes !==
        null
    ) {
      delivery.riderNotes =
        String(
          riderNotes
        ).trim();
    }

    await delivery.save();

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * START DELIVERY
 * =========================================================
 */
export const startOutForDelivery =
  async (
    deliveryId,
    riderUserId,
    riderNotes = null
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,

        riderUser:
          riderUserId,
      });

    if (!delivery) {
      const error =
        new Error(
          "Delivery was not found or does not belong to this rider."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      delivery.status !==
      "picked_up"
    ) {
      const error =
        new Error(
          "The bouquet must be picked up before starting delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const order =
      await Order.findById(
        delivery.order
      );

    if (!order) {
      const error =
        new Error(
          "Associated order was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      order.orderStatus !==
      "ready_for_delivery"
    ) {
      const error =
        new Error(
          "Associated order is not ready for delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const now =
      new Date();

    delivery.status =
      "out_for_delivery";

    delivery.outForDeliveryAt =
      now;

    if (
      riderNotes !==
        undefined &&
      riderNotes !==
        null
    ) {
      delivery.riderNotes =
        String(
          riderNotes
        ).trim();
    }

    order.orderStatus =
      "out_for_delivery";

    await delivery.save();
    await order.save();

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * MARK DELIVERY AS DELIVERED
 * =========================================================
 */
export const markDeliveryDelivered =
  async (
    deliveryId,
    riderUserId,
    riderNotes = null
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,

        riderUser:
          riderUserId,
      });

    if (!delivery) {
      const error =
        new Error(
          "Delivery was not found or does not belong to this rider."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      delivery.status !==
      "out_for_delivery"
    ) {
      const error =
        new Error(
          "Only out-for-delivery orders can be marked as delivered."
        );

      error.statusCode =
        400;

      throw error;
    }

    const order =
      await Order.findById(
        delivery.order
      );

    if (!order) {
      const error =
        new Error(
          "Associated order was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    const now =
      new Date();

    delivery.status =
      "delivered";

    delivery.deliveredAt =
      now;

    if (
      riderNotes !==
        undefined &&
      riderNotes !==
        null
    ) {
      delivery.riderNotes =
        String(
          riderNotes
        ).trim();
    }

    /*
     * Synchronize Order.
     */
    order.orderStatus =
      "delivered";

    order.deliveredAt =
      now;

    /*
     * COD is paid when successful
     * delivery occurs.
     *
     * PayMongo payment remains managed
     * by the PayMongo webhook.
     */
    if (
      order.paymentMethod ===
      "cash_on_delivery"
    ) {
      order.paymentStatus =
        "paid";

      order.paidAt =
        now;
    }

    /*
     * Rider is available again.
     */
    rider.isAvailable =
      true;

    await delivery.save();
    await order.save();
    await rider.save();

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * SELLER
 * CANCEL DELIVERY BEFORE PICKUP
 * =========================================================
 */
export const cancelDelivery =
  async (
    deliveryId,
    sellerId
  ) => {
    const florist =
      await getSellerFlorist(
        sellerId
      );

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        florist:
          florist._id,
      });

    if (!delivery) {
      const error =
        new Error(
          "Delivery was not found or does not belong to this florist."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      ![
        "available",
        "accepted",
      ].includes(
        delivery.status
      )
    ) {
      const error =
        new Error(
          "This delivery can no longer be cancelled."
        );

      error.statusCode =
        400;

      throw error;
    }

    let rider =
      null;

    if (delivery.rider) {
      rider =
        await Rider.findById(
          delivery.rider
        );
    }

    delivery.status =
      "cancelled";

    delivery.cancelledAt =
      new Date();

    await delivery.save();

    /*
     * Release rider if the request
     * had already been accepted.
     */
    if (
      rider &&
      rider.isActive &&
      rider.verificationStatus ===
        "approved"
    ) {
      rider.isAvailable =
        true;

      await rider.save();
    }

    /*
     * Order remains ready_for_delivery.
     *
     * Seller/system may create another
     * available delivery request.
     */
    return populateDelivery(
      delivery._id
    );
  };