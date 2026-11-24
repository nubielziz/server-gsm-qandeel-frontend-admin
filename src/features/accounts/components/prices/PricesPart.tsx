// PricesPart: the "Prices" part of an account's record (for an account with a merchant rank and a login): the rank and what it means for prices,
// and the fixed prices of this account with Add fixed price…, edit and remove. A fixed price beats every other rule for the account. The
// fixed prices are read whole and paged in the browser. One account's grid of prices by rank is a follow-up, not part of this release.
import { useState } from 'react';
import { Button, FooterPager, FormRow, Icon, ReadValue, SectionHeading } from '@/components/ui';
import { useAccountPrices } from '../../hooks/useAccountPrices';
import type { AccountPrice } from '../../types';
import type { AccountPartProps } from '../types';
import { PriceDialog } from './PriceDialog';
import { PriceTable } from './PriceTable';
import { discountWords, paysWords } from './priceWords';
import { RemovePriceDialog } from './RemovePriceDialog';

type Dialog = { kind: 'add' } | { kind: 'edit' | 'remove'; price: AccountPrice };

const DEFAULT_SIZE = 50;

/** The rank's prices and the fixed prices of one account. Its dialogs are mounted only while open. */
export function PricesPart({ account, grants }: AccountPartProps) {
  const { prices, query } = useAccountPrices(account.id, grants.can('pricing:read'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const createLock = grants.needs('pricing:create');
  const { rank } = account;

  const current = Math.min(page, Math.max(1, Math.ceil(prices.length / size)));
  const shown = prices.slice((current - 1) * size, current * size);

  return (
    <div className="view-frame">
      <div>
        <FormRow label="Rank">
          <ReadValue>{rank.name}</ReadValue>
        </FormRow>
        <FormRow label="Rank discount">
          <ReadValue>{discountWords(rank.discountPercent)}</ReadValue>
        </FormRow>
        <FormRow label="Without a fixed price">
          <ReadValue>{paysWords(rank.name)}</ReadValue>
        </FormRow>

        <SectionHeading>Fixed prices</SectionHeading>
        <p className="cell-sub mb-2">A fixed price beats every other rule for this account.</p>
        <PriceTable
          rows={shown}
          state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={
            <p className="py-3 text-sm text-ink3">
              No fixed prices. This account pays the {rank.name} price on every service.
            </p>
          }
          updateLock={grants.needs('pricing:update')}
          deleteLock={grants.needs('pricing:delete')}
          onEdit={(price) => setDialog({ kind: 'edit', price })}
          onRemove={(price) => setDialog({ kind: 'remove', price })}
        />
        <div className="mt-3">
          <Button
            size="sm"
            disabled={createLock.disabled}
            title={createLock.title}
            onClick={() => setDialog({ kind: 'add' })}
          >
            <Icon name="plus" className="ic-sm" />
            Add fixed price…
          </Button>
        </div>

        {dialog && dialog.kind !== 'remove' && (
          <PriceDialog
            account={account}
            price={dialog.kind === 'edit' ? dialog.price : undefined}
            existing={prices}
            canListServices={grants.can('catalog:read')}
            onClose={() => setDialog(null)}
          />
        )}
        {dialog?.kind === 'remove' && (
          <RemovePriceDialog rank={rank} price={dialog.price} onClose={() => setDialog(null)} />
        )}
      </div>
      <FooterPager
        page={current}
        pageSize={size}
        total={prices.length}
        onPage={setPage}
        onPageSize={(next) => {
          setSize(next);
          setPage(1);
        }}
      />
    </div>
  );
}
