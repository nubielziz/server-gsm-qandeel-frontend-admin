// UnsavedGuard: the question asked before the edit view is left while a part holds unsaved changes. While `active`, a plain click on a link
// that opens another address (another part, the back link, another view or page of the console) is held back and the question is shown; the
// browser's own question is asked before the tab is reloaded or closed. The app's router cannot hold a move back by itself (it is not a data
// router), so the clicks are watched here, before the router sees them; a move the code makes by itself (a shortcut, the palette) is not.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ConfirmDialog } from '@/components/ui';
import { isPlainClick, leaveLink } from './leaveLink';

export interface UnsavedGuardProps {
  /** True while something is unsaved. */
  active: boolean;
  /** What would be lost, in words for the question: the name of the part ("Overview"). */
  what: string;
  /**
   * The address of the part that is open, as its own link writes it. The part may also be open under another spelling (the address names
   * no part and the first one shows), so a click on that link leaves nothing and needs no question.
   */
  stays?: string;
}

/** Draws nothing until a move is held back, then a small confirm question: "Discard changes" goes on, "Keep editing" stays. */
export function UnsavedGuard({ active, what, stays }: UnsavedGuardProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // The address a held-back click wanted to open.
  const [held, setHeld] = useState<string | null>(null);

  // Hold back a plain click on a link that leaves this address. The listener sits on the document in the capture phase, so it runs before
  // the router's own link handler; stopping the event keeps that handler from moving the app.
  useEffect(() => {
    if (!active) return;
    const hold = (event: MouseEvent) => {
      if (!isPlainClick(event)) return;
      const to = leaveLink(event.target, { pathname, search });
      if (to === null || to === stays) return;
      event.preventDefault();
      event.stopPropagation();
      setHeld(to);
    };
    document.addEventListener('click', hold, true);
    return () => document.removeEventListener('click', hold, true);
  }, [active, pathname, search, stays]);

  // Reloading or closing the tab loses the typing too: let the browser ask.
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers only ask when a return value is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active]);

  const asking = active ? held : null;
  if (asking === null) return null;
  return (
    <ConfirmDialog
      open
      title="Discard your unsaved changes?"
      body={<p>You have unsaved changes in {what}. If you go on, they are lost.</p>}
      confirm="Discard changes"
      cancel="Keep editing"
      kind="danger"
      onClose={() => setHeld(null)}
      onConfirm={() => void navigate(asking)}
    />
  );
}
