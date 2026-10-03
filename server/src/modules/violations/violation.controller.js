import { getMyViolations, getViolations, liftViolation, recordViolation } from "./violation.service.js";

const wrap = (handler, message, statusCode = 200) => async (req, res, next) => {
  try {
    res.status(statusCode).json({ success: true, message, data: await handler(req) });
  } catch (error) {
    next(error);
  }
};

export const create = wrap(
  async (req) => ({ violation: await recordViolation(req.user.userId, req.body) }),
  "Violation recorded and penalty applied.",
  201
);

export const list = wrap(
  async (req) => ({ violations: await getViolations({ userId: req.query.userId, status: req.query.status }) }),
  "Violations retrieved successfully."
);

export const lift = wrap(
  async (req) => ({ violation: await liftViolation(req.user.userId, req.params.violationId, req.body?.reason) }),
  "Penalty lifted."
);

export const mine = wrap(
  async (req) => ({ violations: await getMyViolations(req.user.userId) }),
  "Your policy record was retrieved."
);
