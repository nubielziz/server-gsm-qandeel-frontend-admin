// InboxItemRow: one notification in the bell's panel: its category icon, title and text (plain text, line breaks kept, never HTML), how long ago it came
// and a dot while it is unread. The whole row is a button: it marks the item read and opens its link.
import { Icon } from '@/components/ui';
import { ago } from '@/lib/format';
import { CATEGORY_ICON } from '../lib/inbox';
import type { InboxItem } from '../types';

export function InboxItemRow({
  item,
  now,
  onOpen,
}: {
  item: InboxItem;
  now: number;
  onOpen: (item: InboxItem) => void;
}) {
  const unread = item.readAt === null;
  return (
    <button
      type="button"
      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-start hover:bg-hover"
      onClick={() => onOpen(item)}
      data-unread={unread || undefined}
    >
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sunken text-ink2">
        <Icon name={CATEGORY_ICON[item.category]} className="ic-sm" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={unread ? 'block text-sm font-semibold' : 'block text-sm text-ink2'}>
          {item.title}
        </span>
        <span className="mt-0.5 line-clamp-3 block whitespace-pre-line break-words text-xs text-ink3">
          {item.body}
        </span>
        <span className="mt-1 block text-2xs text-ink3">{ago(item.createdAt, now)}</span>
      </span>
      {unread ? (
        <>
          <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
          <span className="sr-only">Unread</span>
        </>
      ) : null}
    </button>
  );
}
