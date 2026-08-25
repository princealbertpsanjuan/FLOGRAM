import {
  acceptDeliveryAssignment,
  cancelDelivery,
  createDeliveryRequest,
  getAvailableDeliveryRequests,
  getCustomerDeliveries,
  getDeliveryById,
  getDeliveryTracking,
  getRiderDeliveries,
  getRiderNavigation,
  getSellerDeliveries,
  markDeliveryDelivered,
  markDeliveryPickedUp,
  startOutForDelivery,
  updateRiderLocation,
} from "./delivery.service.js";

/*
 * =========================================================
 * SELLER
 * CREATE DELIVERY REQUEST
 * =========================================================
 *
 * Seller does NOT choose a rider.
 *
 * The order must already be:
 * ready_for_delivery
 */
export const createRequest = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await createDeliveryRequest(
        req.params.orderId,
        req.user.userId
      );

    res.status(201).json({
      success: true,

      message:
        "Delivery request created successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET AVAILABLE DELIVERY REQUESTS
 * =========================================================
 *
 * Only approved, active and available
 * riders can view available requests.
 */
export const getAvailableRequests =
  async (
    req,
    res,
    next
  ) => {
    try {
      const deliveries =
        await getAvailableDeliveryRequests(
          req.user.userId
        );

      res.status(200).json({
        success: true,

        message:
          "Available delivery requests retrieved successfully.",

        data: {
          count:
            deliveries.length,

          deliveries,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * SELLER
 * GET SELLER DELIVERIES
 * =========================================================
 *
 * Optional:
 *
 * ?status=available
 * ?status=accepted
 * ?status=picked_up
 * ?status=out_for_delivery
 * ?status=delivered
 * ?status=cancelled
 */
export const getForSeller = async (
  req,
  res,
  next
) => {
  try {
    const deliveries =
      await getSellerDeliveries(
        req.user.userId,
        {
          status:
            req.query.status,
        }
      );

    res.status(200).json({
      success: true,

      message:
        "Seller deliveries retrieved successfully.",

      data: {
        count:
          deliveries.length,

        deliveries,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET RIDER'S OWN DELIVERIES
 * =========================================================
 *
 * Optional:
 *
 * ?status=accepted
 * ?status=picked_up
 * ?status=out_for_delivery
 * ?status=delivered
 * ?status=cancelled
 */
export const getForRider = async (
  req,
  res,
  next
) => {
  try {
    const deliveries =
      await getRiderDeliveries(
        req.user.userId,
        {
          status:
            req.query.status,
        }
      );

    res.status(200).json({
      success: true,

      message:
        "Rider deliveries retrieved successfully.",

      data: {
        count:
          deliveries.length,

        deliveries,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER
 * GET CUSTOMER'S OWN DELIVERIES
 * =========================================================
 */
export const getMine = async (
  req,
  res,
  next
) => {
  try {
    const deliveries =
      await getCustomerDeliveries(
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        "Customer deliveries retrieved successfully.",

      data: {
        count:
          deliveries.length,

        deliveries,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * CUSTOMER / SELLER / RIDER
 * GET ONE DELIVERY
 * =========================================================
 *
 * Access control is handled
 * inside the service layer.
 */
export const getOne = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await getDeliveryById(
        req.params.deliveryId,
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        "Delivery retrieved successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * DELIVERY TRACKING
 * CUSTOMER / SELLER / ASSIGNED RIDER
 * =========================================================
 *
 * Returns the current delivery information
 * including:
 *
 * - delivery status
 * - rider information
 * - rider location
 * - pickup location
 * - customer delivery location
 * - navigation information
 * - estimated arrival
 *
 * Access control is handled by the
 * service layer.
 */
export const getTracking = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await getDeliveryTracking(
        req.params.deliveryId,
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        "Delivery tracking retrieved successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * ACCEPT AVAILABLE DELIVERY REQUEST
 * =========================================================
 *
 * First eligible rider to successfully
 * claim the request gets the delivery.
 */
export const acceptAssignment =
  async (
    req,
    res,
    next
  ) => {
    try {
      const delivery =
        await acceptDeliveryAssignment(
          req.params.deliveryId,
          req.user.userId
        );

      res.status(200).json({
        success: true,

        message:
          "Delivery request accepted successfully.",

        data: {
          delivery,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * =========================================================
 * RIDER
 * UPDATE LIVE LOCATION
 * =========================================================
 *
 * PATCH
 * /api/v1/deliveries/:deliveryId/location
 *
 * Example:
 *
 * {
 *   "latitude": 13.625,
 *   "longitude": 123.195,
 *   "accuracy": 8.5
 * }
 *
 * The service will also calculate:
 *
 * accepted:
 * rider -> florist
 *
 * picked_up / out_for_delivery:
 * rider -> customer
 *
 * using OpenRouteService.
 */
export const updateLocation = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await updateRiderLocation(
        req.params.deliveryId,
        req.user.userId,
        {
          latitude:
            req.body.latitude,

          longitude:
            req.body.longitude,

          accuracy:
            req.body.accuracy,
        }
      );

    res.status(200).json({
      success: true,

      message:
        "Rider location updated successfully.",

      data: {
        delivery:
          result.delivery,

        route:
          result.route,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * GET CURRENT NAVIGATION
 * =========================================================
 *
 * GET
 * /api/v1/deliveries/:deliveryId/navigation
 *
 * accepted:
 * rider -> florist
 *
 * picked_up:
 * rider -> customer
 *
 * out_for_delivery:
 * rider -> customer
 */
export const getNavigation = async (
  req,
  res,
  next
) => {
  try {
    const navigation =
      await getRiderNavigation(
        req.params.deliveryId,
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        "Rider navigation retrieved successfully.",

      data: {
        navigation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * MARK BOUQUET AS PICKED UP
 * =========================================================
 */
export const pickedUp = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await markDeliveryPickedUp(
        req.params.deliveryId,
        req.user.userId,
        req.body.riderNotes
      );

    res.status(200).json({
      success: true,

      message:
        "Bouquet marked as picked up successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * START DELIVERY
 * =========================================================
 *
 * Delivery:
 * picked_up -> out_for_delivery
 *
 * Order:
 * ready_for_delivery -> out_for_delivery
 */
export const startDelivery = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await startOutForDelivery(
        req.params.deliveryId,
        req.user.userId,
        req.body.riderNotes
      );

    res.status(200).json({
      success: true,

      message:
        "Delivery started successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * RIDER
 * MARK DELIVERY AS DELIVERED
 * =========================================================
 *
 * Service also:
 *
 * - Order -> delivered
 * - COD -> paid
 * - PayMongo remains webhook-controlled
 * - Rider -> available
 */
export const delivered = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await markDeliveryDelivered(
        req.params.deliveryId,
        req.user.userId,
        req.body.riderNotes
      );

    res.status(200).json({
      success: true,

      message:
        "Delivery completed successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * SELLER
 * CANCEL AVAILABLE / ACCEPTED DELIVERY
 * =========================================================
 *
 * The order remains ready_for_delivery
 * so another delivery request may be
 * created.
 */
export const cancel = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await cancelDelivery(
        req.params.deliveryId,
        req.user.userId
      );

    res.status(200).json({
      success: true,

      message:
        "Delivery cancelled successfully.",

      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};