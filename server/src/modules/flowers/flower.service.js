import Flower from "./flower.model.js";
import Florist from "../florists/florist.model.js";
import User from "../auth/auth.model.js";

import {
  generateImageEmbedding,
  generateUploadedImageEmbedding,
} from "../../services/ai.service.js";

const normalizePath = (filePath) => {
  return filePath
    .replace(process.cwd(), "")
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");
};

const cosineSimilarity = (
  vectorA,
  vectorB
) => {
  if (
    !Array.isArray(vectorA) ||
    !Array.isArray(vectorB) ||
    vectorA.length === 0 ||
    vectorB.length === 0 ||
    vectorA.length !== vectorB.length
  ) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (
    let index = 0;
    index < vectorA.length;
    index += 1
  ) {
    dotProduct +=
      vectorA[index] *
      vectorB[index];

    magnitudeA +=
      vectorA[index] *
      vectorA[index];

    magnitudeB +=
      vectorB[index] *
      vectorB[index];
  }

  if (
    magnitudeA === 0 ||
    magnitudeB === 0
  ) {
    return 0;
  }

  return (
    dotProduct /
    (
      Math.sqrt(magnitudeA) *
      Math.sqrt(magnitudeB)
    )
  );
};

export const createFlower = async (
  userId,
  flowerData,
  files = []
) => {
  const user =
    await User.findById(userId);

  if (
    !user ||
    user.role !== "seller"
  ) {
    const error = new Error(
      "Only seller accounts can create flower listings."
    );

    error.statusCode = 403;

    throw error;
  }

  const florist =
    await Florist.findOne({
      owner: userId,
    });

  if (!florist) {
    const error = new Error(
      "Florist profile was not found."
    );

    error.statusCode = 404;

    throw error;
  }

  if (
    florist.verificationStatus !==
    "approved"
  ) {
    const error = new Error(
      "Only approved florists can create flower listings."
    );

    error.statusCode = 403;

    throw error;
  }

  const images = files.map(
    (file) =>
      normalizePath(file.path)
  );

  let imageEmbedding = [];
  let embeddingModel = null;

  if (images.length > 0) {
    const aiResult =
      await generateImageEmbedding(
        images[0]
      );

    imageEmbedding =
      aiResult.embedding;

    embeddingModel =
      aiResult.model;
  }

  const flower =
    await Flower.create({
      seller:
        userId,

      florist:
        florist._id,

      name:
        flowerData.name,

      description:
        flowerData.description,

      price:
        flowerData.price,

      category:
        flowerData.category,

      occasion:
        flowerData.occasion || [],

      flowerTypes:
        flowerData.flowerTypes || [],

      colors:
        flowerData.colors || [],

      images,

      imageEmbedding,

      embeddingModel,

      isAvailable:
        flowerData.isAvailable ??
        true,
    });

  return flower;
};

export const getSellerFlowers =
  async (userId) => {
    return Flower.find({
      seller: userId,
    }).sort({
      createdAt: -1,
    });
  };

export const getFlowerById = async (
  flowerId
) => {
  const flower =
    await Flower.findById(
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
  const flower =
    await Flower.findOne({
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

  allowedFields.forEach(
    (field) => {
      if (
        updateData[field] !==
        undefined
      ) {
        flower[field] =
          updateData[field];
      }
    }
  );

  await flower.save();

  return flower;
};

export const deactivateFlower =
  async (
    flowerId,
    userId
  ) => {
    const flower =
      await Flower.findOne({
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

export const getPublicFlowers =
  async (filters = {}) => {
    const query = {
      isActive: true,
      isAvailable: true,
    };

    if (filters.search) {
      const searchRegex =
        new RegExp(
          filters.search,
          "i"
        );

      query.$or = [
        {
          name:
            searchRegex,
        },
        {
          description:
            searchRegex,
        },
        {
          category:
            searchRegex,
        },
        {
          occasion:
            searchRegex,
        },
        {
          flowerTypes:
            searchRegex,
        },
        {
          colors:
            searchRegex,
        },
      ];
    }

    if (filters.category) {
      query.category = {
        $regex:
          `^${filters.category}$`,

        $options:
          "i",
      };
    }

    if (filters.occasion) {
      query.occasion = {
        $regex:
          `^${filters.occasion}$`,

        $options:
          "i",
      };
    }

    if (filters.flowerType) {
      query.flowerTypes = {
        $regex:
          `^${filters.flowerType}$`,

        $options:
          "i",
      };
    }

    if (filters.color) {
      query.colors = {
        $regex:
          `^${filters.color}$`,

        $options:
          "i",
      };
    }

    if (
      filters.minPrice !==
        undefined ||
      filters.maxPrice !==
        undefined
    ) {
      query.price = {};

      if (
        filters.minPrice !==
        undefined
      ) {
        query.price.$gte =
          Number(
            filters.minPrice
          );
      }

      if (
        filters.maxPrice !==
        undefined
      ) {
        query.price.$lte =
          Number(
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

export const getRecommendedFlowers =
  async (
    preferences = {},
    limit = 5
  ) => {
    const safeLimit = Math.min(
      Math.max(
        Number(limit) || 5,
        1
      ),
      20
    );

    const flowers =
      await Flower.find({
        isActive: true,
        isAvailable: true,
      })
        .populate(
          "florist",
          "shopName address"
        )
        .select(
          "-imageEmbedding -embeddingModel"
        )
        .lean();

    const normalizedOccasion =
      preferences.occasion
        ? String(
            preferences.occasion
          )
            .trim()
            .toLowerCase()
        : null;

    const normalizedFlowerTypes =
      Array.isArray(
        preferences.flowerTypes
      )
        ? preferences.flowerTypes
            .map(
              (flowerType) =>
                String(
                  flowerType
                )
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        : [];

    const normalizedColors =
      Array.isArray(
        preferences.colors
      )
        ? preferences.colors
            .map(
              (color) =>
                String(color)
                  .trim()
                  .toLowerCase()
            )
            .filter(Boolean)
        : [];

    /*
     * IMPORTANT:
     * Guard against both undefined
     * and null.
     *
     * Number(null) becomes 0, which
     * previously caused every bouquet
     * to match "minimum_budget".
     */
    const maxBudget =
      preferences.maxBudget !==
        undefined &&
      preferences.maxBudget !==
        null
        ? Number(
            preferences.maxBudget
          )
        : null;

    const minBudget =
      preferences.minBudget !==
        undefined &&
      preferences.minBudget !==
        null
        ? Number(
            preferences.minBudget
          )
        : null;

    const rankedFlowers =
      flowers.map((flower) => {
        let score = 0;

        const matchedCriteria = [];

        /*
         * MAXIMUM BUDGET
         */
        if (
          maxBudget !== null &&
          !Number.isNaN(maxBudget)
        ) {
          if (
            flower.price <=
            maxBudget
          ) {
            score += 25;

            matchedCriteria.push(
              "within_budget"
            );

            if (
              flower.price >=
              maxBudget * 0.7
            ) {
              score += 5;
            }
          }
        }

        /*
         * MINIMUM BUDGET
         */
        if (
          minBudget !== null &&
          !Number.isNaN(minBudget)
        ) {
          if (
            flower.price >=
            minBudget
          ) {
            score += 5;

            matchedCriteria.push(
              "minimum_budget"
            );
          }
        }

        /*
         * OCCASION
         */
        if (normalizedOccasion) {
          const flowerOccasions =
            (
              flower.occasion || []
            ).map(
              (occasion) =>
                String(occasion)
                  .trim()
                  .toLowerCase()
            );

          if (
            flowerOccasions.includes(
              normalizedOccasion
            )
          ) {
            score += 25;

            matchedCriteria.push(
              "occasion"
            );
          }
        }

        /*
         * FLOWER TYPE
         */
        if (
          normalizedFlowerTypes.length >
          0
        ) {
          const listingFlowerTypes =
            (
              flower.flowerTypes ||
              []
            ).map(
              (flowerType) =>
                String(
                  flowerType
                )
                  .trim()
                  .toLowerCase()
            );

          const flowerTypeMatches =
            normalizedFlowerTypes.filter(
              (flowerType) =>
                listingFlowerTypes.includes(
                  flowerType
                )
            );

          if (
            flowerTypeMatches.length >
            0
          ) {
            const flowerTypeScore =
              Math.min(
                25,
                flowerTypeMatches.length *
                  15
              );

            score +=
              flowerTypeScore;

            matchedCriteria.push(
              "flower_type"
            );
          }
        }

        /*
         * COLOR
         */
        if (
          normalizedColors.length >
          0
        ) {
          const listingColors =
            (
              flower.colors || []
            ).map(
              (color) =>
                String(color)
                  .trim()
                  .toLowerCase()
            );

          const colorMatches =
            normalizedColors.filter(
              (color) =>
                listingColors.includes(
                  color
                )
            );

          if (
            colorMatches.length > 0
          ) {
            const colorScore =
              Math.min(
                20,
                colorMatches.length *
                  10
              );

            score +=
              colorScore;

            matchedCriteria.push(
              "color"
            );
          }
        }

        return {
          ...flower,

          recommendationScore:
            score,

          matchedCriteria,
        };
      });

    return rankedFlowers
      .filter(
        (flower) =>
          flower.recommendationScore >
          0
      )
      .sort(
        (a, b) => {
          if (
            b.recommendationScore !==
            a.recommendationScore
          ) {
            return (
              b.recommendationScore -
              a.recommendationScore
            );
          }

          return (
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
          );
        }
      )
      .slice(
        0,
        safeLimit
      );
  };

export const searchFlowersByImage =
  async (
    uploadedImage,
    limit = 10
  ) => {
    if (!uploadedImage) {
      const error = new Error(
        "Search image is required."
      );

      error.statusCode = 400;

      throw error;
    }

    const aiResult =
      await generateUploadedImageEmbedding(
        uploadedImage
      );

    const queryEmbedding =
      aiResult.embedding;

    const minimumSimilarity =
      0.60;

    const flowers =
      await Flower.find({
        isActive: true,
        isAvailable: true,

        imageEmbedding: {
          $exists: true,
          $ne: [],
        },
      })
        .populate(
          "florist",
          "shopName address"
        )
        .lean();

    const rankedFlowers =
      flowers
        .map((flower) => {
          const similarity =
            cosineSimilarity(
              queryEmbedding,
              flower.imageEmbedding
            );

          const {
            imageEmbedding,
            embeddingModel,
            ...publicFlower
          } = flower;

          return {
            ...publicFlower,

            similarity:
              Number(
                similarity.toFixed(
                  4
                )
              ),

            similarityPercentage:
              Number(
                (
                  similarity * 100
                ).toFixed(2)
              ),
          };
        })
        .filter(
          (flower) =>
            flower.similarity >=
            minimumSimilarity
        )
        .sort(
          (a, b) =>
            b.similarity -
            a.similarity
        )
        .slice(
          0,
          Number(limit) || 10
        );

    return {
      model:
        aiResult.model,

      results:
        rankedFlowers,
    };
  };