import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import { chatWithWorkAssistant } from "./work-assistant.service.js";

/*
 * POST /api/v1/assistant/work/chat
 * body: { message, history?: [{ role: "user"|"assistant", content }] }
 */
const workAssistantRouter = Router();

workAssistantRouter.post("/work/chat", authenticate, authorize("seller", "rider"), async (req, res, next) => {
  try {
    const data = await chatWithWorkAssistant(req.user, req.body);
    res.status(200).json({ success: true, message: "Assistant replied.", data });
  } catch (error) {
    next(error);
  }
});

export default workAssistantRouter;
