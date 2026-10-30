// TaxPanel: the "Tax by country" panel: each rate with the date it applies from, a badge for rates not started or ended, Add and Edit.
// Ports the tax half of tabTax in 55-p-settings.js. The map adds effective dates (a country keeps its history) and the edit dialog.
import { useState } from 'react';
import { Badge, Button, DataTable, EmptyState, Icon, Panel, type DataTableColumn } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useTaxRateList } from '../hooks/useTaxRates';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { countryName, effectiveDay, rateText, rateWindow, schemeText, sortTaxRates } from '../lib/tax';
import type { TaxRate } from '../types';
import { TaxRateDialog } from './TaxRateDialog';

type Dialog = { kind: 'create' } | { kind: 'edit'; rate: TaxRate };

/** The panel with its dialogs. */
export function TaxPanel() {
  const grants = useSettingsGrants();
  const now = useNow();
  const readable = grants.can('tax:read');
  const { rates, query } = useTaxRateList(grants.ready && readable);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const createLock = grants.needs('tax:create');
  const updateLock = grants.needs('tax:update');

  const columns: DataTableColumn<TaxRate>[] = [
    {
      key: 'country',
      label: 'Country',
      render: (rate) => (
        <>
          <p className="font-medium">{countryName(rate.country)}</p>
          <p className="text-2xs text-ink3">
            {[rate.country, rate.region, rate.label].filter(Boolean).join(' · ')}
          </p>
        </>
      ),
    },
    {
      key: 'rate',
      label: 'Added to the price',
      num: true,
      render: (rate) =>
        rateText(rate) === 'No tax' ? <span className="text-ink3">No tax</span> : rateText(rate),
    },
    {
      key: 'scheme',
      label: 'Reported through',
      hide: 'sm',
      render: (rate) =>
        rate.ossScheme.trim() ? (
          <span className="text-ink2">{schemeText(rate)}</span>
        ) : (
          <span className="text-ink3">Not collected</span>
        ),
    },
    {
      key: 'since',
      label: 'Rate since',
      hide: 'md',
      render: (rate) => {
        const window = rateWindow(rate, now);
        return (
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-ink2">{effectiveDay(rate.validFrom)}</span>
            {rate.validTo && <span className="text-ink3">until {effectiveDay(rate.validTo)}</span>}
            {window === 'scheduled' && (
              <Badge tone="accent" icon="clock">
                Scheduled
              </Badge>
            )}
            {window === 'ended' && (
              <Badge tone="neutral" icon="ban">
                Ended
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (rate) => (
        <span className="flex justify-end">
          <Button
            size="sm"
            aria-label={`Edit ${countryName(rate.country)} tax`}
            disabled={updateLock.disabled}
            title={updateLock.title}
            onClick={() => setDialog({ kind: 'edit', rate })}
          >
            Edit
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <Panel
        title="Tax by country"
        sub="The price shown to a customer already includes tax for their country. This is what is added, not what you must register for: your accountant decides where you report it."
        flush
        right={
          readable && (
            <Button
              size="sm"
              disabled={createLock.disabled}
              title={createLock.title}
              onClick={() => setDialog({ kind: 'create' })}
            >
              <Icon name="plus" className="ic-xs" />
              Add tax rate
            </Button>
          )
        }
      >
        {!readable ? (
          <EmptyState icon="lock" title="Tax rates are hidden for your role">
            Reading the tax rates needs the tax:read permission.
          </EmptyState>
        ) : (
          <DataTable
            caption="Tax by country"
            columns={columns}
            rows={sortTaxRates(rates)}
            rowKey={(rate) => rate.id}
            state={query.isLoading ? 'loading' : query.isError ? 'error' : 'ready'}
            error={query.error}
            errorTitle="Could not load the tax rates"
            onRetry={() => void query.refetch()}
            empty={
              <EmptyState icon="percent" title="No countries">
                Add the countries you sell to.
              </EmptyState>
            }
          />
        )}
      </Panel>
      {dialog?.kind === 'create' && <TaxRateDialog onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && <TaxRateDialog rate={dialog.rate} onClose={() => setDialog(null)} />}
    </>
  );
}
