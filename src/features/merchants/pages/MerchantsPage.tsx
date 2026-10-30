// MerchantsPage: the merchants list (`/merchants`, the demo's `pageMerchants` in 42-p-merchants.js): counts, status tabs plus
// Groups and Verification (map-only), filters and the table. Tab, filters, page and sort live in the address; the page only
// composes, and the server filters, sorts and counts.
import { useState } from 'react';
import { EmptyState, Panel, SectionTabs, SkeletonTable, usePageClamp, type TabItem } from '@/components/ui';
import { useNow } from '@/lib/format';
import { GroupsTab } from '../components/GroupsTab';
import { InviteMerchantDialog } from '../components/InviteMerchantDialog';
import { MerchantsEmpty } from '../components/MerchantsEmpty';
import { MerchantsHeader } from '../components/MerchantsHeader';
import { MerchantsToolbar } from '../components/MerchantsToolbar';
import { MerchantTable } from '../components/MerchantTable';
import { VerificationTab } from '../components/VerificationTab';
import { useApproveClient } from '../hooks/useClientMutations';
import { useClientGroups } from '../hooks/useClientGroups';
import { useClientsList } from '../hooks/useClientsList';
import { useMerchantCounts } from '../hooks/useMerchantCounts';
import { useMerchantGrants } from '../hooks/useMerchantGrants';
import { useMerchantView } from '../hooks/useMerchantView';
import { hasActiveFilters, PAGE_SIZE, toClientFilters } from '../lib/filters';
import { isStatusTab, MERCHANT_TABS, type MerchantTab } from '../lib/status';

export function MerchantsPage() {
  const grants = useMerchantGrants();
  const visible = MERCHANT_TABS.filter((spec) => grants.can(spec.permission));
  const view = useMerchantView(visible.map((spec) => spec.id));
  const counts = useMerchantCounts(grants.can);
  const now = useNow();
  const [inviting, setInviting] = useState(false);
  const canReadGroups = grants.can('groups:read');
  const groups = useClientGroups(canReadGroups);
  const approve = useApproveClient();

  const tab = view.tab;
  const onTable = tab !== undefined && isStatusTab(tab);
  const list = useClientsList({
    filters: toClientFilters(tab ?? 'all', view.filters),
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: onTable,
  });
  // A shrinking list (an approval, a filter, an old link) must not leave the table on an empty page.
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: onTable && list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  const items: TabItem<MerchantTab>[] = visible.map((spec) => ({
    value: spec.id,
    label: spec.label,
    count: counts[spec.id],
  }));
  const filtersOn = hasActiveFilters(view.filters);
  const noMerchants = counts.all === 0 || (tab === 'all' && !filtersOn && list.total === 0);
  const inviteLock = grants.needs('clients:create');

  return (
    <>
      <MerchantsHeader
        grants={grants}
        active={counts.active}
        pending={counts.pending}
        onInvite={() => setInviting(true)}
      />
      <Panel flush>
        {!grants.ready ? (
          <SkeletonTable cols={6} rows={6} />
        ) : !tab ? (
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot read merchants, groups or verification requests. Ask an owner if you need access.
          </EmptyState>
        ) : (
          <>
            <SectionTabs items={items} value={tab} onChange={view.setTab} label="Merchant status" />
            {tab === 'groups' ? (
              <GroupsTab grants={grants} />
            ) : tab === 'verification' ? (
              <VerificationTab
                grants={grants}
                filter={view.kycFilter}
                page={view.page}
                onFilterChange={view.setKycFilter}
                onPageChange={view.setPage}
              />
            ) : (
              <>
                <MerchantsToolbar
                  filters={view.filters}
                  onChange={view.setFilters}
                  onClear={view.clearFilters}
                  total={list.total}
                  groups={canReadGroups ? groups.groups : undefined}
                />
                <div className="border-t border-line">
                  <MerchantTable
                    rows={list.clients}
                    state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
                    error={list.query.error}
                    onRetry={() => void list.query.refetch()}
                    now={now}
                    sort={view.sort}
                    onSortChange={view.setSort}
                    pagination={{
                      page: view.page,
                      pageSize: PAGE_SIZE,
                      total: list.total ?? list.clients.length,
                    }}
                    onPageChange={view.setPage}
                    grants={grants}
                    approving={approve.isPending ? (approve.variables?.id ?? null) : null}
                    onApprove={(client) => approve.mutate(client)}
                    empty={
                      <MerchantsEmpty
                        tab={tab}
                        filtersOn={filtersOn}
                        noMerchants={noMerchants}
                        invite={inviteLock}
                        onInvite={() => setInviting(true)}
                        onClear={view.clearFilters}
                      />
                    }
                  />
                </div>
              </>
            )}
          </>
        )}
      </Panel>
      {inviting && (
        <InviteMerchantDialog
          groups={canReadGroups ? groups.groups : undefined}
          onClose={() => setInviting(false)}
        />
      )}
    </>
  );
}
