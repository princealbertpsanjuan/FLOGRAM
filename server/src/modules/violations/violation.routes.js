import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import { create, lift, list, mine } from "./violation.controller.js";

/*
 * /api/v1/violations
 *
 * GET   /mine                    own warnings/penalties
 * GET   /                        Admin list (?userId=&status=)
 * POST  /                        Admin records violation + penalty
 * PATCH /:violationId/lift       Admin lifts a penalty
 */
const violationRouter = Router();

violationRouter.get("/mine", authenticate, mine);
violationRouter.get("/", authenticate, authorize("admin"), list);
violationRouter.post("/", authenticate, authorize("admin"), create);
violationRouter.patch("/:violationId/lift", authenticate, authorize("admin"), lift);

export default violationRouter;
