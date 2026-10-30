// NotificationDrawer: the details of one line of the notification log: who it went to (as the server prints it, masked), the channel,
// the status and time, the reason if it failed, and the data the message was built from. Read-only.
import { KeyValue } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useNotification } from '../hooks/useLogs';
import { jsonText, NOTIFICATION_STATUS } from '../lib/logs';
import { CHANNEL_LABEL, eventLabel } from '../lib/templates';
import type { NotificationLogEntry } from '../types';
import { LogDrawerShell } from './LogDrawerShell';
import { StatusBadge } from './StatusBadge';

/** The drawer for notification `id`; `row` is the list row shown while the single read loads. */
export function NotificationDrawer({
  id,
  row,
  onClose,
}: {
  id: number;
  row?: NotificationLogEntry;
  onClose: () => void;
}) {
  const { notification, query } = useNotification(id, row);
  return (
    <LogDrawerShell
      title={notification ? eventLabel(notification.event) : `Notification ${id}`}
      ready={notification !== undefined}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      onClose={onClose}
      badges={notification && <StatusBadge look={NOTIFICATION_STATUS[notification.status]} />}
      sub={notification?.event}
    >
      {notification && (
        <div className="space-y-4">
          {notification.error && (
            <p className="rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">
              {notification.error}
            </p>
          )}
          <KeyValue
            rows={[
              ['Channel', CHANNEL_LABEL[notification.channel]],
              [
                'Sent to',
                <span key="to" className="mono">
                  {notification.recipient}
                </span>,
              ],
              ['Recipient type', notification.recipientType],
              ['Created', fmtDate(notification.createdAt)],
              [
                'Sent',
                notification.sentAt ? (
                  fmtDate(notification.sentAt)
                ) : (
                  <span className="text-ink3">Not sent</span>
                ),
              ],
            ]}
          />
          {notification.payload !== undefined && (
            <section aria-label="Data">
              <h3 className="mb-1 text-sm font-semibold">Data</h3>
              <pre className="mono max-h-72 overflow-auto rounded-md bg-sunken p-3 text-xs">
                {jsonText(notification.payload)}
              </pre>
            </section>
          )}
        </div>
      )}
    </LogDrawerShell>
  );
}
