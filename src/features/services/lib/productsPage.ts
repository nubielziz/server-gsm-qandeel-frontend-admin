// What the app needs to know about the Product / Services page without loading it: its heading and the gate that opens it. The manifest
// (../manifest.ts) is loaded with the app, so this file must stay free of the page's views.

/** The page's heading, the same in every view (the sidebar label is the same words). */
export const PRODUCTS_HEADING = 'Product / Services';

/**
 * The page gate (the feature manifest's `permission`; MISMATCHES M19 has the same shape for other pages): any one of these opens the
 * page. The services list and the groups need `catalog:read`, the price grid and the price rules `pricing:read`, the code stock
 * `inventory:read`, the publish runs `storefront:read`. A role with none of them has nothing on this page, so it is refused at the door; a
 * role with one opens the first view it may use. The server still checks every call.
 */
export const PRODUCTS_PAGE_PERMISSIONS = [
  'catalog:read',
  'pricing:read',
  'inventory:read',
  'storefront:read',
] as const;
