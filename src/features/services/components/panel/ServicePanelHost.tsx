// ServicePanelHost: finds the service the address names (in the loaded page of rows, else by its id), shows the panel for it, and
// wires the panel to the unsaved-changes guard. A service that is not on the page (another page, a filter, a shared link) is read
// with the detail hook, so the panel never depends on where the table is.
import { useCallback, useMemo } from 'react';
import { ErrorState, Skeleton, SidePanel } from '@/components/ui';
import { isApiError, type Id } from '@/lib/api';
import type { PanelGuard } from '../../hooks/usePanelGuard';
import type { ServiceGrants } from '../../hooks/useServiceGrants';
import { useServiceDetail } from '../../hooks/useServiceDetail';
import type { Service } from '../../types';
import { BackToList } from './BackToList';
import { ServicePanel } from './ServicePanel';
import type { PanelSectionId } from './types';

export interface ServicePanelHostProps {
  /** The service the address names (`open=`). */
  id: Id;
  /** The section the address names (`section=`), if any. */
  section: PanelSectionId | null;
  /** The rows of the table's loaded page. */
  rows: readonly Service[];
  grants: ServiceGrants;
  guard: PanelGuard;
}

/** The panel, or its loading and failure states while the service is read. */
export function ServicePanelHost({ id, section, rows, grants, guard }: ServicePanelHostProps) {
  const row = rows.find((candidate) => candidate.id === id);
  // The detail is read even when the row is on the page: it is the refreshed record that tells the sections a save happened. The
  // sections that need it read the same query.
  const { detail: read, query } = useServiceDetail(id);
  // The app keeps the previous answer while the next one loads: the record of the service before this one is not this service's.
  const detail = read?.id === id ? read : undefined;
  const rowText = useMemo(() => (row ? JSON.stringify(row) : undefined), [row]);
  const detailText = useMemo(() => (detail ? JSON.stringify(detail) : undefined), [detail]);
  const { requestClose, requestOpen, requestLeave, markDirty } = guard;
  const onSection = useCallback((part: PanelSectionId) => requestOpen(id, part), [requestOpen, id]);

  // The server says the service is gone (deleted, here or elsewhere): a copy that is still cached, or a row the list has not dropped
  // yet, must not keep a panel whose saves and switches can only fail.
  const gone = query.isError && isApiError(query.error) && query.error.status === 404;
  const service = gone ? undefined : (row ?? detail);
  if (!service) {
    return (
      <SidePanel title="Service" onClose={requestClose} closeLabel="Close service">
        <BackToList onBack={requestClose} />
        {query.isError ? (
          <ErrorState
            title="Could not load this service"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <div role="status" className="flex flex-col gap-2">
            <span className="sr-only">Loading the service</span>
            <Skeleton width="60%" height={16} />
            <Skeleton />
            <Skeleton width="80%" />
          </div>
        )}
      </SidePanel>
    );
  }

  return (
    <ServicePanel
      key={service.id}
      service={service}
      grants={grants}
      section={section}
      signature={[rowText, detailText]}
      dirty={guard.dirty}
      onDirtyChange={markDirty}
      onSection={onSection}
      onClose={requestClose}
      onLeave={requestLeave}
    />
  );
}
