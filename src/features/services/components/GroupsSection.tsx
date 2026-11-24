// GroupsSection: "Ranks" of the Merchant price rules view (the old "Price groups" of the Rules and groups tab), read-only: each rank with its
// discount and how many accounts it has. Ports the groups table of rulesTab in 43-p-services.js. Ranks are managed on the Accounts page,
// so a link goes there.
import { Link } from 'react-router';
import { DataTable, EmptyState, QueryState, SkeletonTable, type DataTableColumn } from '@/components/ui';
import { useGroupOptions } from '../hooks/useChoices';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { percentText } from '../lib/money';
import { RANKS_PATH } from '../lib/paths';
import type { ClientGroup } from '../types';
import { RuleSection } from './RuleSection';

const COLUMNS: DataTableColumn<ClientGroup>[] = [
  { key: 'group', label: 'Rank', render: (group) => <span className="font-medium">{group.name}</span> },
  {
    key: 'discount',
    label: 'Discount',
    num: true,
    render: (group) =>
      Number(group.discountPercent) === 0 ? 'None' : `-${percentText(group.discountPercent)}`,
  },
  { key: 'accounts', label: 'Accounts', num: true, render: (group) => group.accountCount ?? '–' },
];

/** The read-only ranks table. */
export function GroupsSection({ grants }: { grants: ServiceGrants }) {
  const allowed = grants.can('groups:read');
  const groups = useGroupOptions(allowed);
  return (
    <RuleSection
      title="Ranks"
      sub="Discount applied to base prices"
      right={
        <Link className="link text-sm" to={RANKS_PATH}>
          Manage ranks
        </Link>
      }
    >
      {allowed ? (
        <QueryState
          isLoading={groups.isLoading}
          isError={groups.isError}
          error={groups.error}
          onRetry={() => void groups.refetch()}
          errorTitle="Could not load the ranks"
          skeleton={<SkeletonTable cols={3} rows={3} />}
        >
          <DataTable
            skin="list"
            footer={false}
            caption="Ranks"
            columns={COLUMNS}
            rows={groups.data ?? []}
            rowKey={(group) => group.id}
            empty={
              <EmptyState icon="users" title="No ranks">
                Ranks are created on the Accounts page.
              </EmptyState>
            }
          />
        </QueryState>
      ) : (
        <p className="text-sm text-ink3">You need the groups:read permission to see the ranks.</p>
      )}
    </RuleSection>
  );
}
