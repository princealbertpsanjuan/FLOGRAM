import { Router } from "express";

import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
  resetPassword,
  verifyResetCode,
} from "./auth.controller.js";

import {
  forgotPasswordValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  validateRequest,
  verifyResetCodeValidation,
} from "./auth.validation.js";

import authenticate from "../../middleware/authenticate.js";

const authRouter = Router();

// Public routes
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

authRouter.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);

authRouter.post(
  "/verify-reset-code",
  verifyResetCodeValidation,
  validateRequest,
  verifyResetCode
);

authRouter.post(
  "/reset-password",
  resetPasswordValidation,
  validateRequest,
  resetPassword
);

// Authenticated routes
authRouter.get(
  "/me",
  authenticate,
  getCurrentUser
);

authRouter.post(
  "/logout",
  authenticate,
  logout
);

export default authRouter;