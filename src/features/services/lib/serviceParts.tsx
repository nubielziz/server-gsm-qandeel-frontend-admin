// The parts of the edit view, in the order the left menu shows them, and which of them a staff member may see. Each part is a file in
// components/products/edit/parts (the API Connection and Retail Purchase parts are thin adapters of the suppliers and storefront features'
// parts): the edit view draws whatever this list holds, and the part's own save button saves that part alone (each part is saved on its own,
// as the layout the owner asked for has it).
import { ActivityPart } from '../components/products/edit/parts/ActivityPart';
import { ApiConnectionPart } from '../components/products/edit/parts/ApiConnectionPart';
import { FieldsPart } from '../components/products/edit/parts/FieldsPart';
import { InventoryPart } from '../components/products/edit/parts/InventoryPart';
import { OverviewPart } from '../components/products/edit/parts/OverviewPart';
import { PricingPart } from '../components/products/edit/parts/PricingPart';
import { RetailPurchasePart } from '../components/products/edit/parts/RetailPurchasePart';
import type { ServicePartSpec } from '../components/products/types';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import type { ServiceDetail } from '../types';

// A `show` rule: the staff member holds every one of these permissions.
const holds =
  (...permissions: string[]) =>
  (grants: ServiceGrants) =>
    grants.canAll(permissions);

/**
 * The parts, top to bottom: one row each. The edit view itself needs `catalog:read`, which every part reads with; the shop part also needs
 * storefront:read, as the row's shop keys do, and the stored codes need inventory:read. Each control inside a part keeps its own
 * permission hint.
 */
export const SERVICE_PART_SPECS: readonly ServicePartSpec[] = [
  { id: 'overview', label: 'Overview', show: holds('catalog:read'), Component: OverviewPart },
  { id: 'pricing', label: 'Set Pricing', show: holds('catalog:read'), Component: PricingPart },
  { id: 'fields', label: 'Field', show: holds('catalog:read'), Component: FieldsPart },
  { id: 'api', label: 'API Connection', show: holds('catalog:read'), Component: ApiConnectionPart },
  {
    id: 'shop',
    label: 'Retail Purchase',
    show: holds('catalog:read', 'storefront:read'),
    Component: RetailPurchasePart,
  },
  { id: 'inventory', label: 'Inventory', show: holds('inventory:read'), Component: InventoryPart },
  { id: 'activity', label: 'Activity', show: holds('catalog:read'), Component: ActivityPart },
];

/** The parts this staff member may see for this service, in the list's order. Pass another list to draw it instead. */
export function visibleParts(
  grants: ServiceGrants,
  service: ServiceDetail,
  parts: readonly ServicePartSpec[] = SERVICE_PART_SPECS,
): ServicePartSpec[] {
  return parts.filter((part) => part.show(grants, service));
}
