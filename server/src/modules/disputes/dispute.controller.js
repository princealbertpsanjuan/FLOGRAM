import {
  addDisputeMessage,
  fileDispute,
  getAdminDisputes,
  getDisputeForUser,
  getMyDisputes,
  updateDisputeStatus,
} from "./dispute.service.js";

const wrap = (handler, message, statusCode = 200) => async (req, res, next) => {
  try {
    res.status(statusCode).json({ success: true, message, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

export const create = wrap(
  async (req) => ({
    dispute: await fileDispute(
      req.user,
      req.body,
      (req.files || []).map((file) => `/uploads/disputes/${file.filename}`)
    ),
  }),
  "Your report was sent to FLOGRAM Admin.",
  201
);

export const mine = wrap(
  async (req) => ({ disputes: await getMyDisputes(req.user.userId) }),
  "Reports retrieved successfully."
);

export const getOne = wrap(
  async (req) => ({ dispute: await getDisputeForUser(req.user, req.params.disputeId) }),
  "Report retrieved successfully."
);

export const message = wrap(
  async (req) => ({ dispute: await addDisputeMessage(req.user, req.params.disputeId, req.body.message) }),
  "Message sent."
);

export const adminList = wrap(
  (req) => getAdminDisputes({ status: req.query.status || null }),
  "Disputes retrieved successfully."
);

export const adminUpdate = wrap(
  async (req) => ({ dispute: await updateDisputeStatus(req.user.userId, req.params.disputeId, req.body) }),
  "Dispute updated."
);
