import { Router } from "express";

import {
  approve,
  createMyFloristProfile,
  getFlorist,
  getMyProfile,
  getPending,
  reject,
  updateMyProfile,
  getPublicShops,
  getPublicShop,
  getPublicShopFlowers,
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
 * PUBLIC ROUTES
 * Search & Discovery
 */

// Get all approved and active florist shops
floristRouter.get(
  "/public",
  getPublicShops
);

// Get available bouquets from a specific florist
floristRouter.get(
  "/public/:floristId/flowers",
  getPublicShopFlowers
);

// Get one approved florist's public profile
floristRouter.get(
  "/public/:floristId",
  getPublicShop
);

/*
 * SELLER ROUTES
 */

// Create seller's florist profile
floristRouter.post(
  "/profile",
  authenticate,
  authorize("seller"),
  floristProfileValidation,
  validateFloristRequest,
  createMyFloristProfile
);

// Get seller's own florist profile
floristRouter.get(
  "/profile",
  authenticate,
  authorize("seller"),
  getMyProfile
);

// Update seller's own florist profile
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

// Get pending florist profiles
floristRouter.get(
  "/pending",
  authenticate,
  authorize("admin"),
  getPending
);

// Approve florist
floristRouter.patch(
  "/:floristId/approve",
  authenticate,
  authorize("admin"),
  approve
);

// Reject florist
floristRouter.patch(
  "/:floristId/reject",
  authenticate,
  authorize("admin"),
  rejectFloristValidation,
  validateFloristRequest,
  reject
);

// Get florist by ID
// Keep generic parameter route after specific routes.
floristRouter.get(
  "/:floristId",
  authenticate,
  authorize("admin"),
  getFlorist
);

export default floristRouter;