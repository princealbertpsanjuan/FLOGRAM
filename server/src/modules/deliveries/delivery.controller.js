import {
  acceptDeliveryAssignment,
  assignRiderToOrder,
  cancelDelivery,
  getAvailableRiders,
  getCustomerDeliveries,
  getDeliveryById,
  getRiderDeliveries,
  getSellerDeliveries,
  markDeliveryDelivered,
  markDeliveryPickedUp,
  startOutForDelivery,
} from "./delivery.service.js";

/*
 * SELLER
 * Get approved, active, available riders.
 */
export const getAvailable = async (
  req,
  res,
  next
) => {
  try {
    const riders =
      await getAvailableRiders();

    res.status(200).json({
      success: true,
      message:
        "Available riders retrieved successfully.",
      data: {
        count:
          riders.length,
        riders,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Assign a rider to a ready-for-delivery order.
 */
export const assignRider = async (
  req,
  res,
  next
) => {
  try {
    const delivery =
      await assignRiderToOrder(
        req.params.orderId,
        req.user.userId,
        req.body.riderId
      );

    res.status(201).json({
      success: true,
      message:
        "Rider assigned to delivery successfully.",
      data: {
        delivery,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER
 * Get seller's florist deliveries.
 *
 * Optional:
 * ?status=assigned
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
 * RIDER
 * Get rider's own delivery assignments.
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
 * CUSTOMER
 * Get customer's own deliveries.
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
 * CUSTOMER / SELLER / RIDER
 * Get one delivery.
 *
 * Access control is handled
 * in the service layer.
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
 * RIDER
 * Accept assigned delivery.
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
          "Delivery assignment accepted successfully.",
        data: {
          delivery,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * RIDER
 * Mark bouquet as picked up
 * from florist.
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
 * RIDER
 * Start delivery trip.
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
 * RIDER
 * Mark delivery as successfully delivered.
 *
 * The service will also:
 * - update the Order to delivered
 * - mark COD orders as paid
 * - make the rider available again
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
 * SELLER
 * Cancel delivery before pickup.
 *
 * The order remains ready_for_delivery
 * so another rider can be assigned.
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