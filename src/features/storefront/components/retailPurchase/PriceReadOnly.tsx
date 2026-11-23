// PriceReadOnly: the shop price of a service that has no shop page: the price its record carries with how it was set (rule or typed), or "None".
// Every figure is the server's. There is no form: the price is kept when the service goes on the shop.
import { FormRow, ReadValue } from '@/components/ui';
import type { Money } from '@/lib/api';
import { money } from '@/lib/format';
import type { RetailPurchasePartProps } from './types';

export interface PriceReadOnlyProps {
  retailPrice?: Money | null;
  retailPriceSource?: RetailPurchasePartProps['retailPriceSource'];
}

/** The price with a small italic line for who wrote it, and one line about what happens to it when the service goes on the shop. */
export function PriceReadOnly({ retailPrice, retailPriceSource }: PriceReadOnlyProps) {
  if (retailPrice == null) {
    return (
      <FormRow label="Shop price">
        <ReadValue muted>None</ReadValue>
      </FormRow>
    );
  }
  return (
    <FormRow label="Shop price" hint="It is kept when the service goes on the shop.">
      <ReadValue className="font-medium">{money(retailPrice)}</ReadValue>
      {retailPriceSource === 'rule' && <span className="cell-sub">Set by a pricing rule</span>}
      {retailPriceSource === 'manual' && <span className="cell-sub">Typed by staff</span>}
    </FormRow>
  );
}
