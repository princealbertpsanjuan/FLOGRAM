import { Router } from "express";

import {
  changeMyPassword,
  getMyProfile,
  updateMyProfile,
} from "./user.controller.js";

import {
  changePasswordValidation,
  updateProfileValidation,
  validateUserRequest,
} from "./user.validation.js";

import authenticate from "../../middleware/authenticate.js";

const userRouter = Router();

userRouter.use(authenticate);

userRouter.get(
  "/me",
  getMyProfile
);

userRouter.patch(
  "/me",
  updateProfileValidation,
  validateUserRequest,
  updateMyProfile
);

userRouter.patch(
  "/me/password",
  changePasswordValidation,
  validateUserRequest,
  changeMyPassword
);

export default userRouter;