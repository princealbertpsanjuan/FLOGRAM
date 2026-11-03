import mongoose from "mongoose";
import Flower from "./flower.model.js";
import Florist from "../florists/florist.model.js";
import User from "../auth/auth.model.js";

import {
  generateImageEmbedding,
  generateUploadedImageEmbedding,
} from "../../services/ai.service.js";
import { notifyFollowersOfNewProduct } from "../follows/follow.service.js";
import { recordPriceChange } from "../pricing/price-history.service.js";

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

  /*
   * The image-search embedding is a bonus: if the AI
   * service is asleep or down, still save the listing
   * (it just won't appear in image search until its
   * photo is updated).
   */
  if (images.length > 0) {
    try {
      const aiResult =
        await generateImageEmbedding(
          images[0]
        );

      imageEmbedding =
        aiResult.embedding;

      embeddingModel =
        aiResult.model;
    } catch (error) {
      console.warn(
        "Image embedding skipped for new listing:",
        error.message
      );
    }
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

  // First entry of the price history
  await recordPriceChange({ itemType: "flower", item: flower, changedBy: userId });

  /*
   * Let customers who follow this shop know.
   * Runs in the background; never blocks the seller.
   */
  if (flower.isAvailable) {
    void notifyFollowersOfNewProduct(
      flower
    );
  }

  return flower;
};

export const getSellerFlowers =
  async (userId) => {
    // The 512-number image embedding is only used by image search
    return Flower.find({
      seller: userId,
    })
      .select("-imageEmbedding -embeddingModel")
      .sort({
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
      // Public endpoint: no seller email, no image embedding
      .select("-imageEmbedding -embeddingModel")
      .populate(
        "seller",
        "firstName lastName"
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

  const previousPrice =
    flower.price;

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

  // Logs only when the price actually changed
  await recordPriceChange({
    itemType: "flower",
    item: flower,
    oldPrice: previousPrice,
    changedBy: userId,
  });

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
    flower.hiddenByAdmin = false;

    await flower.save();

    return flower;
  };

/*
 * =========================================================
 * SEARCH HELPERS
 * =========================================================
 */

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/*
 * Case-insensitive match at the start of a word, with the
 * trailing plural removed: "Roses" -> /\brose/i, which
 * matches "Rose", "Roses" and "Red Roses".
 */
const buildLooseWordRegex = (value) => {
  let stem = String(value).trim().toLowerCase();

  if (stem.length > 4 && stem.endsWith("ies")) {
    stem = `${stem.slice(0, -3)}y`;
  } else if (stem.length > 3 && stem.endsWith("s") && !stem.endsWith("ss")) {
    stem = stem.slice(0, -1);
  }

  /*
   * "lily" should also match "Lilies".
   */
  const pattern =
    stem.length > 3 && stem.endsWith("y")
      ? `${escapeRegex(stem.slice(0, -1))}(?:y|ies)`
      : escapeRegex(stem);

  return new RegExp(`\\b${pattern}`, "i");
};

/*
 * Shops that may sell right now (approved + active). Cached
 * for 60 s so catalog requests do not query it every time.
 * Bouquets from rejected, deactivated or re-verifying shops
 * are hidden from the catalog, recommendations and image
 * search (checkout also refuses them).
 */
let sellableShopCache = { at: 0, ids: [] };

const getSellableFloristIds = async () => {
  if (Date.now() - sellableShopCache.at < 60 * 1000) {
    return sellableShopCache.ids;
  }

  const ids = await Florist.find({
    verificationStatus: "approved",
    isActive: { $ne: false },
  }).distinct("_id");

  sellableShopCache = { at: Date.now(), ids };
  return ids;
};

export const getPublicFlowers =
  async (filters = {}) => {
    const sellableShops =
      await getSellableFloristIds();

    const query = {
      isActive: true,
      isAvailable: true,
      florist: { $in: sellableShops },
    };

    /*
     * One shop's bouquets (Following list, shop page).
     */
    if (
      filters.florist &&
      mongoose.Types.ObjectId.isValid(
        String(filters.florist)
      )
    ) {
      query.florist = sellableShops.some(
        (id) => String(id) === String(filters.florist)
      )
        ? filters.florist
        : { $in: [] };
    }

    /*
     * =====================================================
     * KEYWORD SEARCH
     * =====================================================
     *
     * - User input is escaped (no regex injection).
     * - Every word must match at least one field, so
     *   "red rose" finds red rose bouquets.
     * - Simple singular/plural tolerance: "roses",
     *   "rose" and "Rose" all match.
     */

    if (filters.search) {
      const words =
        String(filters.search)
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 6);

      const wordConditions =
        words.map((word) => {
          const wordRegex =
            buildLooseWordRegex(word);

          return {
            $or: [
              { name: wordRegex },
              { description: wordRegex },
              { category: wordRegex },
              { occasion: wordRegex },
              { flowerTypes: wordRegex },
              { colors: wordRegex },
            ],
          };
        });

      if (wordConditions.length) {
        query.$and = wordConditions;
      }
    }

    /*
     * Filters are matched loosely too, because Sellers
     * type values freely (e.g. "Roses" vs "Rose",
     * "Birthday Gift" vs "Birthday").
     */

    if (filters.category) {
      query.category =
        buildLooseWordRegex(filters.category);
    }

    if (filters.occasion) {
      query.occasion =
        buildLooseWordRegex(filters.occasion);
    }

    if (filters.flowerType) {
      query.flowerTypes =
        buildLooseWordRegex(filters.flowerType);
    }

    if (filters.color) {
      query.colors =
        buildLooseWordRegex(filters.color);
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
  .select(
    "-imageEmbedding -embeddingModel"
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
        florist: { $in: await getSellableFloristIds() },
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
        florist: { $in: await getSellableFloristIds() },

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