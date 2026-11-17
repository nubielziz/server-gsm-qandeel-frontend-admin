// PublishPriceChoice: the "Shop price" choice of the row dialog: use the pricing rule (with the rule's price), type a price (with
// the floor as the hint) or keep the price the service has. The figures are the server's. A role without `storefront:update`
// sees the group locked, with the permission in `title` (the server answers 403 for a price key otherwise).
import type { UseFormReturn } from 'react-hook-form';
import { RadioGroup, TextField, type RadioOption } from '@/components/ui';
import { price } from '@/lib/format';
import { checkTypedPrice, type ItemValues } from '../../lib/publishItemForm';
import type { PublishItem } from '../../types';

export interface PublishPriceChoiceProps {
  item: PublishItem;
  form: UseFormReturn<ItemValues>;
  /** The props of a control that needs `storefront:update`. */
  lock: { disabled: boolean; title?: string };
}

/** The options as the server's figures say them. */
function optionsOf(item: PublishItem): RadioOption[] {
  const replaces =
    item.existingPrice !== null ? `Replaces the current price of ${price(item.existingPrice)}.` : '';
  const rule: RadioOption =
    item.rule && item.rulePrice !== null
      ? {
          value: 'rule',
          label: `Use the pricing rule (${price(item.rulePrice)})`,
          description: [item.rule.label, replaces].filter(Boolean).join(' · '),
        }
      : {
          value: 'rule',
          label: 'Use the pricing rule',
          description: 'No pricing rule gives this service a price.',
          disabled: true,
        };
  const options: RadioOption[] = [
    rule,
    { value: 'manual', label: 'Type a price', description: 'A typed price stays until you change it.' },
  ];
  if (item.existingPrice !== null) {
    options.push({ value: 'keep', label: `Keep the current price (${price(item.existingPrice)})` });
  }
  return options;
}

/** The radio group and, when "Type a price" is chosen, the mono price field. */
export function PublishPriceChoice({ item, form, lock }: PublishPriceChoiceProps) {
  const { register, watch, formState } = form;
  const mode = watch('price');
  return (
    <div className="space-y-2">
      <RadioGroup
        legend="Shop price"
        options={optionsOf(item)}
        error={formState.errors.price}
        disabled={lock.disabled}
        title={lock.title}
        {...register('price')}
      />
      {lock.disabled && <p className="text-xs text-ink3">{lock.title}.</p>}
      {mode === 'manual' && (
        <TextField
          label="Price shown to customers (USD, before VAT)"
          className="mono"
          inputMode="decimal"
          autoComplete="off"
          disabled={lock.disabled}
          title={lock.title}
          hint={`Floor ${price(item.floorPrice)}: the lowest price the server accepts.`}
          error={formState.errors.retailPrice}
          {...register('retailPrice', { validate: (value, values) => checkTypedPrice(value, values.price) })}
        />
      )}
    </div>
  );
}
