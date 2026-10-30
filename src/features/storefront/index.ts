// Public surface of the storefront feature: the `/admin/service-listings`, content-pages, help-articles, legal-documents and
// tac-catalog API functions, their types, the data-provider registry, and `storefrontListPath` for links into the page
// (`/storefront?tab=landing&kind=carrier`). The page itself is not re-exported here: it loads lazily from `./pages`.
export * from './api';
export { storefrontListPath, type StorefrontLink } from './lib/paths';
export * from './types';
