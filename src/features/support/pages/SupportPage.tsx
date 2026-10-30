// SupportPage: the Support page (`/support`, the demo's `pageSupport` in 49-p-support.js): one inbox for customers and merchants with the
// list on the left and the thread on the right, plus the Templates view (`?view=templates`). Filters, thread, page and view live in the
// address (`?filter=late&ticket=4202`). The page only composes; the server filters, sorts and counts.
import { InboxView } from '../components/InboxView';
import { SupportHeader } from '../components/SupportHeader';
import { TemplatesView } from '../components/TemplatesView';
import { useComposerState } from '../hooks/useComposerState';
import { useSupportGrants } from '../hooks/useSupportGrants';
import { useSupportView } from '../hooks/useSupportView';

export function SupportPage() {
  const grants = useSupportGrants();
  const { view, setView } = useSupportView();
  // The composer's drafts live here so they survive the trip to the Templates view and back.
  const composer = useComposerState();
  return (
    <>
      <SupportHeader view={view} onView={setView} />
      {view === 'templates' ? (
        <TemplatesView grants={grants} />
      ) : (
        <InboxView grants={grants} composer={composer} />
      )}
    </>
  );
}
