// Public surface of the suppliers feature: the `/admin/suppliers*` API functions (`listSuppliers` among them), their types, the registry,
// the palette source, `SupplierStatusBadge` and `supplierPath` (the `/suppliers?supplier=<id>` link). The page loads lazily from `./pages`.
export * from './api';
export * from './components/SupplierStatusBadge';
export { isEnabled, supplierState, type SupplierState } from './lib/state';
export * from './lib/paletteSource';
export { supplierPath } from './lib/paths';
export * from './types';
