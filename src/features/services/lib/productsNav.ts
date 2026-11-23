// The two rows of links of the Product / Services page, as data: the strip of kinds (IMEI Service, Server Service, …) and the row of views
// (All | Pricing | +Add Service | Group | +Add Group, a divider, Price Rules | Shop Publish | Inventory). Pure, so each rule is a test row;
// the page hands the items to the kit's `StripTabs` and `ViewLinks`. Every address is written by `productsPath`.
import { SERVICE_TYPES, TYPE_LABEL, type ServiceType } from '@/lib/serviceTypes';
import type { ProductsViewSpec } from '../components/products/types';
import { productsPath, type ProductsViewId } from './productsPath';

/** One tab of the strip of kinds. */
export type KindItem = { id: ServiceType; label: string; to: string };

/** One link of the row of views. `after: 'divider'` draws a thin divider after the link. */
export type ViewItem = { id: ProductsViewId; label: string; to: string; add?: boolean; after?: 'divider' };

/** The words of a kind on the strip: "IMEI Service", "Server Service", "Remote Service", "File Service". */
export function kindLabel(type: ServiceType): string {
  return `${TYPE_LABEL[type]} Service`;
}

// The list a view about one record belongs to: its link lights up in the row, and a change of kind goes to the list of the new kind (the
// record belongs to the old kind).
const LIST_OF_VIEW: Partial<Record<ProductsViewId, ProductsViewId>> = { edit: 'all', 'edit-group': 'groups' };

/** The first view with a link that the role may use (null when none): where a bare, unknown or forbidden address lands. */
export function firstListedView(usable: readonly ProductsViewSpec[]): ProductsViewSpec | null {
  return usable.find((spec) => spec.group !== 'hidden') ?? null;
}

/** The strip of kinds: every kind, each linking to the same view of that kind (a record's view goes to the list of the new kind). */
export function kindItems(view: ProductsViewId): KindItem[] {
  const target = LIST_OF_VIEW[view] ?? view;
  return SERVICE_TYPES.map((type) => ({
    id: type,
    label: kindLabel(type),
    to: productsPath({ view: target, type }),
  }));
}

/** The row of views the role may use for a kind, in the registry's order, with the divider between the two groups when both have links. */
export function viewItems(usable: readonly ProductsViewSpec[], type: ServiceType): ViewItem[] {
  const listed = usable.filter((spec) => spec.group !== 'hidden');
  const lastMain = listed.filter((spec) => spec.group === 'main').at(-1);
  const hasExtra = listed.some((spec) => spec.group === 'extra');
  return listed.map((spec) => ({
    id: spec.id,
    label: spec.label,
    to: productsPath({ view: spec.id, type }),
    ...(spec.add ? { add: true } : {}),
    ...(hasExtra && spec === lastMain ? { after: 'divider' as const } : {}),
  }));
}

/** The link to light for a view: the view's own, or the list an edit view belongs to. */
export function currentLink(view: ProductsViewId): ProductsViewId {
  return LIST_OF_VIEW[view] ?? view;
}
