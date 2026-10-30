// PaymentsTab: the "Payment methods" tab: one card per gateway with its switch, a warning when customers cannot pay, and Add, Edit and
// Delete. Ports tabGateways and `st-gw` of 55-p-settings.js. The server decides what a switch may do; a refusal shows as a toast.
import { useState } from 'react';
import { Button, EmptyState, Icon, Panel, QueryState, SkeletonTable } from '@/components/ui';
import { useGatewayList, useGroupNames, useToggleGateway } from '../hooks/useGateways';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { customersCanPay, isLastStorefrontMethod } from '../lib/gateways';
import { GatewayCard } from './GatewayCard';
import { PaymentDialogs, type PaymentDialogState } from './PaymentDialogs';

/** The cards, the warning and the dialogs. */
export function PaymentsTab() {
  const grants = useSettingsGrants();
  const allowed = grants.can('payments:gateways');
  const { gateways, query } = useGatewayList(grants.ready && allowed);
  const groups = useGroupNames(grants.can('groups:read'));
  const toggle = useToggleGateway();
  const [dialog, setDialog] = useState<PaymentDialogState | null>(null);
  const lock = grants.needs('payments:gateways');

  // Turning off the last storefront method asks first, as the demo does.
  const flip = (gateway: (typeof gateways)[number], on: boolean) => {
    if (!on && isLastStorefrontMethod(gateway, gateways)) setDialog({ kind: 'last', gateway });
    else toggle.mutate({ gateway, on });
  };

  const addButton = (
    <Button
      variant="primary"
      size="sm"
      disabled={lock.disabled}
      title={lock.title}
      onClick={() => setDialog({ kind: 'create' })}
    >
      <Icon name="plus" className="ic-sm" />
      Add payment method
    </Button>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="min-w-[13rem] flex-1 text-sm text-ink2">
          The ways customers and merchants can pay. Secrets are write-only: once saved they are never shown
          again.
        </p>
        {addButton}
      </div>
      <QueryState
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error}
        errorTitle="Could not load the payment methods"
        onRetry={() => void query.refetch()}
        isEmpty={gateways.length === 0}
        skeleton={
          <Panel flush>
            <SkeletonTable cols={3} rows={4} />
          </Panel>
        }
        empty={
          <Panel flush>
            <EmptyState icon="wallet" title="No payment methods" cta={addButton}>
              Connect a card gateway to start selling.
            </EmptyState>
          </Panel>
        }
      >
        {!customersCanPay(gateways) && (
          <div className="mb-4 flex gap-2 rounded-md bg-crit-bg p-3 text-sm text-crit-fg" role="alert">
            <Icon name="alert" className="ic-sm mt-0.5 flex-none" />
            <span>
              <strong className="font-medium">Customers can’t pay.</strong> Every storefront payment method is
              off, so the checkout shows no way to pay. Turn one on.
            </span>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {gateways.map((gateway) => (
            <GatewayCard
              key={gateway.id}
              gateway={gateway}
              groups={groups.data}
              locks={{ update: lock, remove: lock }}
              saving={toggle.isPending && toggle.variables?.gateway.id === gateway.id}
              onToggle={(on) => flip(gateway, on)}
              onEdit={() => setDialog({ kind: 'edit', gateway })}
              onDelete={() => setDialog({ kind: 'delete', gateway })}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-ink3">
          Storefront payments are taken before an order is sent anywhere. Merchants on the API pay from their
          wallet instead, so bank transfer and Wise only apply to them.
        </p>
      </QueryState>
      <PaymentDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </>
  );
}
