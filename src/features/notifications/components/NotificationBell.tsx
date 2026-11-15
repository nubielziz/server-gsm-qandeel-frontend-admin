// NotificationBell: the staff member's bell in the top bar (the manifest's `topbar` slot). A ghost icon button with the unread number (99+ at the server's
// cap) opens a panel with the newest notifications. The number comes from `GET /admin/inbox/unread-count`: it is asked every 60 seconds while the tab is
// visible, when the window is focused again, and after a read action, and never before the staff member is known. Escape closes the panel and gives the
// focus back to the button.
// Arrival animation (owner, 2026-11-15; rules in lib/bellMotion.ts): a live item swings the icon from its top, pops the badge and rolls the number; a read
// rolls it down; reduced motion plays nothing. It is decoration only: the button's name stays "Notifications, 3 unread". While the tab is hidden the title
// carries "(n) " (lib/titleBadge.ts).
import { useState } from 'react';
import { Button, Count, cx, FloatingPanel, Icon, usePopover } from '@/components/ui';
import { useMe } from '@/features/auth';
import { useBellMotion, useTitleBadge } from '../hooks/useBellMotion';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { badgeText, bellLabel } from '../lib/inbox';
import { InboxPanel } from './InboxPanel';

export function NotificationBell() {
  const { data: me } = useMe();
  const { unread } = useUnreadCount();
  const pop = usePopover();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const badge = badgeText(unread);
  const { view, onAnimationEnd } = useBellMotion(unread ?? 0, badge ?? '');
  useTitleBadge(unread ?? 0, badge ?? '');
  // No session, no bell: the shell only renders it for a signed-in staff member, and this keeps it from drawing before `me` is known.
  if (!me) return null;

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
        onAnimationEnd={onAnimationEnd}
      >
        {/* A new ring gets a new key, so the swing starts again from rest. It pivots on the top centre: symmetric, so RTL needs nothing. */}
        <Icon key={view.rings} name="bell" className={view.ring ? 'bell-ring' : undefined} />
        {badge && (
          <Count
            key={view.popKey}
            className={cx(
              'absolute -end-0.5 -top-0.5 !h-4 !min-w-[16px] overflow-hidden !bg-accent !px-1 !text-[10px] !text-white',
              view.pop === 'pop' && 'badge-pop',
              view.pop === 'in' && 'badge-in',
            )}
          >
            {/* The leaving number is laid over the badge (absolute), so only the new number sizes it: no width jump. It is invisible at rest. */}
            {view.roll && (
              <span
                key={`out-${view.rollKey}`}
                aria-hidden="true"
                className={cx(
                  'count-out absolute inset-0 flex items-center justify-center',
                  view.roll.up ? 'count-out-up' : 'count-out-down',
                )}
              >
                {view.roll.from}
              </span>
            )}
            <span
              key={view.rollKey}
              className={cx('inline-block', view.roll && (view.roll.up ? 'count-in-up' : 'count-in-down'))}
            >
              {badge}
            </span>
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
