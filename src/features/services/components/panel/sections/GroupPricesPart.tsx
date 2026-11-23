// GroupPricesPart: the second form of the panel's Prices section. Saving replaces the whole list of group prices, so it opens the form
// only once the service's saved prices and the merchant groups are loaded; until then it shows the loading or the error state.
import type { ReactNode } from 'react';
import { QueryState, SkeletonTable } from '@/components/ui';
import { useGroupOptions } from '../../../hooks/useChoices';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import type { Service } from '../../../types';
import { GroupPricesPanelForm } from './GroupPricesPanelForm';

export interface GroupPricesPartProps {
  service: Service;
  grants: ServiceGrants;
  /** One more line under the explanation of the form. */
  note?: ReactNode;
  /** Says whether the boxes hold unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

/**
 * Listing the groups needs `groups:read` (a role without it sees a sentence instead of the form); saving needs `pricing:update`
 * as well, and a role that lacks it sees the boxes disabled with the permission named.
 */
export function GroupPricesPart({ service, grants, note, onDirtyChange }: GroupPricesPartProps) {
  const canListGroups = grants.ready && grants.can('groups:read');
  const { detail, query } = useServiceDetail(service.id);
  const groups = useGroupOptions(canListGroups);

  if (grants.ready && !canListGroups) {
    return (
      <p className="text-sm text-ink3">{grants.needs('groups:read').title} to see the merchant groups.</p>
    );
  }
  const failed = [query, groups].find((one) => one.isError);
  const ready = Boolean(detail && groups.data);
  return (
    <QueryState
      isLoading={!ready && !failed}
      isError={!ready && Boolean(failed)}
      error={failed?.error}
      onRetry={() => [query, groups].forEach((one) => void one.refetch())}
      errorTitle="Could not load the group prices"
      skeleton={<SkeletonTable cols={2} rows={3} />}
    >
      {detail && groups.data && (
        <GroupPricesPanelForm
          service={service}
          groups={groups.data}
          saved={detail.groupPrices}
          lock={grants.needsAll('pricing:update', 'groups:read')}
          note={note}
          onDirtyChange={onDirtyChange}
        />
      )}
    </QueryState>
  );
}
