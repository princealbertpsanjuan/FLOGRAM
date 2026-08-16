import {
  createFlower,
  deactivateFlower,
  getFlowerById,
  getPublicFlowers,
  getRecommendedFlowers,
  getSellerFlowers,
  searchFlowersByImage,
  updateFlower,
} from "./flower.service.js";

export const create = async (
  req,
  res,
  next
) => {
  try {
    const flower = await createFlower(
      req.user.userId,
      req.body,
      req.files || []
    );

    res.status(201).json({
      success: true,
      message:
        "Flower listing created successfully.",
      data: {
        flower,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMine = async (
  req,
  res,
  next
) => {
  try {
    const flowers = await getSellerFlowers(
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Seller flower listings retrieved successfully.",
      data: {
        flowers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (
  req,
  res,
  next
) => {
  try {
    const flower = await getFlowerById(
      req.params.flowerId
    );

    res.status(200).json({
      success: true,
      message:
        "Flower listing retrieved successfully.",
      data: {
        flower,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const update = async (
  req,
  res,
  next
) => {
  try {
    const flower = await updateFlower(
      req.params.flowerId,
      req.user.userId,
      req.body
    );

    res.status(200).json({
      success: true,
      message:
        "Flower listing updated successfully.",
      data: {
        flower,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const remove = async (
  req,
  res,
  next
) => {
  try {
    const flower = await deactivateFlower(
      req.params.flowerId,
      req.user.userId
    );

    res.status(200).json({
      success: true,
      message:
        "Flower listing deactivated successfully.",
      data: {
        flower,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPublic = async (
  req,
  res,
  next
) => {
  try {
    const filters = {
      search: req.query.search,
      category: req.query.category,
      occasion: req.query.occasion,
      flowerType: req.query.flowerType,
      color: req.query.color,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
    };

    const flowers = await getPublicFlowers(
      filters
    );

    res.status(200).json({
      success: true,
      message:
        "Available flower listings retrieved successfully.",
      data: {
        count: flowers.length,
        flowers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (
  req,
  res,
  next
) => {
  try {
    const preferences = {
      occasion: req.body.occasion,
      minBudget: req.body.minBudget,
      maxBudget: req.body.maxBudget,
      flowerTypes:
        req.body.flowerTypes || [],
      colors:
        req.body.colors || [],
    };

    const limit =
      req.body.limit || 5;

    const flowers =
      await getRecommendedFlowers(
        preferences,
        limit
      );

    res.status(200).json({
      success: true,
      message:
        "Recommended flower listings retrieved successfully.",
      data: {
        count:
          flowers.length,
        preferences,
        flowers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const imageSearch = async (
  req,
  res,
  next
) => {
  try {
    const limit =
      req.query.limit || 10;

    const result =
      await searchFlowersByImage(
        req.file,
        limit
      );

    res.status(200).json({
      success: true,
      message:
        "Similar flower listings retrieved successfully.",
      data: {
        model:
          result.model,
        count:
          result.results.length,
        flowers:
          result.results,
      },
    });
  } catch (error) {
    next(error);
  }
};