// TabPlaceholder: what each tab shows until its own slice replaces it. Not a real screen; it keeps the tab strip working.
import { EmptyState, Panel } from '@/components/ui';

/** "This tab is being built". The tab slices delete their use of it when they write the real tab. */
export function TabPlaceholder({ name }: { name: string }) {
  return (
    <Panel>
      <EmptyState icon="pulse" title="This tab is being built">
        The {name} tab is not ready yet. The status and the key figures above already work.
      </EmptyState>
    </Panel>
  );
}
