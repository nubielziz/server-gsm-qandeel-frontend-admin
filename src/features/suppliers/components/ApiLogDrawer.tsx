// ApiLogDrawer: the side sheet a log row opens: when the call happened, its status and duration, the order it belongs to and
// the request and response bodies as pretty JSON. The bodies come from `GET /admin/supplier-api-logs/:id`; the server has
// already masked the secrets in them.
import { cx, Drawer, Icon, KeyValue, QueryState, SkeletonTable } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useSupplierLog } from '../hooks/useSupplierLogs';
import { codeStyle, logMessage, logOrderLabel } from '../lib/logs';
import { msText } from '../lib/metrics';
import { JsonBlock } from './JsonBlock';

export interface ApiLogDrawerProps {
  /** The call to show; null keeps the drawer closed. */
  id: number | null;
  onClose: () => void;
  /** Opens an order's drawer; undefined when the staff member cannot read orders. */
  onOpenOrder?: (orderId: number) => void;
}

/** The side sheet for one logged call; it reads the call (with both bodies) only while it is open. */
export function ApiLogDrawer({ id, onClose, onOpenOrder }: ApiLogDrawerProps) {
  const { log, query } = useSupplierLog(id ?? undefined);
  const style = log ? codeStyle(log.httpStatus) : null;
  return (
    <Drawer
      open={id !== null}
      onClose={onClose}
      title={log?.action ?? 'API call'}
      titleClassName="mono"
      sub={log ? fmtDate(log.createdAt) : undefined}
      badges={
        log &&
        style && (
          <span className={cx('inline-flex items-center gap-1 text-sm tabular-nums', style.className)}>
            <Icon name={style.icon} className="ic-xs" />
            {log.httpStatus}
          </span>
        )
      }
    >
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Could not load the call"
        skeleton={<SkeletonTable cols={2} rows={5} />}
      >
        {log && (
          <div className="space-y-4">
            <KeyValue
              rows={[
                ['Status', `${log.httpStatus}${logMessage(log) ? `, ${logMessage(log)}` : ''}`],
                ['Duration', msText(log.durationMs)],
                [
                  'Order',
                  log.orderId === null ? (
                    '–'
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
                  ),
                ],
              ]}
            />
            <div>
              <h3 className="mb-1.5 text-sm font-medium">Request</h3>
              <JsonBlock label="request" value={log.request} />
            </div>
            <div>
              <h3 className="mb-1.5 text-sm font-medium">Response</h3>
              <JsonBlock label="response" value={log.response} />
            </div>
          </div>
        )}
      </QueryState>
    </Drawer>
  );
}
