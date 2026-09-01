import * as SecureStore from 'expo-secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not configured.'
  );
}

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;
};

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    authenticated = false,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders =
    new Headers(headers);

  /*
   * =========================================================
   * ACCEPT HEADER
   * =========================================================
   */

  requestHeaders.set(
    'Accept',
    'application/json'
  );

  /*
   * =========================================================
   * CONTENT TYPE
   * =========================================================
   *
   * Normal JSON requests:
   *   Content-Type: application/json
   *
   * FormData / file uploads:
   *   DO NOT manually set Content-Type.
   *
   * fetch / React Native automatically creates:
   *
   * multipart/form-data; boundary=...
   *
   * The boundary is required by multer on the backend.
   * =========================================================
   */

  const isFormData =
    typeof FormData !== 'undefined' &&
    requestOptions.body instanceof
      FormData;

  if (
    requestOptions.body &&
    !isFormData &&
    !requestHeaders.has(
      'Content-Type'
    )
  ) {
    requestHeaders.set(
      'Content-Type',
      'application/json'
    );
  }

  /*
   * =========================================================
   * AUTHENTICATION
   * =========================================================
   */

  if (authenticated) {
    const accessToken =
      await SecureStore.getItemAsync(
        'flogram_access_token'
      );

    if (accessToken) {
      requestHeaders.set(
        'Authorization',
        `Bearer ${accessToken}`
      );
    }
  }

  /*
   * =========================================================
   * REQUEST
   * =========================================================
   */

  const response =
    await fetch(
      `${API_URL}${endpoint}`,
      {
        ...requestOptions,

        headers:
          requestHeaders,
      }
    );

  /*
   * =========================================================
   * READ RESPONSE
   * =========================================================
   */

  let data: any;

  try {
    data =
      await response.json();
  } catch {
    throw new Error(
      'Unable to read the server response.'
    );
  }

  /*
   * =========================================================
   * ERROR HANDLING
   * =========================================================
   */

  if (!response.ok) {
    /*
     * express-validator response:
     *
     * {
     *   success: false,
     *   message: "Validation failed.",
     *   errors: [...]
     * }
     */

    if (
      Array.isArray(data?.errors) &&
      data.errors.length > 0
    ) {
      const validationMessage =
        data.errors
          .map(
            (error: {
              message?: string;
            }) =>
              error.message
          )
          .filter(Boolean)
          .join('\n');

      throw new Error(
        validationMessage ||
          data.message ||
          'Validation failed.'
      );
    }

    throw new Error(
      data?.message ||
        'Something went wrong.'
    );
  }

  /*
   * =========================================================
   * SUCCESS
   * =========================================================
   */

  return data as T;
}