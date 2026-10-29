// AccessPage: "Admins and access" (`/access`, the demo's `pageAccess` in 56-p-access.js). Five tabs, kept in the URL
// (`?tab=`): admin accounts, allowed IPs, blocked IPs, and two the demo lacks, roles and sessions. A tab whose read
// permission the staff member lacks is hidden. The page only composes; each tab owns its data and dialogs.
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState, PageHeader, Panel, SkeletonTable, Tabs, type TabItem } from '@/components/ui';
import { AdminsTab } from '../components/AdminsTab';
import { AllowedIpsTab } from '../components/AllowedIpsTab';
import { BlockedIpsTab } from '../components/BlockedIpsTab';
import { RolesTab } from '../components/RolesTab';
import { SessionsTab } from '../components/SessionsTab';
import { useAccessCounts, type AccessCounts } from '../hooks/useAccessCounts';
import { useAccessGrants } from '../hooks/useAccessGrants';

type TabId = 'admins' | 'allow' | 'block' | 'roles' | 'sessions';

type TabSpec = {
  id: TabId;
  label: string;
  /** The read permission the tab needs. */
  permission: string;
  count: (counts: AccessCounts) => number | undefined;
  body: () => ReactNode;
};

const TABS: readonly TabSpec[] = [
  {
    id: 'admins',
    label: 'Admin accounts',
    permission: 'staff:read',
    count: (c) => c.admins,
    body: () => <AdminsTab />,
  },
  {
    id: 'allow',
    label: 'Allowed IPs',
    permission: 'access:read',
    count: (c) => c.allow,
    body: () => <AllowedIpsTab />,
  },
  {
    id: 'block',
    label: 'Blocked IPs',
    permission: 'access:read',
    count: (c) => c.block,
    body: () => <BlockedIpsTab />,
  },
  { id: 'roles', label: 'Roles', permission: 'roles:read', count: (c) => c.roles, body: () => <RolesTab /> },
  // Sessions can be many and are read a page at a time, so the tab carries no count.
  {
    id: 'sessions',
    label: 'Sessions',
    permission: 'sessions:read',
    count: () => undefined,
    body: () => <SessionsTab />,
  },
];

/**
 * The page: a header and the tabs the staff member may read. Each tab loads its own data.
 */
export function AccessPage() {
  const grants = useAccessGrants();
  const counts = useAccessCounts(grants.can);
  const [params, setParams] = useSearchParams();

  const visible = TABS.filter((tab) => grants.can(tab.permission));
  // An unknown or forbidden `?tab=` falls back to the first tab the staff member may open.
  const current = visible.find((tab) => tab.id === params.get('tab')) ?? visible[0];

  const items: TabItem<TabId>[] = visible.map((tab) => ({
    value: tab.id,
    label: tab.label,
    count: tab.count(counts),
  }));

  return (
    <>
      <PageHeader
        title="Admins and access"
        sub="Who can sign in to this console, and which network addresses can reach it, the storefront and the merchant API."
      />
      {!grants.ready ? (
        <Panel flush>
          <SkeletonTable cols={5} rows={6} />
        </Panel>
      ) : !current ? (
        <Panel flush>
          <EmptyState icon="lock" title="Nothing here for your role">
            Your role cannot see admin accounts, IP rules, roles or sessions. Ask an owner if you need access.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <div className="mb-4">
            <Tabs
              items={items}
              value={current.id}
              onChange={(tab) => setParams({ tab })}
              label="Access sections"
            />
          </div>
          <div role="tabpanel" aria-label={current.label}>
            {current.body()}
          </div>
        </>
      )}
    </>
  );
}
