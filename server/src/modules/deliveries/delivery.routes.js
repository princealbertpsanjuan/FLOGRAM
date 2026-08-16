import {
  Router,
} from "express";

import {
  acceptAssignment,
  assignRider,
  cancel,
  delivered,
  getAvailable,
  getForRider,
  getForSeller,
  getMine,
  getOne,
  pickedUp,
  startDelivery,
} from "./delivery.controller.js";

import {
  assignRiderValidation,
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
 * Get approved + active + available riders
 * =========================================================
 */
deliveryRouter.get(
  "/available-riders",
  authenticate,
  authorize("seller"),
  getAvailable
);

/*
 * =========================================================
 * SELLER
 * Get florist deliveries
 *
 * Optional:
 * ?status=assigned
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
 * Get rider's own delivery assignments
 *
 * Optional:
 * ?status=assigned
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
 * Assign rider to an order
 *
 * Body:
 * {
 *   "riderId": "..."
 * }
 * =========================================================
 */
deliveryRouter.post(
  "/orders/:orderId/assign",
  authenticate,
  authorize("seller"),
  assignRiderValidation,
  validateDeliveryRequest,
  assignRider
);

/*
 * =========================================================
 * RIDER
 * Accept assigned delivery
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
 * picked_up -> out_for_delivery
 *
 * Order:
 * ready_for_delivery -> out_for_delivery
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
 * - Order -> delivered
 * - COD -> paid
 * - Rider -> available
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
 * Cancel assigned/accepted delivery
 *
 * Order remains ready_for_delivery
 * so another rider can be assigned.
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
 * Keep this last.
 * =========================================================
 */
deliveryRouter.get(
  "/:deliveryId",
  authenticate,
  getOne
);

export default deliveryRouter;