// QueryText: an SQL statement in mono, cut to one line in a table (three lines on a phone) with a button that copies all of it.
import { CopyButton, cx } from '@/components/ui';
import { useCompactScreen } from '../../lib';

export interface QueryTextProps {
  query: string;
  /** Names the copy button and its toast ("query 2210948872210445613"), so every row's button has its own name. */
  label: string;
}

/**
 * The statement is cut by the layout, not by the text: the full statement stays in the page (and in the hover title),
 * and the button copies it whole. A table row stays one line high; a phone card has room, so it shows more lines.
 * The text takes all the room the button leaves (`flex-1`), so the button sits at the right edge of its cell and the
 * buttons line up from row to row, whatever the length of the statement.
 */
export function QueryText({ query, label }: QueryTextProps) {
  const compact = useCompactScreen();
  return (
    <span className={cx('flex min-w-0 gap-1', compact ? 'items-start' : 'items-center')}>
      <code
        title={query}
        className={cx('mono block min-w-0 flex-1', compact ? 'line-clamp-3 break-words' : 'truncate')}
      >
        {query}
      </code>
      <CopyButton value={query} label={label} />
    </span>
  );
}
