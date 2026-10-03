import { Router } from "express";

import {
  changeMyPassword,
  getMyAddresses,
  getMyProfile,
  getUser,
  getUsers,
  updateMyAddresses,
  updateMyProfile,
  updateUserStatus,
} from "./user.controller.js";

import {
  adminUpdateUserStatusValidation,
  adminUserListValidation,
  changePasswordValidation,
  updateProfileValidation,
  validateUserRequest,
} from "./user.validation.js";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

const userRouter = Router();

/*
 * =========================================================
 * ALL USER ROUTES REQUIRE AUTHENTICATION
 * =========================================================
 */

userRouter.use(authenticate);

/*
 * =========================================================
 * CURRENT USER
 *
 * IMPORTANT:
 * Keep /me routes above /:userId.
 * =========================================================
 */

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

/*
 * =========================================================
 * CUSTOMER ADDRESS BOOK
 *
 * GET /api/v1/users/me/addresses
 * PUT /api/v1/users/me/addresses   { addresses: [...] }
 * =========================================================
 */

userRouter.get(
  "/me/addresses",
  getMyAddresses
);

userRouter.put(
  "/me/addresses",
  updateMyAddresses
);

/*
 * =========================================================
 * ADMIN - USERS LIST
 *
 * GET /api/v1/users
 *
 * Optional query:
 * ?role=customer
 * ?accountStatus=active
 * ?verificationStatus=approved
 * ?search=juan
 * =========================================================
 */

userRouter.get(
  "/",
  authorize("admin"),
  adminUserListValidation,
  validateUserRequest,
  getUsers
);

/*
 * =========================================================
 * ADMIN - USER DETAILS
 *
 * GET /api/v1/users/:userId
 * =========================================================
 */

userRouter.get(
  "/:userId",
  authorize("admin"),
  getUser
);

/*
 * =========================================================
 * ADMIN - CHANGE USER ACCOUNT STATUS
 *
 * PATCH /api/v1/users/:userId/status
 *
 * BODY:
 * {
 *   "accountStatus": "suspended"
 * }
 * =========================================================
 */

userRouter.patch(
  "/:userId/status",
  authorize("admin"),
  adminUpdateUserStatusValidation,
  validateUserRequest,
  updateUserStatus
);

export default userRouter;