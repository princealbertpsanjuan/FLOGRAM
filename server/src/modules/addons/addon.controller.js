import {
  createAddOn,
  deleteAddOn,
  getFloristAddOns,
  getMyAddOns,
  updateAddOn,
} from "./addon.service.js";

const wrap = (handler, message, status = 200) => async (req, res, next) => {
  try {
    const data = await handler(req);
    res.status(status).json({ success: true, message, data });
  } catch (error) {
    next(error);
  }
};

export const listMine = wrap(
  async (req) => ({ addOns: await getMyAddOns(req.user.userId) }),
  "Gift add-ons retrieved successfully."
);

export const create = wrap(
  async (req) => ({ addOn: await createAddOn(req.user.userId, req.body || {}) }),
  "Gift add-on created successfully.",
  201
);

export const update = wrap(
  async (req) => ({ addOn: await updateAddOn(req.user.userId, req.params.addOnId, req.body || {}) }),
  "Gift add-on updated successfully."
);

export const remove = wrap(
  async (req) => ({ addOn: await deleteAddOn(req.user.userId, req.params.addOnId) }),
  "Gift add-on removed successfully."
);

export const listForFlorist = wrap(
  async (req) => ({ addOns: await getFloristAddOns(req.params.floristId) }),
  "Gift add-ons retrieved successfully."
);
