// The list of the sections the service panel shows, in order, and which of them a staff member may see. To add a section, add one
// row here (its component comes from components/panel/sections): the panel draws whatever this list holds, and draws each row's
// heading and frame itself, so a section component never renders its own.
import type { ComponentType } from 'react';
import { ActivitySection } from '../components/panel/ActivitySection';
import { DetailsSection } from '../components/panel/sections/DetailsSection';
import { OrderFormSection } from '../components/panel/sections/OrderFormSection';
import { PricesPanelSection } from '../components/panel/sections/PricesPanelSection';
import { ShopPanelSection } from '../components/panel/sections/ShopPanelSection';
import { SuppliersPanelSection } from '../components/panel/sections/SuppliersPanelSection';
import type { PanelSectionId, PanelSectionProps } from '../components/panel/types';
import type { ServiceGrants } from '../hooks/useServiceGrants';

/**
 * One section of the panel: its id (the address names it with `section=`), the heading the panel draws, whether the staff member's
 * permissions show it at all, and the component that fills it. Each control inside a section keeps its own permission hint.
 */
export type PanelSectionSpec = {
  id: PanelSectionId;
  title: string;
  show: (grants: ServiceGrants) => boolean;
  Component: ComponentType<PanelSectionProps>;
  /**
   * The section keeps a snapshot of the service in a form (Details, Prices). It is mounted again from the refreshed service after a
   * data change, and only while it holds no unsaved changes. A section that follows its props and queries leaves this off: mounting
   * it again would only drop focus and any dialog it has open.
   */
  remountOnChange?: boolean;
};

// A `show` rule: the staff member holds every one of these permissions.
const holds =
  (...permissions: string[]) =>
  (grants: ServiceGrants) =>
    grants.canAll(permissions);

/**
 * The sections, top to bottom: one row each, so adding a section is adding a line. The Shop page needs storefront:read, as the row's
 * shop keys do; every other section reads what catalog:read gives, and each control inside keeps its own permission hint.
 */
export const PANEL_SECTIONS: readonly PanelSectionSpec[] = [
  {
    id: 'details',
    title: 'Details',
    show: holds('catalog:read'),
    Component: DetailsSection,
    remountOnChange: true,
  },
  { id: 'order-form', title: 'Order form', show: holds('catalog:read'), Component: OrderFormSection },
  { id: 'suppliers', title: 'Suppliers', show: holds('catalog:read'), Component: SuppliersPanelSection },
  {
    id: 'prices',
    title: 'Prices',
    show: holds('catalog:read'),
    Component: PricesPanelSection,
    remountOnChange: true,
  },
  {
    id: 'shop',
    title: 'Shop page',
    show: holds('catalog:read', 'storefront:read'),
    Component: ShopPanelSection,
  },
  { id: 'activity', title: 'Activity', show: holds('catalog:read'), Component: ActivitySection },
];

/** The sections this staff member may see, in the list's order. Pass another list to draw it instead. */
export function visibleSections(
  grants: ServiceGrants,
  sections: readonly PanelSectionSpec[] = PANEL_SECTIONS,
): PanelSectionSpec[] {
  return sections.filter((section) => section.show(grants));
}
