import GiftAddOn, { ADD_ON_CATEGORIES } from "./addon.model.js";
import Florist from "../florists/florist.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const MAX_ADD_ON_QUANTITY = 10;

const getSellerFlorist = async (sellerUserId) => {
  const florist = await Florist.findOne({ owner: sellerUserId });

  if (!florist) {
    throw createError("Florist profile was not found.", 404);
  }

  return florist;
};

const cleanAddOnInput = (data, { partial = false } = {}) => {
  const output = {};

  if (!partial || data.name !== undefined) {
    const name = String(data.name || "").trim();
    if (!name) throw createError("Add-on name is required.");
    output.name = name.slice(0, 80);
  }

  if (data.description !== undefined) {
    output.description = String(data.description || "").trim().slice(0, 300);
  }

  if (!partial || data.price !== undefined) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price < 0) {
      throw createError("Add-on price must be zero or more.");
    }
    output.price = Math.round(price * 100) / 100;
  }

  if (data.category !== undefined) {
    output.category = ADD_ON_CATEGORIES.includes(data.category) ? data.category : "other";
  }

  if (data.isAvailable !== undefined) {
    output.isAvailable = data.isAvailable === true || data.isAvailable === "true";
  }

  return output;
};

/*
 * SELLER
 */

export const getMyAddOns = async (sellerUserId) => {
  const florist = await getSellerFlorist(sellerUserId);

  return GiftAddOn.find({ florist: florist._id, isActive: true }).sort({ category: 1, name: 1 });
};

export const createAddOn = async (sellerUserId, data) => {
  const florist = await getSellerFlorist(sellerUserId);

  return GiftAddOn.create({
    ...cleanAddOnInput(data),
    florist: florist._id,
    seller: sellerUserId,
  });
};

export const updateAddOn = async (sellerUserId, addOnId, data) => {
  const florist = await getSellerFlorist(sellerUserId);

  const addOn = await GiftAddOn.findOneAndUpdate(
    { _id: addOnId, florist: florist._id, isActive: true },
    { $set: cleanAddOnInput(data, { partial: true }) },
    { returnDocument: "after", runValidators: true }
  );

  if (!addOn) {
    throw createError("Add-on was not found.", 404);
  }

  return addOn;
};

export const deleteAddOn = async (sellerUserId, addOnId) => {
  const florist = await getSellerFlorist(sellerUserId);

  // Soft delete so past orders keep their snapshot.
  const addOn = await GiftAddOn.findOneAndUpdate(
    { _id: addOnId, florist: florist._id },
    { $set: { isActive: false, isAvailable: false } },
    { returnDocument: "after" }
  );

  if (!addOn) {
    throw createError("Add-on was not found.", 404);
  }

  return addOn;
};

/*
 * PUBLIC
 */

export const getFloristAddOns = async (floristId) =>
  GiftAddOn.find({ florist: floristId, isActive: true, isAvailable: true }).sort({
    category: 1,
    price: 1,
  });

/*
 * =========================================================
 * RESOLVE SELECTED ADD-ONS (authoritative pricing)
 * =========================================================
 *
 * selections: [{ addOnId | addOn, quantity }]
 * Every add-on must belong to the bouquet's florist and be
 * available. Prices come from the database, never from the
 * app. Returns order/cart snapshots and their total.
 * =========================================================
 */
export const resolveAddOnSelections = async (floristId, selections = []) => {
  const list = Array.isArray(selections) ? selections : [];

  if (list.length === 0) {
    return { addOns: [], addOnsTotal: 0 };
  }

  const quantities = new Map();

  list.forEach((selection) => {
    const id = String(selection?.addOnId || selection?.addOn?._id || selection?.addOn || "");
    if (!id) return;

    const quantity = Math.min(
      MAX_ADD_ON_QUANTITY,
      Math.max(1, Math.floor(Number(selection?.quantity) || 1))
    );

    quantities.set(id, quantity);
  });

  const addOnDocs = await GiftAddOn.find({
    _id: { $in: [...quantities.keys()] },
    florist: floristId,
    isActive: true,
    isAvailable: true,
  }).lean();

  if (addOnDocs.length !== quantities.size) {
    throw createError(
      "One or more selected gift add-ons are unavailable for this shop.",
      409
    );
  }

  const addOns = addOnDocs.map((doc) => ({
    addOn: doc._id,
    name: doc.name,
    category: doc.category,
    price: Number(doc.price),
    quantity: quantities.get(String(doc._id)),
  }));

  const addOnsTotal = addOns.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return { addOns, addOnsTotal: Math.round(addOnsTotal * 100) / 100 };
};
