// Columns of the two tables of the Data stores tab: slow queries and long transactions. Ids and SQL in mono, numbers tabular.
import type { DataTableColumn } from '@/components/ui';
import { num } from '@/lib/format';
import { formatDuration, formatValue } from '../../lib';
import type { LongTransaction, SlowQuery } from '../../types';
import { QueryText } from './QueryText';
import { sentenceCase } from './storeFigures';

// The query takes the room the other columns leave and is cut to one line there (`max-w-0` lets a table cell shrink).
const QUERY_CELL = 'w-full max-w-0';
// A short figure ("41 ms", "12m 39s") never breaks at its space, however narrow the table gets.
const NO_WRAP = 'whitespace-nowrap';

/** Slow queries: id, statement, calls, mean and total time. The mean is in ms, the total as a duration ("12m 38s"). */
export const SLOW_QUERY_COLUMNS: readonly DataTableColumn<SlowQuery>[] = [
  { key: 'id', label: 'Query id', render: (row) => <span className="mono">{row.id}</span> },
  {
    key: 'query',
    label: 'Query',
    className: QUERY_CELL,
    render: (row) => <QueryText query={row.query} label={`query ${row.id}`} />,
  },
  { key: 'calls', label: 'Calls', num: true, className: NO_WRAP, render: (row) => num(row.calls) },
  {
    key: 'mean',
    label: 'Mean',
    num: true,
    className: NO_WRAP,
    render: (row) => formatValue(row.meanMs, 'ms'),
  },
  {
    key: 'total',
    label: 'Total',
    num: true,
    className: NO_WRAP,
    render: (row) => formatDuration(row.totalMs / 1000),
  },
];

/** Long transactions: process id, how long it has been open, its state, and the statement it is stuck on. */
export const LONG_TRANSACTION_COLUMNS: readonly DataTableColumn<LongTransaction>[] = [
  { key: 'pid', label: 'PID', render: (row) => <span className="mono">{row.pid}</span> },
  {
    key: 'duration',
    label: 'Open for',
    num: true,
    className: NO_WRAP,
    render: (row) => formatDuration(row.durationSeconds),
  },
  { key: 'state', label: 'State', className: NO_WRAP, render: (row) => sentenceCase(row.state) },
  {
    key: 'query',
    label: 'Query',
    className: QUERY_CELL,
    render: (row) => <QueryText query={row.query} label={`query of PID ${row.pid}`} />,
  },
];
