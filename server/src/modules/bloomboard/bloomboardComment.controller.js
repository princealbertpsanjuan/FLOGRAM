import {
  createBloomboardComment,
  deleteBloomboardComment,
  getBloomboardComments,
} from "./bloomboardComment.service.js";

export const createComment = async (
  req,
  res,
  next
) => {
  try {
    const comment =
      await createBloomboardComment(
        req.params.postId,
        req.user.userId,
        req.body.content
      );

    res.status(201).json({
      success: true,
      message:
        "Comment added successfully.",
      data: {
        comment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (
  req,
  res,
  next
) => {
  try {
    const comments =
      await getBloomboardComments(
        req.params.postId
      );

    res.status(200).json({
      success: true,
      message:
        "BloomBoard comments retrieved successfully.",
      data: {
        count:
          comments.length,
        comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeComment = async (
  req,
  res,
  next
) => {
  try {
    const comment =
      await deleteBloomboardComment(
        req.params.commentId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Comment deleted successfully.",
      data: {
        comment,
      },
    });
  } catch (error) {
    next(error);
  }
};