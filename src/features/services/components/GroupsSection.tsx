// GroupsSection: "Price groups" of the Rules and groups tab, read-only: each merchant group with its discount and how many merchants it
// has. Ports the groups table of rulesTab in 43-p-services.js. Groups are managed on the merchants page, so a button links there.
import {
  ButtonLink,
  DataTable,
  EmptyState,
  QueryState,
  SkeletonTable,
  type DataTableColumn,
} from '@/components/ui';
import { useGroupOptions } from '../hooks/useChoices';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import { percentText } from '../lib/money';
import { MERCHANT_GROUPS_PATH } from '../lib/paths';
import type { ClientGroup } from '../types';
import { RuleSection } from './RuleSection';

const COLUMNS: DataTableColumn<ClientGroup>[] = [
  { key: 'group', label: 'Group', render: (group) => <span className="font-medium">{group.name}</span> },
  {
    key: 'discount',
    label: 'Discount',
    num: true,
    render: (group) =>
      Number(group.discountPercent) === 0 ? 'None' : `-${percentText(group.discountPercent)}`,
  },
  { key: 'merchants', label: 'Merchants', num: true, render: (group) => group.merchantCount ?? '–' },
];

/** The read-only merchant groups table. */
export function GroupsSection({ grants }: { grants: ServiceGrants }) {
  const allowed = grants.can('groups:read');
  const groups = useGroupOptions(allowed);
  return (
    <RuleSection
      title="Price groups"
      sub="Discount applied to base prices"
      right={
        <ButtonLink size="sm" to={MERCHANT_GROUPS_PATH}>
          Manage groups
        </ButtonLink>
      }
    >
      {allowed ? (
        <QueryState
          isLoading={groups.isLoading}
          isError={groups.isError}
          error={groups.error}
          onRetry={() => void groups.refetch()}
          errorTitle="Could not load the merchant groups"
          skeleton={<SkeletonTable cols={3} rows={3} />}
        >
          <DataTable
            caption="Price groups"
            columns={COLUMNS}
            rows={groups.data ?? []}
            rowKey={(group) => group.id}
            empty={
              <EmptyState icon="users" title="No merchant groups">
                Groups are created on the merchants page.
              </EmptyState>
            }
          />
        </QueryState>
      ) : (
        <p className="px-3.5 pb-3.5 text-sm text-ink3">
          You need the groups:read permission to see the merchant groups.
        </p>
      )}
    </RuleSection>
  );
}
