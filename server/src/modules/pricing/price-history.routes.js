import { Router } from "express";

import authenticate, { optionalAuthenticate } from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";
import {
  getAdminPriceHistory,
  getFlowerPriceHistory,
  getSellerPriceHistory,
} from "./price-history.service.js";

/*
 * =========================================================
 * PRICE HISTORY
 * =========================================================
 *
 * GET /api/v1/pricing/flowers/:flowerId
 *     Public timeline. The owner seller or Admin also gets
 *     the number of orders at each price.
 *
 * GET /api/v1/pricing/seller/mine
 *     Seller: every price change in the shop.
 *
 * GET /api/v1/pricing/admin?flagged=true
 *     Admin: platform-wide changes (flagged = +50% or more).
 * =========================================================
 */

const pricingRouter = Router();

const send = (res, message, data) =>
  res.status(200).json({ success: true, message, data });

pricingRouter.get("/flowers/:flowerId", optionalAuthenticate, async (req, res, next) => {
  try {
    send(res, "Price history retrieved successfully.", await getFlowerPriceHistory(req.params.flowerId, req.user || null));
  } catch (error) {
    next(error);
  }
});

pricingRouter.get("/seller/mine", authenticate, authorize("seller"), async (req, res, next) => {
  try {
    const entries = await getSellerPriceHistory(req.user.userId, { limit: req.query.limit });
    send(res, "Price history retrieved successfully.", { count: entries.length, entries });
  } catch (error) {
    next(error);
  }
});

pricingRouter.get("/admin", authenticate, authorize("admin"), async (req, res, next) => {
  try {
    const entries = await getAdminPriceHistory({
      flaggedOnly: req.query.flagged === "true",
      limit: req.query.limit,
    });
    send(res, "Price history retrieved successfully.", { count: entries.length, entries });
  } catch (error) {
    next(error);
  }
});

export default pricingRouter;
