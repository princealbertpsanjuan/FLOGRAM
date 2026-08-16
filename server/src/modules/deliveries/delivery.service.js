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
 * =========================================================
 * SELLER
 * GET AVAILABLE RIDERS
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
 * ASSIGN RIDER TO ORDER
 * =========================================================
 *
 * Seller may only assign a rider when:
 *
 * - order belongs to seller
 * - fulfillmentType is delivery
 * - order is ready_for_delivery
 * - no delivery already exists
 * - rider is approved
 * - rider is active
 * - rider is available
 */
export const assignRiderToOrder =
  async (
    orderId,
    sellerId,
    riderId
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
          "Only delivery orders can be assigned to riders."
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
          "Only orders that are ready for delivery can be assigned to riders."
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
      const error =
        new Error(
          "An active delivery already exists for this order."
        );

      error.statusCode =
        409;

      throw error;
    }

    const rider =
      await Rider.findById(
        riderId
      );

    if (!rider) {
      const error =
        new Error(
          "Rider profile was not found."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      rider.verificationStatus !==
      "approved"
    ) {
      const error =
        new Error(
          "Only approved riders can be assigned to deliveries."
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
        400;

      throw error;
    }

    if (
      rider.isAvailable !==
      true
    ) {
      const error =
        new Error(
          "This rider is currently unavailable."
        );

      error.statusCode =
        409;

      throw error;
    }

    const riderUser =
      await User.findById(
        rider.owner
      );

    if (
      !riderUser ||
      riderUser.role !==
        "rider"
    ) {
      const error =
        new Error(
          "The assigned rider account is invalid."
        );

      error.statusCode =
        400;

      throw error;
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

        rider:
          rider._id,

        riderUser:
          rider.owner,

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
          "assigned",

        assignedAt:
          new Date(),
      });

    /*
     * Do not make rider unavailable yet.
     *
     * Rider becomes unavailable only
     * after accepting the assignment.
     */

    return populateDelivery(
      delivery._id
    );
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
        "productName totalAmount orderStatus fulfillmentType"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * RIDER
 * GET MY DELIVERY ASSIGNMENTS
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
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate"
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
        "productName inspirationImage totalAmount orderStatus"
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

    if (
      user.role ===
      "customer"
    ) {
      if (
        String(
          delivery.customer._id
        ) !==
        String(userId)
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

    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          delivery.seller._id
        ) !==
        String(userId)
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

    if (
      user.role ===
      "rider"
    ) {
      if (
        String(
          delivery.riderUser
        ) !==
        String(userId)
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
 * ACCEPT DELIVERY ASSIGNMENT
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

    if (
      rider.verificationStatus !==
      "approved"
    ) {
      const error =
        new Error(
          "Only approved riders can accept delivery assignments."
        );

      error.statusCode =
        403;

      throw error;
    }

    if (
      !rider.isActive
    ) {
      const error =
        new Error(
          "This rider account is not active."
        );

      error.statusCode =
        403;

      throw error;
    }

    if (
      !rider.isAvailable
    ) {
      const error =
        new Error(
          "You must be available before accepting a delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,
      });

    if (!delivery) {
      const error =
        new Error(
          "Delivery assignment was not found or does not belong to this rider."
        );

      error.statusCode =
        404;

      throw error;
    }

    if (
      delivery.status !==
      "assigned"
    ) {
      const error =
        new Error(
          "Only newly assigned deliveries can be accepted."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * A rider should not already have
     * another active accepted delivery.
     */
    const activeDelivery =
      await Delivery.findOne({
        rider:
          rider._id,

        _id: {
          $ne:
            delivery._id,
        },

        status: {
          $in: [
            "accepted",
            "picked_up",
            "out_for_delivery",
          ],
        },
      });

    if (activeDelivery) {
      const error =
        new Error(
          "You already have an active delivery."
        );

      error.statusCode =
        409;

      throw error;
    }

    delivery.status =
      "accepted";

    delivery.acceptedAt =
      new Date();

    /*
     * Rider is now busy.
     */
    rider.isAvailable =
      false;

    await rider.save();
    await delivery.save();

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

    delivery.status =
      "out_for_delivery";

    delivery.outForDeliveryAt =
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
     * Synchronize order.
     */
    order.orderStatus =
      "delivered";

    order.deliveredAt =
      now;

    /*
     * Cash on delivery can be marked
     * paid when the rider confirms
     * successful delivery.
     *
     * Online/GCash payment should
     * remain controlled by payment
     * integration later.
     */
    if (
      order.paymentMethod ===
      "cash_on_delivery"
    ) {
      order.paymentStatus =
        "paid";
    }

    /*
     * Rider becomes available again.
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
        "assigned",
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

    const rider =
      await Rider.findById(
        delivery.rider
      );

    delivery.status =
      "cancelled";

    delivery.cancelledAt =
      new Date();

    await delivery.save();

    /*
     * If rider had already accepted,
     * release the rider again.
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
     * The order remains
     * ready_for_delivery so the seller
     * can assign another rider.
     */
    return populateDelivery(
      delivery._id
    );
  };