// ShopProposal: the shop price change that waits for a person (a proposal of the follow pass) for one service, with Apply and Keep, as a
// section of the Retail Purchase part (label-left rows, a plain square for its state). It reads GET /admin/retail-price-changes for the
// service and settles it through the same resolve call the shop price rules use. Nothing is drawn while no proposal waits.
import { useState } from 'react';
import {
  Button,
  ErrorState,
  FormRow,
  Icon,
  SectionHeading,
  StatusSquare,
  type BadgeTone,
  type SquareTone,
  ReadValue,
} from '@/components/ui';
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

/** The square of a proposal's state: what waits for a person is a warning, a closed one is plain. */
const SQUARE: Record<BadgeTone, SquareTone> = {
  good: 'ok',
  neutral: 'off',
  accent: 'warn',
  warn: 'warn',
  serious: 'warn',
  crit: 'crit',
};

/** Nothing while no proposal waits. Needs pricing:read to read; Apply and Keep need pricing:update. */
export function ShopProposal({ serviceId, grants }: ShopProposalProps) {
  const proposal = useServiceProposal(serviceId, grants.ready && grants.can('pricing:read'));
  const resolve = useResolveRetailChanges();
  const [skipped, setSkipped] = useState<string | null>(null);
  const change = proposal.data;

  if (proposal.isError && !change) {
    return (
      <>
        <SectionHeading>Waiting price change</SectionHeading>
        <ErrorState
          title="Could not load the waiting price change"
          error={proposal.error}
          onRetry={() => void proposal.refetch()}
        />
      </>
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
      // The service goes along (never sent) so its record is read again: the edit view then shows the new price and drops the waiting mark.
      const result = await resolve.mutateAsync({ ...body, serviceIds: [serviceId] });
      const skip = result.skipped[0];
      setSkipped(skip ? skippedText(skip, change.service.name) : null);
    } catch {
      // The default error toast shows the server's words.
    }
  };

  return (
    <>
      <SectionHeading>Waiting price change</SectionHeading>
      <div role="group" aria-label="Waiting price change">
        <FormRow label="Status">
          <p className="flex items-center gap-2 text-sm md:min-h-8">
            <StatusSquare tone={SQUARE[words.tone]} label={words.label} />
            <span>{words.label}</span>
          </p>
          {words.note && <p className="hint">{words.note}</p>}
        </FormRow>
        <FormRow label="Shop price now">
          <ReadValue>{money(change.oldPrice)}</ReadValue>
        </FormRow>
        <FormRow label="New price">
          <ReadValue>{change.newPrice === null ? 'None' : money(change.newPrice)}</ReadValue>
        </FormRow>
        <FormRow label="Cost">
          <ReadValue>{`${money(change.oldCost)} to ${money(change.newCost)}`}</ReadValue>
        </FormRow>
        {change.rule && (
          <FormRow label="Rule">
            <ReadValue>{change.rule.label}</ReadValue>
          </FormRow>
        )}
        <FormRow label={null}>
          <div className="flex flex-wrap gap-2">
            <span title={applyTitle} className="inline-flex">
              <Button
                loading={resolve.isPending}
                disabled={lock.disabled || noPrice}
                onClick={() => void send('apply')}
              >
                <Icon name="check" className="ic-sm" />
                Apply the new price
              </Button>
            </span>
            <span title={lock.title} className="inline-flex">
              <Button disabled={lock.disabled || resolve.isPending} onClick={() => void send('keep')}>
                Keep the current price
              </Button>
            </span>
          </div>
          {skipped && (
            <p role="status" className="mt-2 text-sm text-warn-fg">
              {skipped}
            </p>
          )}
        </FormRow>
      </div>
    </>
  );
}
