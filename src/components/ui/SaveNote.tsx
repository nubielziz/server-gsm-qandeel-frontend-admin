// SaveNote: the two lines that go with a Save button of a form that stays open: the "Saved" status (a polite live region) and the failure text
// (an alert). Both are always in the page, so assistive technology announces the text when it appears.
import { Icon } from './Icon';

/** "Saved" with a tick for a few seconds after a save; empty otherwise. */
export function SavedStatus({ saved, text = 'Saved' }: { saved: boolean; text?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-1.5 text-xs text-good-fg">
      {saved && (
        <>
          <Icon name="check" className="ic-sm" />
          {text}
        </>
      )}
    </span>
  );
}

/**
 * What went wrong with a save, in the server's words; hidden while there is nothing to say. `inline` is for a bar, where the line sits
 * beside the button; without it the line has room under it, for a form where the button follows.
 */
export function SaveFailure({ failure, inline = false }: { failure: string | null; inline?: boolean }) {
  return (
    <p
      role="alert"
      className={failure ? (inline ? 'text-sm text-crit-fg' : 'mb-2 text-sm text-crit-fg') : 'hidden'}
    >
      {failure}
    </p>
  );
}
