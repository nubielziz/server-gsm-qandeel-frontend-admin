// NotificationBell: the staff member's bell in the top bar (the manifest's `topbar` slot). A ghost icon button with the unread number (99+ at the server's
// cap) opens a panel with the newest notifications. The number comes from `GET /admin/inbox/unread-count`: it is asked every 60 seconds while the tab is
// visible, when the window is focused again, and after a read action, and never before the staff member is known. Escape closes the panel and gives the
// focus back to the button.
import { useState } from 'react';
import { Button, Count, FloatingPanel, Icon, usePopover } from '@/components/ui';
import { useMe } from '@/features/auth';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { badgeText, bellLabel } from '../lib/inbox';
import { InboxPanel } from './InboxPanel';

export function NotificationBell() {
  const { data: me } = useMe();
  const { unread } = useUnreadCount();
  const pop = usePopover();
  const [unreadOnly, setUnreadOnly] = useState(false);
  // No session, no bell: the shell only renders it for a signed-in staff member, and this keeps it from drawing before `me` is known.
  if (!me) return null;
  const badge = badgeText(unread);

  return (
    <>
      <Button
        ref={pop.anchorRef}
        variant="ghost"
        icon
        className="relative"
        aria-label={bellLabel(unread)}
        aria-haspopup="dialog"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        <Icon name="bell" />
        {badge && (
          <Count className="absolute -end-0.5 -top-0.5 !h-4 !min-w-[16px] !bg-accent !px-1 !text-[10px] !text-white">
            {badge}
          </Count>
        )}
      </Button>
      <FloatingPanel
        {...pop.panelProps}
        role="dialog"
        aria-label="Notifications"
        className="w-[min(380px,calc(100vw-1rem))] rounded-lg border border-line bg-surface shadow-pop"
      >
        <InboxPanel
          open={pop.open}
          unreadOnly={unreadOnly}
          onUnreadOnlyChange={setUnreadOnly}
          onClose={pop.close}
          unread={unread}
        />
      </FloatingPanel>
    </>
  );
}
