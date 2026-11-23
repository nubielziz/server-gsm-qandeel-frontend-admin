// EditPriceBody: the fields of "Edit price": the supplier cost and the floor the server worked out, then the price and the minimum
// profit. The Edit price dialog and the panel's Prices section both show it. The figures are the server's: nothing is computed here.
import type { UseFormReturn } from 'react-hook-form';
import { Icon, KeyValue, TextField } from '@/components/ui';
import { money, pct } from '@/lib/format';
import { isMoneyText } from '../lib/money';
import type { PriceValues } from '../lib/priceForms';
import type { Service } from '../types';

export interface EditPriceBodyProps {
  /** The service as the server last sent it: the cost, the floor and, for `figures`, the margin and the below-floor flag. */
  service: Service;
  form: UseFormReturn<PriceValues>;
  /** On in a dialog (focus lands on the price), off in the panel (a section must not take focus on its own). */
  autoFocus?: boolean;
  /** Props for a role that may not change prices: the boxes are disabled and the title says which permission is missing. */
  lock?: { disabled: boolean; title?: string };
  /** Also show the margin and, when the server says so, that the price is under the floor. */
  figures?: boolean;
}

/** The figures and the two boxes. The form (its defaults, its save) belongs to the host. */
export function EditPriceBody({
  service,
  form,
  autoFocus = false,
  lock,
  figures = false,
}: EditPriceBodyProps) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <div className="space-y-3">
      <KeyValue
        className="!grid-cols-[130px_1fr]"
        rows={[
          [
            'Supplier cost',
            <span key="cost" className="tabular-nums">
              {money(service.cost)}
              {service.costChangedFrom && (
                <span className="text-warn-fg"> (was {money(service.costChangedFrom)})</span>
              )}
            </span>,
          ],
          [
            'Floor',
            <span key="floor" className="font-medium tabular-nums">
              {money(service.floorPrice)}
            </span>,
          ],
          figures && [
            'Margin',
            <span key="margin" className="tabular-nums">
              {pct(service.marginPct, 1)}
            </span>,
          ],
        ]}
      />
      {figures && service.belowFloor && (
        <p className="flex items-center gap-1.5 text-xs text-crit-fg">
          <Icon name="alert" className="ic-xs" />
          Under the floor: orders are charged the floor price.
        </p>
      )}
      <TextField
        label="Base price (USD)"
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        disabled={lock?.disabled}
        title={lock?.title}
        error={errors.basePrice}
        {...register('basePrice', {
          validate: (value) =>
            (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
        })}
      />
      <TextField
        label="Minimum profit (USD)"
        inputMode="decimal"
        autoComplete="off"
        disabled={lock?.disabled}
        title={lock?.title}
        hint="The floor is the supplier cost plus this amount. The server works it out when you save."
        error={errors.minProfit}
        {...register('minProfit', {
          validate: (value) => isMoneyText(value) || 'Enter an amount, 0 or more.',
        })}
      />
    </div>
  );
}
