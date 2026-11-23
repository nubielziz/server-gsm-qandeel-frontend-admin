// PricingPart: the "Set Pricing" part of the edit view (decision 022): the credit (the base price) and the minimum profit with the server's
// cost, floor and margin as read-only rows, then the fixed price of each merchant rank. The price is the existing merchant price form
// (useEditPriceForm), the ranks the existing group prices form (useGroupPricesForm); the retail price has its own part (Retail Purchase).
// One Save pinned to the foot of the view saves what changed: the price first, then the rank prices, each route with its own permission.
import { useRef, useState, type FormEvent } from 'react';
import { PartForm, SectionHeading, useReportDirty, type FormDialogResult } from '@/components/ui';
import { useEditPriceForm } from '../../../../hooks/useEditPriceForm';
import { savedInOrder } from '../../../../lib/saveOutcome';
import type { ServicePartProps } from '../../types';
import { PriceRows } from './pricing/PriceRows';
import type { RankSave } from './pricing/RankPrices';
import { RankSection } from './pricing/RankSection';

/**
 * The part. Saving a price needs `catalog:update` and `pricing:update` (the route and the server's second permission); saving rank prices
 * needs `pricing:update`. A role that lacks one sees that block's boxes off with the missing permission named, and Save off when it may
 * change neither. A refused credit shows under its box and nothing after it is sent, so the rank prices wait until the credit is fixed.
 * Side effects: `PATCH /admin/services/:id` and `PUT /admin/services/:id/group-prices`, their toasts and the refresh of the services reads.
 */
export function PricingPart({ service, grants, onDirtyChange }: ServicePartProps) {
  const priceLock = grants.needsAll('catalog:update', 'pricing:update');
  const rankLock = grants.needs('pricing:update');
  const { form, submit: submitPrice, saved } = useEditPriceForm(service, { stay: true });
  const [rankDirty, setRankDirty] = useState(false);
  const rankSave = useRef<RankSave | null>(null);

  const priceDirty = form.formState.isDirty;
  useReportDirty(priceDirty || rankDirty, onDirtyChange);

  const priceToSave = priceDirty && !priceLock.disabled;
  const ranksToSave = rankDirty && !rankLock.disabled;
  const mayChange = !priceLock.disabled || !rankLock.disabled;

  function save(event: FormEvent<HTMLFormElement>) {
    const ranks = rankSave.current;
    const steps: (() => Promise<FormDialogResult>)[] = [];
    if (priceToSave) steps.push(() => submitPrice(event));
    if (ranksToSave && ranks) steps.push(() => ranks(event));
    return savedInOrder(steps);
  }

  return (
    <PartForm
      label="Set Pricing"
      onSubmit={save}
      dirty={priceToSave || ranksToSave}
      lock={mayChange ? undefined : rankLock}
    >
      <SectionHeading as="h3">Price</SectionHeading>
      <PriceRows saved={saved} form={form} lock={priceLock} />
      <SectionHeading as="h3">Rank prices</SectionHeading>
      <RankSection
        service={service}
        grants={grants}
        lock={rankLock}
        saveRef={rankSave}
        onDirtyChange={setRankDirty}
      />
    </PartForm>
  );
}
