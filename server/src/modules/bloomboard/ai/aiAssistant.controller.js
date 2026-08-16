import {
  archiveAiConversation,
  createAiConversation,
  getAiConversationById,
  getMyAiConversations,
  sendAiMessage,
} from "./aiAssistant.service.js";

export const createConversation = async (
  req,
  res,
  next
) => {
  try {
    const conversation =
      await createAiConversation(
        req.user.userId
      );

    res.status(201).json({
      success: true,
      message:
        "AI bouquet conversation created successfully.",
      data: {
        conversation,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyConversations = async (
  req,
  res,
  next
) => {
  try {
    const conversations =
      await getMyAiConversations(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "AI bouquet conversations retrieved successfully.",
      data: {
        count:
          conversations.length,
        conversations,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await getAiConversationById(
        req.params.conversationId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "AI bouquet conversation retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req,
  res,
  next
) => {
  try {
    const result =
      await sendAiMessage(
        req.params.conversationId,
        req.user.userId,
        req.body.content
      );

    res.status(201).json({
      success: true,
      message:
        "AI bouquet message sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveConversation = async (
  req,
  res,
  next
) => {
  try {
    const conversation =
      await archiveAiConversation(
        req.params.conversationId,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "AI bouquet conversation archived successfully.",
      data: {
        conversation,
      },
    });
  } catch (error) {
    next(error);
  }
};