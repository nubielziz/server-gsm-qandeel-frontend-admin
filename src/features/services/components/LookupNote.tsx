// LookupNote: the small note under a menu whose names could not be loaded (merchant groups, categories, services), with a Retry.
// Without it a failed lookup looks like an empty menu, and the admin would think there is nothing to choose from.

export interface LookupNoteProps {
  /** What failed to load, in words: "merchant groups", "the categories". */
  what: string;
  /** The lookup's query: the note shows only while it has failed, and Retry asks again. */
  query: { isError: boolean; refetch: () => unknown };
}

/** "Could not load merchant groups. Retry", or nothing while the lookup is fine. */
export function LookupNote({ what, query }: LookupNoteProps) {
  if (!query.isError) return null;
  return (
    <p className="mt-1 text-xs text-crit-fg" role="status">
      Could not load {what}.{' '}
      <button type="button" className="link" onClick={() => void query.refetch()}>
        Retry
      </button>
    </p>
  );
}
