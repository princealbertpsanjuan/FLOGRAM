import {
  createBloomboardPost,
  deleteBloomboardPost,
  getBloomboardFeed,
  getBloomboardPostById,
  getMyBloomboardPosts,
  getMySavedBloomboardPosts,
  likeBloomboardPost,
  saveBloomboardPost,
  unlikeBloomboardPost,
  unsaveBloomboardPost,
  getMyLikedBloomboardPosts,
  getShopTaggedPosts,
  getTaggableShops,
} from "./bloomboardPost.service.js";

export const createPost = async (
  req,
  res,
  next
) => {
  try {
    const post =
      await createBloomboardPost(
        req.user.userId,
        req.body,
        req.files || []
      );

    res.status(201).json({
      success: true,
      message:
        "BloomBoard post created successfully.",
      data: {
        post,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFeed = async (
  req,
  res,
  next
) => {
  try {
    const filters = {
      postType:
        req.query.postType,
      authorRole:
        req.query.authorRole,
      limit:
        req.query.limit,
    };

    const posts =
      await getBloomboardFeed(
        filters
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard feed retrieved successfully.",
      data: {
        count: posts.length,
        posts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPosts = async (
  req,
  res,
  next
) => {
  try {
    const posts =
      await getMyBloomboardPosts(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Your BloomBoard posts retrieved successfully.",
      data: {
        count:
          posts.length,
        posts,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPost = async (
  req,
  res,
  next
) => {
  try {
    const post =
      await getBloomboardPostById(
        req.params.postId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post retrieved successfully.",
      data: {
        post,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removePost = async (
  req,
  res,
  next
) => {
  try {
    const post =
      await deleteBloomboardPost(
        req.params.postId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post deleted successfully.",
      data: {
        post,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const likePost = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await likeBloomboardPost(
        req.params.postId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post liked successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unlikePost = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await unlikeBloomboardPost(
        req.params.postId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post unliked successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const savePost = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await saveBloomboardPost(
        req.params.postId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post saved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unsavePost = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await unsaveBloomboardPost(
        req.params.postId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard post removed from saved posts successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySavedPosts =
  async (
    req,
    res,
    next
  ) => {
    try {
      const posts =
        await getMySavedBloomboardPosts(
          req.user.userId
        );

      res.status(200).json({
        success: true,
        message:
          "Saved BloomBoard posts retrieved successfully.",
        data: {
          count:
            posts.length,
          posts,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const getMyLikedPosts =
  async (
    req,
    res,
    next
  ) => {
    try {
      const posts =
        await getMyLikedBloomboardPosts(
          req.user.userId
        );

      res.status(200).json({
        success: true,
        message:
          "Liked BloomBoard posts retrieved successfully.",
        data: {
          count:
            posts.length,
          posts,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * CUSTOMER
 * Shops that can be tagged / rated in a post
 */
export const getTaggable = async (req, res, next) => {
  try {
    const shops = await getTaggableShops(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Taggable shops retrieved successfully.",
      data: { count: shops.length, shops },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PUBLIC
 * Posts that tag a shop + community rating
 */
export const getShopTagged = async (req, res, next) => {
  try {
    const result = await getShopTaggedPosts(req.params.floristId, req.query.limit);

    res.status(200).json({
      success: true,
      message: "Tagged posts retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
