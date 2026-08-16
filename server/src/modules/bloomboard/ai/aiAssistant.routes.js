import { Router } from "express";

import {
  archiveConversation,
  createConversation,
  getConversation,
  getMyConversations,
  sendMessage,
} from "./aiAssistant.controller.js";

import authenticate from "../../../middleware/authenticate.js";
import authorize from "../../../middleware/authorize.js";

const aiAssistantRouter =
  Router();

/*
 * CUSTOMER
 * Create a new AI Bouquet Assistant conversation
 */
aiAssistantRouter.post(
  "/conversations",
  authenticate,
  authorize("customer"),
  createConversation
);

/*
 * CUSTOMER
 * Get all own AI conversations
 */
aiAssistantRouter.get(
  "/conversations",
  authenticate,
  authorize("customer"),
  getMyConversations
);

/*
 * CUSTOMER
 * Send a message
 *
 * Keep before /:conversationId
 * routes where appropriate.
 */
aiAssistantRouter.post(
  "/conversations/:conversationId/messages",
  authenticate,
  authorize("customer"),
  sendMessage
);

/*
 * CUSTOMER
 * Archive own conversation
 */
aiAssistantRouter.patch(
  "/conversations/:conversationId/archive",
  authenticate,
  authorize("customer"),
  archiveConversation
);

/*
 * CUSTOMER
 * Get one conversation + messages
 */
aiAssistantRouter.get(
  "/conversations/:conversationId",
  authenticate,
  authorize("customer"),
  getConversation
);

export default aiAssistantRouter;