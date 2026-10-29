// PagePlaceholder: stands in for a page until its feature is built. Each feature replaces its placeholder in routes.tsx.
import { EmptyState, PageHeader, Panel } from '@/components/ui';

export function PagePlaceholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Panel flush>
        <EmptyState icon="layers" title="This page is being ported">
          The {title} screen of the demo has not been built into the console yet.
        </EmptyState>
      </Panel>
    </>
  );
}
