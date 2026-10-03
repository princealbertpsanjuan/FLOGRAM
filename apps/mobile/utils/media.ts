/*
 * =========================================================
 * UPLOADED FILE URL
 * =========================================================
 *
 * Backend returns paths like /uploads/riders/payouts/x.jpg.
 * EXPO_PUBLIC_API_URL ends with /api/v1, while static
 * uploads are served from the server root.
 * =========================================================
 */

export const getUploadUrl = (
  path?: string | null
) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  if (!apiUrl) {
    return null;
  }

  const serverUrl = apiUrl.replace(/\/api\/v1\/?$/, '');

  return `${serverUrl}${path.startsWith('/') ? path : `/${path}`}`;
};
