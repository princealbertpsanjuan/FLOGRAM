import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";
import { disputeEvidenceUpload } from "../../middleware/upload.js";

import { adminList, adminUpdate, create, getOne, message, mine } from "./dispute.controller.js";

/*
 * /api/v1/disputes
 *
 * POST   /                       file a report (multipart, images[] up to 3)
 * GET    /mine                   my reports
 * GET    /admin                  Admin list (?status=)
 * PATCH  /admin/:disputeId       Admin review / resolve / reject
 * GET    /:disputeId             one report (party or Admin)
 * POST   /:disputeId/messages    add a message
 */
const disputeRouter = Router();

disputeRouter.post(
  "/",
  authenticate,
  authorize("customer", "seller", "rider"),
  disputeEvidenceUpload.array("images", 3),
  create
);

disputeRouter.get("/mine", authenticate, authorize("customer", "seller", "rider"), mine);

disputeRouter.get("/admin", authenticate, authorize("admin"), adminList);

disputeRouter.patch("/admin/:disputeId", authenticate, authorize("admin"), adminUpdate);

disputeRouter.get("/:disputeId", authenticate, getOne);

disputeRouter.post("/:disputeId/messages", authenticate, message);

export default disputeRouter;
