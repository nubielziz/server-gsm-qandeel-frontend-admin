// ServiceEditor: reads the service the edit view names and says what the view shows while it cannot draw it: a loading line, the server's
// refusal (a service that does not exist is told apart from a failed read), or a move to the service's own kind on the strip. It also holds
// the unsaved mark of the open part, beside the read (see below).
import { Navigate } from 'react-router';
import { ButtonLink, EmptyState, ErrorState } from '@/components/ui';
import { isApiError, type Id } from '@/lib/api';
import { useServiceDetail } from '../../../hooks/useServiceDetail';
import { productsPath, type ServicePartId } from '../../../lib/productsPath';
import { lastAllLink } from '../all/lastAllAddress';
import type { ProductsViewProps } from '../types';
import { OpenService } from './OpenService';
import { openPart } from './openPart';
import { ServiceLoading } from './ServiceLoading';
import { useDirtyMark } from './useDirtyMark';

type EditorProps = ProductsViewProps & { id: Id; part: ServicePartId | null };

/** The service the address names, with its parts. */
export function ServiceEditor({ id, part, type, grants }: EditorProps) {
  const { detail: read, query } = useServiceDetail(id);
  // The app keeps the previous answer while the next one loads: the record of the service before this one is not this service's.
  const service = read?.id === id ? read : undefined;
  // The open part's unsaved mark lives here and not in OpenService, so a part's report draws this component again and the record is taken
  // afresh from the cache in that same draw. A save resolves only once the record has been read again, so "nothing unsaved" and the record
  // the save brought reach usePartStart together: the part adopts that record instead of starting again, which would wipe its "Saved".
  const mark = useDirtyMark(service ? openPart(service, part, grants).scope : '');
  if (!service) {
    if (query.isError && isApiError(query.error) && query.error.status === 404) {
      return (
        <EmptyState
          icon="tag"
          title="This service does not exist"
          cta={<ButtonLink to={lastAllLink(type)}>Back to All</ButtonLink>}
        >
          There is no service #{id}. It may have been deleted.
        </EmptyState>
      );
    }
    return query.isError ? (
      <ErrorState
        title="Could not load this service"
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    ) : (
      <ServiceLoading />
    );
  }
  // The strip shows the kind of the service being edited: an address that names another kind (or none) is corrected.
  if (service.type !== type) {
    return (
      <Navigate
        to={productsPath({ view: 'edit', type: service.type, id, part: part ?? undefined })}
        replace
      />
    );
  }
  return (
    <OpenService
      service={service}
      part={part}
      type={type}
      grants={grants}
      refreshing={query.isFetching}
      mark={mark}
    />
  );
}
