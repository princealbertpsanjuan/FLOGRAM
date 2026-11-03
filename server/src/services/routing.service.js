const OPENROUTESERVICE_API_URL =
  process.env.OPENROUTESERVICE_API_URL ||
  "https://api.openrouteservice.org";

const getOpenRouteServiceApiKey = () => {
  const apiKey =
    process.env.OPENROUTESERVICE_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "OPENROUTESERVICE_API_KEY is not configured."
    );

    error.statusCode = 500;

    throw error;
  }

  return apiKey.trim();
};

const validateCoordinate = (
  latitude,
  longitude,
  label
) => {
  const lat =
    Number(latitude);

  const lng =
    Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    const error = new Error(
      `${label} coordinates are invalid.`
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    lat < -90 ||
    lat > 90
  ) {
    const error = new Error(
      `${label} latitude must be between -90 and 90.`
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    lng < -180 ||
    lng > 180
  ) {
    const error = new Error(
      `${label} longitude must be between -180 and 180.`
    );

    error.statusCode = 400;

    throw error;
  }

  return {
    latitude: lat,
    longitude: lng,
  };
};

/*
 * =========================================================
 * DELIVERY FEE
 * =========================================================
 *
 * Proposed FLOGRAM pricing:
 *
 * First 3 km:
 * ₱50 base fee
 *
 * Beyond 3 km:
 * + ₱12 per kilometer
 *
 * Maximum service distance:
 * 25 km
 *
 * These values can be changed later
 * through environment variables.
 * =========================================================
 */
export const calculateDeliveryFee = (
  distanceMeters
) => {
  const distance =
    Number(distanceMeters);

  if (
    !Number.isFinite(distance) ||
    distance < 0
  ) {
    const error = new Error(
      "Delivery distance is invalid."
    );

    error.statusCode = 400;

    throw error;
  }

  const baseFee =
    Number(
      process.env
        .DELIVERY_BASE_FEE ||
        50
    );

  const includedKilometers =
    Number(
      process.env
        .DELIVERY_INCLUDED_KM ||
        3
    );

  const perKilometerRate =
    Number(
      process.env
        .DELIVERY_PER_KM_RATE ||
        12
    );

  const maximumDistanceKm =
    Number(
      process.env
        .DELIVERY_MAX_DISTANCE_KM ||
        25
    );

  const distanceKilometers =
    distance / 1000;

  if (
    distanceKilometers >
    maximumDistanceKm
  ) {
    const error = new Error(
      `Delivery location is outside the ${maximumDistanceKm} km service area.`
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    distanceKilometers <=
    includedKilometers
  ) {
    return Math.round(
      baseFee
    );
  }

  const extraDistance =
    distanceKilometers -
    includedKilometers;

  /*
   * Charge per started kilometer
   * beyond the included distance.
   *
   * Example:
   * 3.2 km => 1 additional km
   * 4.1 km => 2 additional km
   */
  const billableExtraKilometers =
    Math.ceil(
      extraDistance
    );

  const fee =
    baseFee +
    billableExtraKilometers *
      perKilometerRate;

  return Math.round(
    fee
  );
};

/*
 * =========================================================
 * CALCULATE DRIVING ROUTE
 * =========================================================
 *
 * OpenRouteService expects coordinates:
 *
 * [
 *   [longitude, latitude],
 *   [longitude, latitude]
 * ]
 *
 * NOT:
 *
 * [
 *   [latitude, longitude]
 * ]
 * =========================================================
 */
/*
 * =========================================================
 * ROUTE CACHE + SAFE FALLBACK
 * =========================================================
 *
 * Every checkout quote, every created order and every rider
 * GPS update used to call OpenRouteService. Its free plan
 * allows 40 requests/minute and 2,000/day, so a rider
 * screen left open (one call every ~5 s) plus repeated
 * checkout tests could use up the key and make checkout
 * fail with "Unable to calculate delivery route" / quota
 * errors, even though it worked earlier the same day.
 *
 * Now:
 * 1. Same pickup + destination (rounded to ~11 m) reuses
 *    the result for ROUTE_CACHE_MINUTES (default 10).
 * 2. Each call times out after ROUTING_TIMEOUT_MS (10 s).
 * 3. If OpenRouteService is down, slow, out of quota or
 *    cannot snap the pin to a road, the distance is
 *    estimated (straight line × 1.35, 25 km/h) so checkout
 *    still works. The result says estimated: true.
 *    Set ROUTING_FALLBACK=off to disable the estimate.
 * =========================================================
 */

const ROUTE_CACHE_TTL_MS =
  Math.max(Number(process.env.ROUTE_CACHE_MINUTES) || 10, 0) * 60 * 1000;
const ROUTE_CACHE_MAX_ENTRIES = 500;
const ROUTING_TIMEOUT_MS = Math.max(Number(process.env.ROUTING_TIMEOUT_MS) || 10000, 1000);
const ROAD_DISTANCE_FACTOR = 1.35;
const ESTIMATED_SPEED_KMH = 25;

const routeCache = new Map();

const cacheKey = (pickup, delivery) =>
  [pickup.latitude, pickup.longitude, delivery.latitude, delivery.longitude]
    .map((value) => value.toFixed(4))
    .join(",");

const readCache = (key) => {
  const entry = routeCache.get(key);

  if (!entry) return null;

  if (Date.now() - entry.at > ROUTE_CACHE_TTL_MS) {
    routeCache.delete(key);
    return null;
  }

  return entry.route;
};

const writeCache = (key, route) => {
  if (!ROUTE_CACHE_TTL_MS) return;

  if (routeCache.size >= ROUTE_CACHE_MAX_ENTRIES) {
    // Map keeps insertion order: drop the oldest entry
    routeCache.delete(routeCache.keys().next().value);
  }

  routeCache.set(key, { at: Date.now(), route });
};

export const clearRouteCache = () => routeCache.clear();

/*
 * Great-circle distance in meters.
 */
export const haversineMeters = (a, b) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const buildRoute = ({ distanceMeters, durationSeconds, geometry, estimated }) => ({
  distanceMeters,
  distanceKilometers: Number((distanceMeters / 1000).toFixed(2)),
  durationSeconds,
  durationMinutes: Math.ceil(durationSeconds / 60),
  // Enforces the 25 km service area too
  deliveryFee: calculateDeliveryFee(distanceMeters),
  geometry: geometry || null,
  estimated,
  source: estimated ? "estimate" : "openrouteservice",
});

export const estimateRoute = (pickup, delivery) => {
  const distanceMeters = Math.round(haversineMeters(pickup, delivery) * ROAD_DISTANCE_FACTOR);
  const durationSeconds = Math.round((distanceMeters / 1000 / ESTIMATED_SPEED_KMH) * 3600);

  return buildRoute({ distanceMeters, durationSeconds, geometry: null, estimated: true });
};

const fallbackAllowed = () => String(process.env.ROUTING_FALLBACK || "on").toLowerCase() !== "off";

const routingError = (message, statusCode = 502, details = null) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.routingResponse = details;
  return error;
};

/*
 * One OpenRouteService request (throws on any failure).
 */
const requestOpenRouteService = async (pickup, delivery) => {
  const apiKey = getOpenRouteServiceApiKey();

  let response;

  try {
    response = await fetch(`${OPENROUTESERVICE_API_URL}/v2/directions/driving-car/geojson`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        Accept: "application/geo+json, application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [pickup.longitude, pickup.latitude],
          [delivery.longitude, delivery.latitude],
        ],
        instructions: false,
      }),
      signal: AbortSignal.timeout(ROUTING_TIMEOUT_MS),
    });
  } catch (error) {
    throw routingError(
      error?.name === "TimeoutError"
        ? "The routing service took too long to respond."
        : "The routing service could not be reached."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw routingError("Unable to read the routing service response.");
  }

  if (!response.ok) {
    // Log the status and message only (the body can be large)
    console.error(
      "OpenRouteService error:",
      response.status,
      result?.error?.message || result?.message || result?.error || ""
    );

    throw routingError(
      result?.error?.message ||
        (typeof result?.error === "string" ? result.error : "") ||
        result?.message ||
        "Unable to calculate delivery route.",
      502,
      result
    );
  }

  const feature = result?.features?.[0];
  const summary = feature?.properties?.summary;
  const distanceMeters = Number(summary?.distance);
  const durationSeconds = Number(summary?.duration);

  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
    console.error("Unexpected routing response: missing route summary");
    throw routingError("Routing service returned an invalid route.");
  }

  return { distanceMeters, durationSeconds, geometry: feature?.geometry || null };
};

export const calculateDeliveryRoute =
  async ({
    pickupLatitude,
    pickupLongitude,
    deliveryLatitude,
    deliveryLongitude,
  }) => {
    const pickup =
      validateCoordinate(
        pickupLatitude,
        pickupLongitude,
        "Pickup"
      );

    const delivery =
      validateCoordinate(
        deliveryLatitude,
        deliveryLongitude,
        "Delivery"
      );

    const key = cacheKey(pickup, delivery);
    const cached = readCache(key);

    if (cached) {
      return cached;
    }

    let route;

    try {
      const result = await requestOpenRouteService(pickup, delivery);
      route = buildRoute({ ...result, estimated: false });
    } catch (error) {
      if (!fallbackAllowed() || error?.statusCode === 400) {
        throw error;
      }

      console.warn(`Routing fallback used (${error.message}).`);

      // Throws the normal 400 when outside the 25 km area
      route = estimateRoute(pickup, delivery);

      // Keep estimates briefly so OpenRouteService is retried soon
      routeCache.set(key, { at: Date.now() - Math.max(ROUTE_CACHE_TTL_MS - 60000, 0), route });
      return route;
    }

    writeCache(key, route);
    return route;
  };
