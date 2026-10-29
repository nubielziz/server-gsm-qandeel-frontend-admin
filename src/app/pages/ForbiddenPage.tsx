// ForbiddenPage: shown in place of a page the staff member has no permission for, in the demo's empty-state style.
// The client check is a hint; the server refuses the data requests as well.
import { ButtonLink, EmptyState, PageHeader, Panel } from '@/components/ui';
import { usePermittedPages } from '../layout/usePages';
import type { PageResource } from '../resources';

export function ForbiddenPage({ page }: { page: PageResource }) {
  const permitted = usePermittedPages();
  // A way out that cannot lead to another refusal: the first page the staff member may open.
  const elsewhere = permitted?.find((candidate) => candidate.name !== page.name);
  return (
    <>
      <PageHeader title={page.meta.label} />
      <Panel flush>
        <EmptyState
          icon="lock"
          title="You do not have access to this page"
          cta={
            elsewhere ? <ButtonLink to={elsewhere.path}>Go to {elsewhere.meta.label}</ButtonLink> : undefined
          }
        >
          Your role does not include the{' '}
          <span className="mono">{[page.meta.permission].flat().join(' or ')}</span> permission. Ask an owner
          to change your role if you need it.
        </EmptyState>
      </Panel>
    </>
  );
}
