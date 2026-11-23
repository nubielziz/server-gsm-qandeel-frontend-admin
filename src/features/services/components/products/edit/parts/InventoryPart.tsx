// InventoryPart: the "Inventory" part of the edit view: the codes this service delivers from stock. Counts by status, the codes pasted or added from
// a file, and the list of the stored codes (masked by the server) with the footer pager and the void action. Each section works on its own.
import { useState } from 'react';
import { EmptyState, FooterPager, SectionHeading, WithSelected, Button, Icon } from '@/components/ui';
import { VoidCodesDialog } from '../../../VoidCodesDialog';
import type { ServicePartProps } from '../../types';
import { ImportCodesForm } from './inventory/ImportCodesForm';
import { StockCounts } from './inventory/StockCounts';
import { StockTable } from './inventory/StockTable';
import { StockToolbar } from './inventory/StockToolbar';
import { useStockCounts } from './inventory/useStockCounts';
import { useStockList } from './inventory/useStockList';

/**
 * The part needs `inventory:read` (its registry row); importing and voiding need `inventory:write` and say so when they are off. The
 * pasted codes make the part dirty until they are imported. Page, size and status are the part's own state.
 */
export function InventoryPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const ready = grants.ready;
  const stock = useStockList(service.id, ready);
  const { counts, failed, refresh } = useStockCounts(service.id, ready);
  const [voiding, setVoiding] = useState(false);
  const writeLock = grants.needs('inventory:write');
  const { selection, codes } = stock;
  // Only unsold codes can be voided; the server skips the others and says so.
  const unsold = codes.filter((code) => selection.has(code.id) && code.status === 'available');

  return (
    <div className="view-frame">
      <div>
        <SectionHeading as="h3">Import codes</SectionHeading>
        <ImportCodesForm serviceId={service.id} lock={writeLock} onDirtyChange={onDirtyChange} />
        <SectionHeading as="h3">Stored codes</SectionHeading>
        <StockCounts counts={counts} failed={failed} />
        <div className="mt-3">
          <StockToolbar
            status={stock.status}
            onStatus={stock.setStatus}
            onRefresh={() => {
              void refresh();
              void stock.query.refetch();
            }}
          />
          <StockTable
            rows={codes}
            state={stock.query.isLoading ? 'loading' : stock.query.isError ? 'error' : 'ready'}
            error={stock.query.error}
            onRetry={() => void stock.query.refetch()}
            selection={selection}
            empty={
              stock.status ? (
                <EmptyState
                  icon="filter"
                  title="No codes match"
                  cta={<Button onClick={() => stock.setStatus('')}>Show all statuses</Button>}
                >
                  This service has no code with that status.
                </EmptyState>
              ) : (
                <EmptyState icon="inbox" title="No codes in stock">
                  Paste the codes above and import them. They appear here, masked.
                </EmptyState>
              )
            }
          />
          <WithSelected
            count={selection.selected.size}
            onCheckAll={() =>
              selection.setMany(
                codes.map((code) => code.id),
                true,
              )
            }
            onUncheckAll={selection.clear}
          >
            <Button
              size="sm"
              variant="danger"
              disabled={writeLock.disabled || unsold.length === 0}
              title={
                writeLock.title ?? (unsold.length === 0 ? 'None of the ticked codes is unsold' : undefined)
              }
              onClick={() => setVoiding(true)}
            >
              <Icon name="ban" className="ic-sm" />
              Void unsold codes…
            </Button>
          </WithSelected>
        </div>
        {voiding && (
          <VoidCodesDialog
            ids={unsold.map((code) => code.id)}
            onClose={() => setVoiding(false)}
            onDone={selection.clear}
          />
        )}
      </div>
      <FooterPager
        page={stock.page}
        pageSize={stock.size}
        total={stock.total}
        onPage={stock.setPage}
        onPageSize={stock.setSize}
      />
    </div>
  );
}
