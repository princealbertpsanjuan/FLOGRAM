import {
  cancelSellerPayout,
  createAdminSellerPayout,
  getAdminSellerBalances,
  getAdminSellerPayoutById,
  getAdminSellerPayouts,
  getSellerEarnings,
  getSellerPayoutForSeller,
  markSellerPayoutPaid,
} from "./seller-payout.service.js";

const wrap = (handler, message, statusCode = 200) => async (req, res, next) => {
  try {
    res.status(statusCode).json({ success: true, message, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

export const myEarnings = wrap((req) => getSellerEarnings(req.user.userId), "Seller earnings retrieved.");

export const myPayout = wrap(
  async (req) => ({ payout: await getSellerPayoutForSeller(req.user.userId, req.params.payoutId) }),
  "Payout retrieved."
);

export const balances = wrap(async () => ({ balances: await getAdminSellerBalances() }), "Seller balances retrieved.");

export const list = wrap(
  async (req) => ({ payouts: await getAdminSellerPayouts(req.query.status || null) }),
  "Seller payouts retrieved."
);

export const getOne = wrap(
  async (req) => ({ payout: await getAdminSellerPayoutById(req.params.payoutId) }),
  "Seller payout retrieved."
);

export const create = wrap(
  async (req) => ({ payout: await createAdminSellerPayout(req.params.floristId, req.user.userId, req.body) }),
  "Seller payout created.",
  201
);

export const markPaid = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Proof of payment image is required.");
      error.statusCode = 400;
      throw error;
    }

    const payout = await markSellerPayoutPaid(req.params.payoutId, req.user.userId, {
      ...req.body,
      proofImageUrl: `/uploads/sellers/payouts/${req.file.filename}`,
    });

    res.status(200).json({ success: true, message: "Seller payout marked as paid.", data: { payout } });
  } catch (error) {
    next(error);
  }
};

export const cancel = wrap(
  async (req) => ({ payout: await cancelSellerPayout(req.params.payoutId, req.user.userId, req.body?.reason) }),
  "Seller payout cancelled."
);
