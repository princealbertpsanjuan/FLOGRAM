import {
  approveRider,
  createRiderProfile,
  getMyRiderProfile,
  getPendingRiders,
  getRiderById,
  rejectRider,
  updateRiderAvailability,
  updateRiderProfile,
} from "./rider.service.js";

export const createMyRiderProfile = async (
  req,
  res,
  next
) => {
  try {
    const rider = await createRiderProfile(
      req.user.userId,
      req.body
    );

    res.status(201).json({
      success: true,
      message:
        "Rider profile created successfully and is awaiting admin verification.",
      data: {
        rider,
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
    const rider = await getMyRiderProfile(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Rider profile retrieved successfully.",
      data: {
        rider,
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
    const rider = await updateRiderProfile(
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message:
        "Rider profile updated successfully.",
      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAvailability = async (
  req,
  res,
  next
) => {
  try {
    const rider = await updateRiderAvailability(
      req.user.userId,
      req.body.isAvailable
    );

    res.status(200).json({
      success: true,
      message:
        "Rider availability updated successfully.",
      data: {
        rider,
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
    const riders = await getPendingRiders();

    res.status(200).json({
      success: true,
      message:
        "Pending rider applications retrieved successfully.",
      data: {
        riders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRider = async (
  req,
  res,
  next
) => {
  try {
    const rider = await getRiderById(
      req.params.riderId
    );

    res.status(200).json({
      success: true,
      message:
        "Rider profile retrieved successfully.",
      data: {
        rider,
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
    const rider = await approveRider(
      req.params.riderId,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message: "Rider approved successfully.",
      data: {
        rider,
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
    const rider = await rejectRider(
      req.params.riderId,
      req.user.userId,
      req.body.remarks
    );

    res.status(200).json({
      success: true,
      message: "Rider application rejected.",
      data: {
        rider,
      },
    });
  } catch (error) {
    next(error);
  }
};