// SettingsPage: "Settings" (`/settings`, the demo's `pageSettings` in 55-p-settings.js). A header and seven tabs kept in the address
// (`?tab=`): the demo's four (Payment methods, Tax and currency, Policies, Customer emails) and three the map adds (Notification log,
// Webhook deliveries, System). A tab whose permission the staff member lacks is hidden. The page only composes; each tab owns its data.
import { EmptyState, PageHeader, Panel, SkeletonTable, Tabs, type TabItem } from '@/components/ui';
import { useNow } from '@/lib/format';
import { EmailsTab } from '../components/EmailsTab';
import { NotificationLogTab } from '../components/NotificationLogTab';
import { PaymentsTab } from '../components/PaymentsTab';
import { PoliciesTab } from '../components/PoliciesTab';
import { SystemTab } from '../components/SystemTab';
import { TaxTab } from '../components/TaxTab';
import { WebhooksTab } from '../components/WebhooksTab';
import { useCurrencyList } from '../hooks/useCurrencies';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import { useTabView } from '../hooks/useTabView';
import { staleCurrencies } from '../lib/currencies';
import { SETTINGS_TABS, type SettingsTab } from '../lib/tabs';

/** The page: header, tabs and the tab the address names. */
export function SettingsPage() {
  const grants = useSettingsGrants();
  const now = useNow();
  const { tab, setTab } = useTabView();
  // The Tax and currency tab carries the number of stale rates, as the demo's tab does.
  const { currencies } = useCurrencyList(grants.ready && grants.can('settings:update'));
  const stale = staleCurrencies(currencies, now).length;

  const visible = SETTINGS_TABS.filter((spec) => grants.canAny(spec.permissions));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((spec) => spec.id === tab) ?? visible[0];
  const items: TabItem<SettingsTab>[] = visible.map((spec) => ({
    value: spec.id,
    label: spec.label,
    count: spec.id === 'tax' && stale > 0 ? stale : undefined,
  }));

  return (
    <>
      <PageHeader
        title="Settings"
        sub="How the storefront takes money, shows prices and talks to customers."
      />
      {!grants.ready ? (
        <Panel flush>
          <SkeletonTable cols={4} rows={6} />
        </Panel>
      ) : !current ? (
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see payment methods, tax, policies, messages or webhooks. Ask an owner if you
            need access.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="mb-4">
            <Tabs items={items} value={current.id} onChange={setTab} label="Settings sections" />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {current.id === 'payments' && <PaymentsTab />}
            {current.id === 'tax' && <TaxTab />}
            {current.id === 'policies' && <PoliciesTab />}
            {current.id === 'notifications' && <EmailsTab />}
            {current.id === 'log' && <NotificationLogTab />}
            {current.id === 'webhooks' && <WebhooksTab />}
            {current.id === 'system' && <SystemTab />}
          </div>
        </>
      )}
    </>
  );
}
