import {
  approveFlorist,
  createFloristProfile,
  getFloristById,
  getMyFloristProfile,
  getPendingFlorists,
  getPublicFloristById,
  getPublicFloristFlowers,
  getPublicFlorists,
  rejectFlorist,
  updateFloristProfile,
} from "./florist.service.js";

export const createMyFloristProfile = async (
  req,
  res,
  next
) => {
  try {
    const florist = await createFloristProfile(
      req.user.userId,
      req.body
    );

    res.status(201).json({
      success: true,
      message:
        "Florist profile created successfully and is awaiting admin verification.",
      data: {
        florist,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyProfile = async (
  req,
  res,
  next
) => {
  try {
    const florist = await getMyFloristProfile(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Florist profile retrieved successfully.",
      data: {
        florist,
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
    const florist = await updateFloristProfile(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message:
        "Florist profile updated successfully.",
      data: {
        florist,
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
    const florists = await getPendingFlorists();

    res.status(200).json({
      success: true,
      message:
        "Pending florist applications retrieved successfully.",
      data: {
        florists,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getFlorist = async (
  req,
  res,
  next
) => {
  try {
    const florist = await getFloristById(
      req.params.floristId
    );

    res.status(200).json({
      success: true,
      message:
        "Florist profile retrieved successfully.",
      data: {
        florist,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const approve = async (
  req,
  res,
  next
) => {
  try {
    const florist = await approveFlorist(
      req.params.floristId,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Florist approved successfully.",
      data: {
        florist,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const reject = async (
  req,
  res,
  next
) => {
  try {
    const florist = await rejectFlorist(
      req.params.floristId,
      req.user.userId,
      req.body.remarks
    );

    res.status(200).json({
      success: true,
      message:
        "Florist application rejected.",
      data: {
        florist,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PUBLIC
 * Get all approved and active florist shops
 */
export const getPublicShops = async (
  req,
  res,
  next
) => {
  try {
    const florists = await getPublicFlorists();

    res.status(200).json({
      success: true,
      message:
        "Florist shops retrieved successfully.",
      data: {
        count: florists.length,
        florists,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PUBLIC
 * Get one approved florist shop
 */
export const getPublicShop = async (
  req,
  res,
  next
) => {
  try {
    const florist =
      await getPublicFloristById(
        req.params.floristId
      );

    res.status(200).json({
      success: true,
      message:
        "Florist shop retrieved successfully.",
      data: {
        florist,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * PUBLIC
 * Get available bouquets from one florist
 */
export const getPublicShopFlowers = async (
  req,
  res,
  next
) => {
  try {
    const flowers =
      await getPublicFloristFlowers(
        req.params.floristId
      );

    res.status(200).json({
      success: true,
      message:
        "Florist bouquet listings retrieved successfully.",
      data: {
        count: flowers.length,
        flowers,
      },
    });
  } catch (error) {
    next(error);
  }
};