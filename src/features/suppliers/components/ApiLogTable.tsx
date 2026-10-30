// ApiLogTable: the supplier's recent calls: time, what was called, the HTTP status, how long it took, the order it belongs to
// and the supplier's message. Ports `logTable` of 44-p-suppliers.js. A row opens the call in a drawer. The API log has an
// `action` (placeimeiorder…), not the demo's `METHOD /path` (MISMATCHES M64).
import { cx, EmptyState, Icon } from '@/components/ui';
import { fmtDate, fmtTime } from '@/lib/format';
import { codeStyle, logMessage, logOrderLabel, SLOW_CALL_MS } from '../lib/logs';
import { msText } from '../lib/metrics';
import type { SupplierApiLog } from '../types';

export interface ApiLogTableProps {
  logs: readonly SupplierApiLog[];
  onOpen: (id: number) => void;
  /** Opens an order's drawer; undefined when the staff member cannot read orders, and the number is plain text. */
  onOpenOrder?: (orderId: number) => void;
}

/** One row per call. The time is a button (the keyboard way in) and the whole row opens the call too. */
export function ApiLogTable({ logs, onOpen, onOpenOrder }: ApiLogTableProps) {
  if (logs.length === 0) {
    return (
      <EmptyState icon="inbox" title="No calls yet">
        Calls to this supplier appear here as orders are dispatched.
      </EmptyState>
    );
  }
  return (
    <table className="tbl" aria-label="Recent API calls">
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Request</th>
          <th scope="col">Status</th>
          <th scope="col" className="num">
            Latency
          </th>
          <th scope="col" className="hidden md:table-cell">
            Order
          </th>
          <th scope="col" className="hidden lg:table-cell">
            Message
          </th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => {
          const style = codeStyle(log.httpStatus);
          return (
            <tr
              key={log.id}
              className="row"
              onClick={(event) => {
                // Controls inside the row keep their own clicks.
                if (!(event.target as HTMLElement).closest('a, button')) onOpen(log.id);
              }}
            >
              <td className="mono whitespace-nowrap">
                <button
                  type="button"
                  className="link mono"
                  title={fmtDate(log.createdAt)}
                  aria-label={`Details of the ${log.action} call at ${fmtTime(log.createdAt)}`}
                  onClick={() => onOpen(log.id)}
                >
                  {fmtTime(log.createdAt)}
                </button>
              </td>
              <td className="mono whitespace-nowrap">{log.action}</td>
              <td>
                <span className={cx('inline-flex items-center gap-1 tabular-nums', style.className)}>
                  <Icon name={style.icon} className="ic-xs" />
                  {log.httpStatus}
                </span>
              </td>
              <td className={cx('num', log.durationMs > SLOW_CALL_MS && 'text-crit-fg')}>
                {msText(log.durationMs)}
              </td>
              <td className="hidden md:table-cell">
                {log.orderId === null ? (
                  <span className="text-ink3">—</span>
                ) : onOpenOrder ? (
                  <button
                    type="button"
                    className="link mono"
                    onClick={() => onOpenOrder(log.orderId as number)}
                  >
                    {logOrderLabel(log.orderId)}
                  </button>
                ) : (
                  <span className="mono">{logOrderLabel(log.orderId)}</span>
                )}
              </td>
              <td className="hidden max-w-[260px] truncate text-ink2 lg:table-cell">{logMessage(log)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
