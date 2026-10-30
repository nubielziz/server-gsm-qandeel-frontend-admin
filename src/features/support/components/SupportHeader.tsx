// SupportHeader: the page title with its one action: "Manage templates" on the inbox, "Back to the inbox" on the Templates view.
// Ports `pageHead` of pageSupport (49-p-support.js); the demo's "Simulate a ticket" button is not ported (MISMATCHES M9).
import { Button, Icon, PageHeader } from '@/components/ui';
import type { SupportView } from '../lib/filters';

export interface SupportHeaderProps {
  view: SupportView;
  onView: (view: SupportView) => void;
}

export function SupportHeader({ view, onView }: SupportHeaderProps) {
  const inbox = view === 'inbox';
  return (
    <PageHeader
      title="Support"
      sub={
        inbox
          ? 'One inbox for customers on the storefront and merchants on the API.'
          : 'Ready-made replies your team inserts into an answer.'
      }
      actions={
        <Button onClick={() => onView(inbox ? 'templates' : 'inbox')}>
          <Icon name={inbox ? 'edit' : 'chevL'} className="ic-sm" />
          {inbox ? 'Manage templates' : 'Back to the inbox'}
        </Button>
      }
    />
  );
}
