// useDirtyMark: whether the part of the edit view that is open holds unsaved changes. A part says so through `report`; the mark belongs
// to one scope (one part of one service), so a part that has been closed cannot mark the next one, and a new scope starts clean.
import { useCallback, useState } from 'react';

type Mark = { scope: string; dirty: boolean };

/** What the hook answers: the mark of the scope and the report a part calls. */
export type DirtyMark = { dirty: boolean; report: (dirty: boolean) => void };

/**
 * `dirty` is true while the part of `scope` reported unsaved changes. `report` is the part's `onDirtyChange`; it keeps its identity for
 * a scope, so a part can put it in an effect's dependencies, and a late report from the part of another scope is ignored.
 */
export function useDirtyMark(scope: string): DirtyMark {
  const [mark, setMark] = useState<Mark>({ scope, dirty: false });
  // Another part (or service) is open: forget the old mark. Done while rendering, the React way to reset state when a value changes.
  if (mark.scope !== scope) setMark({ scope, dirty: false });

  const report = useCallback(
    (dirty: boolean) =>
      setMark((previous) =>
        previous.scope !== scope || previous.dirty === dirty ? previous : { scope, dirty },
      ),
    [scope],
  );
  return { dirty: mark.scope === scope && mark.dirty, report };
}
