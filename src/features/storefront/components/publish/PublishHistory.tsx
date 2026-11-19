// PublishHistory: "Earlier runs" on the Publish tab's start: every run, newest first, with what it took, how it ended and who
// started it. A draft says Continue (the preview is still waiting); every other run opens its page. Needs storefront:read.
import {
  Badge,
  ButtonLink,
  DataTable,
  EmptyState,
  usePageClamp,
  type DataTableColumn,
} from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useListView } from '../../hooks/useListView';
import { usePublishRuns } from '../../hooks/usePublishRuns';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { storefrontPublishPath } from '../../lib/paths';
import { scopeText, statusWords } from '../../lib/publish';
import { PAGE_SIZE, PUBLISH_RUNS_VIEW } from '../../lib/views';
import type { PublishRun } from '../../types';
import { PricingSection } from '../pricing/PricingSection';

/** The three results of a run that was applied as "12 / 2 / 0"; a draft or a preview being prepared has none yet. */
function resultsOf(run: PublishRun): string {
  if (run.status === 'preparing' || run.status === 'draft') return '–';
  return `${run.counts.published} / ${run.counts.skipped} / ${run.counts.refused}`;
}

const COLUMNS: readonly DataTableColumn<PublishRun>[] = [
  {
    key: 'when',
    label: 'When',
    sortField: 'createdAt',
    render: (run) => <span className="whitespace-nowrap text-ink2">{fmtDate(run.createdAt)}</span>,
  },
  {
    key: 'what',
    label: 'What',
    render: (run) => (
      <>
        {scopeText(run.scope)}
        {!run.listed && <span className="text-ink3"> (switched off)</span>}
      </>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (run) => {
      const words = statusWords(run);
      return (
        <Badge tone={words.tone} icon={words.icon}>
          {words.label}
        </Badge>
      );
    },
  },
  {
    key: 'results',
    label: 'Published / Left out / Refused',
    num: true,
    hide: 'sm',
    render: (run) => <span className="whitespace-nowrap">{resultsOf(run)}</span>,
  },
  {
    key: 'by',
    label: 'By',
    hide: 'md',
    render: (run) => (run.auto || run.requestedBy === null ? 'System' : (run.requestedByName ?? '–')),
  },
  {
    key: 'open',
    label: '',
    num: true,
    render: (run) => (
      <ButtonLink
        variant="ghost"
        size="sm"
        to={storefrontPublishPath(run.id)}
        aria-label={`${run.status === 'draft' ? 'Continue' : 'Open'} run ${run.id}`}
      >
        {run.status === 'draft' ? 'Continue' : 'Open'}
      </ButtonLink>
    ),
  },
];

/** The history block: a paged table of the runs. */
export function PublishHistory({ grants }: { grants: StorefrontGrants }) {
  const { view, setPage, setSort } = useListView(PUBLISH_RUNS_VIEW);
  const list = usePublishRuns({
    page: view.page,
    pageSize: PAGE_SIZE,
    sort: view.sort,
    enabled: grants.ready && grants.can('storefront:read'),
  });
  usePageClamp({
    page: view.page,
    pageSize: PAGE_SIZE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  const canRead = grants.can('storefront:read');
  return (
    <PricingSection
      title="Earlier runs"
      sub="Every run keeps its result. Open one to see what was published, or to take it off the shop again."
    >
      {grants.ready && !canRead ? (
        <EmptyState icon="lock" title="Earlier runs are hidden">
          You need the storefront:read permission to see them.
        </EmptyState>
      ) : (
        <DataTable
          caption="Publish runs"
          columns={COLUMNS}
          rows={list.rows}
          rowKey={(run) => run.id}
          sort={view.sort}
          onSortChange={setSort}
          pagination={{ page: view.page, pageSize: PAGE_SIZE, total: list.total ?? list.rows.length }}
          onPageChange={setPage}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          errorTitle="Could not load the earlier runs"
          onRetry={() => void list.query.refetch()}
          empty={
            <EmptyState icon="history" title="No runs yet">
              A run you prepare shows here, with its result once it is published.
            </EmptyState>
          }
        />
      )}
    </PricingSection>
  );
}
