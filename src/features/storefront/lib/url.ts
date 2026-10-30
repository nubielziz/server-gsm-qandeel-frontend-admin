// Where the public storefront lives, from the Vite env. Replaces the demo's "Preview checkout" button and Live preview tab
// (MISMATCHES M4): the checkout flow belongs to the storefront itself, so the console only links to it.

/** The storefront's address without a trailing slash, or `undefined` when `VITE_STOREFRONT_URL` is not set. Read on every call so tests can stub it. */
export function storefrontUrl(): string | undefined {
  const raw = import.meta.env.VITE_STOREFRONT_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : undefined;
}
