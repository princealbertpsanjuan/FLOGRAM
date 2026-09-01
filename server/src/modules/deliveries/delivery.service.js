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
      path:
        "rider",

      populate: {
        path:
          "owner",

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
 *
 * accepted
 *   rider -> florist
 *
 * picked_up / out_for_delivery
 *   rider -> customer
 *
 * IMPORTANT:
 *
 * New delivery documents store:
 *
 * delivery.pickupLocation
 * delivery.deliveryLocation
 *
 * Older delivery documents may not
 * contain these fields yet.
 *
 * Therefore we fall back to the
 * associated Order coordinates when
 * necessary.
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

    /*
     * =====================================================
     * RIDER -> FLORIST
     * =====================================================
     *
     * Once the rider accepts the
     * delivery, navigation should lead
     * to the florist pickup location.
     */
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
    }

    /*
     * =====================================================
     * RIDER -> CUSTOMER
     * =====================================================
     *
     * After bouquet pickup, navigation
     * switches to the customer's
     * delivery location.
     */
    else if (
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
    }

    /*
     * =====================================================
     * INVALID NAVIGATION STATE
     * =====================================================
     */
    else {
      const error =
        new Error(
          "Navigation is not available for the current delivery status."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * CALCULATE ROUTE
     * =====================================================
     *
     * Current rider GPS:
     *     ↓
     * Destination
     *
     * accepted:
     * destination = florist
     *
     * picked_up / out_for_delivery:
     * destination = customer
     */
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

    /*
     * =====================================================
     * ETA
     * =====================================================
     */
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

      /*
       * GeoJSON route used later by
       * the frontend map.
       */
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
 * PRE-ORDER RIDER AVAILABILITY
 * =========================================================
 */

const getPreOrderRiderLeadMinutes = () => {
  const minutes = Number(
    process.env.PREORDER_RIDER_LEAD_MINUTES ||
      60
  );

  if (
    !Number.isFinite(minutes) ||
    minutes < 0
  ) {
    return 60;
  }

  return minutes;
};

const getDeliveryAvailableAt = (
  order
) => {
  const now = new Date();

  if (
    !order?.isPreOrder ||
    !order?.requestedDeliveryDate
  ) {
    return now;
  }

  const scheduledDelivery =
    new Date(
      order.requestedDeliveryDate
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
    availableAt <= now
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

    /*
     * PayMongo orders must already
     * be paid.
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

    /*
     * Prevent duplicate active
     * delivery requests.
     */
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

    /*
     * =====================================================
     * ADDRESS VALIDATION
     * =====================================================
     */

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

    /*
     * =====================================================
     * LOCATION SNAPSHOTS
     * =====================================================
     */

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

    /*
     * =====================================================
     * RIDER AVAILABILITY
     * =====================================================
     */

    const availableAt =
      getDeliveryAvailableAt(
        order
      );

    /*
     * =====================================================
     * CREATE DELIVERY
     * =====================================================
     */

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

        /*
         * Geographic snapshots.
         */
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

        /*
         * Rider has not accepted yet.
         */
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

    /*
     * CUSTOMER
     */
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

    /*
     * SELLER
     */
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

    /*
     * RIDER
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

      /*
       * Marketplace request.
       */
      if (
        delivery.status ===
          "available" &&
        !delivery.rider
      ) {
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
       * Assigned delivery.
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
    /*
     * getDeliveryById already performs
     * access control.
     */
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

    /*
     * Reserve rider.
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

            /*
             * Rider must first travel
             * toward the florist.
             */
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
      await Rider.findByIdAndUpdate(
        rider._id,
        {
          isAvailable:
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

await createNotificationSafely({
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
});

return populateDelivery(
  delivery._id
);
  };

/*
 * =========================================================
 * RIDER
 * UPDATE LIVE LOCATION
 * =========================================================
 *
 * Rider phone will eventually call this
 * periodically.
 *
 * Example payload:
 *
 * {
 *   latitude: 13.625,
 *   longitude: 123.195,
 *   accuracy: 8.5
 * }
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

    /*
 * =========================================================
 * BACKWARD COMPATIBILITY
 * =========================================================
 *
 * Older Delivery documents were created
 * before pickupLocation and
 * deliveryLocation became required.
 *
 * If those snapshots are missing,
 * copy them from the associated Order
 * before saving the delivery.
 */
if (
  (
    delivery.pickupLocation?.latitude ===
      null ||
    delivery.pickupLocation?.latitude ===
      undefined ||
    delivery.pickupLocation?.longitude ===
      null ||
    delivery.pickupLocation?.longitude ===
      undefined
  ) &&
  delivery.order?.pickupLocation
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
    delivery.deliveryLocation?.latitude ===
      null ||
    delivery.deliveryLocation?.latitude ===
      undefined ||
    delivery.deliveryLocation?.longitude ===
      null ||
    delivery.deliveryLocation?.longitude ===
      undefined
  ) &&
  delivery.order?.deliveryLocation
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
     * Only active delivery states
     * should receive GPS updates.
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

    /*
     * Calculate current navigation:
     *
     * accepted:
     * rider -> florist
     *
     * picked_up/out_for_delivery:
     * rider -> customer
     */
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

    /*
     * Return route geometry separately.
     *
     * We do not permanently store the
     * whole GeoJSON route in MongoDB.
     */
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

    /*
     * Switch navigation from:
     *
     * rider -> florist
     *
     * to:
     *
     * rider -> customer
     *
     * Actual route will be recalculated
     * on the next GPS update.
     */
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

await createNotificationSafely({
  recipient: riderUserId,

  role: "rider",

  type: "delivery_picked_up",

  title: "Order Picked Up",

  message:
    "You have picked up the order from the florist. Proceed to the customer's delivery address.",

  delivery: delivery._id,

  order: delivery.order,

  metadata: {
    screen: "delivery",
  },
});

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

    /*
     * Keep destination pointed toward
     * customer.
     */
    delivery.navigation
      .destinationType =
      "delivery";

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

await createNotificationSafely({
  recipient: riderUserId,

  role: "rider",

  type: "delivery_out_for_delivery",

  title: "Delivery Started",

  message:
    "The order is now out for delivery. Proceed to the customer's delivery address.",

  delivery: delivery._id,

  order: order._id,

  metadata: {
    screen: "delivery",
  },
});

return populateDelivery(
  delivery._id
);
  };
/*
 * =========================================================
 * RIDER
 * SAVE PROOF OF DELIVERY
 * =========================================================
 *
 * IMPORTANT:
 *
 * This function is called only AFTER the proof photo
 * has been successfully uploaded by the controller /
 * upload middleware.
 *
 * The mobile app must NOT enable Mark as Delivered
 * simply because a local photo was taken.
 *
 * It should only enable the button after this function
 * succeeds and proofOfDelivery.imageUrl is returned
 * by the backend.
 * =========================================================
 */

export const saveProofOfDelivery =
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
     * Proof of Delivery is only allowed
     * while the rider is actively delivering
     * the order to the customer.
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

    /*
     * The controller/upload middleware must
     * successfully store the image before
     * calling this service.
     */
    const imageUrl =
      String(
        proofData
          ?.imageUrl ||
          ""
      ).trim();

    if (!imageUrl) {
      const error =
        new Error(
          "A successfully uploaded proof of delivery image is required."
        );

      error.statusCode =
        400;

      throw error;
    }

    /*
     * =====================================================
     * PROOF GPS LOCATION
     * =====================================================
     *
     * Prefer coordinates submitted with the
     * proof upload.
     *
     * If they are not supplied, fall back to
     * the rider's latest known GPS location.
     * =====================================================
     */

    const submittedLatitude =
      proofData?.latitude;

    const submittedLongitude =
      proofData?.longitude;

    let proofLatitude =
      null;

    let proofLongitude =
      null;

    const hasSubmittedCoordinates =
      submittedLatitude !==
        undefined &&
      submittedLatitude !==
        null &&
      submittedLongitude !==
        undefined &&
      submittedLongitude !==
        null;

    if (
      hasSubmittedCoordinates
    ) {
      const proofLocation =
        normalizeCoordinate(
          submittedLatitude,
          submittedLongitude,
          "Proof of delivery"
        );

      proofLatitude =
        proofLocation.latitude;

      proofLongitude =
        proofLocation.longitude;
    } else {
      const latestLatitude =
        delivery
          ?.riderLocation
          ?.latitude;

      const latestLongitude =
        delivery
          ?.riderLocation
          ?.longitude;

      const hasLatestLocation =
        latestLatitude !==
          undefined &&
        latestLatitude !==
          null &&
        latestLongitude !==
          undefined &&
        latestLongitude !==
          null;

      if (hasLatestLocation) {
        const proofLocation =
          normalizeCoordinate(
            latestLatitude,
            latestLongitude,
            "Rider"
          );

        proofLatitude =
          proofLocation.latitude;

        proofLongitude =
          proofLocation.longitude;
      }
    }

    /*
     * GPS accuracy.
     */
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

    /*
     * =====================================================
     * SAVE BACKEND-CONFIRMED PROOF
     * =====================================================
     */

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

    /*
     * Return populated delivery.
     *
     * The frontend will use:
     *
     * delivery.proofOfDelivery.imageUrl
     *
     * as the source of truth for enabling
     * Mark as Delivered.
     */
    return populateDelivery(
      delivery._id
    );
  };


/*
 * =========================================================
 * RIDER
 * MARK DELIVERY AS DELIVERED
 * =========================================================
 *
 * SECURITY RULE:
 *
 * The rider cannot complete the delivery
 * unless a Proof of Delivery image has
 * already been successfully uploaded and
 * saved in:
 *
 * delivery.proofOfDelivery.imageUrl
 *
 * This protects the system even if someone
 * bypasses the disabled mobile button.
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

    /*
     * Delivery must already be travelling
     * toward the customer.
     */
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

    /*
     * =====================================================
     * PROOF OF DELIVERY REQUIREMENT
     * =====================================================
     *
     * Taking a local photo is NOT enough.
     *
     * The image must have successfully reached
     * the backend and imageUrl must already be
     * stored in MongoDB.
     * =====================================================
     */

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

    /*
     * Make sure the upload itself was
     * backend-confirmed.
     */
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

    /*
     * Final navigation state.
     */
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
     * Complete associated order.
     */
    order.orderStatus =
      "delivered";

    order.deliveredAt =
      now;

    /*
     * COD becomes paid only when
     * delivery is successfully completed.
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
     * Rider becomes available again
     * only after successful completion.
     */
    rider.isAvailable =
      true;

await delivery.save();

await order.save();

await rider.save();

await createNotificationSafely({
  recipient: riderUserId,

  role: "rider",

  type: "delivery_completed",

  title: "Delivery Completed",

  message:
    "The delivery has been completed successfully.",

  delivery: delivery._id,

  order: order._id,

  metadata: {
    screen: "delivery",
  },
});

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

    if (
      rider &&
      rider.isActive &&
      rider
        .verificationStatus ===
        "approved"
    ) {
      rider.isAvailable =
        true;

      await rider.save();
    }

    return populateDelivery(
      delivery._id
    );
  };