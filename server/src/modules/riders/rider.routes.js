import { Router } from "express";

import {
  approve,
  createMyRiderProfile,
  getMyProfile,
  getPending,
  getRider,
  reject,
  updateAvailability,
  updateMyProfile,
} from "./rider.controller.js";

import {
  rejectRiderValidation,
  riderAvailabilityValidation,
  riderProfileValidation,
  updateRiderValidation,
  validateRiderRequest,
} from "./rider.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const riderRouter = Router();

/*
 * RIDER ROUTES
 */

riderRouter.post(
  "/profile",
  authenticate,
  authorize("rider"),
  riderProfileValidation,
  validateRiderRequest,
  createMyRiderProfile
);

riderRouter.get(
  "/profile",
  authenticate,
  authorize("rider"),
  getMyProfile
);

riderRouter.patch(
  "/profile",
  authenticate,
  authorize("rider"),
  updateRiderValidation,
  validateRiderRequest,
  updateMyProfile
);

riderRouter.patch(
  "/availability",
  authenticate,
  authorize("rider"),
  riderAvailabilityValidation,
  validateRiderRequest,
  updateAvailability
);

/*
 * ADMIN ROUTES
 */

riderRouter.get(
  "/pending",
  authenticate,
  authorize("admin"),
  getPending
);

riderRouter.get(
  "/:riderId",
  authenticate,
  authorize("admin"),
  getRider
);

riderRouter.patch(
  "/:riderId/approve",
  authenticate,
  authorize("admin"),
  approve
);

riderRouter.patch(
  "/:riderId/reject",
  authenticate,
  authorize("admin"),
  rejectRiderValidation,
  validateRiderRequest,
  reject
);

export default riderRouter;