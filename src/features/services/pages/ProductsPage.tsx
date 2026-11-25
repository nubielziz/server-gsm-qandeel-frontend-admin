// ProductsPage: "Product / Services", the page that replaces the Catalog page (decision 022). A strip of tabs, one per kind of service, then a
// row of text links, one per view (All, Pricing, +Add Service, Group, +Add Group, then our Price Rules, Shop Publish and Inventory); each
// link is a full view of the page. The page only composes: the registry (lib/productsViews) says which views exist and who may use them,
// each view owns its data, and the server computes every price figure. A role opens the first view it may use; without catalog:read the
// services list is never mounted or read. The page is one frame as tall as the window: the heading and the two rows of links keep their
// height and the view fills what is left, so a short view ends with its bar at the foot and nothing scrolls (index.css, .page-frame).
import { EmptyState, PageHeader, SkeletonTable } from '@/components/ui';
import { SERVICE_TYPES } from '@/lib/serviceTypes';
import { useTabEnter } from '@/lib/motion';
import { ProductsNav } from '../components/products/ProductsNav';
import { useProductsAddress } from '../hooks/useProductsAddress';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { PRODUCTS_HEADING } from '../lib/productsPage';
import { PRODUCTS_VIEW_SPECS, usableViews } from '../lib/productsViews';

/** The page: the kind and the view the address names, or the first view the role may use. */
export function ProductsPage() {
  const grants = useServiceGrants();
  const usable = grants.ready ? usableViews(grants, PRODUCTS_VIEW_SPECS) : undefined;
  const { type, view } = useProductsAddress(usable);
  const spec = view ? usable?.find((candidate) => candidate.id === view) : undefined;
  // The view fades in from the side of the kind or link that was clicked: the kinds of the strip come first in the order, and the views
  // of the row in each kind. A hook, so it comes before the early returns below.
  const viewBox = useTabEnter(
    view ? `${type}:${view}` : '',
    SERVICE_TYPES.flatMap((kind) => (usable ?? []).map((candidate) => `${kind}:${candidate.id}`)),
  );

  if (view === null) {
    return (
      <>
        <PageHeader title={PRODUCTS_HEADING} />
        <EmptyState icon="lock" title="Nothing here for your role">
          Your role cannot see services, prices, the code stock or the publish runs. Ask an owner if you need
          access.
        </EmptyState>
      </>
    );
  }
  if (!usable || !view || !spec) {
    return (
      <>
        <PageHeader title={PRODUCTS_HEADING} />
        <SkeletonTable cols={5} rows={6} />
      </>
    );
  }
  return (
    <div className="page-frame">
      <PageHeader title={PRODUCTS_HEADING} />
      <ProductsNav type={type} view={view} usable={usable} />
      <section ref={viewBox} aria-label={spec.label} className="flex flex-1 flex-col">
        {/* A new kind or view starts with fresh state; what a view keeps (page, filters) lives in the address. */}
        <spec.Component key={`${view}:${type}`} type={type} grants={grants} />
      </section>
    </div>
  );
}
