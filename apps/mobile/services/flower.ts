import {
  File,
} from 'expo-file-system';

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

  /*
   * Image-search results only.
   *
   * Normal GET /flowers responses
   * do not need these values.
   */

  similarity?: number;

  similarityPercentage?: number;
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
 * IMAGE SEARCH IMAGE
 * =========================================================
 */

export type FlowerImageSearchImage = {
  uri: string;
};

/*
 * =========================================================
 * PUBLIC FLOWERS RESPONSE
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

/*
 * =========================================================
 * SINGLE FLOWER RESPONSE
 * =========================================================
 */

type FlowerResponse = {
  success: boolean;

  message: string;

  data: {
    flower: FlowerListing;
  };
};

/*
 * =========================================================
 * IMAGE SEARCH RESPONSE
 * =========================================================
 */

type FlowerImageSearchResponse = {
  success: boolean;

  message: string;

  data: {
    model: string;

    count: number;

    flowers: FlowerListing[];
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

  /*
   * SEARCH
   */

  if (filters.search?.trim()) {
    params.append(
      'search',
      filters.search.trim()
    );
  }

  /*
   * CATEGORY
   */

  if (filters.category?.trim()) {
    params.append(
      'category',
      filters.category.trim()
    );
  }

  /*
   * OCCASION
   */

  if (filters.occasion?.trim()) {
    params.append(
      'occasion',
      filters.occasion.trim()
    );
  }

  /*
   * FLOWER TYPE
   */

  if (filters.flowerType?.trim()) {
    params.append(
      'flowerType',
      filters.flowerType.trim()
    );
  }

  /*
   * COLOR
   */

  if (filters.color?.trim()) {
    params.append(
      'color',
      filters.color.trim()
    );
  }

  /*
   * MINIMUM PRICE
   */

  if (
    filters.minPrice !== undefined
  ) {
    params.append(
      'minPrice',
      String(
        filters.minPrice
      )
    );
  }

  /*
   * MAXIMUM PRICE
   */

  if (
    filters.maxPrice !== undefined
  ) {
    params.append(
      'maxPrice',
      String(
        filters.maxPrice
      )
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
 *
 * GET
 * /api/v1/flowers
 *
 * Supported filters:
 *
 * search
 * category
 * occasion
 * flowerType
 * color
 * minPrice
 * maxPrice
 * =========================================================
 */

export const getPublicFlowers =
  async (
    filters: FlowerFilters = {}
  ) => {
    const query =
      buildFlowerQuery(
        filters
      );

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
 *
 * GET
 * /api/v1/flowers/:flowerId
 * =========================================================
 */

export const getFlowerById =
  async (
    flowerId: string
  ) => {
    if (!flowerId?.trim()) {
      throw new Error(
        'Flower ID is required.'
      );
    }

    const response =
      await apiRequest<FlowerResponse>(
        `/flowers/${encodeURIComponent(
          flowerId.trim()
        )}`,
        {
          method: 'GET',
        }
      );

    return response
      .data
      .flower;
  };

/*
 * =========================================================
 * SEARCH FLOWERS BY IMAGE
 * =========================================================
 *
 * POST
 * /api/v1/flowers/image-search
 *
 * Content-Type:
 * multipart/form-data
 *
 * Required backend field:
 *
 * image
 *
 * Backend:
 *
 * Customer image
 *      ↓
 * AI image embedding
 *      ↓
 * Compare with Flower.imageEmbedding
 *      ↓
 * Rank by cosine similarity
 *      ↓
 * Return similar bouquets
 *
 * IMPORTANT:
 *
 * Expo SDK 57 uses a real File object
 * for multipart file uploads.
 *
 * Do NOT use:
 *
 * {
 *   uri,
 *   name,
 *   type
 * }
 *
 * because that may produce:
 *
 * Unsupported FormDataPart implementation
 *
 * Also do NOT manually set:
 *
 * Content-Type: multipart/form-data
 *
 * fetch must generate the multipart
 * boundary automatically.
 * =========================================================
 */

export const searchFlowersByImage =
  async (
    image: FlowerImageSearchImage,
    limit = 10
  ) => {
    const imageUri =
      image.uri?.trim();

    if (!imageUri) {
      throw new Error(
        'Search image is required.'
      );
    }

    /*
     * -----------------------------------------------------
     * SAFE RESULT LIMIT
     * -----------------------------------------------------
     */

    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        20
      );

    /*
     * -----------------------------------------------------
     * MULTIPART DATA
     * -----------------------------------------------------
     */

    const formData =
      new FormData();

    /*
     * -----------------------------------------------------
     * EXPO FILE
     * -----------------------------------------------------
     */

    const imageFile =
      new File(
        imageUri
      );

    /*
     * Must match the backend:
     *
     * flowerUpload.single("image")
     */

    formData.append(
      'image',
      imageFile
    );

    /*
     * -----------------------------------------------------
     * REQUEST
     * -----------------------------------------------------
     */

    const response =
      await apiRequest<FlowerImageSearchResponse>(
        `/flowers/image-search?limit=${safeLimit}`,
        {
          method: 'POST',

          body: formData,
        }
      );

    return response.data;
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
   * Remove:
   *
   * /api/v1
   *
   * so static /uploads can be
   * requested directly.
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
  return `₱${Number(
    price || 0
  ).toLocaleString(
    'en-PH'
  )}`;
};

/*
 * =========================================================
 * SELLER FLOWER LIST RESPONSE
 * =========================================================
 */

type SellerFlowersResponse = {
  success: boolean;
  message: string;
  data: {
    flowers: FlowerListing[];
  };
};

/*
 * =========================================================
 * GET SELLER FLOWERS
 *
 * GET /flowers/seller/mine
 * =========================================================
 */

export async function getSellerFlowers(): Promise<
  FlowerListing[]
> {
  const response =
    await apiRequest<SellerFlowersResponse>(
      '/flowers/seller/mine',
      {
        method: 'GET',
        authenticated: true,
      }
    );

  return response.data.flowers;
}

/*
 * =========================================================
 * UPDATE SELLER FLOWER
 *
 * PATCH /flowers/:flowerId
 * =========================================================
 */

export type UpdateFlowerPayload = {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  occasion?: string[];
  flowerTypes?: string[];
  colors?: string[];
  isAvailable?: boolean;
};

export async function updateSellerFlower(
  flowerId: string,
  payload: UpdateFlowerPayload
): Promise<FlowerListing> {
  if (!flowerId.trim()) {
    throw new Error(
      'Flower ID is required.'
    );
  }

  const response =
    await apiRequest<FlowerResponse>(
      `/flowers/${encodeURIComponent(
        flowerId.trim()
      )}`,
      {
        method: 'PATCH',
        authenticated: true,
        body: JSON.stringify(payload),
      }
    );

  return response.data.flower;
}

/*
 * =========================================================
 * UPDATE FLOWER AVAILABILITY
 * =========================================================
 */

export async function updateFlowerAvailability(
  flowerId: string,
  isAvailable: boolean
): Promise<FlowerListing> {
  return updateSellerFlower(
    flowerId,
    {
      isAvailable,
    }
  );
}

/*
 * =========================================================
 * DEACTIVATE SELLER FLOWER
 *
 * DELETE /flowers/:flowerId
 * =========================================================
 */

export async function deactivateSellerFlower(
  flowerId: string
): Promise<FlowerListing> {
  if (!flowerId.trim()) {
    throw new Error(
      'Flower ID is required.'
    );
  }

  const response =
    await apiRequest<FlowerResponse>(
      `/flowers/${encodeURIComponent(
        flowerId.trim()
      )}`,
      {
        method: 'DELETE',
        authenticated: true,
      }
    );

  return response.data.flower;
}

/*
 * =========================================================
 * CREATE SELLER FLOWER
 *
 * POST /flowers
 * =========================================================
 */

export type CreateFlowerPayload = {
  name: string;
  description: string;
  price: number;
  category: string;
  occasion?: string[];
  flowerTypes?: string[];
  colors?: string[];
  isAvailable?: boolean;
  images?: string[];
};

export async function createSellerFlower(
  payload: CreateFlowerPayload
): Promise<FlowerListing> {
  const formData = new FormData();

  formData.append(
    'name',
    payload.name.trim()
  );

  formData.append(
    'description',
    payload.description.trim()
  );

  formData.append(
    'price',
    String(payload.price)
  );

  formData.append(
    'category',
    payload.category.trim()
  );

  formData.append(
    'occasion',
    JSON.stringify(
      payload.occasion ?? []
    )
  );

  formData.append(
    'flowerTypes',
    JSON.stringify(
      payload.flowerTypes ?? []
    )
  );

  formData.append(
    'colors',
    JSON.stringify(
      payload.colors ?? []
    )
  );

  formData.append(
    'isAvailable',
    String(
      payload.isAvailable ?? true
    )
  );

  /*
   * Backend accepts maximum 5 images.
   */

  const images =
    payload.images?.slice(0, 5) ??
    [];

  images.forEach((imageUri) => {
    const imageFile =
      new File(imageUri);

    formData.append(
      'images',
      imageFile
    );
  });

  const response =
    await apiRequest<FlowerResponse>(
      '/flowers',
      {
        method: 'POST',
        authenticated: true,
        body: formData,
      }
    );

  return response.data.flower;
}