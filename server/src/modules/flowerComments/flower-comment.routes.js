import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import { addListingComment, deleteListingComment, getListingFeedback } from "./flower-comment.service.js";

/*
 * /api/v1/listing-comments
 *
 * GET    /flowers/:flowerId        reviews + comments (public)
 * POST   /flowers/:flowerId        add a comment (customer / owning shop)
 * DELETE /:commentId               delete own comment (or Admin)
 */
const listingCommentRouter = Router();

const send = (res, statusCode, message, data) => res.status(statusCode).json({ success: true, message, data });

listingCommentRouter.get("/flowers/:flowerId", async (req, res, next) => {
  try {
    send(res, 200, "Listing feedback retrieved.", await getListingFeedback(req.params.flowerId));
  } catch (error) {
    next(error);
  }
});

listingCommentRouter.post(
  "/flowers/:flowerId",
  authenticate,
  authorize("customer", "seller"),
  async (req, res, next) => {
    try {
      const comment = await addListingComment(req.user, req.params.flowerId, req.body?.text);
      send(res, 201, "Comment posted.", { comment });
    } catch (error) {
      next(error);
    }
  }
);

listingCommentRouter.delete("/:commentId", authenticate, async (req, res, next) => {
  try {
    send(res, 200, "Comment deleted.", await deleteListingComment(req.user, req.params.commentId));
  } catch (error) {
    next(error);
  }
});

export default listingCommentRouter;
