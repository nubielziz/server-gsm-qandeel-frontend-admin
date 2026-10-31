// FeedItem: the row shared by the open alerts and the ongoing incidents of the Overview tab: severity, title, and a second
// line of status and facts. Route group `health`.
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

export interface FeedItemProps {
  /** The severity badge. It sits in a slot of one width, so every title of the list starts at the same place. */
  severity: ReactNode;
  title: string;
  /** Where the title links to, or null when the staff member may not follow it (plain text then). */
  href: string | null;
  /** A status badge that opens the second line ("Acknowledged", "Investigating"). */
  status?: ReactNode;
  /** The facts of the second line. Empty ones are left out and the rest are joined with " · ". */
  facts: readonly ReactNode[];
}

// A no-break space before the dot keeps it with the part it ends; the plain space after it is where a line may break.
const SEPARATOR = '\u00a0· ';

/** A part that prints nothing (a subject the server left out) must not leave a lone separator behind. */
function isShown(part: ReactNode): boolean {
  return part !== null && part !== undefined && part !== false && part !== '';
}

/**
 * The slot is 5rem wide, the width of the longest severity word ("Warning") with its icon, so the titles line up whatever
 * the severity. `min-w` and not `w`: a severity word the console does not know (printed as the server sent it) widens its
 * own slot and never runs under the title.
 */
export function FeedItem({ severity, title, href, status, facts }: FeedItemProps) {
  const shown = facts.filter(isShown);
  return (
    <li className="flex items-start gap-2 py-2 first:pt-0 last:pb-0">
      <span className="min-w-20 flex-none">{severity}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {href ? (
            <Link className="link" to={href}>
              {title}
            </Link>
          ) : (
            title
          )}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink3">
          {status}
          <p className="min-w-0">
            {shown.map((part, index) => (
              <Fragment key={index}>
                {index > 0 && <span aria-hidden="true">{SEPARATOR}</span>}
                {part}
              </Fragment>
            ))}
          </p>
        </div>
      </div>
    </li>
  );
}
