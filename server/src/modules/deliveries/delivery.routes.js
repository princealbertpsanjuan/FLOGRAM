import {
  Router,
} from "express";

import {
  acceptAssignment,
  cancel,
  createRequest,
  delivered,
  getAvailableRequests,
  getForRider,
  getForSeller,
  getMine,
  getOne,
  pickedUp,
  startDelivery,
} from "./delivery.controller.js";

import {
  riderDeliveryNotesValidation,
  validateDeliveryRequest,
} from "./delivery.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const deliveryRouter =
  Router();

/*
 * =========================================================
 * SELLER
 * Get florist deliveries
 *
 * Optional:
 * ?status=available
 * ?status=accepted
 * ?status=picked_up
 * ?status=out_for_delivery
 * ?status=delivered
 * ?status=cancelled
 * =========================================================
 */
deliveryRouter.get(
  "/seller/mine",
  authenticate,
  authorize("seller"),
  getForSeller
);

/*
 * =========================================================
 * RIDER
 * Get available delivery requests
 *
 * Only approved + active + available
 * riders can access this.
 * =========================================================
 */
deliveryRouter.get(
  "/available",
  authenticate,
  authorize("rider"),
  getAvailableRequests
);

/*
 * =========================================================
 * RIDER
 * Get rider's own accepted/current/
 * previous deliveries
 *
 * Optional:
 * ?status=accepted
 * ?status=picked_up
 * ?status=out_for_delivery
 * ?status=delivered
 * ?status=cancelled
 * =========================================================
 */
deliveryRouter.get(
  "/rider/mine",
  authenticate,
  authorize("rider"),
  getForRider
);

/*
 * =========================================================
 * CUSTOMER
 * Get customer's deliveries
 * =========================================================
 */
deliveryRouter.get(
  "/mine",
  authenticate,
  authorize("customer"),
  getMine
);

/*
 * =========================================================
 * SELLER
 * Create available delivery request
 *
 * The seller does NOT choose a rider.
 *
 * Order must already be:
 * ready_for_delivery
 *
 * POST
 * /api/v1/deliveries/orders/:orderId/request
 *
 * Body:
 * none
 * =========================================================
 */
deliveryRouter.post(
  "/orders/:orderId/request",
  authenticate,
  authorize("seller"),
  createRequest
);

/*
 * =========================================================
 * RIDER
 * Accept available delivery request
 *
 * First eligible rider who successfully
 * accepts gets the delivery.
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/accept",
  authenticate,
  authorize("rider"),
  acceptAssignment
);

/*
 * =========================================================
 * RIDER
 * Mark bouquet as picked up
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/pickup",
  authenticate,
  authorize("rider"),
  riderDeliveryNotesValidation,
  validateDeliveryRequest,
  pickedUp
);

/*
 * =========================================================
 * RIDER
 * Start delivery
 *
 * Delivery:
 * picked_up
 *     ↓
 * out_for_delivery
 *
 * Order:
 * ready_for_delivery
 *     ↓
 * out_for_delivery
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/start",
  authenticate,
  authorize("rider"),
  riderDeliveryNotesValidation,
  validateDeliveryRequest,
  startDelivery
);

/*
 * =========================================================
 * RIDER
 * Mark delivery as delivered
 *
 * Also:
 *
 * Order -> delivered
 *
 * COD:
 * paymentStatus -> paid
 *
 * PayMongo:
 * payment status remains controlled
 * by PayMongo webhook
 *
 * Rider:
 * isAvailable -> true
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/delivered",
  authenticate,
  authorize("rider"),
  riderDeliveryNotesValidation,
  validateDeliveryRequest,
  delivered
);

/*
 * =========================================================
 * SELLER
 * Cancel available/accepted delivery
 *
 * Order stays ready_for_delivery so
 * another delivery request may be made.
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/cancel",
  authenticate,
  authorize("seller"),
  cancel
);

/*
 * =========================================================
 * CUSTOMER / SELLER / RIDER
 * Get one delivery
 *
 * Keep this route last.
 * =========================================================
 */
deliveryRouter.get(
  "/:deliveryId",
  authenticate,
  getOne
);

export default deliveryRouter;