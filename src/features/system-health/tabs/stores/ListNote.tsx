// ListNote: the one quiet line of a list card that has nothing to list (slow queries, long transactions). Data stores tab.
import type { ReactNode } from 'react';

/** Neutral ink, no icon, no green: an empty list is not a verdict. It sits where the table would, so it carries the padding. */
export function ListNote({ children }: { children: ReactNode }) {
  return <p className="m-0 px-3.5 py-3 text-sm text-ink2">{children}</p>;
}
