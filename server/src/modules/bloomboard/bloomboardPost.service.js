import BloomboardPost from "./bloomboardPost.model.js";
import BloomboardComment from "./bloomboardComment.model.js";
import Florist from "../florists/florist.model.js";
import User from "../auth/auth.model.js";

const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

const addPostCounts = async (
  posts
) => {
  return Promise.all(
    posts.map(async (post) => {
      const commentCount =
        await BloomboardComment.countDocuments({
          post: post._id,
          isActive: true,
        });

      return {
        ...post,
        likeCount:
          post.likes?.length || 0,
        commentCount,
      };
    })
  );
};

export const createBloomboardPost = async (
  userId,
  postData,
  files = []
) => {
  const user =
    await User.findById(userId);

  if (!user) {
    const error = new Error(
      "User account was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (
    ![
      "customer",
      "seller",
    ].includes(user.role)
  ) {
    const error = new Error(
      "Only customers and sellers can create BloomBoard posts."
    );
    error.statusCode = 403;
    throw error;
  }

  let florist = null;

  if (user.role === "seller") {
    florist =
      await Florist.findOne({
        owner: userId,
      });

    if (!florist) {
      const error = new Error(
        "Florist profile was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    if (
      florist.verificationStatus !==
        "approved" ||
      !florist.isActive
    ) {
      const error = new Error(
        "Only approved and active florists can create BloomBoard posts."
      );
      error.statusCode = 403;
      throw error;
    }
  }

  const images = files.map(
    (file) =>
      normalizePath(file.path)
  );

  if (
    !postData.caption &&
    images.length === 0
  ) {
    const error = new Error(
      "A BloomBoard post must contain a caption or at least one image."
    );
    error.statusCode = 400;
    throw error;
  }

  const post =
    await BloomboardPost.create({
      author: userId,
      authorRole: user.role,
      florist:
        florist?._id || null,
      caption:
        postData.caption || "",
      images,
      postType:
        postData.postType ||
        "general",
    });

  const populatedPost =
    await BloomboardPost.findById(
      post._id
    )
      .populate(
        "author",
        "firstName lastName role profileImage"
      )
      .populate(
        "florist",
        "shopName shopLogo address"
      )
      .lean();

  return {
    ...populatedPost,
    likeCount: 0,
    commentCount: 0,
  };
};

export const getBloomboardFeed = async (
  filters = {}
) => {
  const query = {
    isActive: true,
  };

  if (filters.postType) {
    query.postType =
      filters.postType;
  }

  if (filters.authorRole) {
    query.authorRole =
      filters.authorRole;
  }

  const limit = Math.min(
    Math.max(
      Number(filters.limit) || 20,
      1
    ),
    50
  );

  const posts =
    await BloomboardPost.find(
      query
    )
      .populate(
        "author",
        "firstName lastName role profileImage"
      )
      .populate(
        "florist",
        "shopName shopLogo address"
      )
      .sort({
        createdAt: -1,
      })
      .limit(limit)
      .lean();

  return addPostCounts(posts);
};

export const getBloomboardPostById =
  async (postId) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .lean();

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    const commentCount =
      await BloomboardComment.countDocuments({
        post: postId,
        isActive: true,
      });

    return {
      ...post,
      likeCount:
        post.likes?.length || 0,
      commentCount,
    };
  };

export const deleteBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        author: userId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found or does not belong to this user."
      );
      error.statusCode = 404;
      throw error;
    }

    post.isActive = false;

    await post.save();

    await BloomboardComment.updateMany(
      {
        post: postId,
        isActive: true,
      },
      {
        isActive: false,
      }
    );

    return post;
  };

export const likeBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    const alreadyLiked =
      post.likes.some(
        (id) =>
          id.toString() ===
          userId.toString()
      );

    if (!alreadyLiked) {
      post.likes.push(userId);
      await post.save();
    }

    return {
      liked: true,
      likeCount:
        post.likes.length,
    };
  };

export const unlikeBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    post.likes =
      post.likes.filter(
        (id) =>
          id.toString() !==
          userId.toString()
      );

    await post.save();

    return {
      liked: false,
      likeCount:
        post.likes.length,
    };
  };

export const saveBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    const alreadySaved =
      post.saves.some(
        (id) =>
          id.toString() ===
          userId.toString()
      );

    if (!alreadySaved) {
      post.saves.push(userId);
      await post.save();
    }

    return {
      saved: true,
    };
  };

export const unsaveBloomboardPost =
  async (
    postId,
    userId
  ) => {
    const post =
      await BloomboardPost.findOne({
        _id: postId,
        isActive: true,
      });

    if (!post) {
      const error = new Error(
        "BloomBoard post was not found."
      );
      error.statusCode = 404;
      throw error;
    }

    post.saves =
      post.saves.filter(
        (id) =>
          id.toString() !==
          userId.toString()
      );

    await post.save();

    return {
      saved: false,
    };
  };

export const getMySavedBloomboardPosts =
  async (userId) => {
    const posts =
      await BloomboardPost.find({
        isActive: true,
        saves: userId,
      })
        .populate(
          "author",
          "firstName lastName role profileImage"
        )
        .populate(
          "florist",
          "shopName shopLogo address"
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    return addPostCounts(posts);
  };