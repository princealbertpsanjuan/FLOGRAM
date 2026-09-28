import {
  changePasswordById,
  getProfileById,
  getUserForAdminById,
  getUsersForAdmin,
  updateProfileById,
  updateUserAccountStatusByAdmin,
} from "./user.service.js";

/*
 * =========================================================
 * CURRENT USER
 * =========================================================
 */

export const getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await getProfileById(
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        "Profile retrieved successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await updateProfileById(
        req.user.userId,
        req.body
      );

    res.status(200).json({
      success: true,
      message:
        "Profile updated successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changeMyPassword = async (
  req,
  res,
  next
) => {
  try {
    await changePasswordById(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN - GET USERS
 * =========================================================
 */

export const getUsers = async (
  req,
  res,
  next
) => {
  try {
    const users =
      await getUsersForAdmin({
        role: req.query.role,
        accountStatus:
          req.query.accountStatus,
        verificationStatus:
          req.query.verificationStatus,
        search: req.query.search,
      });

    res.status(200).json({
      success: true,
      message:
        "Users retrieved successfully.",
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN - GET USER DETAILS
 * =========================================================
 */

export const getUser = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await getUserForAdminById(
        req.params.userId
      );

    res.status(200).json({
      success: true,
      message:
        "User retrieved successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * =========================================================
 * ADMIN - UPDATE ACCOUNT STATUS
 * =========================================================
 */

export const updateUserStatus = async (
  req,
  res,
  next
) => {
  try {
    const user =
      await updateUserAccountStatusByAdmin(
        req.params.userId,
        req.body.accountStatus,
        req.user.userId
      );

    res.status(200).json({
      success: true,
      message:
        `User account is now ${user.accountStatus}.`,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};