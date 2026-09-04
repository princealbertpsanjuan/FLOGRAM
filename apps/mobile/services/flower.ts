import {
  apiRequest,
} from './api';

/*
 * =========================================================
 * FLORIST ADDRESS
 * =========================================================
 */

export type FlowerFloristAddress = {
  street?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
};

/*
 * =========================================================
 * FLORIST
 * =========================================================
 */

export type FlowerFlorist = {
  _id: string;

  shopName: string;

  address?: FlowerFloristAddress;
};

/*
 * =========================================================
 * FLOWER / BOUQUET LISTING
 * =========================================================
 */

export type FlowerListing = {
  _id: string;

  seller: string;

  florist: FlowerFlorist;

  name: string;

  description: string;

  price: number;

  category: string;

  occasion: string[];

  flowerTypes: string[];

  colors: string[];

  images: string[];

  isAvailable: boolean;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
};

/*
 * =========================================================
 * PUBLIC FLOWER FILTERS
 * =========================================================
 */

export type FlowerFilters = {
  search?: string;

  category?: string;

  occasion?: string;

  flowerType?: string;

  color?: string;

  minPrice?: number;

  maxPrice?: number;
};

/*
 * =========================================================
 * API RESPONSE
 * =========================================================
 */

type PublicFlowersResponse = {
  success: boolean;

  message: string;

  data: {
    count: number;

    flowers: FlowerListing[];
  };
};

type FlowerResponse = {
  success: boolean;

  message: string;

  data: {
    flower: FlowerListing;
  };
};

/*
 * =========================================================
 * BUILD QUERY STRING
 * =========================================================
 */

const buildFlowerQuery = (
  filters: FlowerFilters = {}
) => {
  const params =
    new URLSearchParams();

  if (filters.search?.trim()) {
    params.append(
      'search',
      filters.search.trim()
    );
  }

  if (filters.category?.trim()) {
    params.append(
      'category',
      filters.category.trim()
    );
  }

  if (filters.occasion?.trim()) {
    params.append(
      'occasion',
      filters.occasion.trim()
    );
  }

  if (filters.flowerType?.trim()) {
    params.append(
      'flowerType',
      filters.flowerType.trim()
    );
  }

  if (filters.color?.trim()) {
    params.append(
      'color',
      filters.color.trim()
    );
  }

  if (
    filters.minPrice !== undefined
  ) {
    params.append(
      'minPrice',
      String(filters.minPrice)
    );
  }

  if (
    filters.maxPrice !== undefined
  ) {
    params.append(
      'maxPrice',
      String(filters.maxPrice)
    );
  }

  const query =
    params.toString();

  return query
    ? `?${query}`
    : '';
};

/*
 * =========================================================
 * GET ALL PUBLIC / AVAILABLE FLOWERS
 * =========================================================
 */

export const getPublicFlowers =
  async (
    filters: FlowerFilters = {}
  ) => {
    const query =
      buildFlowerQuery(filters);

    const response =
      await apiRequest<PublicFlowersResponse>(
        `/flowers${query}`,
        {
          method: 'GET',
        }
      );

    return response.data;
  };

/*
 * =========================================================
 * GET ONE PUBLIC FLOWER
 * =========================================================
 */

export const getFlowerById =
  async (
    flowerId: string
  ) => {
    const response =
      await apiRequest<FlowerResponse>(
        `/flowers/${flowerId}`,
        {
          method: 'GET',
        }
      );

    return response.data
      .flower;
  };

/*
 * =========================================================
 * FLOWER IMAGE URL
 * =========================================================
 *
 * Backend API:
 *
 * EXPO_PUBLIC_API_URL =
 * http://YOUR_IP:5000/api/v1
 *
 * Uploaded image:
 *
 * uploads/flowers/example.jpg
 *
 * Public image URL:
 *
 * http://YOUR_IP:5000/uploads/flowers/example.jpg
 * =========================================================
 */

export const getFlowerImageUrl = (
  imagePath?: string | null
) => {
  if (!imagePath) {
    return null;
  }

  /*
   * Already a complete remote URL.
   */
  if (
    imagePath.startsWith(
      'http://'
    ) ||
    imagePath.startsWith(
      'https://'
    )
  ) {
    return imagePath;
  }

  const apiUrl =
    process.env
      .EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    return null;
  }

  /*
   * Removes:
   *
   * /api/v1
   *
   * so the static /uploads route
   * can be reached correctly.
   */
  const serverUrl =
    apiUrl.replace(
      /\/api\/v1\/?$/,
      ''
    );

  const normalizedPath =
    imagePath.startsWith('/')
      ? imagePath
      : `/${imagePath}`;

  return `${serverUrl}${normalizedPath}`;
};

/*
 * =========================================================
 * FORMAT PRICE
 * =========================================================
 */

export const formatFlowerPrice = (
  price: number
) => {
  return `₱${price.toLocaleString(
    'en-PH'
  )}`;
};