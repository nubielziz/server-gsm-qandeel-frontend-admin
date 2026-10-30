// CustomersPage: the storefront customers (`/customers`, the demo's `pageCustomers` in 48-p-customers.js): the people-and-accounts sentence, tabs with
// counts (and Data requests for `customers:privacy`), a toolbar and the table. Tab, filters, page and sort live in the address (`?tab=flagged&q=…`).
// The page only composes; the server filters, sorts and counts.
import { useState } from 'react';
import { Panel, SectionTabs, usePageClamp, type TabItem } from '@/components/ui';
import { useNow } from '@/lib/format';
import { AddCustomerFlow } from '../components/AddCustomerFlow';
import { CustomersEmpty } from '../components/CustomersEmpty';
import { CustomersHeader } from '../components/CustomersHeader';
import { CustomersToolbar } from '../components/CustomersToolbar';
import { CustomerTable } from '../components/CustomerTable';
import { DataRequestsTab } from '../components/DataRequestsTab';
import { useCustomerCounts } from '../hooks/useCustomerCounts';
import { useCustomerGrants } from '../hooks/useCustomerGrants';
import { useCustomerView } from '../hooks/useCustomerView';
import { useCustomersList } from '../hooks/useCustomersList';
import { useVisibleTabs } from '../hooks/useVisibleTabs';
import { hasActiveFilters, PAGE_SIZE, toListFilters, type CustomerTab } from '../lib/filters';

export function CustomersPage() {
  const grants = useCustomerGrants();
  const view = useCustomerView();
  const now = useNow();
  const [adding, setAdding] = useState(false);

  // Tabs the staff member may not open are hidden, and a link to one lands on All.
  const { visible, tab, sort } = useVisibleTabs(view, grants);
  const onRequests = tab === 'requests';
  const filters = { ...view.filters, tab };

  const counts = useCustomerCounts({ enabled: grants.ready, privacy: grants.can('customers:privacy') });
  const list = useCustomersList({
    filters: toListFilters(filters),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort,
    enabled: grants.ready && !onRequests,
  });
  // A shrinking list (a refresh, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: !onRequests && list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  const items: TabItem<CustomerTab>[] = visible.map((candidate) => ({
    value: candidate.id,
    label: candidate.label,
    count: counts.tabs[candidate.id],
  }));
  const filtersOn = hasActiveFilters(filters);
  const noCustomers = counts.tabs.all === 0 || (tab === 'all' && !filtersOn && list.total === 0);
  const addLock = grants.needs('customers:create');

  return (
    <>
      <CustomersHeader
        grants={grants}
        total={counts.tabs.all}
        withAccount={counts.withAccount}
        onAdd={() => setAdding(true)}
      />
      <Panel flush>
        <SectionTabs
          items={items}
          value={tab}
          onChange={(next) => view.setFilters({ tab: next })}
          label="Customer filter"
        />
        {onRequests ? (
          <DataRequestsTab
            now={now}
            page={view.page}
            sort={sort}
            status={filters.status}
            onPageChange={view.setPage}
            onSortChange={view.setSort}
            onStatusChange={(next) => view.setFilters({ status: next })}
          />
        ) : (
          <>
            <CustomersToolbar
              filters={filters}
              onChange={view.setFilters}
              onClear={view.clearFilters}
              total={list.total}
            />
            <div className="border-t border-line">
              <CustomerTable
                rows={list.customers}
                state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
                error={list.query.error}
                onRetry={() => void list.query.refetch()}
                now={now}
                sort={sort}
                onSortChange={view.setSort}
                pagination={{
                  page: view.page,
                  pageSize: PAGE_SIZE,
                  total: list.total ?? list.customers.length,
                }}
                onPageChange={view.setPage}
                empty={
                  <CustomersEmpty
                    noCustomers={noCustomers}
                    filtersOn={filtersOn}
                    onClear={view.clearFilters}
                    onAdd={addLock.disabled ? undefined : () => setAdding(true)}
                  />
                }
              />
            </div>
          </>
        )}
      </Panel>
      {adding && <AddCustomerFlow onClose={() => setAdding(false)} />}
    </>
  );
}
