// MerchantDetail: the body of a merchant's page (`/merchants/:id`, `pageMerchant` in 42-p-merchants.js): header and actions,
// a pending/suspended note, five figures and the Orders, Wallet ledger, Pricing and API access tabs (`?tab=`). It only
// composes; tabs the staff member may not read are left out, and the order drawer opens in the address.
import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  EmptyState,
  ErrorState,
  Panel,
  SectionTabs,
  SkeletonStat,
  SkeletonTable,
  type TabItem,
} from '@/components/ui';
import { useBreadcrumbTitle } from '@/app/layout/breadcrumbTitle';
import { OrderDrawerHost } from '@/features/orders';
import { isApiError } from '@/lib/api';
import { useNow } from '@/lib/format';
import { ApiAccessTab } from './ApiAccessTab';
import { MerchantDialogs, type MerchantDialogState } from './MerchantDialogs';
import { MerchantHeader } from './MerchantHeader';
import { MerchantNotFound } from './MerchantNotFound';
import { MerchantNote } from './MerchantNote';
import { MerchantOrdersTab } from './MerchantOrdersTab';
import { MerchantStats } from './MerchantStats';
import { PricingTab } from './PricingTab';
import { WalletTab } from './WalletTab';
import { useClient } from '../hooks/useClient';
import { useClientGroups } from '../hooks/useClientGroups';
import { useClientWallet } from '../hooks/useClientWallet';
import { useMerchantGrants } from '../hooks/useMerchantGrants';
import { DETAIL_TABS, parseDetailTab, writeDetailTab } from '../lib/detailTabs';
import type { DetailTab } from '../lib/paths';

// What the page shows while it loads: the figures strip and the tab panel, as skeletons.
const LOADING = (
  <>
    <SkeletonStat cells={5} />
    <Panel flush>
      <SkeletonTable cols={5} rows={6} />
    </Panel>
  </>
);

/** `id` is null when the address holds no usable id; the page then says the merchant does not exist. */
export function MerchantDetail({ id }: { id: number | null }) {
  const grants = useMerchantGrants();
  const { client, query } = useClient(id);
  const now = useNow();
  const canReadGroups = grants.can('groups:read');
  const groups = useClientGroups(canReadGroups);
  const canReadWallet = grants.can('wallet:read');
  const wallet = useClientWallet(id ?? 0, id !== null && canReadWallet);
  const [dialog, setDialog] = useState<MerchantDialogState | null>(null);
  const [params, setParams] = useSearchParams();
  const setTab = useCallback(
    (tab: DetailTab) => setParams((prev) => writeDetailTab(prev, tab), { replace: true }),
    [setParams],
  );
  useBreadcrumbTitle(client?.name);

  if (id === null || (query.isError && isApiError(query.error) && query.error.status === 404)) {
    return <MerchantNotFound />;
  }
  if (!client && query.isError) {
    return (
      <Panel flush>
        <ErrorState
          title="Could not load the merchant"
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      </Panel>
    );
  }
  // Until the merchant and the staff member's permissions are known, show the page's shape instead of a wrong "no access".
  if (!client || !grants.ready) return LOADING;

  const visible = DETAIL_TABS.filter((spec) => grants.can(spec.permission));
  const current = parseDetailTab(
    params,
    visible.map((spec) => spec.id),
  );
  const items: TabItem<DetailTab>[] = visible.map((spec) => ({ value: spec.id, label: spec.label }));
  const walletNote = !canReadWallet
    ? 'Needs wallet:read'
    : wallet.isError
      ? 'Could not load'
      : wallet.isLoading
        ? 'Loading…'
        : undefined;

  return (
    <>
      <MerchantHeader
        client={client}
        groups={canReadGroups ? groups.groups : undefined}
        groupsLoading={canReadGroups && groups.query.isLoading}
        grants={grants}
        now={now}
        onAdjust={() => setDialog({ kind: 'adjust' })}
        onCreditLimit={() => setDialog({ kind: 'credit' })}
        onSuspend={() => setDialog({ kind: 'suspend' })}
      />
      <MerchantNote client={client} />
      <MerchantStats client={client} wallet={wallet.data} walletNote={walletNote} />
      <Panel flush>
        {!current ? (
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot read orders, the wallet, prices or API keys. Ask an owner if you need access.
          </EmptyState>
        ) : (
          <>
            <SectionTabs items={items} value={current} onChange={setTab} label="Merchant sections" />
            <div role="tabpanel" aria-label={DETAIL_TABS.find((spec) => spec.id === current)?.label}>
              {current === 'orders' && <MerchantOrdersTab client={client} />}
              {current === 'wallet' && <WalletTab client={client} grants={grants} />}
              {current === 'pricing' && <PricingTab client={client} grants={grants} />}
              {current === 'api' && <ApiAccessTab client={client} grants={grants} />}
            </div>
          </>
        )}
      </Panel>
      <OrderDrawerHost />
      <MerchantDialogs dialog={dialog} client={client} wallet={wallet.data} onClose={() => setDialog(null)} />
    </>
  );
}
