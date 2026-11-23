// SuppliersPanelSection: the panel's "Suppliers" section, the suppliers feature's SuppliersSection (the ordered chain of one service)
// given the values it takes from the panel's section props: the service, the catalog:update lock and the unsaved-changes report.
import { SuppliersSection } from '@/features/suppliers';
import type { PanelSectionProps } from '../types';

/** The chain of the open service. Editing needs `catalog:update`; the section checks `suppliers:read` for its menus itself. */
export function SuppliersPanelSection({ service, grants, onDirtyChange }: PanelSectionProps) {
  return (
    <SuppliersSection
      serviceId={service.id}
      serviceName={service.name}
      canEdit={grants.needs('catalog:update')}
      onDirtyChange={onDirtyChange}
    />
  );
}
