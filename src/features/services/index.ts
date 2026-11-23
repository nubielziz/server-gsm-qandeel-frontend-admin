// Public surface of the services feature: the `/admin/services*`, categories, pricing-rules, pricing and inventory API functions, their
// types, the data-provider registry, the palette source, and `catalogPath` for links into the Catalog page (`/catalog?belowFloor=true`,
// a service panel, a settings tab, a publish run). The page itself is not re-exported here: it loads lazily from `./pages`.
export * from './api';
export * from './lib/paletteSource';
export {
  catalogPath,
  type CatalogChip,
  type CatalogLink,
  type CatalogPublishLink,
  type CatalogSettingsLink,
  type CatalogSettingsTab,
  type CatalogTableLink,
} from './lib/paths';
export * from './types';
