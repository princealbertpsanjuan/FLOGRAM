import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import { create, listForFlorist, listMine, remove, update } from "./addon.controller.js";

/*
 * /api/v1/addons
 *
 * GET    /mine                  seller's add-ons
 * POST   /                      seller creates
 * PATCH  /:addOnId              seller updates
 * DELETE /:addOnId              seller removes
 * GET    /florist/:floristId    public list for a shop
 */
const addOnRouter = Router();

addOnRouter.get("/mine", authenticate, authorize("seller"), listMine);
addOnRouter.get("/florist/:floristId", listForFlorist);
addOnRouter.post("/", authenticate, authorize("seller"), create);
addOnRouter.patch("/:addOnId", authenticate, authorize("seller"), update);
addOnRouter.delete("/:addOnId", authenticate, authorize("seller"), remove);

export default addOnRouter;
