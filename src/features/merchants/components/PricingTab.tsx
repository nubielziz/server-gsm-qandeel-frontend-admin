// PricingTab: the "Pricing" tab of a merchant's page: the price group and the client overrides (fixed prices that beat every other
// rule), with Add, Edit and Remove. Ports merPricingTab of 42-p-merchants.js. The demo's category-rule line and its second table
// of group service prices have no route in this feature (MISMATCHES M50); the group price shows beside each override instead.
import { useState } from 'react';
import { Button, Icon, KeyValue, QueryState, SkeletonTable } from '@/components/ui';
import { useClientPrices } from '../hooks/useClientPrices';
import type { MerchantGrants } from '../hooks/useMerchantGrants';
import { percentText } from '../lib/groups';
import type { Client, ClientPrice } from '../types';
import { DeletePriceDialog } from './DeletePriceDialog';
import { PriceDialog } from './PriceDialog';
import { PriceTable } from './PriceTable';

type Dialog = { kind: 'add' } | { kind: 'edit' | 'remove'; price: ClientPrice };

/** Shows the price group and the overrides, and owns the add, edit and remove dialogs. */
export function PricingTab({ client, grants }: { client: Client; grants: MerchantGrants }) {
  const { prices, query } = useClientPrices(client.id, grants.can('pricing:read'));
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('pricing:create');
  const group = client.group;
  const discount = group ? Number(group.discountPercent) : 0;

  return (
    <div className="p-3.5">
      <KeyValue
        className="mb-5"
        rows={[
          [
            'Price group',
            group ? (
              <>
                {group.name}{' '}
                <span className="text-ink3">
                  · {discount > 0 ? `${percentText(group.discountPercent)} off base price` : 'base prices'}
                </span>
              </>
            ) : (
              '–'
            ),
          ],
        ]}
      />
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">Client overrides</h3>
        <span className="text-xs text-ink3">Fixed prices that beat every other rule</span>
        <span className="flex-1" />
        <Button
          size="sm"
          disabled={createLock.disabled}
          title={createLock.title}
          onClick={() => setDialog({ kind: 'add' })}
        >
          <Icon name="plus" className="ic-sm" />
          Add override
        </Button>
      </div>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the overrides"
        skeleton={<SkeletonTable cols={4} rows={3} />}
        isEmpty={prices.length === 0}
        empty={
          <p className="rounded-lg border border-dashed border-line2 p-4 text-sm text-ink3">
            No overrides. This merchant pays the {group?.name ?? 'group'} group price on every service.
          </p>
        }
      >
        <div className="rounded-lg border border-line">
          <PriceTable
            rows={prices}
            grants={grants}
            onEdit={(price) => setDialog({ kind: 'edit', price })}
            onRemove={(price) => setDialog({ kind: 'remove', price })}
          />
        </div>
      </QueryState>

      {dialog && dialog.kind !== 'remove' && (
        <PriceDialog
          client={client}
          price={dialog.kind === 'edit' ? dialog.price : undefined}
          existing={prices}
          canListServices={grants.can('catalog:read')}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'remove' && (
        <DeletePriceDialog client={client} price={dialog.price} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}
