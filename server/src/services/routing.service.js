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

    const apiKey =
      getOpenRouteServiceApiKey();

    const response =
      await fetch(
        `${OPENROUTESERVICE_API_URL}/v2/directions/driving-car/geojson`,
        {
          method: "POST",

          headers: {
            Authorization:
              apiKey,

            Accept:
              "application/geo+json, application/json",

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              coordinates: [
                [
                  pickup.longitude,
                  pickup.latitude,
                ],

                [
                  delivery.longitude,
                  delivery.latitude,
                ],
              ],

              instructions:
                false,
            }),
        }
      );

    let result;

    try {
      result =
        await response.json();
    } catch {
      const error = new Error(
        "Unable to read the routing service response."
      );

      error.statusCode = 502;

      throw error;
    }

    if (!response.ok) {
      console.error(
        "OpenRouteService error:",
        result
      );

      const message =
        result?.error
          ?.message ||
        result?.message ||
        "Unable to calculate delivery route.";

      const error =
        new Error(message);

      error.statusCode = 502;

      error.routingResponse =
        result;

      throw error;
    }

    /*
     * GeoJSON Directions response:
     *
     * features[0].properties.summary
     *
     * {
     *   distance: meters,
     *   duration: seconds
     * }
     */
    const feature =
      result?.features?.[0];

    const summary =
      feature
        ?.properties
        ?.summary;

    const distanceMeters =
      Number(
        summary?.distance
      );

    const durationSeconds =
      Number(
        summary?.duration
      );

    if (
      !Number.isFinite(
        distanceMeters
      ) ||
      !Number.isFinite(
        durationSeconds
      )
    ) {
      console.error(
        "Unexpected routing response:",
        result
      );

      const error = new Error(
        "Routing service returned an invalid route."
      );

      error.statusCode = 502;

      throw error;
    }

    /*
     * Calculate delivery fee using
     * FLOGRAM pricing rules.
     */
    const deliveryFee =
      calculateDeliveryFee(
        distanceMeters
      );

    return {
      distanceMeters,

      distanceKilometers:
        Number(
          (
            distanceMeters /
            1000
          ).toFixed(2)
        ),

      durationSeconds,

      durationMinutes:
        Math.ceil(
          durationSeconds /
          60
        ),

      deliveryFee,

      /*
       * GeoJSON geometry can later be
       * returned to the frontend and
       * displayed using Leaflet.
       */
      geometry:
        feature?.geometry ||
        null,
    };
  };