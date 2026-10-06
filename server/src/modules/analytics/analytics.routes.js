import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import {
  adminBuyingPatterns,
  adminSentiment,
  alsoBought,
  searchSuggestions,
  sellerBuyingPatterns,
  sellerSentiment,
} from "./analytics.controller.js";

/*
 * =========================================================
 * ANALYTICS ROUTES  (/api/v1/analytics)
 * =========================================================
 *
 * GET /admin/sentiment            AFINN review sentiment
 * GET /admin/buying-patterns      FP-Growth rules
 * GET /seller/sentiment           own shop only
 * GET /seller/buying-patterns     own shop only
 * GET /flowers/:flowerId/also-bought   public
 * =========================================================
 */

const analyticsRouter = Router();

analyticsRouter.get("/admin/sentiment", authenticate, authorize("admin"), adminSentiment);
analyticsRouter.get("/admin/buying-patterns", authenticate, authorize("admin"), adminBuyingPatterns);

analyticsRouter.get("/seller/sentiment", authenticate, authorize("seller"), sellerSentiment);
analyticsRouter.get("/seller/buying-patterns", authenticate, authorize("seller"), sellerBuyingPatterns);

analyticsRouter.get("/flowers/:flowerId/also-bought", alsoBought);

/*
 * Customer search box: popular (FP-Growth) bouquets, bought-together pairs, keywords.
 */
analyticsRouter.get("/search-suggestions", searchSuggestions);

export default analyticsRouter;
