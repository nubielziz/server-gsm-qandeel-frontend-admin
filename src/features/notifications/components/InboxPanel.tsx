// InboxPanel: the inside of the bell's panel: the newest 20 notifications with unread ones marked, an "Unread only" switch, "Mark all read" and "Load more".
// Clicking an item marks it read and, when it has a link on this app, opens it with the router. Text is always rendered as text.
import { useNavigate } from 'react-router';
import { Button, EmptyState, ErrorState, Skeleton, Switch } from '@/components/ui';
import { useNow } from '@/lib/format';
import { useInbox, useMarkAllRead, useMarkRead } from '../hooks/useInbox';
import { consolePath, newestId } from '../lib/inbox';
import type { InboxItem } from '../types';
import { InboxItemRow } from './InboxItemRow';

export interface InboxPanelProps {
  /** Whether the panel is open: a closed bell asks for nothing. */
  open: boolean;
  unreadOnly: boolean;
  onUnreadOnlyChange: (value: boolean) => void;
  /** Asked for after an item opened a link, so the panel closes. */
  onClose: () => void;
  /** The unread count of the bell, to disable "Mark all read" when there is nothing to mark. */
  unread: number | undefined;
}

export function InboxPanel({ open, unreadOnly, onUnreadOnlyChange, onClose, unread }: InboxPanelProps) {
  const navigate = useNavigate();
  const now = useNow();
  const { items, query } = useInbox({ open, unreadOnly });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  function openItem(item: InboxItem) {
    if (item.readAt === null) markRead.mutate(item.id);
    const path = consolePath(item.link);
    if (path) {
      onClose();
      void navigate(path);
    }
  }

  return (
    <div className="flex max-h-[min(560px,calc(100vh-4rem))] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <h2 className="flex-1 text-sm font-semibold">Notifications</h2>
        <label className="flex items-center gap-2 text-xs text-ink2">
          <Switch checked={unreadOnly} onChange={onUnreadOnlyChange} label="Unread only" />
          Unread only
        </label>
        <Button
          size="sm"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate(newestId(items))}
        >
          Mark all read
        </Button>
      </div>
      <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto" aria-live="polite">
        {query.isLoading ? (
          <div className="space-y-3 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Could not load notifications"
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState icon="bell" title={unreadOnly ? 'Nothing unread.' : 'No notifications yet.'}>
            {unreadOnly
              ? 'You have read everything.'
              : 'Messages for you, from the team and from the system, show here.'}
          </EmptyState>
        ) : (
          items.map((item) => <InboxItemRow key={item.id} item={item} now={now} onOpen={openItem} />)
        )}
      </div>
      {query.hasNextPage && (
        <div className="border-t border-line p-2 text-center">
          <Button
            size="sm"
            variant="ghost"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
