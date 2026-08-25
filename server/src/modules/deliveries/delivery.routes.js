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
  getNavigation,
  getOne,
  getTracking,
  pickedUp,
  startDelivery,
  updateLocation,
} from "./delivery.controller.js";

import {
  riderDeliveryNotesValidation,
  riderLocationValidation,
  validateDeliveryRequest,
} from "./delivery.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const deliveryRouter =
  Router();

/*
 * =========================================================
 * SELLER
 * GET FLORIST DELIVERIES
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
 * GET AVAILABLE DELIVERY REQUESTS
 * =========================================================
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
 * GET CUSTOMER'S DELIVERIES
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
 * CREATE AVAILABLE DELIVERY REQUEST
 * =========================================================
 *
 * The seller does NOT choose a rider.
 *
 * Order must already be:
 *
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
 * ACCEPT AVAILABLE DELIVERY REQUEST
 * =========================================================
 *
 * First eligible rider who successfully
 * accepts gets the delivery.
 *
 * Delivery:
 *
 * available
 *     ↓
 * accepted
 *
 * Once accepted, the rider can begin
 * sending their GPS location.
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
 * UPDATE LIVE GPS LOCATION
 * =========================================================
 *
 * PATCH
 * /api/v1/deliveries/:deliveryId/location
 *
 * Example body:
 *
 * {
 *   "latitude": 13.625,
 *   "longitude": 123.195,
 *   "accuracy": 8.5
 * }
 *
 * Only the assigned rider can update
 * the location.
 *
 * Depending on the delivery status:
 *
 * accepted:
 * Rider -> Florist
 *
 * picked_up:
 * Rider -> Customer
 *
 * out_for_delivery:
 * Rider -> Customer
 *
 * The service recalculates:
 *
 * - distance remaining
 * - duration remaining
 * - estimated arrival
 * =========================================================
 */
deliveryRouter.patch(
  "/:deliveryId/location",
  authenticate,
  authorize("rider"),
  riderLocationValidation,
  validateDeliveryRequest,
  updateLocation
);

/*
 * =========================================================
 * RIDER
 * GET CURRENT NAVIGATION
 * =========================================================
 *
 * GET
 * /api/v1/deliveries/:deliveryId/navigation
 *
 * Only the assigned rider can access
 * navigation for their delivery.
 *
 * accepted:
 *
 * Rider
 *   ↓
 * Florist
 *
 * picked_up / out_for_delivery:
 *
 * Rider
 *   ↓
 * Customer
 *
 * The response can include the current
 * OpenRouteService route geometry for
 * the frontend map.
 * =========================================================
 */
deliveryRouter.get(
  "/:deliveryId/navigation",
  authenticate,
  authorize("rider"),
  getNavigation
);

/*
 * =========================================================
 * CUSTOMER / SELLER / RIDER
 * GET DELIVERY TRACKING
 * =========================================================
 *
 * GET
 * /api/v1/deliveries/:deliveryId/tracking
 *
 * CUSTOMER:
 * Can track their own delivery.
 *
 * SELLER:
 * Can monitor their own florist's
 * delivery.
 *
 * RIDER:
 * Can view tracking information for
 * their assigned delivery.
 *
 * Tracking may contain:
 *
 * - delivery status
 * - rider information
 * - rider location
 * - pickup location
 * - delivery location
 * - remaining distance
 * - remaining duration
 * - estimated arrival
 * =========================================================
 */
deliveryRouter.get(
  "/:deliveryId/tracking",
  authenticate,
  getTracking
);

/*
 * =========================================================
 * RIDER
 * MARK BOUQUET AS PICKED UP
 * =========================================================
 *
 * Delivery:
 *
 * accepted
 *     ↓
 * picked_up
 *
 * Navigation destination changes from:
 *
 * florist
 *
 * to:
 *
 * customer
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
 * START DELIVERY
 * =========================================================
 *
 * Delivery:
 *
 * picked_up
 *     ↓
 * out_for_delivery
 *
 * Order:
 *
 * ready_for_delivery
 *     ↓
 * out_for_delivery
 *
 * Rider navigation continues toward
 * the customer's delivery location.
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
 * MARK DELIVERY AS DELIVERED
 * =========================================================
 *
 * Delivery:
 *
 * out_for_delivery
 *     ↓
 * delivered
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
 * CANCEL AVAILABLE / ACCEPTED DELIVERY
 * =========================================================
 *
 * Order stays:
 *
 * ready_for_delivery
 *
 * so another delivery request may
 * be created.
 *
 * If a rider had already accepted the
 * delivery, that rider becomes available
 * again.
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
 * GET ONE DELIVERY
 * =========================================================
 *
 * IMPORTANT:
 *
 * Keep this generic parameter route
 * AFTER the more specific routes:
 *
 * /:deliveryId/location
 * /:deliveryId/navigation
 * /:deliveryId/tracking
 * /:deliveryId/accept
 * /:deliveryId/pickup
 * /:deliveryId/start
 * /:deliveryId/delivered
 * /:deliveryId/cancel
 *
 * Access control is handled inside
 * the service layer.
 * =========================================================
 */
deliveryRouter.get(
  "/:deliveryId",
  authenticate,
  getOne
);

export default deliveryRouter;