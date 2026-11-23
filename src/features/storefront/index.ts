// Public surface of the storefront feature: the `/admin/service-listings`, publish-runs, retail-price-rules and -changes, content-pages,
// help-articles, legal-documents and tac-catalog API functions, their types, the data-provider registry, the link builders
// (`storefrontListPath` for Shop content; `storefrontPublishPath`, `storefrontPricingPath` and `storefrontOnShopPath` for the Catalog
// page's views) and the components the Catalog page mounts: the retail pricing tab, the publish start, history and run view, the
// listing dialogs and the two shop parts of the service panel (`ShopPageSection`, `ShopPriceBlock`). The Shop content page itself is
// not re-exported here: it loads lazily from `./pages`.
//
// Which of the mounted parts read the address themselves (a Catalog view that mounts one of them alone keeps the keys below):
// `RetailPricingTab` (its price changes list keeps `show`, `page`, `sort`, `dir`), `PublishStart` and `PublishHistory` (`page`, `sort`,
// `dir` of the earlier runs) and `PublishRunView` through the run's preview and result rows (`q`, `page`, `sort`, `dir`, `state`,
// `included`, `flag`, `brandKind`, `result`). `PublishTab` is the one that also reads and writes `run` and `view`; the other publish
// parts take the run as a prop. The two shop parts take plain values and read no part of the address. No exported part reads `tab`.
export * from './api';
export { ListingCreateDialog } from './components/ListingCreateDialog';
export {
  ListingEditDialogById,
  PriceDialogById,
  type ListingDialogByIdProps,
} from './components/ListingDialogsById';
export { ListingEditDialog, type ListingEditDialogProps } from './components/ListingEditDialog';
export { PriceDialog, type PriceDialogProps } from './components/PriceDialog';
export { RetailPricingTab } from './components/pricing/RetailPricingTab';
export { ShopPageSection, type ShopPageSectionProps } from './components/shop/ShopPageSection';
export { ShopPriceBlock, type ShopPriceBlockProps } from './components/shop/ShopPriceBlock';
export type { ShopPublishFailure } from './components/shop/types';
export { PublishHistory } from './components/publish/PublishHistory';
export { PublishRunView, type PublishRunViewProps } from './components/publish/PublishRunView';
export { PublishStart, type PublishStartProps } from './components/publish/PublishStart';
export { PublishTab } from './components/publish/PublishTab';
export { useStartPublish } from './hooks/useStartPublish';
export { useWaitingCount } from './hooks/useRetailPricing';
export { useStorefrontGrants, type StorefrontGrants } from './hooks/useStorefrontGrants';
export {
  storefrontListPath,
  storefrontOnShopPath,
  storefrontPricingPath,
  storefrontPublishPath,
  type StorefrontLink,
} from './lib/paths';
export * from './types';
