import { rateLimit } from "../../middleware/rateLimit.js";

const byEmail = (req) => req.body?.email;
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
  rateLimit({ max: 30, windowMs: 60 * 60 * 1000, message: "Too many sign-ups from this network. Please try again later." }),
  registerValidation,
  validateRequest,
  register
);

authRouter.post(
  "/login",
  rateLimit({ max: 10, keyBy: byEmail, message: "Too many login attempts for this account. Please wait 15 minutes and try again." }),
  loginValidation,
  validateRequest,
  login
);

authRouter.post(
  "/forgot-password",
  rateLimit({ max: 5, keyBy: byEmail, message: "Too many reset requests. Please wait 15 minutes and try again." }),
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);

authRouter.post(
  "/verify-reset-code",
  rateLimit({ max: 10, keyBy: byEmail }),
  verifyResetCodeValidation,
  validateRequest,
  verifyResetCode
);

authRouter.post(
  "/reset-password",
  rateLimit({ max: 10, keyBy: byEmail }),
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