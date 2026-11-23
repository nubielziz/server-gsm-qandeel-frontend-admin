// Public surface of the services feature: the `/admin/services*`, categories, pricing-rules, pricing and inventory API functions, their
// types, the data-provider registry, the palette source, and `productsPath` for links into the Product / Services page
// (`/products?view=all&show=attention`, one service's edit view, a view's own tab, a publish run). The page itself is not re-exported
// here: it loads lazily from `./pages`.
export * from './api';
export * from './lib/paletteSource';
export {
  PRODUCTS_PATH,
  PRODUCTS_VIEWS,
  RULES_TABS,
  SERVICE_PARTS,
  productsPath,
  type ProductsLink,
  type ProductsViewId,
  type RulesTabId,
  type ServicePartId,
} from './lib/productsPath';
export * from './types';
