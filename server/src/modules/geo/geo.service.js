/*
 * =========================================================
 * ADDRESS SEARCH & PIN → ADDRESS (OpenRouteService / Pelias)
 * =========================================================
 *
 * Uses the same OPENROUTESERVICE_API_KEY as routing.
 *
 * autocomplete: "TAB" → Tabuco, Naga City, ...
 *   biased to Naga City, limited to the Philippines.
 * reverse: map pin → street / barangay / city / province.
 *
 * Results are mapped to FLOGRAM's address fields.
 * Failures return [] / null so forms keep working when the
 * geocoder is unavailable (typing manually still works).
 * =========================================================
 */

const ORS_URL = process.env.OPENROUTESERVICE_API_URL || "https://api.openrouteservice.org";

const NAGA_CENTER = { latitude: 13.6218, longitude: 123.1948 };

const TIMEOUT_MS = 8000;

const getKey = () => String(process.env.OPENROUTESERVICE_API_KEY || "").trim();

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(`Geocoder responded ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Geocoder request failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
};

/*
 * Pelias feature → FLOGRAM address.
 */
const toAddress = (feature) => {
  const p = feature?.properties || {};
  const [longitude, latitude] = feature?.geometry?.coordinates || [];

  const street = [p.housenumber, p.street].filter(Boolean).join(" ") || (p.layer === "address" || p.layer === "venue" || p.layer === "street" ? p.name : "") || "";

  const barangay = p.neighbourhood || p.borough || (p.layer === "neighbourhood" ? p.name : "") || "";

  const city = p.locality || p.localadmin || p.county || "";

  const province = p.region || p.macroregion || "";

  return {
    label: p.label || [street, barangay, city, province].filter(Boolean).join(", "),
    street,
    barangay,
    city,
    province,
    postalCode: p.postalcode || "",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
  };
};

export const searchAddresses = async (text) => {
  const query = String(text || "").trim();
  const key = getKey();

  if (query.length < 3 || !key) {
    return [];
  }

  const params = new URLSearchParams({
    api_key: key,
    text: query,
    "boundary.country": "PH",
    "focus.point.lat": String(NAGA_CENTER.latitude),
    "focus.point.lon": String(NAGA_CENTER.longitude),
    size: "8",
  });

  const data = await fetchJson(`${ORS_URL}/geocode/autocomplete?${params}`);

  const seen = new Set();

  return (data?.features || [])
    .map(toAddress)
    .filter((item) => {
      if (!item.label || seen.has(item.label)) {
        return false;
      }

      seen.add(item.label);
      return true;
    });
};

export const reverseGeocode = async (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const key = getKey();

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !key) {
    return null;
  }

  const params = new URLSearchParams({
    api_key: key,
    "point.lat": String(lat),
    "point.lon": String(lng),
    "boundary.country": "PH",
    size: "5",
  });

  const data = await fetchJson(`${ORS_URL}/geocode/reverse?${params}`);
  const features = data?.features || [];

  if (!features.length) {
    return null;
  }

  /*
   * The nearest result may be a venue without a barangay;
   * fill missing parts from the next results.
   */
  const merged = toAddress(features[0]);

  for (const feature of features.slice(1)) {
    const next = toAddress(feature);
    merged.street = merged.street || next.street;
    merged.barangay = merged.barangay || next.barangay;
    merged.city = merged.city || next.city;
    merged.province = merged.province || next.province;
    merged.postalCode = merged.postalCode || next.postalCode;
  }

  merged.latitude = lat;
  merged.longitude = lng;

  return merged;
};
