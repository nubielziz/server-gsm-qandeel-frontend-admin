// ListingsTab: the "Services on sale" tab: the figures, the search, the table with its switch and Price button, and the two
// dialogs. Ports `tabListings`, `sf-list` and `sf-price` of 50-p-storefront.js. Search, page and sort live in the address; the
// server filters, sorts and counts, and works out every price figure and every refusal.
import { useState } from 'react';
import { Button, Icon, Panel, usePageClamp } from '@/components/ui';
import { useSetListed } from '../hooks/useListingMutations';
import { useListView } from '../hooks/useListView';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { hasActiveFilters, LISTING_VIEW, PAGE_SIZE, toRefineFilters } from '../lib/views';
import type { ServiceListing } from '../types';
import { ListingCreateDialog } from './ListingCreateDialog';
import { ListingStats } from './ListingStats';
import { ListingTable } from './ListingTable';
import { ListingsEmpty } from './ListingsEmpty';
import { ListToolbar } from './ListToolbar';
import { PriceDialog } from './PriceDialog';

type Dialog = { kind: 'create' } | { kind: 'price'; listing: ServiceListing };

/** Figures, search, table and dialogs; owns the switch's request. */
export function ListingsTab({ grants }: { grants: StorefrontGrants }) {
  const { view, setQuery, clear, setPage, setSort } = useListView(LISTING_VIEW);
  const list = useStorefrontList<ServiceListing>('service-listings', {
    filters: toRefineFilters(view.q),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.ready,
  });
  // A shrinking list (a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });
  const setListed = useSetListed();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const filtered = hasActiveFilters(view);
  const add = grants.needsAll('storefront:create', 'catalog:read');

  return (
    <>
      <ListingStats enabled={grants.can('storefront:read')} />
      <Panel
        title="What the public can buy"
        sub="Only IMEI services are sold to the public. A retail price can never go below the floor the server sets for the service, so merchants never find it cheaper to buy on the storefront."
        right={
          <Button
            variant="primary"
            size="sm"
            disabled={add.disabled}
            title={add.title}
            onClick={() => setDialog({ kind: 'create' })}
          >
            <Icon name="plus" className="ic-sm" />
            Add listing…
          </Button>
        }
        flush
      >
        <ListToolbar
          query={view.q}
          onQuery={setQuery}
          placeholder="Search service, code, slug"
          total={list.total}
          noun={['listing', 'listings']}
          filtered={filtered}
          onClear={clear}
        />
        <div className="border-t border-line">
          <ListingTable
            rows={list.rows}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            sort={view.sort}
            onSortChange={setSort}
            pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.rows.length }}
            onPageChange={setPage}
            empty={<ListingsEmpty noListings={!filtered && list.total === 0} onClear={clear} />}
            lock={grants.needs('storefront:update')}
            busyId={setListed.isPending ? setListed.variables?.listing.id : undefined}
            onToggle={(listing, on) => setListed.mutate({ listing, on })}
            onEditPrice={(listing) => setDialog({ kind: 'price', listing })}
          />
        </div>
      </Panel>
      {dialog?.kind === 'create' && <ListingCreateDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'price' && <PriceDialog listing={dialog.listing} onClose={() => setDialog(null)} />}
    </>
  );
}
