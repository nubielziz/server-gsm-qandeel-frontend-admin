// Reads the API settings from the Vite env (see .env.example). Read on every call so tests can stub them.

/** Base URL of the API without a trailing slash. An empty string means "same origin" (dev proxy or mocks). */
export function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL ?? '';
  return raw.trim().replace(/\/+$/, '');
}

/** Name of the readable cookie that carries the CSRF token (decision 006). */
export function csrfCookieName(): string {
  return import.meta.env.VITE_CSRF_COOKIE?.trim() || 'csrf_token';
}
