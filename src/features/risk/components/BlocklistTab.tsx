// BlocklistTab: the Blocklist tab: a panel with the type filter, the table, Add… and Remove. Ports `tabBlock` of 54-p-risk.js.
// The filter, page and sort live in the address; the server filters, sorts and counts. Add needs `risk:create`, Remove
// `risk:delete` (hints only: the server decides).
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, SelectField, TableToolbar, usePageClamp } from '@/components/ui';
import { num, useNow } from '@/lib/format';
import { useBlocklistList } from '../hooks/useBlocklist';
import type { RiskGrants } from '../hooks/useRiskGrants';
import type { useRiskView } from '../hooks/useRiskView';
import { BLOCK_KIND_LABEL, BLOCK_KINDS } from '../lib/labels';
import { RISK_PERMISSION } from '../lib/permissions';
import { BLOCK_PAGE_SIZE, toBlockFilters, type BlockView } from '../lib/view';
import type { BlocklistEntry } from '../types';
import { AddBlockDialog } from './AddBlockDialog';
import { BlocklistTable } from './BlocklistTable';
import { RemoveBlockDialog } from './RemoveBlockDialog';

export interface BlocklistTabProps {
  view: ReturnType<typeof useRiskView>;
  grants: RiskGrants;
}

export function BlocklistTab({ view, grants }: BlocklistTabProps) {
  const now = useNow();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<BlocklistEntry | null>(null);
  const list = useBlocklistList({
    filters: toBlockFilters(view.block),
    page: view.page,
    pageSize: BLOCK_PAGE_SIZE,
    sort: view.sort,
  });
  usePageClamp({
    page: view.page,
    pageSize: BLOCK_PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage: view.setPage,
  });

  const lock = grants.needs(RISK_PERMISSION.addBlock);
  const filtered = view.block.kind !== '';
  const add = (primary: boolean) => (
    <Button
      variant={primary ? 'primary' : 'default'}
      size={primary ? 'sm' : 'md'}
      {...lock}
      onClick={() => setAdding(true)}
    >
      <Icon name="plus" className="ic-sm" />
      {primary ? 'Add' : 'Add to blocklist'}
    </Button>
  );

  return (
    <>
      <Panel
        title="Blocklist"
        sub="Anyone or anything on this list cannot place an order. Chargebacks add entries automatically. Network addresses live under Admins and access."
        right={add(true)}
        flush
      >
        <TableToolbar
          count={
            list.total === undefined
              ? undefined
              : `${num(list.total)} ${list.total === 1 ? 'entry' : 'entries'}`
          }
        >
          <SelectField
            aria-label="Filter by type"
            value={view.block.kind}
            options={[
              { value: '', label: 'All types' },
              ...BLOCK_KINDS.map((kind) => ({ value: kind, label: BLOCK_KIND_LABEL[kind] })),
            ]}
            onChange={(event) => view.setBlock({ kind: event.target.value as BlockView['kind'] })}
          />
        </TableToolbar>
        <div className="border-t border-line">
          <BlocklistTable
            rows={list.entries}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            onRetry={() => void list.query.refetch()}
            now={now}
            sort={view.sort}
            onSortChange={view.setSort}
            pagination={{
              page: view.page,
              pageSize: BLOCK_PAGE_SIZE,
              total: list.total ?? list.entries.length,
            }}
            onPageChange={view.setPage}
            grants={grants}
            onRemove={setRemoving}
            empty={
              <EmptyState
                icon="ban"
                title={filtered ? 'Nothing of this type is blocked' : 'Nothing is blocked'}
                cta={filtered ? undefined : add(false)}
              >
                {filtered
                  ? 'Choose another type, or add one.'
                  : 'Add an email, domain, card or IMEI that should never be able to buy.'}
              </EmptyState>
            }
          />
        </div>
      </Panel>
      {adding && <AddBlockDialog onClose={() => setAdding(false)} />}
      {removing && <RemoveBlockDialog entry={removing} onClose={() => setRemoving(null)} />}
    </>
  );
}
