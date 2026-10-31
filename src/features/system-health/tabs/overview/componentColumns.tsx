// The columns of the Overview tab's components list: status, name with kind and last failure, since, latency, the three
// uptime windows and the check history bars. A column can be hidden at narrow widths; the phone cards show all of them.
import type { DataTableColumn } from '@/components/ui';
import { HealthBadge, MeasureValue } from '../../components';
import type { HealthComponent } from '../../types';
import { ComponentName } from './ComponentName';
import { HistoryCell } from './HistoryCell';
import type { HistoryView } from './history';
import { WhenText } from './WhenText';

/** What the columns need besides the row itself. */
export interface ColumnContext {
  /** The clock of the screen (epoch ms), for "38m ago". */
  now: number;
  /** Header of the bars column: the range in words ("Last 24 hours"). */
  historyLabel: string;
  history: HistoryView;
  /** Key of the component the chart shows. */
  picked: string | null;
  onPick: (key: string) => void;
  canOpenSupplier: boolean;
  /** The list is drawn as phone cards: the status moves into the heading, next to the name. */
  compact: boolean;
}

/**
 * The status is the first column so the badges line up and are what the eye meets first; on a phone the name leads
 * (`cardTitle="component"`) and carries the badge itself. The uptime windows are fixed (24 hours, 7 days, 30 days); only the
 * bars follow the range. "Since" is never hidden (what is broken, and since when, is what the list is for): below `xl` the
 * three uptime figures give way instead.
 */
export function componentColumns(ctx: ColumnContext): DataTableColumn<HealthComponent>[] {
  return [
    {
      key: 'status',
      label: 'Status',
      // A card line that renders nothing is left out, so the badge is not shown twice.
      render: (c) => (ctx.compact ? null : <HealthBadge status={c.status} />),
    },
    {
      key: 'component',
      label: 'Component',
      className: 'min-w-[11rem]',
      render: (c) => (
        <ComponentName
          component={c}
          picked={c.key === ctx.picked}
          onPick={ctx.onPick}
          canOpenSupplier={ctx.canOpenSupplier}
          badge={ctx.compact ? <HealthBadge status={c.status} /> : undefined}
        />
      ),
    },
    { key: 'since', label: 'Since', render: (c) => <WhenText time={c.since} now={ctx.now} /> },
    { key: 'latency', label: 'Latency', num: true, render: (c) => <MeasureValue measure={c.latency} /> },
    {
      key: 'uptime24',
      label: 'Uptime 24h',
      num: true,
      hide: 'xl',
      render: (c) => <MeasureValue measure={c.uptime.h24} />,
    },
    {
      key: 'uptime7',
      label: 'Uptime 7d',
      num: true,
      hide: 'xl',
      render: (c) => <MeasureValue measure={c.uptime.d7} />,
    },
    {
      key: 'uptime30',
      label: 'Uptime 30d',
      num: true,
      hide: 'xl',
      render: (c) => <MeasureValue measure={c.uptime.d30} />,
    },
    {
      key: 'history',
      label: ctx.historyLabel,
      render: (c) => <HistoryCell component={c} history={ctx.history} />,
    },
  ];
}
