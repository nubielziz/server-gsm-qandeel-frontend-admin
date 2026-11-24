// OpenService: a service that has been read, drawn as the layout of a record with many parts. The parts come from the registry
// (lib/serviceParts), narrowed to what the role may see; the part the address names is shown, or the first one when it names none (or one
// the role may not see). It asks the unsaved-changes question: a part says it has unsaved changes (the mark ServiceEditor holds), and
// while it has, another part, the back link, another view or a reload asks first (UnsavedGuard). It also keeps a part from working on a
// stale copy of the service (usePartStart): a part that fills a form from the record is not drawn while the record is being read again,
// and starts again when the record changes while it holds nothing unsaved.
import { EmptyState, ButtonLink, PartsLayout, UnsavedGuard, type DirtyMark } from '@/components/ui';
import type { ServiceType } from '@/lib/serviceTypes';
import type { ServiceGrants } from '../../../hooks/useServiceGrants';
import { productsPath, type ServicePartId } from '../../../lib/productsPath';
import type { ServiceDetail } from '../../../types';
import { lastAllLink } from '../all/lastAllAddress';
import { openPart } from './openPart';
import { ServiceLoading } from './ServiceLoading';
import { usePartStart } from './usePartStart';

/**
 * The parts that fill a form from the record when they open (the ones that save a whole copy of it). Only these wait for a fresh record and
 * start again when it changes; the others (API Connection, Inventory, Activity) read their own data or follow their props.
 */
const STARTS_FROM_RECORD: readonly ServicePartId[] = ['overview', 'pricing', 'fields', 'shop'];

export interface OpenServiceProps {
  service: ServiceDetail;
  /** The part the address names, or null when it names none. */
  part: ServicePartId | null;
  type: ServiceType;
  grants: ServiceGrants;
  /** The record is being read again (a save marked it stale): a part that fills a form from it is not drawn until the new copy is here. */
  refreshing: boolean;
  /** The unsaved mark of the open part (useDirtyMark on the scope of openPart), held by the caller beside its read of the record. */
  mark: DirtyMark;
}

/** The menu of parts, the part that is open and the question asked before its unsaved changes are left. */
export function OpenService({ service, part, type, grants, refreshing, mark }: OpenServiceProps) {
  const { parts, current, scope } = openPart(service, part, grants);
  // One mark per part of one service: a part that has been closed cannot mark the next one.
  const { dirty, report } = mark;
  const { waiting, version } = usePartStart(scope, service, {
    fromRecord: current !== undefined && STARTS_FROM_RECORD.includes(current.id),
    dirty,
    refreshing,
  });
  // The list as it was last seen (its filters and page), not the first page of everything.
  const back = { label: 'Back to All', to: lastAllLink(type) };
  if (!current) {
    return (
      <EmptyState
        icon="lock"
        title="Nothing to show for your role"
        cta={<ButtonLink to={back.to}>{back.label}</ButtonLink>}
      >
        Your role cannot see any part of this service.
      </EmptyState>
    );
  }
  return (
    <>
      <PartsLayout
        title={service.name}
        sub={`#${service.id} · ${service.code}`}
        back={back}
        items={parts.map((candidate) => ({
          id: candidate.id,
          label: candidate.label,
          to: productsPath({ type, view: 'edit', id: service.id, part: candidate.id }),
        }))}
        current={current.id}
      >
        {waiting ? (
          <ServiceLoading />
        ) : (
          <current.Component
            key={`${service.id}:${current.id}:${version}`}
            service={service}
            grants={grants}
            onDirtyChange={report}
          />
        )}
      </PartsLayout>
      <UnsavedGuard
        active={dirty}
        what={current.label}
        stays={productsPath({ type, view: 'edit', id: service.id, part: current.id })}
      />
    </>
  );
}
