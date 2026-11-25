// Public surface of the money feature: the Money page's views and the builders of its addresses (lib/moneyViews.ts). Only that pure
// module is exported: the finance and refunds features import it for their links, and the page imports their views, so anything else
// here would be an import cycle. The page loads lazily from `./pages`.
export * from './lib/moneyViews';
