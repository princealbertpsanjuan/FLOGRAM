import { followShop, getFollowStatus, getFollowedShops, unfollowShop } from "./follow.service.js";

const wrap = (handler, message) => async (req, res, next) => {
  try {
    res.status(200).json({ success: true, message, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

export const status = wrap(
  (req) => getFollowStatus(req.user?.userId || null, req.params.floristId),
  "Follow status retrieved successfully."
);

export const follow = wrap(
  (req) => followShop(req.user.userId, req.params.floristId),
  "You are now following this shop."
);

export const unfollow = wrap(
  (req) => unfollowShop(req.user.userId, req.params.floristId),
  "You unfollowed this shop."
);

export const mine = wrap(
  async (req) => ({ shops: await getFollowedShops(req.user.userId) }),
  "Followed shops retrieved successfully."
);
