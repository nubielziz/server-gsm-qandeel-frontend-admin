// The contract between the Product / Services page and its views: what a view receives, the row a view has in the registry
// (lib/productsViews.tsx), and what a part of the edit view receives with its registry row (lib/serviceParts.tsx). A package that builds
// a view or a part adds its row to a registry; the page draws whatever the registry holds, so no view knows about another.
import type { ComponentType } from 'react';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import type { ProductsViewId, ServicePartId } from '../../lib/productsPath';
import type { ServiceDetail } from '../../types';

/** What every view of the page receives: the kind of service on the strip, and what the signed-in staff member may do. */
export type ProductsViewProps = { type: ServiceType; grants: ServiceGrants };

/**
 * One view of the page. `group` says where its link goes: `main` is the first row (All, Pricing, +Add Service, Group, +Add Group),
 * `extra` is after the divider (Price Rules, Shop Publish, Inventory) and `hidden` has no link (the two edit views). `add` draws a
 * "+" before the label. `show` says whether the staff member's permissions open the view at all (each control inside keeps its own
 * hint); a view the role may not use is not listed and falls back to the first one it may.
 */
export type ProductsViewSpec = {
  id: ProductsViewId;
  label: string;
  add?: boolean;
  group: 'main' | 'extra' | 'hidden';
  show: (grants: ServiceGrants) => boolean;
  Component: ComponentType<ProductsViewProps>;
};

/**
 * What every part of the edit view receives: the service (read in full), the grants, and a way to say the part holds unsaved changes,
 * so the editor can ask before another part or view is opened. Each part saves on its own.
 */
export type ServicePartProps = {
  service: ServiceDetail;
  grants: ServiceGrants;
  onDirtyChange: (dirty: boolean) => void;
};

/** One part of the edit view, in the left menu's order: its id (the address names it with `part=`), its label and its permissions. */
export type ServicePartSpec = {
  id: ServicePartId;
  label: string;
  show: (grants: ServiceGrants, service: ServiceDetail) => boolean;
  Component: ComponentType<ServicePartProps>;
};
