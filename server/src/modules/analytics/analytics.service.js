import Checkout from "../checkout/checkout.model.js";
import Order from "../orders/order.model.js";
import Flower from "../flowers/flower.model.js";
import Florist from "../florists/florist.model.js";
import Review from "../reviews/review.model.js";

import { associationRules, fpGrowth } from "./fpgrowth.js";
import { summarizeSentiment } from "./sentiment.service.js";

/*
 * =========================================================
 * ANALYTICS
 * =========================================================
 *
 * 1. Customer behaviour analytics (FP-Growth)
 *    One transaction = everything bought together in one
 *    checkout (bouquets + gift add-ons). Orders placed
 *    outside a cart checkout are their own transaction.
 *    Only successful orders (delivered / completed) count.
 *
 * 2. Review sentiment (AFINN-165)
 *    Every review comment is scored; results are grouped
 *    into positive / neutral / negative with the most
 *    frequent positive and negative words.
 * =========================================================
 */

const SUCCESS_STATUSES = ["delivered", "completed"];

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const getFloristForSeller = async (sellerUserId) => {
  const florist = await Florist.findOne({ owner: sellerUserId }).select("_id shopName").lean();

  if (!florist) {
    throw createError("Florist profile was not found.", 404);
  }

  return florist;
};

const flowerKey = (id) => `flower:${id}`;
const addOnKey = (name) => `addon:${String(name).trim().toLowerCase()}`;

const orderItems = (order) => {
  const items = [];

  if (order.flower) {
    items.push(flowerKey(order.flower));
  }

  (order.addOns || []).forEach((addOn) => {
    if (addOn?.name) {
      items.push(addOnKey(addOn.name));
    }
  });

  return items;
};

/*
 * Build the list of transactions (item arrays).
 */
export const buildTransactions = async ({ floristId = null } = {}) => {
  const orderFilter = { orderStatus: { $in: SUCCESS_STATUSES } };

  if (floristId) {
    orderFilter.florist = floristId;
  }

  const orders = await Order.find(orderFilter).select("_id flower addOns").lean();
  const orderById = new Map(orders.map((order) => [String(order._id), order]));

  const checkouts = await Checkout.find({ orders: { $in: orders.map((order) => order._id) } })
    .select("orders")
    .lean();

  const usedOrders = new Set();
  const transactions = [];

  checkouts.forEach((checkout) => {
    const items = [];

    (checkout.orders || []).forEach((orderId) => {
      const order = orderById.get(String(orderId));

      if (order) {
        usedOrders.add(String(order._id));
        items.push(...orderItems(order));
      }
    });

    if (items.length) {
      transactions.push(items);
    }
  });

  orders.forEach((order) => {
    if (!usedOrders.has(String(order._id))) {
      const items = orderItems(order);

      if (items.length) {
        transactions.push(items);
      }
    }
  });

  return transactions;
};

const describeItems = async (keys) => {
  const flowerIds = keys.filter((key) => key.startsWith("flower:")).map((key) => key.slice(7));

  const flowers = flowerIds.length
    ? await Flower.find({ _id: { $in: flowerIds } })
        .select("_id name images price isAvailable isActive")
        .populate("florist", "shopName")
        .lean()
    : [];

  const flowerById = new Map(flowers.map((flower) => [String(flower._id), flower]));

  return (key) => {
    if (key.startsWith("flower:")) {
      const flower = flowerById.get(key.slice(7));

      return {
        key,
        type: "bouquet",
        id: key.slice(7),
        name: flower?.name || "Removed bouquet",
        shopName: flower?.florist?.shopName || "",
        image: flower?.images?.[0] || null,
      };
    }

    const name = key.slice(6);

    return {
      key,
      type: "addon",
      id: null,
      name: name.replace(/\b\w/g, (letter) => letter.toUpperCase()),
      shopName: "",
      image: null,
    };
  };
};

export const getBuyingPatterns = async ({
  floristId = null,
  minSupport = 0.02,
  minConfidence = 0.3,
  limit = 20,
} = {}) => {
  const transactions = await buildTransactions({ floristId });
  const mined = fpGrowth(transactions, { minSupport: Number(minSupport) || 0.02 });
  const rules = associationRules(mined, { minConfidence: Number(minConfidence) || 0.3 });

  const keys = new Set();
  mined.itemsets.forEach((itemset) => itemset.items.forEach((item) => keys.add(item)));
  const describe = await describeItems([...keys]);

  return {
    algorithm: "FP-Growth",
    transactionCount: mined.transactionCount,
    multiItemTransactions: transactions.filter((items) => new Set(items).size > 1).length,
    minSupportCount: mined.minCount,
    minConfidence: Number(minConfidence) || 0.3,
    topItems: mined.itemsets
      .filter((itemset) => itemset.items.length === 1)
      .slice(0, limit)
      .map((itemset) => ({
        item: describe(itemset.items[0]),
        count: itemset.count,
        support: Number(itemset.support.toFixed(4)),
      })),
    frequentItemsets: mined.itemsets
      .filter((itemset) => itemset.items.length >= 2)
      .slice(0, limit)
      .map((itemset) => ({
        items: itemset.items.map(describe),
        count: itemset.count,
        support: Number(itemset.support.toFixed(4)),
      })),
    rules: rules.slice(0, limit).map((rule) => ({
      ...rule,
      antecedent: rule.antecedent.map(describe),
      consequent: rule.consequent.map(describe),
    })),
  };
};

/*
 * "Customers also bought" for one bouquet. Uses rules whose
 * antecedent is exactly this bouquet; falls back to plain
 * co-occurrence counts while data is still small.
 */
export const getAlsoBought = async (flowerId, { limit = 6 } = {}) => {
  const transactions = await buildTransactions();
  const target = flowerKey(flowerId);
  const containing = transactions.filter((items) => items.includes(target));

  const tally = new Map();
  containing.forEach((items) => {
    new Set(items).forEach((item) => {
      if (item !== target && item.startsWith("flower:")) {
        tally.set(item, (tally.get(item) || 0) + 1);
      }
    });
  });

  const mined = fpGrowth(transactions, { minCount: 2 });
  const rules = associationRules(mined, { minConfidence: 0.1 }).filter(
    (rule) =>
      rule.antecedent.length === 1 &&
      rule.antecedent[0] === target &&
      rule.consequent.length === 1 &&
      rule.consequent[0].startsWith("flower:")
  );

  const ranked = rules.length
    ? rules.map((rule) => ({ key: rule.consequent[0], score: rule.lift, count: rule.count }))
    : [...tally.entries()].map(([key, count]) => ({ key, score: count, count }));

  const keys = ranked.sort((a, b) => b.score - a.score).slice(0, limit * 2).map((entry) => entry.key);

  const flowers = await Flower.find({
    _id: { $in: keys.map((key) => key.slice(7)) },
    isActive: true,
    isAvailable: true,
  })
    .select("-imageEmbedding -embeddingModel")
    .populate("florist", "shopName address")
    .lean();

  const byId = new Map(flowers.map((flower) => [String(flower._id), flower]));

  return {
    basedOn: rules.length ? "fp-growth" : "co-occurrence",
    transactionsWithProduct: containing.length,
    flowers: keys
      .map((key) => byId.get(key.slice(7)))
      .filter(Boolean)
      .slice(0, limit),
  };
};

/*
 * Review sentiment summary (Admin: all shops; Seller: own).
 */
export const getReviewSentiment = async ({ floristId = null, limit = 10 } = {}) => {
  const filter = {};

  if (floristId) {
    filter.florist = floristId;
  }

  const reviews = await Review.find(filter)
    .select("comment overallRating florist customer createdAt")
    .populate("florist", "shopName")
    .populate("customer", "firstName lastName")
    .sort({ createdAt: -1 })
    .lean();

  const summary = summarizeSentiment(reviews, (review) => review.comment);

  const shaped = summary.results
    .filter(({ item }) => String(item.comment || "").trim())
    .map(({ item, sentiment }) => ({
      id: String(item._id),
      comment: item.comment,
      rating: item.overallRating,
      shopName: item.florist?.shopName || "",
      customerName: [item.customer?.firstName, item.customer?.lastName].filter(Boolean).join(" "),
      createdAt: item.createdAt,
      sentiment: {
        score: sentiment.score,
        comparative: sentiment.comparative,
        label: sentiment.label,
        positiveWords: sentiment.positiveWords,
        negativeWords: sentiment.negativeWords,
      },
    }));

  const byShop = new Map();

  if (!floristId) {
    shaped.forEach((review) => {
      const entry = byShop.get(review.shopName) || {
        shopName: review.shopName,
        positive: 0,
        neutral: 0,
        negative: 0,
        totalScore: 0,
        count: 0,
      };

      entry[review.sentiment.label] += 1;
      entry.totalScore += review.sentiment.score;
      entry.count += 1;
      byShop.set(review.shopName, entry);
    });
  }

  return {
    method: "Lexicon-based sentiment analysis (AFINN-165)",
    totalReviews: reviews.length,
    analyzedReviews: summary.analyzed,
    counts: summary.counts,
    averageScore: summary.averageScore,
    positiveShare: summary.positiveShare,
    negativeShare: summary.negativeShare,
    topPositiveWords: summary.topPositiveWords,
    topNegativeWords: summary.topNegativeWords,
    recentNegative: shaped.filter((review) => review.sentiment.label === "negative").slice(0, limit),
    recentPositive: shaped.filter((review) => review.sentiment.label === "positive").slice(0, limit),
    byShop: [...byShop.values()]
      .map((entry) => ({
        ...entry,
        averageScore: entry.count ? Number((entry.totalScore / entry.count).toFixed(2)) : 0,
      }))
      .sort((a, b) => a.averageScore - b.averageScore),
  };
};

/*
 * =========================================================
 * SEARCH SUGGESTIONS (Customer search box)
 * =========================================================
 *
 * Popular bouquets = most frequent single items found by
 * FP-Growth; "bought together" = its association rules.
 * Keywords come from the popular bouquets' flower types
 * and occasions. While there are no completed orders yet,
 * the newest available bouquets are suggested instead.
 */
export const getSearchSuggestions = async ({ limit = 8 } = {}) => {
  const transactions = await buildTransactions();
  const mined = fpGrowth(transactions, { minCount: 2 });
  const rules = transactions.length ? associationRules(mined, { minConfidence: 0.2 }) : [];

  /*
   * Single-item support (frequent 1-itemsets). Counted
   * directly so a bouquet bought once still ranks.
   */
  const singleCounts = new Map();
  transactions.forEach((items) => {
    new Set(items).forEach((item) => {
      if (item.startsWith("flower:")) {
        singleCounts.set(item, (singleCounts.get(item) || 0) + 1);
      }
    });
  });

  const popularIds = [...singleCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([item, count]) => ({ id: item.slice(7), count }));

  const countById = new Map(popularIds.map((entry) => [entry.id, entry.count]));

  let flowers = await Flower.find({
    _id: { $in: popularIds.map((entry) => entry.id) },
    isActive: true,
    isAvailable: true,
  })
    .select("_id name price images flowerTypes occasion category florist")
    .populate("florist", "shopName")
    .lean();

  flowers.sort((a, b) => (countById.get(String(b._id)) || 0) - (countById.get(String(a._id)) || 0));

  const basedOn = flowers.length ? "fp-growth" : "newest";

  if (flowers.length < limit) {
    const extra = await Flower.find({
      _id: { $nin: flowers.map((flower) => flower._id) },
      isActive: true,
      isAvailable: true,
    })
      .sort({ createdAt: -1 })
      .limit(limit - flowers.length)
      .select("_id name price images flowerTypes occasion category florist")
      .populate("florist", "shopName")
      .lean();

    flowers = [...flowers, ...extra];
  }

  flowers = flowers.slice(0, limit);

  const keywordCounts = new Map();
  flowers.forEach((flower) => {
    [...(flower.flowerTypes || []), flower.occasion, flower.category]
      .flat()
      .filter(Boolean)
      .forEach((word) => {
        const key = String(word).trim().toLowerCase();
        if (key) keywordCounts.set(key, (keywordCounts.get(key) || 0) + 1);
      });
  });

  const describe = await describeItems(
    [...new Set(rules.flatMap((rule) => [...rule.antecedent, ...rule.consequent]))]
  );

  return {
    basedOn,
    transactionCount: transactions.length,
    popular: flowers.map((flower) => ({
      _id: String(flower._id),
      name: flower.name,
      price: flower.price,
      image: flower.images?.[0] || null,
      shopName: flower.florist?.shopName || "",
      timesBought: countById.get(String(flower._id)) || 0,
    })),
    boughtTogether: rules
      .filter((rule, index, all) => {
        const key = [...rule.antecedent, ...rule.consequent].sort().join("|");
        return all.findIndex((other) => [...other.antecedent, ...other.consequent].sort().join("|") === key) === index;
      })
      .slice(0, 4)
      .map((rule) => ({
      items: [...rule.antecedent, ...rule.consequent].map(describe).map((item) => ({ id: item.id, name: item.name, type: item.type })),
      confidence: Number(rule.confidence.toFixed(2)),
    })),
    keywords: [...keywordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word),
  };
};
