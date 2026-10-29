// HomeRedirect: the console's start page (`/`). Sends the staff member to the first page their role may open, so a
// role without the dashboard (say Support) never lands on a "no access" screen after signing in.
import { Navigate } from 'react-router';
import { EmptyState, ErrorState, PageHeader, Panel } from '@/components/ui';
import { useMe } from '@/features/auth';
import { usePermittedPages } from '../layout/usePages';
import { PageLoading } from '../pages/PageLoading';

export function HomeRedirect() {
  const me = useMe();
  const pages = usePermittedPages();

  if (pages === undefined) {
    // The permitted pages come from `me`. If it failed for a reason that does not end the session (5xx, 429, offline),
    // nothing else on this screen would call the API again, so offer the retry here instead of waiting forever.
    if (me.isError) {
      return (
        <>
          <PageHeader title="GSM Supply" />
          <Panel flush>
            <ErrorState
              title="Could not load your account"
              error={me.error}
              onRetry={() => void me.refetch()}
            />
          </Panel>
        </>
      );
    }
    return <PageLoading />;
  }

  const first = pages[0];
  if (first) return <Navigate to={first.path} replace />;
  // Signed in, but the role opens no page at all: say so instead of bouncing between refusals.
  return (
    <>
      <PageHeader title="GSM Supply" />
      <Panel flush>
        <EmptyState icon="lock" title="Your role has no pages yet">
          You are signed in, but your role does not include any page of this console. Ask an owner to give
          your role the permissions you need.
        </EmptyState>
      </Panel>
    </>
  );
}
