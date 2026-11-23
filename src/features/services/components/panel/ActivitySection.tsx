// ActivitySection: the panel's last part: how orders of the service are handled (the SLA, and whether they go to the supplier by
// themselves or wait for an operator) and the two links to its orders and to the trace of a merchant price. Nothing here is edited
// in a form, so it is never dirty. The Auto switch and the SLA left the table for this section. Its two links leave the page, so they ask
// the panel's guard first.
import { Button, ButtonLink, Icon, KeyValue, Switch } from '@/components/ui';
import { ordersListPath } from '@/features/orders';
import { useLeaveClick } from '../../hooks/useLeaveClick';
import { useSetExecutionMode } from '../../hooks/useServiceMutations';
import { catalogPath } from '../../lib/paths';
import { slaText } from '../../lib/sla';
import { MODE_TOAST } from '../../lib/status';
import type { PanelSectionProps } from './types';

/** SLA, automatic or manual, and the links to the service's orders and to its price trace. */
export function ActivitySection({ service, grants, onLeave }: PanelSectionProps) {
  const setMode = useSetExecutionMode();
  const leave = useLeaveClick(onLeave);
  const ordersPath = ordersListPath({ tab: 'all', q: service.name });
  const tracePath = catalogPath({ view: 'settings', tab: 'resolver', service: service.id });
  const update = grants.needs('catalog:update');
  const orders = grants.needs('orders:read');
  const trace = grants.needsAll('pricing:read', 'catalog:read');
  const mode = service.executionMode;

  return (
    <div className="flex flex-col gap-3">
      <KeyValue
        rows={[
          ['SLA', slaText(service.slaMinutes)],
          [
            'Automation',
            <span className="inline-flex items-center gap-2">
              <Switch
                checked={mode === 'auto'}
                label={`Automation for ${service.name}`}
                disabled={update.disabled || setMode.isPending}
                title={update.title}
                onChange={(on) => setMode.mutate({ service, mode: on ? 'auto' : 'manual' })}
              />
              {mode === 'auto' ? 'Automatic' : 'Manual'}
            </span>,
          ],
        ]}
      />
      <p className="text-xs text-ink3">{MODE_TOAST[mode].body}</p>
      <div className="flex flex-wrap gap-2">
        {orders.disabled ? (
          <Button disabled title={orders.title}>
            <Icon name="orders" className="ic-sm" />
            See orders
          </Button>
        ) : (
          <ButtonLink to={ordersPath} onClick={leave(ordersPath)}>
            <Icon name="orders" className="ic-sm" />
            See orders
          </ButtonLink>
        )}
        {trace.disabled ? (
          <Button disabled title={trace.title}>
            <Icon name="scale" className="ic-sm" />
            Trace a merchant price
          </Button>
        ) : (
          <ButtonLink to={tracePath} onClick={leave(tracePath)}>
            <Icon name="scale" className="ic-sm" />
            Trace a merchant price
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
