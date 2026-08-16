import { Router } from "express";

import {
  createPost,
  getFeed,
  getMySavedPosts,
  getPost,
  likePost,
  removePost,
  savePost,
  unlikePost,
  unsavePost,
} from "./bloomboardPost.controller.js";

import {
  createComment,
  getComments,
  removeComment,
} from "./bloomboardComment.controller.js";

import {
  createBloomboardCommentValidation,
  createBloomboardPostValidation,
  validateBloomboardPostRequest,
} from "./bloomboardPost.validation.js";

import authenticate from "../../middleware/authenticate.js";

import {
  bloomboardUpload,
} from "../../middleware/upload.js";

const bloomboardPostRouter =
  Router();

/*
 * PUBLIC
 * Get BloomBoard social feed
 */
bloomboardPostRouter.get(
  "/",
  getFeed
);

/*
 * AUTHENTICATED
 * Get current user's saved posts
 *
 * Keep before /:postId
 */
bloomboardPostRouter.get(
  "/saved/mine",
  authenticate,
  getMySavedPosts
);

/*
 * CUSTOMER / SELLER
 * Create BloomBoard post
 */
bloomboardPostRouter.post(
  "/",
  authenticate,
  bloomboardUpload.array(
    "images",
    5
  ),
  createBloomboardPostValidation,
  validateBloomboardPostRequest,
  createPost
);

/*
 * AUTHENTICATED
 * Add comment
 */
bloomboardPostRouter.post(
  "/:postId/comments",
  authenticate,
  createBloomboardCommentValidation,
  validateBloomboardPostRequest,
  createComment
);

/*
 * PUBLIC
 * Get comments on a post
 */
bloomboardPostRouter.get(
  "/:postId/comments",
  getComments
);

/*
 * AUTHENTICATED
 * Delete own comment
 *
 * Keep before /:postId
 */
bloomboardPostRouter.delete(
  "/comments/:commentId",
  authenticate,
  removeComment
);

/*
 * AUTHENTICATED
 * Like post
 */
bloomboardPostRouter.post(
  "/:postId/like",
  authenticate,
  likePost
);

/*
 * AUTHENTICATED
 * Unlike post
 */
bloomboardPostRouter.delete(
  "/:postId/like",
  authenticate,
  unlikePost
);

/*
 * AUTHENTICATED
 * Save post
 */
bloomboardPostRouter.post(
  "/:postId/save",
  authenticate,
  savePost
);

/*
 * AUTHENTICATED
 * Unsave post
 */
bloomboardPostRouter.delete(
  "/:postId/save",
  authenticate,
  unsavePost
);

/*
 * AUTHOR
 * Delete own post
 */
bloomboardPostRouter.delete(
  "/:postId",
  authenticate,
  removePost
);

/*
 * PUBLIC
 * Get one BloomBoard post
 *
 * Keep this last.
 */
bloomboardPostRouter.get(
  "/:postId",
  getPost
);

export default bloomboardPostRouter;