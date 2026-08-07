import {
  changePasswordById,
  getProfileById,
  updateProfileById,
} from "./user.service.js";

export const getMyProfile = async (req, res, next) => {
  try {
    const user = await getProfileById(req.user.userId);

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (req, res, next) => {
  try {
    const user = await updateProfileById(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changeMyPassword = async (req, res, next) => {
  try {
    await changePasswordById(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};