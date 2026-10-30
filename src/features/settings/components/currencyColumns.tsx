// currencyColumns: the columns of the Currencies table (currency, rate, markup, rate updated, offered, edit). Ports `ccols` of tabTax in
// 55-p-settings.js. The base currency has no rate or markup to edit, so its row shows dashes.
import { Button, Icon, Switch, type DataTableColumn } from '@/components/ui';
import { ageText, pct } from '@/lib/format';
import { trimDecimal } from '../lib/decimal';
import { isBaseCurrency, isStaleRate, shownAs } from '../lib/currencies';
import type { Currency } from '../types';

export type CurrencyColumnsArgs = {
  now: number;
  /** Props for the controls that change a currency (`disabled` and the reason). */
  lock: { disabled: boolean; title?: string };
  /** The id of the row whose switch is being saved. */
  savingId: number | undefined;
  onShown: (currency: Currency, shown: boolean) => void;
  onEdit: (currency: Currency) => void;
};

const dash = <span className="text-ink3">–</span>;

/** The columns. */
export function currencyColumns({
  now,
  lock,
  savingId,
  onShown,
  onEdit,
}: CurrencyColumnsArgs): DataTableColumn<Currency>[] {
  return [
    {
      key: 'code',
      label: 'Currency',
      render: (currency) => (
        <>
          <p className="font-medium">{currency.code}</p>
          <p className="text-2xs text-ink3">
            {isBaseCurrency(currency)
              ? 'Base currency'
              : `${currency.name} · shown as ${shownAs(currency.code)}`}
          </p>
        </>
      ),
    },
    {
      key: 'rate',
      label: 'Per $1',
      num: true,
      render: (currency) => <span className="tabular-nums">{trimDecimal(currency.rateToBase)}</span>,
    },
    {
      key: 'markup',
      label: 'Markup',
      num: true,
      hide: 'sm',
      render: (currency) => (isBaseCurrency(currency) ? dash : pct(currency.markupPercent)),
    },
    {
      key: 'updated',
      label: 'Rate updated',
      render: (currency) => {
        if (isBaseCurrency(currency)) return dash;
        const age = currency.rateUpdatedAt
          ? `${ageText(now - Date.parse(currency.rateUpdatedAt))} ago`
          : 'Never';
        return isStaleRate(currency, now) ? (
          <span className="inline-flex items-center gap-1 font-medium text-warn-fg">
            <Icon name="alert" className="ic-xs" />
            {age}
          </span>
        ) : (
          <span className="text-ink2">{age}</span>
        );
      },
    },
    {
      key: 'shown',
      label: 'Offered',
      render: (currency) =>
        isBaseCurrency(currency) ? (
          <span className="text-ink3">Always</span>
        ) : (
          <Switch
            checked={currency.isStorefront}
            label={`Offer prices in ${currency.code}`}
            disabled={lock.disabled || savingId === currency.id}
            title={lock.title}
            onChange={(shown) => onShown(currency, shown)}
          />
        ),
    },
    {
      key: 'actions',
      label: '',
      render: (currency) =>
        isBaseCurrency(currency) ? null : (
          <span className="flex justify-end">
            <Button
              size="sm"
              aria-label={`Edit ${currency.code}`}
              disabled={lock.disabled}
              title={lock.title}
              onClick={() => onEdit(currency)}
            >
              Edit rate
            </Button>
          </span>
        ),
    },
  ];
}
