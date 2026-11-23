// The views of the Product / Services page, in the order their links appear, and which of them a staff member may use. Each view lives in its
// own folder (components/products/<view>/): the page draws whatever this list holds, a role sees only the views it may use, and the first of
// them is where the bare address (or an unknown or forbidden one) lands.
import { AddServiceView } from '../components/products/add/AddServiceView';
import { AddGroupView } from '../components/products/add-group/AddGroupView';
import { AllView } from '../components/products/all/AllView';
import { EditView } from '../components/products/edit/EditView';
import { EditGroupView } from '../components/products/edit-group/EditGroupView';
import { GroupsView } from '../components/products/groups/GroupsView';
import { InventoryView } from '../components/products/inventory/InventoryView';
import { PricingView } from '../components/products/pricing/PricingView';
import { PublishView } from '../components/products/publish/PublishView';
import { RulesView } from '../components/products/rules/RulesView';
import type { ProductsViewSpec } from '../components/products/types';
import type { ServiceGrants } from '../hooks/useServiceGrants';

// A `show` rule: the staff member holds every one of these permissions.
const holds =
  (...permissions: string[]) =>
  (grants: ServiceGrants) =>
    grants.canAll(permissions);

/**
 * The views, in the order of their links: the five of the first row, then the three after the divider, then the two without a link.
 * The services and the groups need `catalog:read`; adding one needs `catalog:create` too; the price grid needs `pricing:read` as well, the
 * price rules `pricing:read`, the publish runs `storefront:read` and the code stock `inventory:read`. A role with none of them has nothing
 * on this page, so the page gate (the manifest's `permission`) refuses it at the door. The server still checks every call.
 */
export const PRODUCTS_VIEW_SPECS: readonly ProductsViewSpec[] = [
  { id: 'all', label: 'All', group: 'main', show: holds('catalog:read'), Component: AllView },
  {
    id: 'pricing',
    label: 'Pricing',
    group: 'main',
    show: holds('catalog:read', 'pricing:read'),
    Component: PricingView,
  },
  {
    id: 'add',
    label: 'Add Service',
    add: true,
    group: 'main',
    show: holds('catalog:read', 'catalog:create'),
    Component: AddServiceView,
  },
  { id: 'groups', label: 'Group', group: 'main', show: holds('catalog:read'), Component: GroupsView },
  {
    id: 'add-group',
    label: 'Add Group',
    add: true,
    group: 'main',
    show: holds('catalog:read', 'catalog:create'),
    Component: AddGroupView,
  },
  { id: 'rules', label: 'Price Rules', group: 'extra', show: holds('pricing:read'), Component: RulesView },
  {
    id: 'publish',
    label: 'Shop Publish',
    group: 'extra',
    show: holds('storefront:read'),
    Component: PublishView,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    group: 'extra',
    show: holds('inventory:read'),
    Component: InventoryView,
  },
  { id: 'edit', label: 'Edit Service', group: 'hidden', show: holds('catalog:read'), Component: EditView },
  {
    id: 'edit-group',
    label: 'Edit Group',
    group: 'hidden',
    show: holds('catalog:read'),
    Component: EditGroupView,
  },
];

/** The views this staff member may use, in the registry's order. Pass another list to draw it instead. */
export function usableViews(
  grants: ServiceGrants,
  specs: readonly ProductsViewSpec[] = PRODUCTS_VIEW_SPECS,
): ProductsViewSpec[] {
  return specs.filter((spec) => spec.show(grants));
}
