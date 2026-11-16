// HiddenTermsPanel: "Hidden from popular searches": the terms staff kept out of the list under the empty search box, each with
// Show again (`DELETE /admin/search/hidden-terms/:id`). Part of the Report section. New in the Search tab.
import { Button, DataTable, Panel, type DataTableColumn } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useShowTermAgain } from '../../hooks/useSearchMutations';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import type { HiddenTerm } from '../../types';

export interface HiddenTermsPanelProps {
  rows: readonly HiddenTerm[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  grants: StorefrontGrants;
}

/** The hidden terms and their Show again buttons; owns the delete request. */
export function HiddenTermsPanel({ rows, state, error, onRetry, grants }: HiddenTermsPanelProps) {
  const show = useShowTermAgain();
  const write = grants.needs('storefront:update');
  const columns: DataTableColumn<HiddenTerm>[] = [
    { key: 'term', label: 'Term', render: (row) => <span className="mono">{row.term}</span> },
    {
      key: 'note',
      label: 'Why',
      hide: 'sm',
      render: (row) =>
        row.note ? <span className="text-ink2">{row.note}</span> : <span className="text-ink3">–</span>,
    },
    {
      key: 'at',
      label: 'Hidden',
      hide: 'md',
      render: (row) => <span className="whitespace-nowrap text-ink2">{fmtDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={write.disabled}
            loading={show.isPending && show.variables?.id === row.id}
            title={write.title}
            aria-label={`Show ${row.term} in popular searches again`}
            onClick={() => show.mutate(row)}
          >
            Show again
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Panel
      title="Hidden from popular searches"
      sub="Terms kept out of the list under the empty search box. They are still searched as before."
      flush
    >
      <DataTable
        caption="Hidden search terms"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        state={state}
        error={error}
        errorTitle="Could not load the hidden terms"
        onRetry={onRetry}
        skeletonRows={2}
        empty={<p className="px-3.5 py-6 text-center text-sm text-ink2">No term is hidden.</p>}
      />
    </Panel>
  );
}
