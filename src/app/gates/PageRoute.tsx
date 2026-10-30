// PageRoute: one routed page behind its permission gate. The access-control provider decides whether the staff member
// may open it; if not, the ForbiddenPage shows instead. That is a hint for the user: the server refuses the data
// requests of a page the staff member may not read anyway.
import { useCan, useResourceParams } from '@refinedev/core';
import { Suspense, type ComponentType } from 'react';
import { ErrorState, Panel } from '@/components/ui';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { PageLoading } from '../pages/PageLoading';
import { PagePlaceholder } from '../pages/PagePlaceholder';
import type { PageResource } from '../resources';

export interface PageRouteProps {
  page: PageResource;
  /** `list` for the page itself, `show` for its detail view (both need the page's read permission). */
  action: 'list' | 'show';
  /** The feature's page (lazy, from its manifest); without one the "being ported" placeholder shows. */
  Page?: ComponentType;
}

/**
 * Like Refine's `<CanAccess>`, plus the two states it leaves blank: still checking (skeleton) and the check failed
 * because the permissions could not be loaded (error with Retry). A failed refresh keeps the last answer, so an open
 * page is never replaced by a false "no access" screen after a network blip.
 */
export function PageRoute({ page, action, Page }: PageRouteProps) {
  const { resource } = useResourceParams({ resource: page.name });
  const { data, isError, error, refetch } = useCan({ resource: page.name, action, params: { resource } });

  if (data?.can === false) return <ForbiddenPage page={page} />;
  if (data?.can) {
    return (
      // Feature pages are lazy (one chunk per feature), so the first visit waits for the chunk here.
      <Suspense fallback={<PageLoading />}>
        {Page ? <Page /> : <PagePlaceholder title={page.meta.label} />}
      </Suspense>
    );
  }
  if (isError) {
    return (
      <Panel flush>
        <ErrorState title="Could not check your access" error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }
  return <PageLoading />;
}
