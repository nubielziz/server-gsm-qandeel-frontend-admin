// CurrenciesPanel: the "Currencies" panel of the Tax and currency tab: rates with their markup and age, the "Offered" switch, Add currency,
// and Refresh rates with a banner when a rate is stale. Ports the currencies half of tabTax and `st-fx-*` of 55-p-settings.js.
import { useState } from 'react';
import { Button, DataTable, EmptyState, Icon, Panel } from '@/components/ui';
import { ageText, useNow } from '@/lib/format';
import { useCurrencyList, useRefreshRates, useToggleOffered } from '../hooks/useCurrencies';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { oldestUpdate, staleCurrencies } from '../lib/currencies';
import type { Currency, RefreshFxResult } from '../types';
import { CurrencyDialog } from './CurrencyDialog';
import { currencyColumns } from './currencyColumns';
import { RefreshResultDialog } from './RefreshResultDialog';

type Dialog = { kind: 'create' } | { kind: 'edit'; currency: Currency };

/** The panel with its dialogs. */
export function CurrenciesPanel() {
  const grants = useSettingsGrants();
  const now = useNow();
  const readable = grants.can('settings:update');
  const { currencies, query } = useCurrencyList(grants.ready && readable);
  const toggle = useToggleOffered();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [result, setResult] = useState<RefreshFxResult | null>(null);
  const refresh = useRefreshRates(setResult);
  const stale = staleCurrencies(currencies, now);
  const changeLock = grants.needs('settings:update');
  const refreshLock = grants.needs('currencies:update');

  const refreshButton = (label: string) => (
    <Button
      size="sm"
      loading={refresh.isPending}
      disabled={refreshLock.disabled}
      title={refreshLock.title}
      onClick={() => refresh.mutate()}
    >
      <Icon name="refresh" className="ic-xs" />
      {label}
    </Button>
  );

  return (
    <>
      <Panel
        title="Currencies"
        sub="Prices are set in dollars and shown in the customer’s currency, rounded to a clean ending. The rate is fixed on the order, so a later move does not change what they paid."
        flush
        right={
          readable && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                disabled={changeLock.disabled}
                title={changeLock.title}
                onClick={() => setDialog({ kind: 'create' })}
              >
                <Icon name="plus" className="ic-xs" />
                Add currency
              </Button>
              {refreshButton('Refresh rates')}
            </div>
          )
        }
      >
        {!readable ? (
          <EmptyState icon="lock" title="Currencies are hidden for your role">
            Reading the currency list needs the settings:update permission.
          </EmptyState>
        ) : (
          <>
            {stale.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-warn-bg px-3.5 py-2.5 text-sm text-warn-fg">
                <Icon name="alert" className="ic-sm flex-none" />
                <span className="min-w-0 flex-1">
                  The {stale.map((currency) => currency.code).join(', ')} rate is{' '}
                  {ageText(now - oldestUpdate(stale, now))} old. Customers are quoted a price that may be off
                  by a few percent.
                </span>
                {refreshButton('Refresh now')}
              </div>
            )}
            <DataTable
              caption="Currencies"
              columns={currencyColumns({
                now,
                lock: changeLock,
                savingId: toggle.isPending ? toggle.variables?.currency.id : undefined,
                onShown: (currency, shown) => toggle.mutate({ currency, shown }),
                onEdit: (currency) => setDialog({ kind: 'edit', currency }),
              })}
              rows={currencies}
              rowKey={(currency) => currency.id}
              state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
              error={query.error}
              errorTitle="Could not load the currencies"
              onRetry={() => void query.refetch()}
              empty={
                <EmptyState icon="globe" title="No currencies">
                  Add the currencies you want to show.
                </EmptyState>
              }
            />
          </>
        )}
      </Panel>
      {dialog?.kind === 'create' && <CurrencyDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && (
        <CurrencyDialog currency={dialog.currency} onClose={() => setDialog(null)} />
      )}
      {result && <RefreshResultDialog result={result} onClose={() => setResult(null)} />}
    </>
  );
}
