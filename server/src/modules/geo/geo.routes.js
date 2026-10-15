import { Router } from "express";

import { reverseGeocode, searchAddresses } from "./geo.service.js";

/*
 * GET /api/v1/geo/autocomplete?text=TAB
 * GET /api/v1/geo/reverse?latitude=13.62&longitude=123.19
 */
const geoRouter = Router();

geoRouter.get("/autocomplete", async (req, res, next) => {
  try {
    const results = await searchAddresses(req.query.text);
    return res.status(200).json({ success: true, data: { results } });
  } catch (error) {
    return next(error);
  }
});

geoRouter.get("/reverse", async (req, res, next) => {
  try {
    const address = await reverseGeocode(req.query.latitude, req.query.longitude);
    return res.status(200).json({ success: true, data: { address } });
  } catch (error) {
    return next(error);
  }
});

export default geoRouter;
