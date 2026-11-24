// RankSection: the rank prices of the Set Pricing part, once the ranks are known. Listing the groups needs groups:read (a role
// without it sees a sentence instead of the table); the table itself (RankPrices) opens only when the groups are loaded.
import type { RefObject } from 'react';
import { QueryState, SkeletonTable } from '@/components/ui';
import { useGroupOptions } from '../../../../../hooks/useChoices';
import type { ServiceGrants } from '../../../../../hooks/useServiceGrants';
import type { ServiceDetail } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';
import { RankPrices, type RankSave } from './RankPrices';

export interface RankSectionProps {
  service: ServiceDetail;
  grants: ServiceGrants;
  /** Off, with the missing permission in its title, for a role that may not change prices. */
  lock: PermissionLock;
  saveRef: RefObject<RankSave | null>;
  onDirtyChange: (dirty: boolean) => void;
}

/** The loading, error and no-permission states of the rank table. */
export function RankSection({ service, grants, lock, saveRef, onDirtyChange }: RankSectionProps) {
  const canListGroups = grants.ready && grants.can('groups:read');
  const groups = useGroupOptions(canListGroups);

  if (!grants.ready) return null;
  if (!canListGroups) {
    return (
      <p className="text-sm text-ink3">{grants.needs('groups:read').title} to see the merchant ranks.</p>
    );
  }
  return (
    <QueryState
      isLoading={groups.isLoading}
      isError={groups.isError && !groups.data}
      error={groups.error}
      onRetry={() => void groups.refetch()}
      errorTitle="Could not load the merchant ranks"
      skeleton={<SkeletonTable cols={3} rows={3} />}
    >
      {groups.data && (
        <RankPrices
          service={service}
          groups={groups.data}
          lock={lock}
          saveRef={saveRef}
          onDirtyChange={onDirtyChange}
        />
      )}
    </QueryState>
  );
}
