import Delivery from "./delivery.model.js";
import Order from "../orders/order.model.js";
import Rider from "../riders/rider.model.js";
import User from "../auth/auth.model.js";
import Florist from "../florists/florist.model.js";

import {
  calculateDeliveryRoute,
} from "../../services/routing.service.js";

import {
  createNotification,
} from "../notifications/notification.service.js";

import {
  getRiderWorkShiftStatus,
  requireActiveApprovedShiftForRider,
} from "../riders/rider-shift.service.js";

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
      "shopName address location contactNumber businessEmail shopLogo"
    )
    .populate({
      path: "rider",

      populate: {
        path: "owner",

        select:
          "firstName lastName email phoneNumber role verificationStatus",
      },
    })
    .populate("order");
};

const getSellerFlorist =
  async (
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
 * Validate rider account.
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
 * RIDER WORK SHIFT HELPERS
 * =========================================================
 *
 * A Rider may only receive or accept NEW delivery requests
 * while an approved work shift is currently active.
 *
 * An active delivery is different:
 *
 * accepted
 * picked_up
 * out_for_delivery
 *
 * Once the Rider has already accepted a delivery, the Rider
 * may finish that delivery even if the approved work shift
 * reaches its end time.
 * =========================================================
 */

const canRiderReceiveNewDeliveries =
  async (
    rider
  ) => {
    const workShift =
      await getRiderWorkShiftStatus(
        rider._id
      );

    return (
      workShift?.canGoOnline ===
      true
    );
  };

const restoreRiderAvailabilityAfterDelivery =
  async (
    riderId
  ) => {
    const rider =
      await Rider.findById(
        riderId
      );

    if (!rider) {
      return false;
    }

    if (
      rider.verificationStatus !==
        "approved" ||
      rider.isActive !==
        true
    ) {
      rider.isAvailable =
        false;

      await rider.save();

      return false;
    }

    const canReceive =
      await canRiderReceiveNewDeliveries(
        rider
      );

    rider.isAvailable =
      canReceive;

    await rider.save();

    return canReceive;
  };

/*
 * =========================================================
 * SAFE NOTIFICATION HELPER
 * =========================================================
 */

const createNotificationSafely =
  async (
    notificationData
  ) => {
    try {
      const notification =
        await createNotification(
          notificationData
        );

      console.log(
        "Notification created:",
        notification._id
      );

      return notification;
    } catch (error) {
      console.error(
        "Notification creation failed:",
        error
      );

      return null;
    }
  };

/*
 * =========================================================
 * COORDINATE HELPERS
 * =========================================================
 */

const normalizeCoordinate = (
  latitude,
  longitude,
  label
) => {
  const lat =
    Number(
      latitude
    );

  const lng =
    Number(
      longitude
    );

  if (
    !Number.isFinite(
      lat
    ) ||
    !Number.isFinite(
      lng
    )
  ) {
    const error =
      new Error(
        `${label} coordinates are invalid.`
      );

    error.statusCode =
      400;

    throw error;
  }

  if (
    lat < -90 ||
    lat > 90
  ) {
    const error =
      new Error(
        `${label} latitude must be between -90 and 90.`
      );

    error.statusCode =
      400;

    throw error;
  }

  if (
    lng < -180 ||
    lng > 180
  ) {
    const error =
      new Error(
        `${label} longitude must be between -180 and 180.`
      );

    error.statusCode =
      400;

    throw error;
  }

  return {
    latitude:
      lat,

    longitude:
      lng,
  };
};

/*
 * =========================================================
 * NAVIGATION HELPER
 * =========================================================
 */

const calculateRiderNavigation =
  async (
    delivery,
    riderLatitude,
    riderLongitude
  ) => {
    let destinationType;

    let destination;

    if (
      delivery.status ===
      "accepted"
    ) {
      destinationType =
        "pickup";

      const pickupLatitude =
        delivery
          .pickupLocation
          ?.latitude ??
        delivery
          .order
          ?.pickupLocation
          ?.latitude;

      const pickupLongitude =
        delivery
          .pickupLocation
          ?.longitude ??
        delivery
          .order
          ?.pickupLocation
          ?.longitude;

      destination =
        normalizeCoordinate(
          pickupLatitude,
          pickupLongitude,
          "Pickup"
        );
    } else if (
      [
        "picked_up",
        "out_for_delivery",
      ].includes(
        delivery.status
      )
    ) {
      destinationType =
        "delivery";

      const deliveryLatitude =
        delivery
          .deliveryLocation
          ?.latitude ??
        delivery
          .order
          ?.deliveryLocation
          ?.latitude;

      const deliveryLongitude =
        delivery
          .deliveryLocation
          ?.longitude ??
        delivery
          .order
          ?.deliveryLocation
          ?.longitude;

      destination =
        normalizeCoordinate(
          deliveryLatitude,
          deliveryLongitude,
          "Delivery"
        );
    } else {
      const error =
        new Error(
          "Navigation is not available for the current delivery status."
        );

      error.statusCode =
        400;

      throw error;
    }

    const route =
      await calculateDeliveryRoute({
        pickupLatitude:
          riderLatitude,

        pickupLongitude:
          riderLongitude,

        deliveryLatitude:
          destination.latitude,

        deliveryLongitude:
          destination.longitude,
      });

    const now =
      new Date();

    const estimatedArrivalAt =
      new Date(
        now.getTime() +
          route.durationSeconds *
            1000
      );

    return {
      destinationType,

      distanceMeters:
        route.distanceMeters,

      durationSeconds:
        route.durationSeconds,

      estimatedArrivalAt,

      updatedAt:
        now,

      geometry:
        route.geometry,
    };
  };

/*
 * =========================================================
 * SELLER
 * GET AVAILABLE RIDERS
 * =========================================================
 */

export const getAvailableRiders =
  async () => {
    const riders =
      await Rider.find({
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

    const availableRiders =
      [];

    for (
      const rider
      of riders
    ) {
      const canReceive =
        await canRiderReceiveNewDeliveries(
          rider
        );

      if (canReceive) {
        availableRiders.push(
          rider
        );
      } else {
        rider.isAvailable =
          false;

        await rider.save();
      }
    }

    return availableRiders;
  };

/*
 * =========================================================
 * PRE-ORDER RIDER AVAILABILITY
 * =========================================================
 */

const getPreOrderRiderLeadMinutes =
  () => {
    const minutes =
      Number(
        process.env
          .PREORDER_RIDER_LEAD_MINUTES ||
          60
      );

    if (
      !Number.isFinite(
        minutes
      ) ||
      minutes < 0
    ) {
      return 60;
    }

    return minutes;
  };

const getDeliveryAvailableAt =
  (
    order
  ) => {
    const now =
      new Date();

    if (
      !order?.isPreOrder ||
      !order
        ?.requestedDeliveryDate
    ) {
      return now;
    }

    const scheduledDelivery =
      new Date(
        order
          .requestedDeliveryDate
      );

    if (
      Number.isNaN(
        scheduledDelivery.getTime()
      )
    ) {
      return now;
    }

    const leadMinutes =
      getPreOrderRiderLeadMinutes();

    const availableAt =
      new Date(
        scheduledDelivery.getTime() -
          leadMinutes *
            60 *
            1000
      );

    if (
      availableAt <=
      now
    ) {
      return now;
    }

    return availableAt;
  };

/*
 * =========================================================
 * SELLER
 * CREATE DELIVERY REQUEST
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
      !order
        .recipientPhoneNumber
    ) {
      const error =
        new Error(
          "Recipient information is incomplete."
        );

      error.statusCode =
        400;

      throw error;
    }

    const pickupLocation =
      normalizeCoordinate(
        order
          ?.pickupLocation
          ?.latitude,

        order
          ?.pickupLocation
          ?.longitude,

        "Pickup"
      );

    const deliveryLocation =
      normalizeCoordinate(
        order
          ?.deliveryLocation
          ?.latitude,

        order
          ?.deliveryLocation
          ?.longitude,

        "Delivery"
      );

    const availableAt =
      getDeliveryAvailableAt(
        order
      );

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
            pickupAddress
              .postalCode ||
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
            deliveryAddress
              .postalCode ||
            "",

          landmark:
            deliveryAddress
              .landmark ||
            "",
        },

        pickupLocation: {
          latitude:
            pickupLocation.latitude,

          longitude:
            pickupLocation.longitude,
        },

        deliveryLocation: {
          latitude:
            deliveryLocation.latitude,

          longitude:
            deliveryLocation.longitude,
        },

        riderLocation: {
          latitude:
            null,

          longitude:
            null,

          accuracy:
            null,

          updatedAt:
            null,
        },

        navigation: {
          destinationType:
            null,

          distanceMeters:
            null,

          durationSeconds:
            null,

          estimatedArrivalAt:
            null,

          updatedAt:
            null,
        },

        recipientName:
          order.recipientName,

        recipientPhoneNumber:
          order
            .recipientPhoneNumber,

        status:
          "available",

        availableAt,

        assignedAt:
          null,

        acceptedAt:
          null,

        pickedUpAt:
          null,

        outForDeliveryAt:
          null,

        deliveredAt:
          null,

        cancelledAt:
          null,
      });

    await createNotificationSafely({
      recipient:
        order.customer,

      role:
        "customer",

      type:
        "delivery_ready",

      title:
        "Delivery Request Created",

      message:
        "Your bouquet is ready for delivery and is waiting for a rider to accept the request.",

      delivery:
        delivery._id,

      order:
        order._id,

      metadata: {
        screen:
          "delivery",

        deliveryStatus:
          "available",
      },
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

    await requireActiveApprovedShiftForRider(
      rider._id
    );

    if (
      rider.isAvailable !==
      true
    ) {
      const error =
        new Error(
          "You must be Online to view delivery requests."
        );

      error.statusCode =
        400;

      throw error;
    }

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

    if (
      activeDelivery
    ) {
      return [];
    }

    const now =
      new Date();

    return Delivery.find({
      status:
        "available",

      availableAt: {
        $lte:
          now,
      },

      rider:
        null,

      riderUser:
        null,
    })
      .populate(
        "florist",
        "shopName address location contactNumber shopLogo"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate isPreOrder requestedDeliveryTimeStart requestedDeliveryTimeEnd"
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
        path:
          "rider",

        populate: {
          path:
            "owner",

          select:
            "firstName lastName phoneNumber",
        },
      })
      .populate(
        "order",
        "productName totalAmount orderStatus fulfillmentType paymentMethod paymentStatus requestedDeliveryDate isPreOrder requestedDeliveryTimeStart requestedDeliveryTimeEnd"
      )
      .sort({
        createdAt:
          -1,
      });
  };

/*
 * =========================================================
 * RIDER
 * GET MY DELIVERIES
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
        "shopName address location contactNumber"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate isPreOrder requestedDeliveryTimeStart requestedDeliveryTimeEnd paymentMethod paymentStatus"
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
        path:
          "rider",

        populate: {
          path:
            "owner",

          select:
            "firstName lastName phoneNumber",
        },
      })
      .populate(
        "florist",
        "shopName address location contactNumber"
      )
      .populate(
        "order",
        "productName inspirationImage totalAmount orderStatus requestedDeliveryDate isPreOrder requestedDeliveryTimeStart requestedDeliveryTimeEnd paymentMethod paymentStatus"
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
          delivery
            .customer
            ._id
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

    if (
      user.role ===
      "seller"
    ) {
      if (
        String(
          delivery
            .seller
            ._id
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

      /*
       * Unassigned marketplace delivery.
       *
       * Viewing a NEW available request follows
       * the same authorization rules as the
       * available-deliveries marketplace:
       *
       * - approved Rider
       * - active Rider
       * - active approved work shift
       * - Rider Online
       * - request already available
       */

      if (
        delivery.status ===
          "available" &&
        !delivery.rider
      ) {
        await requireActiveApprovedShiftForRider(
          rider._id
        );

        if (
          rider.isAvailable !==
          true
        ) {
          const error =
            new Error(
              "You must be Online to view delivery requests."
            );

          error.statusCode =
            400;

          throw error;
        }

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

        if (
          activeDelivery
        ) {
          const error =
            new Error(
              "You already have an active delivery."
            );

          error.statusCode =
            409;

          throw error;
        }

        const availableAt =
          delivery.availableAt
            ? new Date(
                delivery.availableAt
              )
            : null;

        if (
          availableAt &&
          availableAt <=
            new Date()
        ) {
          return delivery;
        }

        const error =
          new Error(
            "This scheduled delivery request is not available to riders yet."
          );

        error.statusCode =
          403;

        throw error;
      }

      /*
       * Assigned deliveries remain accessible
       * to their assigned Rider after shift end.
       */

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
 * DELIVERY TRACKING
 * CUSTOMER / SELLER / ASSIGNED RIDER
 * =========================================================
 */

export const getDeliveryTracking =
  async (
    deliveryId,
    userId
  ) => {
    return getDeliveryById(
      deliveryId,
      userId
    );
  };

/*
 * =========================================================
 * RIDER
 * ACCEPT DELIVERY
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

    await requireActiveApprovedShiftForRider(
      rider._id
    );

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

    if (
      !reservedRider
    ) {
      const error =
        new Error(
          "You must be available before accepting a delivery."
        );

      error.statusCode =
        409;

      throw error;
    }

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

    if (
      activeDelivery
    ) {
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

    const delivery =
      await Delivery.findOneAndUpdate(
        {
          _id:
            deliveryId,

          status:
            "available",

          availableAt: {
            $lte:
              now,
          },

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

            "navigation.destinationType":
              "pickup",

            "navigation.distanceMeters":
              null,

            "navigation.durationSeconds":
              null,

            "navigation.estimatedArrivalAt":
              null,

            "navigation.updatedAt":
              null,
          },
        },

        {
          new:
            true,

          runValidators:
            true,
        }
      );

    if (
      !delivery
    ) {
      const workShift =
        await getRiderWorkShiftStatus(
          rider._id
        );

      await Rider.findByIdAndUpdate(
        rider._id,
        {
          isAvailable:
            workShift?.canGoOnline ===
            true,
        }
      );

      const error =
        new Error(
          "This delivery is not available yet or another rider may have already accepted it."
        );

      error.statusCode =
        409;

      throw error;
    }

    await Promise.all([
      createNotificationSafely({
        recipient:
          riderUserId,

        role:
          "rider",

        type:
          "delivery_accepted",

        title:
          "Delivery Accepted",

        message:
          "You successfully accepted a delivery request. Proceed to the florist for pickup.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",
        },
      }),

      createNotificationSafely({
        recipient:
          delivery.customer,

        role:
          "customer",

        type:
          "delivery_accepted",

        title:
          "Rider Assigned",

        message:
          "A rider has accepted your delivery and is heading to the florist to pick up your bouquet.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",

          deliveryStatus:
            "accepted",
        },
      }),
    ]);

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * UPDATE LIVE LOCATION
 * =========================================================
 */

export const updateRiderLocation =
  async (
    deliveryId,
    riderUserId,
    locationData
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    validateEligibleRider(
      rider
    );

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,

        riderUser:
          riderUserId,
      }).populate(
        "order"
      );

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
      (
        delivery
          .pickupLocation
          ?.latitude ===
          null ||
        delivery
          .pickupLocation
          ?.latitude ===
          undefined ||
        delivery
          .pickupLocation
          ?.longitude ===
          null ||
        delivery
          .pickupLocation
          ?.longitude ===
          undefined
      ) &&
      delivery.order
        ?.pickupLocation
    ) {
      const pickupLocation =
        normalizeCoordinate(
          delivery.order
            .pickupLocation
            .latitude,

          delivery.order
            .pickupLocation
            .longitude,

          "Pickup"
        );

      delivery.pickupLocation = {
        latitude:
          pickupLocation.latitude,

        longitude:
          pickupLocation.longitude,
      };
    }

    if (
      (
        delivery
          .deliveryLocation
          ?.latitude ===
          null ||
        delivery
          .deliveryLocation
          ?.latitude ===
          undefined ||
        delivery
          .deliveryLocation
          ?.longitude ===
          null ||
        delivery
          .deliveryLocation
          ?.longitude ===
          undefined
      ) &&
      delivery.order
        ?.deliveryLocation
    ) {
      const deliveryLocation =
        normalizeCoordinate(
          delivery.order
            .deliveryLocation
            .latitude,

          delivery.order
            .deliveryLocation
            .longitude,

          "Delivery"
        );

      delivery.deliveryLocation = {
        latitude:
          deliveryLocation.latitude,

        longitude:
          deliveryLocation.longitude,
      };
    }

    /*
     * Active delivery operations intentionally
     * do not require the work shift to still be
     * active. An already accepted delivery can
     * continue after shift end.
     */

    if (
      ![
        "accepted",
        "picked_up",
        "out_for_delivery",
      ].includes(
        delivery.status
      )
    ) {
      const error =
        new Error(
          "Rider location can only be updated for an active delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const riderLocation =
      normalizeCoordinate(
        locationData
          ?.latitude,

        locationData
          ?.longitude,

        "Rider"
      );

    let accuracy =
      null;

    if (
      locationData?.accuracy !==
        undefined &&
      locationData?.accuracy !==
        null
    ) {
      accuracy =
        Number(
          locationData.accuracy
        );

      if (
        !Number.isFinite(
          accuracy
        ) ||
        accuracy < 0
      ) {
        const error =
          new Error(
            "Rider location accuracy is invalid."
          );

        error.statusCode =
          400;

        throw error;
      }
    }

    const navigation =
      await calculateRiderNavigation(
        delivery,
        riderLocation.latitude,
        riderLocation.longitude
      );

    const now =
      new Date();

    delivery.riderLocation = {
      latitude:
        riderLocation.latitude,

      longitude:
        riderLocation.longitude,

      accuracy,

      updatedAt:
        now,
    };

    delivery.navigation = {
      destinationType:
        navigation.destinationType,

      distanceMeters:
        navigation.distanceMeters,

      durationSeconds:
        navigation.durationSeconds,

      estimatedArrivalAt:
        navigation
          .estimatedArrivalAt,

      updatedAt:
        now,
    };

    await delivery.save();

    return {
      delivery:
        await populateDelivery(
          delivery._id
        ),

      route: {
        destinationType:
          navigation.destinationType,

        distanceMeters:
          navigation.distanceMeters,

        durationSeconds:
          navigation.durationSeconds,

        estimatedArrivalAt:
          navigation
            .estimatedArrivalAt,

        geometry:
          navigation.geometry,
      },
    };
  };

/*
 * =========================================================
 * RIDER
 * GET CURRENT NAVIGATION
 * =========================================================
 */

export const getRiderNavigation =
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

    const delivery =
      await Delivery.findOne({
        _id:
          deliveryId,

        rider:
          rider._id,

        riderUser:
          riderUserId,
      }).populate(
        "order"
      );

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
      ![
        "accepted",
        "picked_up",
        "out_for_delivery",
      ].includes(
        delivery.status
      )
    ) {
      const error =
        new Error(
          "Navigation is not available for this delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const riderLatitude =
      delivery
        ?.riderLocation
        ?.latitude;

    const riderLongitude =
      delivery
        ?.riderLocation
        ?.longitude;

    if (
      riderLatitude ===
        null ||
      riderLatitude ===
        undefined ||
      riderLongitude ===
        null ||
      riderLongitude ===
        undefined
    ) {
      const error =
        new Error(
          "The rider's current location has not been received yet."
        );

      error.statusCode =
        400;

      throw error;
    }

    const navigation =
      await calculateRiderNavigation(
        delivery,
        riderLatitude,
        riderLongitude
      );

    const now =
      new Date();

    delivery.navigation = {
      destinationType:
        navigation.destinationType,

      distanceMeters:
        navigation.distanceMeters,

      durationSeconds:
        navigation.durationSeconds,

      estimatedArrivalAt:
        navigation
          .estimatedArrivalAt,

      updatedAt:
        now,
    };

    await delivery.save();

    return {
      deliveryId:
        delivery._id,

      status:
        delivery.status,

      riderLocation:
        delivery.riderLocation,

      pickupLocation:
        delivery.pickupLocation,

      deliveryLocation:
        delivery.deliveryLocation,

      navigation:
        delivery.navigation,

      geometry:
        navigation.geometry,
    };
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

    validateEligibleRider(
      rider
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

    const now =
      new Date();

    delivery.status =
      "picked_up";

    delivery.pickedUpAt =
      now;

    delivery.navigation = {
      destinationType:
        "delivery",

      distanceMeters:
        null,

      durationSeconds:
        null,

      estimatedArrivalAt:
        null,

      updatedAt:
        now,
    };

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

    await Promise.all([
      createNotificationSafely({
        recipient:
          riderUserId,

        role:
          "rider",

        type:
          "delivery_picked_up",

        title:
          "Bouquet Picked Up",

        message:
          "You picked up the bouquet from the florist. Tap Start Delivery when you leave for the customer's address.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",
        },
      }),

      createNotificationSafely({
        recipient:
          delivery.customer,

        role:
          "customer",

        type:
          "delivery_picked_up",

        title:
          "Bouquet Picked Up",

        message:
          "Your rider has picked up the bouquet from the florist.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",

          deliveryStatus:
            "picked_up",
        },
      }),
    ]);

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

    validateEligibleRider(
      rider
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

    /*
     * An already accepted delivery remains
     * actionable after shift end.
     */

    if (
      delivery.status !==
      "picked_up"
    ) {
      const error =
        new Error(
          "The bouquet must be picked up before delivery can start."
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

    delivery.navigation = {
      destinationType:
        "delivery",

      distanceMeters:
        delivery.navigation
          ?.distanceMeters ??
        null,

      durationSeconds:
        delivery.navigation
          ?.durationSeconds ??
        null,

      estimatedArrivalAt:
        delivery.navigation
          ?.estimatedArrivalAt ??
        null,

      updatedAt:
        delivery.navigation
          ?.updatedAt ??
        null,
    };

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

    const order =
      await Order.findById(
        delivery.order
      );

    if (order) {
      order.orderStatus =
        "out_for_delivery";

      await order.save();
    }

    await Promise.all([
      createNotificationSafely({
        recipient:
          riderUserId,

        role:
          "rider",

        type:
          "delivery_out_for_delivery",

        title:
          "Delivery Started",

        message:
          "You are now out for delivery. Upload Proof of Delivery when you hand over the bouquet.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",
        },
      }),

      createNotificationSafely({
        recipient:
          delivery.customer,

        role:
          "customer",

        type:
          "delivery_out_for_delivery",

        title:
          "Your Bouquet Is On the Way",

        message:
          "Your rider is now on the way to your delivery address.",

        delivery:
          delivery._id,

        order:
          delivery.order,

        metadata: {
          screen:
            "delivery",

          deliveryStatus:
            "out_for_delivery",

          orderStatus:
            "out_for_delivery",
        },
      }),
    ]);

    return populateDelivery(
      delivery._id
    );
  };

/*
 * =========================================================
 * RIDER
 * UPLOAD PROOF OF DELIVERY
 * =========================================================
 */

export const saveProofOfDelivery  =
  async (
    deliveryId,
    riderUserId,
    proofData
  ) => {
    const rider =
      await getRiderProfileByUser(
        riderUserId
      );

    validateEligibleRider(
      rider
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

    /*
     * Proof can only be uploaded after the
     * Rider has started the customer delivery.
     *
     * No active-shift requirement is applied
     * because an accepted delivery may finish
     * after the scheduled shift ends.
     */

    if (
      delivery.status !==
      "out_for_delivery"
    ) {
      const error =
        new Error(
          "Proof of delivery can only be uploaded while the order is out for delivery."
        );

      error.statusCode =
        400;

      throw error;
    }

    const imageUrl =
      String(
        proofData
          ?.imageUrl ||
          ""
      ).trim();

    if (!imageUrl) {
      const error =
        new Error(
          "Proof of delivery image is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    let proofLatitude =
      null;

    let proofLongitude =
      null;

    /*
     * Prefer coordinates explicitly submitted
     * together with the proof.
     */

    if (
      proofData?.latitude !==
        undefined &&
      proofData?.latitude !==
        null &&
      proofData?.longitude !==
        undefined &&
      proofData?.longitude !==
        null
    ) {
      const proofLocation =
        normalizeCoordinate(
          proofData.latitude,
          proofData.longitude,
          "Proof of delivery"
        );

      proofLatitude =
        proofLocation.latitude;

      proofLongitude =
        proofLocation.longitude;
    } else if (
      delivery
        ?.riderLocation
        ?.latitude !==
        undefined &&
      delivery
        ?.riderLocation
        ?.latitude !==
        null &&
      delivery
        ?.riderLocation
        ?.longitude !==
        undefined &&
      delivery
        ?.riderLocation
        ?.longitude !==
        null
    ) {
      proofLatitude =
        Number(
          delivery
            .riderLocation
            .latitude
        );

      proofLongitude =
        Number(
          delivery
            .riderLocation
            .longitude
        );
    }

    let accuracy =
      null;

    if (
      proofData?.accuracy !==
        undefined &&
      proofData?.accuracy !==
        null
    ) {
      accuracy =
        Number(
          proofData.accuracy
        );

      if (
        !Number.isFinite(
          accuracy
        ) ||
        accuracy < 0
      ) {
        const error =
          new Error(
            "Proof of delivery location accuracy is invalid."
          );

        error.statusCode =
          400;

        throw error;
      }
    } else if (
      delivery
        ?.riderLocation
        ?.accuracy !==
        undefined &&
      delivery
        ?.riderLocation
        ?.accuracy !==
        null
    ) {
      accuracy =
        Number(
          delivery
            .riderLocation
            .accuracy
        );

      if (
        !Number.isFinite(
          accuracy
        ) ||
        accuracy < 0
      ) {
        accuracy =
          null;
      }
    }

    const now =
      new Date();

    delivery.proofOfDelivery = {
      imageUrl,

      uploadedAt:
        now,

      latitude:
        proofLatitude,

      longitude:
        proofLongitude,

      accuracy,
    };

    await delivery.save();

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

    validateEligibleRider(
      rider
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

    const proofImageUrl =
      String(
        delivery
          ?.proofOfDelivery
          ?.imageUrl ||
          ""
      ).trim();

    if (!proofImageUrl) {
      const error =
        new Error(
          "Proof of delivery must be successfully uploaded before this delivery can be marked as delivered."
        );

      error.statusCode =
        400;

      throw error;
    }

    if (
      !delivery
        ?.proofOfDelivery
        ?.uploadedAt
    ) {
      const error =
        new Error(
          "Proof of delivery upload has not been confirmed yet."
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

    delivery.navigation = {
      destinationType:
        "delivery",

      distanceMeters:
        0,

      durationSeconds:
        0,

      estimatedArrivalAt:
        now,

      updatedAt:
        now,
    };

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
     * Delivery is delivered, but the Order
     * is not yet "completed". Customer receipt
     * confirmation remains a separate stage.
     */

    order.orderStatus =
      "delivered";

    order.deliveredAt =
      now;

    /*
     * COD becomes paid after successful
     * Rider delivery.
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

    await delivery.save();

    await order.save();

    /*
     * Rider only returns Online when the
     * approved work shift is still active.
     *
     * If the shift has ended, Rider remains
     * Offline and receives no new request.
     */

    await restoreRiderAvailabilityAfterDelivery(
      rider._id
    );

    await Promise.all([
      createNotificationSafely({
        recipient:
          riderUserId,

        role:
          "rider",

        type:
          "delivery_completed",

        title:
          "Delivery Completed",

        message:
          "The delivery has been completed successfully.",

        delivery:
          delivery._id,

        order:
          order._id,

        metadata: {
          screen:
            "delivery",
        },
      }),

      createNotificationSafely({
        recipient:
          delivery.customer,

        role:
          "customer",

        type:
          "delivery_completed",

        title:
          "Bouquet Delivered",

        message:
          "Your bouquet has been marked as delivered. Open the order to confirm that you received it.",

        delivery:
          delivery._id,

        order:
          order._id,

        metadata: {
          screen:
            "delivery",

          deliveryStatus:
            "delivered",

          orderStatus:
            "delivered",
        },
      }),
    ]);

    return populateDelivery(
      delivery._id
    );
  };
  /*
 * =========================================================
 * SELLER
 * CANCEL DELIVERY
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

    /*
     * Only available or accepted deliveries
     * can still be cancelled.
     */

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

    if (
      delivery.rider
    ) {
      rider =
        await Rider.findById(
          delivery.rider
        );
    }

    const now =
      new Date();

    delivery.status =
      "cancelled";

    delivery.cancelledAt =
      now;

    delivery.navigation = {
      destinationType:
        null,

      distanceMeters:
        null,

      durationSeconds:
        null,

      estimatedArrivalAt:
        null,

      updatedAt:
        now,
    };

    await delivery.save();

    /*
     * If a Rider had already accepted this
     * delivery, release the Rider.
     *
     * The Rider only returns Online when an
     * approved work shift remains active.
     */

    if (
      rider
    ) {
      await restoreRiderAvailabilityAfterDelivery(
        rider._id
      );
    }

    const cancellationNotifications =
      [
        createNotificationSafely({
          recipient:
            delivery.customer,

          role:
            "customer",

          type:
            "delivery_cancelled",

          title:
            "Delivery Request Cancelled",

          message:
            "The current delivery request was cancelled. Open your order for the latest fulfillment status.",

          delivery:
            delivery._id,

          order:
            delivery.order,

          metadata: {
            screen:
              "delivery",

            deliveryStatus:
              "cancelled",
          },
        }),
      ];

    if (
      delivery.riderUser
    ) {
      cancellationNotifications.push(
        createNotificationSafely({
          recipient:
            delivery.riderUser,

          role:
            "rider",

          type:
            "delivery_cancelled",

          title:
            "Delivery Cancelled",

          message:
            "The florist cancelled this delivery request.",

          delivery:
            delivery._id,

          order:
            delivery.order,

          metadata: {
            screen:
              "delivery",

            deliveryStatus:
              "cancelled",
          },
        })
      );
    }

    await Promise.all(
      cancellationNotifications
    );

    return populateDelivery(
      delivery._id
    );
  };