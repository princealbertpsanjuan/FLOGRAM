import { Router } from "express";

import {
  getCurrentUser,
  login,
  logout,
  register,
} from "./auth.controller.js";

import {
  loginValidation,
  registerValidation,
  validateRequest,
} from "./auth.validation.js";

import authenticate from "../../middleware/authenticate.js";

const authRouter = Router();

authRouter.post(
  "/register",
  registerValidation,
  validateRequest,
  register
);

authRouter.post(
  "/login",
  loginValidation,
  validateRequest,
  login
);

authRouter.post("/logout", authenticate, logout);

authRouter.get("/me", authenticate, getCurrentUser);

export default authRouter;