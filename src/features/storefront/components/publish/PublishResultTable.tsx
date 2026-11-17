// PublishResultTable: the rows of a run that was applied: what happened to each (published, left out, refused, and why), the
// service with its title, the three facts, the cost, the shop price, and whether its listing is on the shop now. Filter chips
// show the published, the left out and the refused; the table is server-paged (50 a page) and sorted by the server. The chips'
// counts are the run's own. The page, sort and chip live in the address.
import {
  Badge,
  DataTable,
  EmptyState,
  SegmentedControl,
  usePageClamp,
  type DataTableColumn,
} from '@/components/ui';
import type { Id } from '@/lib/api';
import { num, price } from '@/lib/format';
import { useListView } from '../../hooks/useListView';
import { usePublishItems } from '../../hooks/usePublishItems';
import { resultWords } from '../../lib/publishWords';
import { PUBLISH_ITEMS_PAGE, PUBLISH_ITEMS_VIEW } from '../../lib/views';
import type { PublishItem, PublishResult, PublishRun } from '../../types';
import { PublishFacts, PublishOnShopCell, PublishPriceCell, PublishServiceCell } from './PublishItemCells';

const COLUMNS: readonly DataTableColumn<PublishItem>[] = [
  {
    key: 'result',
    label: 'Result',
    render: (item) => {
      const words = resultWords(item);
      return (
        <>
          <Badge tone={words.tone} icon={words.icon}>
            {words.label}
          </Badge>
          {words.note && <p className="mt-0.5 max-w-[16rem] text-2xs text-ink3">{words.note}</p>}
        </>
      );
    },
  },
  {
    key: 'service',
    label: 'Service',
    sortField: 'title',
    render: (item) => <PublishServiceCell item={item} />,
  },
  {
    key: 'facts',
    label: 'Brand / Carrier / Country',
    hide: 'lg',
    render: (item) => <PublishFacts item={item} />,
  },
  {
    key: 'cost',
    label: 'Cost',
    sortField: 'cost',
    num: true,
    hide: 'md',
    render: (item) => price(item.cost),
  },
  {
    key: 'price',
    label: 'Shop price',
    num: true,
    render: (item) => <PublishPriceCell item={item} amount={item.publishedPrice ?? item.retailPrice} />,
  },
  { key: 'shop', label: 'On the shop', render: (item) => <PublishOnShopCell item={item} /> },
];

/** The chips: every row, then one per result. */
function chipsOf(run: PublishRun) {
  return [
    { value: '', label: `All (${num(run.total)})` },
    { value: 'published', label: `Published (${num(run.counts.published)})` },
    { value: 'skipped', label: `Left out (${num(run.counts.skipped)})` },
    { value: 'refused', label: `Refused (${num(run.counts.refused)})` },
  ];
}

/** The result table of a run: chips, then the rows. */
export function PublishResultTable({ run, runId }: { run: PublishRun; runId: Id }) {
  const { view, setFilter, setPage, setSort } = useListView(PUBLISH_ITEMS_VIEW);
  const result = view.filters.result as PublishResult | '';
  const list = usePublishItems(runId, {
    q: '',
    filters: { result: result || undefined },
    page: view.page,
    sort: view.sort,
  });
  usePageClamp({
    page: view.page,
    pageSize: PUBLISH_ITEMS_PAGE,
    total: list.total,
    settled: list.query.isSuccess && !list.query.isPlaceholderData,
    setPage,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
        <SegmentedControl
          items={chipsOf(run)}
          value={result}
          onChange={(next) => setFilter('result', next)}
          label="Show rows"
        />
      </div>
      <DataTable
        caption="Publish result"
        columns={COLUMNS}
        rows={list.rows}
        rowKey={(item) => item.id}
        sort={view.sort}
        onSortChange={setSort}
        pagination={{ page: view.page, pageSize: PUBLISH_ITEMS_PAGE, total: list.total ?? list.rows.length }}
        onPageChange={setPage}
        state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
        error={list.query.error}
        errorTitle="Could not load the rows"
        onRetry={() => void list.query.refetch()}
        empty={
          <EmptyState icon="filter" title="No rows here">
            No row of this run has that result.
          </EmptyState>
        }
      />
    </div>
  );
}
