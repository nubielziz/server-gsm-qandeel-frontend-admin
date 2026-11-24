// Public surface of the storefront feature: the `/admin/service-listings`, publish-runs, retail-price-rules and -changes, content-pages,
// help-articles and legal-documents API functions, their types, the data-provider registry, the link builders
// (`storefrontListPath` for Shop content; `storefrontPublishPath` and `storefrontPricingPath` for the Product / Services page's views) and the components that page mounts: the
// shop price rules (`RetailPricingTab`, with `useWaitingCount` for the count on its tab) and the publish start and run view
// (`PublishStart`, `PublishRunView`), with `useStartPublish` for the screens that start a run, and the edit view's Retail Purchase part
// (`RetailPurchasePart`: the service's shop switch slot, shop price, waiting price change and shop page, each section saved on its own). The Shop content page itself is not
// re-exported here: it loads lazily from `./pages`.
//
// Which of the mounted parts read the address themselves: `RetailPricingTab` (its price changes list keeps `show`, `page`, `sort`,
// `dir`), `PublishStart` and `PublishHistory` (`page`, `sort`, `dir` of the earlier runs) and `PublishRunView` through the run's preview
// and result rows (`q`, `page`, `sort`, `dir`, `state`, `included`, `flag`, `brandKind`, `result`). The publish parts take the run as a
// prop. No exported part reads `tab`.
export * from './api';
export { RetailPricingTab } from './components/pricing/RetailPricingTab';
export type { ShopPublishFailure } from './components/shop/types';
export { RetailPurchasePart } from './components/retailPurchase/RetailPurchasePart';
export type { RetailPurchasePartProps } from './components/retailPurchase/types';
export { PublishRunView, type PublishRunViewProps } from './components/publish/PublishRunView';
export { PublishStart, type PublishStartProps } from './components/publish/PublishStart';
export { useStartPublish } from './hooks/useStartPublish';
export { useWaitingCount } from './hooks/useRetailPricing';
export { useStorefrontGrants, type StorefrontGrants } from './hooks/useStorefrontGrants';
export {
  storefrontListPath,
  storefrontPricingPath,
  storefrontPublishPath,
  type StorefrontLink,
} from './lib/paths';
export * from './types';
