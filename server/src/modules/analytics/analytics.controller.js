import {
  getAlsoBought,
  getBuyingPatterns,
  getFloristForSeller,
  getReviewSentiment,
  getSearchSuggestions,
} from "./analytics.service.js";

const send = (res, message, data) =>
  res.status(200).json({ success: true, message, data });

/*
 * ADMIN
 */

export const adminSentiment = async (req, res, next) => {
  try {
    send(res, "Review sentiment retrieved successfully.", await getReviewSentiment());
  } catch (error) {
    next(error);
  }
};

export const adminBuyingPatterns = async (req, res, next) => {
  try {
    send(
      res,
      "Buying patterns retrieved successfully.",
      await getBuyingPatterns({
        minSupport: req.query.minSupport,
        minConfidence: req.query.minConfidence,
      })
    );
  } catch (error) {
    next(error);
  }
};

/*
 * SELLER (own shop only)
 */

export const sellerSentiment = async (req, res, next) => {
  try {
    const florist = await getFloristForSeller(req.user.userId);

    send(
      res,
      "Shop review sentiment retrieved successfully.",
      await getReviewSentiment({ floristId: florist._id })
    );
  } catch (error) {
    next(error);
  }
};

export const sellerBuyingPatterns = async (req, res, next) => {
  try {
    const florist = await getFloristForSeller(req.user.userId);

    send(
      res,
      "Shop buying patterns retrieved successfully.",
      await getBuyingPatterns({
        floristId: florist._id,
        minSupport: req.query.minSupport,
        minConfidence: req.query.minConfidence,
      })
    );
  } catch (error) {
    next(error);
  }
};

/*
 * PUBLIC
 */

export const alsoBought = async (req, res, next) => {
  try {
    send(
      res,
      "Related bouquets retrieved successfully.",
      await getAlsoBought(req.params.flowerId)
    );
  } catch (error) {
    next(error);
  }
};


export const searchSuggestions = async (req, res, next) => {
  try {
    const data = await getSearchSuggestions();
    res.status(200).json({ success: true, message: "Search suggestions retrieved.", data });
  } catch (error) {
    next(error);
  }
};
