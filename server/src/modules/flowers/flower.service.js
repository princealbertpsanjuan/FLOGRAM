import Flower from "./flower.model.js";
import Florist from "../florists/florist.model.js";
import User from "../auth/auth.model.js";

const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

export const createFlower = async (
  userId,
  flowerData,
  files = []
) => {
  const user = await User.findById(userId);

  if (!user || user.role !== "seller") {
    const error = new Error(
      "Only seller accounts can create flower listings."
    );
    error.statusCode = 403;
    throw error;
  }

  const florist = await Florist.findOne({
    owner: userId,
  });

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  if (florist.verificationStatus !== "approved") {
    const error = new Error(
      "Only approved florists can create flower listings."
    );
    error.statusCode = 403;
    throw error;
  }

  const images = files.map((file) =>
    normalizePath(file.path)
  );

  const flower = await Flower.create({
    seller: userId,
    florist: florist._id,
    name: flowerData.name,
    description: flowerData.description,
    price: flowerData.price,
    category: flowerData.category,
    occasion: flowerData.occasion || [],
    flowerTypes: flowerData.flowerTypes || [],
    colors: flowerData.colors || [],
    images,
    isAvailable:
      flowerData.isAvailable ?? true,
  });

  return flower;
};

export const getSellerFlowers = async (
  userId
) => {
  return Flower.find({
    seller: userId,
  }).sort({
    createdAt: -1,
  });
};

export const getFlowerById = async (
  flowerId
) => {
  const flower = await Flower.findById(
    flowerId
  )
    .populate(
      "seller",
      "firstName lastName email"
    )
    .populate(
      "florist",
      "shopName description address contactNumber businessEmail"
    );

  if (!flower) {
    const error = new Error(
      "Flower listing was not found."
    );
    error.statusCode = 404;
    throw error;
  }

  return flower;
};

export const updateFlower = async (
  flowerId,
  userId,
  updateData
) => {
  const flower = await Flower.findOne({
    _id: flowerId,
    seller: userId,
  });

  if (!flower) {
    const error = new Error(
      "Flower listing was not found or does not belong to this seller."
    );
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "name",
    "description",
    "price",
    "category",
    "occasion",
    "flowerTypes",
    "colors",
    "isAvailable",
  ];

  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      flower[field] = updateData[field];
    }
  });

  await flower.save();

  return flower;
};

export const deactivateFlower = async (
  flowerId,
  userId
) => {
  const flower = await Flower.findOne({
    _id: flowerId,
    seller: userId,
  });

  if (!flower) {
    const error = new Error(
      "Flower listing was not found or does not belong to this seller."
    );
    error.statusCode = 404;
    throw error;
  }

  flower.isActive = false;
  flower.isAvailable = false;

  await flower.save();

  return flower;
};

/*
 * PUBLIC FLOWER SEARCH AND DISCOVERY
 */
export const getPublicFlowers = async (
  filters = {}
) => {
  const query = {
    isActive: true,
    isAvailable: true,
  };

  /*
   * KEYWORD SEARCH
   *
   * Searches:
   * - name
   * - description
   * - category
   * - occasion
   * - flowerTypes
   * - colors
   */
  if (filters.search) {
    const searchRegex = new RegExp(
      filters.search,
      "i"
    );

    query.$or = [
      {
        name: searchRegex,
      },
      {
        description: searchRegex,
      },
      {
        category: searchRegex,
      },
      {
        occasion: searchRegex,
      },
      {
        flowerTypes: searchRegex,
      },
      {
        colors: searchRegex,
      },
    ];
  }

  /*
   * CATEGORY FILTER
   */
  if (filters.category) {
    query.category = {
      $regex: `^${filters.category}$`,
      $options: "i",
    };
  }

  /*
   * OCCASION FILTER
   */
  if (filters.occasion) {
    query.occasion = {
      $regex: `^${filters.occasion}$`,
      $options: "i",
    };
  }

  /*
   * FLOWER TYPE FILTER
   */
  if (filters.flowerType) {
    query.flowerTypes = {
      $regex: `^${filters.flowerType}$`,
      $options: "i",
    };
  }

  /*
   * COLOR FILTER
   */
  if (filters.color) {
    query.colors = {
      $regex: `^${filters.color}$`,
      $options: "i",
    };
  }

  /*
   * PRICE FILTER
   */
  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    query.price = {};

    if (filters.minPrice !== undefined) {
      query.price.$gte = Number(
        filters.minPrice
      );
    }

    if (filters.maxPrice !== undefined) {
      query.price.$lte = Number(
        filters.maxPrice
      );
    }
  }

  return Flower.find(query)
    .populate(
      "florist",
      "shopName address"
    )
    .sort({
      createdAt: -1,
    });
};