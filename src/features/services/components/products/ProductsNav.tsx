// ProductsNav: the two rows of links under the page title: the strip of kinds (level 1) and the text links of the views (level 2). It only
// draws what `lib/productsNav` works out; every link is a full view of the page (no dialog, no side panel).
import { StripTabs, ViewLinks } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import { currentLink, kindItems, viewItems } from '../../lib/productsNav';
import type { ProductsViewId } from '../../lib/productsPath';
import type { ProductsViewSpec } from './types';

export interface ProductsNavProps {
  /** The kind on the strip. */
  type: ServiceType;
  /** The view on screen. */
  view: ProductsViewId;
  /** The views the role may use. */
  usable: readonly ProductsViewSpec[];
}

/** The strip of kinds, then the row of views. */
export function ProductsNav({ type, view, usable }: ProductsNavProps) {
  return (
    <>
      <StripTabs items={kindItems(view)} current={type} ariaLabel="Kind of service" />
      <ViewLinks items={viewItems(usable, type)} current={currentLink(view)} ariaLabel="Views" />
    </>
  );
}
