import { Router } from "express";

import {
  create,
  getMine,
  getOne,
  getPublic,
  remove,
  update,
} from "./flower.controller.js";

import {
  createFlowerValidation,
  updateFlowerValidation,
  validateFlowerRequest,
} from "./flower.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";
import { flowerUpload } from "../../middleware/upload.js";

const flowerRouter = Router();

const parseFlowerFormData = (req, res, next) => {
  try {
    if (req.body.occasion) {
      req.body.occasion = JSON.parse(
        req.body.occasion
      );
    }

    if (req.body.flowerTypes) {
      req.body.flowerTypes = JSON.parse(
        req.body.flowerTypes
      );
    }

    if (req.body.colors) {
      req.body.colors = JSON.parse(
        req.body.colors
      );
    }

    if (req.body.price !== undefined) {
      req.body.price = Number(
        req.body.price
      );
    }

    if (
      req.body.isAvailable !== undefined
    ) {
      req.body.isAvailable =
        req.body.isAvailable === "true";
    }

    next();
  } catch (error) {
    return res.status(422).json({
      success: false,
      message: "Invalid flower form data.",
    });
  }
};

/*
 * PUBLIC
 * Get all available flower/bouquet listings
 */
flowerRouter.get(
  "/",
  getPublic
);

/*
 * SELLER
 * Get seller's own listings
 */
flowerRouter.get(
  "/seller/mine",
  authenticate,
  authorize("seller"),
  getMine
);

/*
 * SELLER
 * Create flower/bouquet listing
 * Supports up to 5 images
 */
flowerRouter.post(
  "/",
  authenticate,
  authorize("seller"),
  flowerUpload.array("images", 5),
  parseFlowerFormData,
  createFlowerValidation,
  validateFlowerRequest,
  create
);

/*
 * SELLER
 * Update own listing
 */
flowerRouter.patch(
  "/:flowerId",
  authenticate,
  authorize("seller"),
  updateFlowerValidation,
  validateFlowerRequest,
  update
);

/*
 * SELLER
 * Deactivate own listing
 */
flowerRouter.delete(
  "/:flowerId",
  authenticate,
  authorize("seller"),
  remove
);

/*
 * PUBLIC
 * Get one flower/bouquet listing
 *
 * Keep this last.
 */
flowerRouter.get(
  "/:flowerId",
  getOne
);

export default flowerRouter;