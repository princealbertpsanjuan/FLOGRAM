import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import { follow, mine, status, unfollow } from "./follow.controller.js";

/*
 * /api/v1/follows
 *
 * GET    /mine                      shops I follow
 * GET    /florists/:floristId       follow status + follower count
 * POST   /florists/:floristId       follow
 * DELETE /florists/:floristId       unfollow
 */
const followRouter = Router();

followRouter.use(authenticate, authorize("customer"));

followRouter.get("/mine", mine);
followRouter.get("/florists/:floristId", status);
followRouter.post("/florists/:floristId", follow);
followRouter.delete("/florists/:floristId", unfollow);

export default followRouter;
