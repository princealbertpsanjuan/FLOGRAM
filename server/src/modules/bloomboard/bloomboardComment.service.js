import BloomboardComment from "./bloomboardComment.model.js";
import BloomboardPost from "./bloomboardPost.model.js";
import User from "../auth/auth.model.js";

export const createBloomboardComment =
  async (
    postId,
    userId,
    content
  ) => {
    const user =
      await User.findById(
        userId
      );

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
        "Only customers and sellers can comment on BloomBoard posts."
      );
      error.statusCode = 403;
      throw error;
    }

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

    const comment =
      await BloomboardComment.create({
        post: postId,
        author: userId,
        content,
      });

    return BloomboardComment.findById(
      comment._id
    ).populate(
      "author",
      "firstName lastName role profileImage"
    );
  };

export const getBloomboardComments =
  async (postId) => {
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

    return BloomboardComment.find({
      post: postId,
      isActive: true,
    })
      .populate(
        "author",
        "firstName lastName role profileImage"
      )
      .sort({
        createdAt: 1,
      });
  };

export const deleteBloomboardComment =
  async (
    commentId,
    userId
  ) => {
    const comment =
      await BloomboardComment.findOne({
        _id: commentId,
        author: userId,
        isActive: true,
      });

    if (!comment) {
      const error = new Error(
        "Comment was not found or does not belong to this user."
      );
      error.statusCode = 404;
      throw error;
    }

    comment.isActive = false;

    await comment.save();

    return comment;
  };