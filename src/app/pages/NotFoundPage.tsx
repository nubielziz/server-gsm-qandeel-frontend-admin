// NotFoundPage: shown for an address that matches no page (the `*` route inside the shell), in the demo's empty-state style.
import { ButtonLink, EmptyState, PageHeader, Panel } from '@/components/ui';
import { AUTH_PATHS } from '@/features/auth';
import { useBreadcrumbTitle } from '../layout/breadcrumbTitle';

export function NotFoundPage() {
  // Names the tab and the breadcrumb, since no page resource matches this address.
  useBreadcrumbTitle('Page not found');
  return (
    <>
      <PageHeader title="Page not found" />
      <Panel flush>
        <EmptyState
          icon="search"
          title="Nothing at this address"
          cta={<ButtonLink to={AUTH_PATHS.home}>Go to the start page</ButtonLink>}
        >
          The link may be old or mistyped. Pick a page from the menu, or press ⌘K to search.
        </EmptyState>
      </Panel>
    </>
  );
}
