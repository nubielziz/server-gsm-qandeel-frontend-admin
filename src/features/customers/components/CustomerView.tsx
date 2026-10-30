// CustomerView: one loaded customer: the header, the suspended banner, the five figures and the five tabs (Orders, Account,
// Support, Consents and data, Risk), with the dialogs and the order drawer. Ports the body of pageCustomer in 48-p-customers.js.
// The tab lives in the address (`?tab=account`), the open order in `?order=<id>`.
import { useState } from 'react';
import { Panel, SectionTabs, type TabItem } from '@/components/ui';
import { OrderDrawerHost } from '@/features/orders';
import { useNow } from '@/lib/format';
import { useCustomerGrants } from '../hooks/useCustomerGrants';
import { useDetailTab } from '../hooks/useDetailTab';
import { DETAIL_TABS, type DetailTab } from '../lib/detailTabs';
import type { CustomerDetail } from '../types';
import { AccountTab } from './AccountTab';
import { ConsentsTab } from './ConsentsTab';
import { CustomerDialogs } from './CustomerDialogs';
import type { CustomerDialogKind, CustomerDialogState } from './customerDialogState';
import { CustomerHeader } from './CustomerHeader';
import { CustomerStats } from './CustomerStats';
import { OrdersTab } from './OrdersTab';
import { RiskTab } from './RiskTab';
import { SuspendedBanner } from './SuspendedBanner';
import { SupportTab } from './SupportTab';

export function CustomerView({ customer }: { customer: CustomerDetail }) {
  const grants = useCustomerGrants();
  const [tab, setTab] = useDetailTab();
  const [dialog, setDialog] = useState<CustomerDialogState | null>(null);
  const now = useNow();
  const open = (kind: CustomerDialogKind) => setDialog({ kind, customer });

  const items: TabItem<DetailTab>[] = DETAIL_TABS.map(({ id, label }) => ({
    value: id,
    label,
    count: id === 'orders' ? customer.stats.orders : id === 'support' ? customer.stats.tickets : undefined,
  }));

  return (
    <>
      <CustomerHeader customer={customer} grants={grants} onAction={open} />
      {customer.status === 'suspended' && (
        <SuspendedBanner
          customer={customer}
          grants={grants}
          now={now}
          onReactivate={() => open('reactivate')}
        />
      )}
      <CustomerStats stats={customer.stats} now={now} />
      <Panel flush>
        <SectionTabs items={items} value={tab} onChange={setTab} label="Customer details" />
        <div
          className="border-t border-line"
          role="tabpanel"
          aria-label={DETAIL_TABS.find((candidate) => candidate.id === tab)?.label}
        >
          {tab === 'orders' && <OrdersTab customer={customer} grants={grants} />}
          {tab === 'account' && <AccountTab customer={customer} grants={grants} now={now} onAction={open} />}
          {tab === 'support' && <SupportTab customer={customer} />}
          {tab === 'consents' && (
            <ConsentsTab customer={customer} grants={grants} now={now} onAction={open} />
          )}
          {tab === 'risk' && <RiskTab customer={customer} />}
        </div>
      </Panel>
      {/* The drawer comes first and the dialogs after it, so a dialog opened over it sits on top. */}
      <OrderDrawerHost />
      <CustomerDialogs dialog={dialog} onChange={setDialog} />
    </>
  );
}
