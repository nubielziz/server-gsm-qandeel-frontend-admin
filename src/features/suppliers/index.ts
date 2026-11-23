// Public surface of the suppliers feature: the `/admin/suppliers*` API functions (`listSuppliers` among them), their types, the registry,
// the palette source, `SupplierStatusBadge`, `supplierPath` (the `/suppliers?supplier=<id>` link) and the parts the Catalog page mounts:
// the service panel's `SuppliersSection` and the Add services flow (`AddServicesDialog` and its two paths, `GroupsFlowDialog` and
// `SinglesFlowDialog`). The page loads lazily from `./pages`.
export * from './api';
export * from './components/SupplierStatusBadge';
export { SuppliersSection, type SuppliersSectionProps } from './components/SuppliersSection';
export { isEnabled, supplierState, type SupplierState } from './lib/state';
export * from './lib/paletteSource';
export { AddServicesDialog, type AddServicesDialogProps } from './components/addFlow/AddServicesDialog';
export { GroupsFlowDialog } from './components/addFlow/GroupsFlowDialog';
export { SinglesFlowDialog } from './components/addFlow/SinglesFlowDialog';
export { supplierPath } from './lib/paths';
export * from './types';
