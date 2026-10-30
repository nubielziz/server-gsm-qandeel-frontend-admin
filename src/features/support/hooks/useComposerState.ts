// What the composer remembers while the page is open: one draft per ticket (so switching tickets does not lose what was typed)
// and the "Internal note" switch, which stays on across tickets. Ports `ui.support.draft` and `ui.support.internal`
// (49-p-support.js). Nothing is stored beyond the page.
import { useCallback, useState } from 'react';

export function useComposerState() {
  const [drafts, setDrafts] = useState<Readonly<Record<number, string>>>({});
  const [internal, setInternal] = useState(false);

  const setDraft = useCallback(
    (ticketId: number, text: string) => setDrafts((prev) => ({ ...prev, [ticketId]: text })),
    [],
  );
  const draftOf = useCallback((ticketId: number) => drafts[ticketId] ?? '', [drafts]);

  return { draftOf, setDraft, internal, setInternal };
}

export type ComposerState = ReturnType<typeof useComposerState>;
