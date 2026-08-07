import { Router } from "express";

import {
  approve,
  createMyFloristProfile,
  getFlorist,
  getMyProfile,
  getPending,
  reject,
  updateMyProfile,
} from "./florist.controller.js";

import {
  floristProfileValidation,
  rejectFloristValidation,
  updateFloristValidation,
  validateFloristRequest,
} from "./florist.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const floristRouter = Router();

/*
 * SELLER ROUTES
 */

floristRouter.post(
  "/profile",
  authenticate,
  authorize("seller"),
  floristProfileValidation,
  validateFloristRequest,
  createMyFloristProfile
);

floristRouter.get(
  "/profile",
  authenticate,
  authorize("seller"),
  getMyProfile
);

floristRouter.patch(
  "/profile",
  authenticate,
  authorize("seller"),
  updateFloristValidation,
  validateFloristRequest,
  updateMyProfile
);

/*
 * ADMIN ROUTES
 */

floristRouter.get(
  "/pending",
  authenticate,
  authorize("admin"),
  getPending
);

floristRouter.get(
  "/:floristId",
  authenticate,
  authorize("admin"),
  getFlorist
);

floristRouter.patch(
  "/:floristId/approve",
  authenticate,
  authorize("admin"),
  approve
);

floristRouter.patch(
  "/:floristId/reject",
  authenticate,
  authorize("admin"),
  rejectFloristValidation,
  validateFloristRequest,
  reject
);

export default floristRouter;