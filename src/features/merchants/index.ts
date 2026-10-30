// Public surface of the merchants feature: its API functions and types, the registry, the palette source, `listClients` /
// `Client` for merchant menus, `MerchantStatusBadge` and `merchantPath` / `merchantsListPath`. Pages load lazily from `./pages`;
// nothing that imports the orders feature may be exported here (the merchant page uses orders).
export * from './api';
export * from './components/MerchantStatusBadge';
export * from './lib/paletteSource';
export * from './lib/paths';
export * from './types';
