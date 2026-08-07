import {
  getMyVerification,
  getPendingVerifications,
  saveRiderVerification,
  saveSellerVerification,
} from "./verification.service.js";

export const submitRiderVerification = async (
  req,
  res,
  next
) => {
  try {
    const verification =
      await saveRiderVerification(
        req.user.userId,
        req.files
      );

    res.status(201).json({
      success: true,
      message:
        "Rider verification documents submitted successfully.",
      data: {
        verification,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submitSellerVerification = async (
  req,
  res,
  next
) => {
  try {
    const verification =
      await saveSellerVerification(
        req.user.userId,
        req.files
      );

    res.status(201).json({
      success: true,
      message:
        "Seller verification documents submitted successfully.",
      data: {
        verification,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMySubmission = async (
  req,
  res,
  next
) => {
  try {
    const verification =
      await getMyVerification(req.user.userId);

    res.status(200).json({
      success: true,
      message:
        "Verification submission retrieved successfully.",
      data: {
        verification,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPending = async (
  req,
  res,
  next
) => {
  try {
    const verifications =
      await getPendingVerifications(
        req.query.role
      );

    res.status(200).json({
      success: true,
      message:
        "Pending verification submissions retrieved successfully.",
      data: {
        verifications,
      },
    });
  } catch (error) {
    next(error);
  }
};