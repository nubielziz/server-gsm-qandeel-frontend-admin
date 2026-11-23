// useSaveFlow: the run of one Save button of a form that stays open (a section, a part of an edit view, a pinned bar): the spinner while it
// runs, the failure text, the "Saved" status that clears itself, a second press ignored while a save runs, and the focus that moves to the
// first invalid input after a failure. FormSection, SectionForm and PartForm draw their buttons with it; a view with its own button may too.
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './errorText';

/** How long "Saved" stays on screen. */
export const SAVED_MS = 4000;

/** What a save says about itself: it saved, or it did not (with the text for the failure line when there is one). */
export type SaveOutcome = { saved: true } | { saved: false; message: string | null };

/**
 * Reads the result of a save, with the meaning of a FormDialog's `onSubmit` result: `false` is not saved and the fields show why, a string
 * is not saved and that text goes in the failure line, anything else (`true`, nothing) is saved.
 */
export function outcomeOf(result: unknown): SaveOutcome {
  if (result === false) return { saved: false, message: null };
  if (typeof result === 'string') return { saved: false, message: result };
  return { saved: true };
}

/**
 * `run(task)` runs one save; what the task returns is read by `outcomeOf`, and a throw is a failure whose text is the error's. Attach
 * `formRef` to the `<form>` so focus can go to its first input marked `aria-invalid` after a failure.
 */
export function useSaveFlow() {
  const formRef = useRef<HTMLFormElement>(null);
  // A ref as well as state: two submits in the same tick would both see a stale `pending` state.
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);

  // Focus waits for the render that follows the failure, so an input that became invalid because of it already carries aria-invalid.
  useEffect(() => {
    if (focusRequest) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [focusRequest]);

  // The status clears itself; a new save starts a new timer because it clears `saved` first.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  const run = useCallback(async (task: () => unknown) => {
    if (running.current) return;
    running.current = true;
    setPending(true);
    setFailure(null);
    setSaved(false);
    const stay = (message: string | null) => {
      setFailure(message);
      setFocusRequest((count) => count + 1);
    };
    try {
      const outcome = outcomeOf(await task());
      if (outcome.saved) setSaved(true);
      else stay(outcome.message);
    } catch (error) {
      stay(errorText(error));
    } finally {
      running.current = false;
      setPending(false);
    }
  }, []);

  return { formRef, pending, failure, saved, run };
}
