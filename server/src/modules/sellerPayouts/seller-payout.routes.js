import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";
import { sellerPayoutProofUpload } from "../../middleware/upload.js";

import { balances, cancel, create, getOne, list, markPaid, myEarnings, myPayout } from "./seller-payout.controller.js";

/*
 * /api/v1/seller-payouts
 *
 * Seller:
 *   GET   /me                       earnings summary + payouts
 *   GET   /me/:payoutId             one payout
 *
 * Admin:
 *   GET   /balances                 amount owed per shop
 *   GET   /                         payouts (?status=)
 *   POST  /florist/:floristId       create payout
 *   GET   /:payoutId                one payout
 *   PATCH /:payoutId/pay            mark paid (multipart proofImage)
 *   PATCH /:payoutId/cancel         cancel pending payout
 */
const sellerPayoutRouter = Router();

sellerPayoutRouter.get("/me", authenticate, authorize("seller"), myEarnings);
sellerPayoutRouter.get("/me/:payoutId", authenticate, authorize("seller"), myPayout);

sellerPayoutRouter.get("/balances", authenticate, authorize("admin"), balances);
sellerPayoutRouter.get("/", authenticate, authorize("admin"), list);
sellerPayoutRouter.post("/florist/:floristId", authenticate, authorize("admin"), create);
sellerPayoutRouter.get("/:payoutId", authenticate, authorize("admin"), getOne);
sellerPayoutRouter.patch(
  "/:payoutId/pay",
  authenticate,
  authorize("admin"),
  sellerPayoutProofUpload.single("proofImage"),
  markPaid
);
sellerPayoutRouter.patch("/:payoutId/cancel", authenticate, authorize("admin"), cancel);

export default sellerPayoutRouter;
