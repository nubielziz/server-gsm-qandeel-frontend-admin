// ShopProposal: the shop price change that waits for a person (a proposal of the follow pass) for one service, with Apply and Keep.
// It reads GET /admin/retail-price-changes for the service and settles it through the same resolve call the shop price rules use.
import { useState } from 'react';
import { Badge, Button, ErrorState, Icon, KeyValue } from '@/components/ui';
import { money } from '@/lib/format';
import type { Id } from '@/lib/api';
import { useResolveRetailChanges, useServiceProposal } from '../../hooks/useRetailPricing';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { changeWords, skippedText } from '../../lib/retailPricing';
import type { ResolveRetailPriceChangesBody } from '../../types';

export interface ShopProposalProps {
  serviceId: Id;
  grants: StorefrontGrants;
}

/** Nothing while no proposal waits. Needs pricing:read to read; Apply and Keep need pricing:update. */
export function ShopProposal({ serviceId, grants }: ShopProposalProps) {
  const proposal = useServiceProposal(serviceId, grants.ready && grants.can('pricing:read'));
  const resolve = useResolveRetailChanges();
  const [skipped, setSkipped] = useState<string | null>(null);
  const change = proposal.data;

  if (proposal.isError && !change) {
    return (
      <ErrorState
        title="Could not load the waiting price change"
        error={proposal.error}
        onRetry={() => void proposal.refetch()}
      />
    );
  }
  if (!change) return null;

  const words = changeWords(change);
  const lock = grants.needs('pricing:update');
  // A proposal with no new price (the service has no cost) cannot be applied: the server would skip it.
  const noPrice = change.newPrice === null;
  const applyTitle = lock.title ?? (noPrice ? 'There is no new price to apply' : undefined);

  const send = async (action: ResolveRetailPriceChangesBody['action']) => {
    const body: ResolveRetailPriceChangesBody =
      action === 'apply'
        ? { action, ids: [change.id], seen: [{ id: change.id, newPrice: change.newPrice }] }
        : { action, ids: [change.id] };
    try {
      // The service goes along (never sent) so its record is read again: the panel then shows the new price and drops the waiting mark.
      const result = await resolve.mutateAsync({ ...body, serviceIds: [serviceId] });
      const skip = result.skipped[0];
      setSkipped(skip ? skippedText(skip, change.service.name) : null);
    } catch {
      // The default error toast shows the server's words.
    }
  };

  return (
    <div
      role="group"
      aria-label="Waiting price change"
      className="space-y-2 rounded-md border border-line p-3"
    >
      <Badge tone={words.tone} icon={words.icon}>
        {words.label}
      </Badge>
      <KeyValue
        rows={[
          ['Shop price now', money(change.oldPrice)],
          ['New price', change.newPrice === null ? 'None' : money(change.newPrice)],
          ['Cost', `${money(change.oldCost)} to ${money(change.newCost)}`],
          change.rule && ['Rule', change.rule.label],
        ]}
      />
      {words.note && <p className="hint">{words.note}</p>}
      <div className="flex flex-wrap gap-2">
        <span title={applyTitle} className="inline-flex">
          <Button
            size="sm"
            variant="primary"
            loading={resolve.isPending}
            disabled={lock.disabled || noPrice}
            onClick={() => void send('apply')}
          >
            <Icon name="check" className="ic-sm" />
            Apply the new price
          </Button>
        </span>
        <span title={lock.title} className="inline-flex">
          <Button size="sm" disabled={lock.disabled || resolve.isPending} onClick={() => void send('keep')}>
            Keep the current price
          </Button>
        </span>
      </div>
      {skipped && (
        <p role="status" className="text-sm text-warn-fg">
          {skipped}
        </p>
      )}
    </div>
  );
}
