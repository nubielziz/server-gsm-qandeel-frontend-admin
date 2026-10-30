// DeliveryDrawer: the details of one webhook delivery: the merchant and address, the status and attempts, the request that was sent, the
// merchant's answer, and Retry. A refusal from the server (for example "already delivered") shows under the buttons.
import { Link } from 'react-router';
import { Button, errorText, Icon, KeyValue } from '@/components/ui';
import { merchantPath } from '@/features/merchants';
import { fmtDate } from '@/lib/format';
import { useDelivery, useRetryDelivery } from '../hooks/useLogs';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { answerText, canRetry, DELIVERY_STATUS, jsonText } from '../lib/logs';
import { eventLabel } from '../lib/templates';
import type { WebhookDelivery } from '../types';
import { LogDrawerShell } from './LogDrawerShell';
import { StatusBadge } from './StatusBadge';

/** The drawer for delivery `id`; `row` is the list row shown while the single read loads. */
export function DeliveryDrawer({
  id,
  row,
  onClose,
}: {
  id: number;
  row?: WebhookDelivery;
  onClose: () => void;
}) {
  const grants = useSettingsGrants();
  const { delivery, query } = useDelivery(id, row);
  const retry = useRetryDelivery();
  const lock = grants.needs('webhooks:update');
  const sendable = delivery ? canRetry(delivery) : false;

  return (
    <LogDrawerShell
      title={delivery ? eventLabel(delivery.event) : `Delivery ${id}`}
      ready={delivery !== undefined}
      isError={query.isError}
      error={query.error}
      onRetry={() => void query.refetch()}
      onClose={onClose}
      badges={delivery && <StatusBadge look={DELIVERY_STATUS[delivery.status]} />}
      sub={delivery?.event}
      footer={
        <>
          <span className="min-w-0 flex-1 text-sm text-crit-fg" role="alert">
            {retry.isError ? errorText(retry.error) : ''}
          </span>
          <Button
            variant="primary"
            loading={retry.isPending}
            disabled={!delivery || !sendable || lock.disabled}
            title={lock.title ?? (sendable ? undefined : 'This delivery already worked')}
            onClick={() => delivery && retry.mutate(delivery)}
          >
            <Icon name="refresh" className="ic-sm" />
            Retry
          </Button>
        </>
      }
    >
      {delivery && (
        <div className="space-y-4">
          <KeyValue
            rows={[
              [
                'Merchant',
                delivery.client ? (
                  <Link key="m" className="underline" to={merchantPath(delivery.client.id)}>
                    {delivery.client.name}
                  </Link>
                ) : (
                  <span className="text-ink3">Removed</span>
                ),
              ],
              [
                'Address',
                delivery.endpoint ? (
                  <span key="u" className="mono break-all">
                    {delivery.endpoint.url}
                  </span>
                ) : (
                  <span className="text-ink3">Removed</span>
                ),
              ],
              ['Answer', answerText(delivery.responseCode)],
              ['Attempts', delivery.attempt],
              ['Created', fmtDate(delivery.createdAt)],
              delivery.nextRetryAt ? ['Next attempt', fmtDate(delivery.nextRetryAt)] : null,
            ]}
          />
          {delivery.error && (
            <p className="rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">
              {delivery.error}
            </p>
          )}
          <section aria-label="Request">
            <h3 className="mb-1 text-sm font-semibold">Request</h3>
            <pre className="mono max-h-60 overflow-auto rounded-md bg-sunken p-3 text-xs">
              {jsonText(delivery.payload ?? null)}
            </pre>
          </section>
          <section aria-label="Response">
            <h3 className="mb-1 text-sm font-semibold">Response</h3>
            <pre className="mono max-h-60 overflow-auto whitespace-pre-wrap rounded-md bg-sunken p-3 text-xs">
              {delivery.responseBody ?? (delivery.responseCode > 0 ? '(empty)' : 'No answer')}
            </pre>
          </section>
        </div>
      )}
    </LogDrawerShell>
  );
}
