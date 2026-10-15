import * as SecureStore from './storage';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not configured.'
  );
}

/*
 * Error with the HTTP status and response body, so screens
 * can react to specific cases (e.g. 409 duplicate).
 */
export class ApiError extends Error {
  status: number;

  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type ApiRequestOptions = RequestInit & {
  authenticated?: boolean;

  /*
   * Milliseconds before the request is aborted.
   * Defaults: 60 s for JSON, 120 s for FormData uploads.
   */
  timeoutMs?: number;
};

/*
 * Render's free plan sleeps the API when idle and the
 * first request after that can take ~50 s to wake it, so
 * the default is generous enough not to fail a cold start
 * while still guaranteeing that a dead request ends.
 */
const DEFAULT_TIMEOUT_MS = 60000;

const UPLOAD_TIMEOUT_MS = 120000;

const TIMEOUT_MESSAGE =
  'The server is taking too long to respond. Please check your connection and try again.';

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    authenticated = false,
    headers,
    timeoutMs,
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
      await SecureStore.getItem(
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

  /*
   * A request that never answers (sleeping server, dead
   * connection) is aborted so spinners always stop.
   * A caller's own AbortSignal still cancels the request.
   */
  const controller =
    new AbortController();

  let timedOut = false;

  const timeout = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    timeoutMs ??
      (isFormData
        ? UPLOAD_TIMEOUT_MS
        : DEFAULT_TIMEOUT_MS)
  );

  const callerSignal =
    requestOptions.signal;

  const abortFromCaller = () =>
    controller.abort();

  if (callerSignal) {
    if (callerSignal.aborted) {
      controller.abort();
    } else {
      callerSignal.addEventListener(
        'abort',
        abortFromCaller
      );
    }
  }

  let response: Response;

  let data: any;

  try {
    response =
      await fetch(
        `${API_URL}${endpoint}`,
        {
          ...requestOptions,
          headers: requestHeaders,
          signal: controller.signal,
        }
      );

    /*
     * =========================================================
     * READ RESPONSE
     * =========================================================
     *
     * The body is read inside the timeout too: a stalled
     * body would otherwise hang just like a stalled request.
     */

    try {
      data =
        await response.json();
    } catch (error) {
      if (timedOut) {
        throw error;
      }

      throw new Error(
        'Unable to read the server response.'
      );
    }
  } catch (error) {
    if (timedOut) {
      throw new Error(
        TIMEOUT_MESSAGE
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);

    callerSignal?.removeEventListener(
      'abort',
      abortFromCaller
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

    throw new ApiError(
      data?.message ||
        'Something went wrong.',
      response.status,
      data
    );
  }

  /*
   * =========================================================
   * SUCCESS
   * =========================================================
   */

  return data as T;
}