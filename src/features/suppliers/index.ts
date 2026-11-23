// Public surface of the suppliers feature: the `/admin/suppliers*` API functions (`listSuppliers` among them), their types, the registry,
// the palette source, `SupplierStatusBadge`, `supplierPath` (the `/suppliers?supplier=<id>` link), and the two pieces of the Product / Services
// page that live here: `AddFromSupplierForm` (adds services from a supplier) and `ApiConnectionPart` (the API Connection part of a service's
// edit view). The page loads lazily from `./pages`.
export * from './api';
export { ApiConnectionPart, type ApiConnectionPartProps } from './components/apiConnection/ApiConnectionPart';
export * from './components/SupplierStatusBadge';
export { isEnabled, supplierState, type SupplierState } from './lib/state';
export * from './lib/paletteSource';
export { supplierPath } from './lib/paths';
export {
  AddFromSupplierForm,
  type AddFromSupplierFormProps,
} from './components/addFromSupplier/AddFromSupplierForm';
export * from './types';
