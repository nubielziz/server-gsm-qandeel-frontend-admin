// SearchReportPanel: the Report section of the Search tab: what visitors searched in the last 7, 30 or 90 days (totals, top
// terms, searches that found nothing) and the terms hidden from the popular searches. Each no-result row opens the synonym and pin
// dialogs with its words filled in. The report holds terms and counts only, never a person or an address.
import { useState } from 'react';
import { QueryState, SegmentedControl, SkeletonStat, StatGrid, Panel } from '@/components/ui';
import { num, pct } from '@/lib/format';
import { useSearchReport } from '../../hooks/useSearchAdmin';
import { useStorefrontList } from '../../hooks/useStorefrontList';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { WHOLE_LIST_CAP } from '../../lib/views';
import { REPORT_DAYS, type HiddenTerm, type ReportDays } from '../../types';
import { HiddenTermsPanel } from './HiddenTermsPanel';
import { HideTermDialog } from './HideTermDialog';
import { PinDialog } from './PinDialog';
import { TopTermsTable, ZeroTermsTable } from './ReportTerms';
import { SynonymDialog } from './SynonymDialog';

type Dialog = { kind: 'hide' | 'synonym' | 'pin'; term: string };

const RANGES = REPORT_DAYS.map((days) => ({ value: days, label: `${days} days` }));

/** The range control, the figures, the two term tables, the hidden terms and the dialogs the rows open. */
export function SearchReportPanel({ grants }: { grants: StorefrontGrants }) {
  const [days, setDays] = useState<ReportDays>(30);
  const report = useSearchReport(days, grants.can('storefront:read'));
  const hidden = useStorefrontList<HiddenTerm>('search-hidden-terms', {
    filters: [],
    page: 1,
    pageSize: WHOLE_LIST_CAP,
    enabled: grants.ready,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const write = grants.needs('storefront:update');
  const hiddenTerms = new Set(hidden.rows.map((row) => row.term));
  const data = report.data;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-[13rem] flex-1">
          <h2 className="panel-t">Search report</h2>
          <p className="panel-s">
            What visitors searched for. Words and counts only: no person, no address, nothing that looks like
            an IMEI, an email or an order number.
          </p>
        </div>
        <SegmentedControl items={RANGES} value={days} onChange={setDays} label="Report range" />
      </div>
      <QueryState
        isLoading={report.isLoading}
        isError={report.isError && !data}
        error={report.error}
        onRetry={() => void report.refetch()}
        errorTitle="Could not load the search report"
        skeleton={<SkeletonStat cells={3} />}
      >
        {data && (
          <>
            <StatGrid
              label="Search report figures"
              cells={[
                { label: 'Searches', value: num(data.totals.searches), sub: `last ${data.days} days` },
                {
                  label: 'Found nothing',
                  value: num(data.totals.zeroResults),
                  sub:
                    data.totals.searches > 0
                      ? `${pct((data.totals.zeroResults / data.totals.searches) * 100)} of searches`
                      : 'no searches yet',
                },
                { label: 'Different terms', value: num(data.totals.terms) },
              ]}
            />
            <Panel
              title="Most searched"
              sub="Hide a term that should not show under the empty search box."
              flush
              className="mb-4"
            >
              <TopTermsTable
                top={data.topTerms}
                hiddenTerms={hiddenTerms}
                lock={write}
                onHide={(term) => setDialog({ kind: 'hide', term })}
              />
            </Panel>
            <Panel
              title="Searches that found nothing"
              sub="A synonym or a pinned service turns a miss into a sale."
              flush
              className="mb-4"
            >
              <ZeroTermsTable
                zero={data.zeroResultTerms}
                hiddenTerms={hiddenTerms}
                lock={write}
                onHide={(term) => setDialog({ kind: 'hide', term })}
                onSynonym={(term) => setDialog({ kind: 'synonym', term })}
                onPin={(term) => setDialog({ kind: 'pin', term })}
              />
            </Panel>
          </>
        )}
      </QueryState>
      <HiddenTermsPanel
        rows={hidden.rows}
        state={hidden.query.isLoading ? 'loading' : hidden.query.isError ? 'error' : 'ready'}
        error={hidden.query.error}
        onRetry={() => void hidden.query.refetch()}
        grants={grants}
      />
      {dialog?.kind === 'hide' && <HideTermDialog term={dialog.term} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'synonym' && (
        <SynonymDialog initialTerm={dialog.term} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'pin' && <PinDialog initialQuery={dialog.term} onClose={() => setDialog(null)} />}
    </>
  );
}
