// StaffMenu: the signed-in staff member (avatar, name, role) at the sidebar foot, with a menu for the shortcut
// list and sign-out. Replaces the static avatar line of renderNav() in 90-app.js, which had no menu.
import { Avatar, Icon, Menu, Skeleton, usePopover, type MenuItem } from '@/components/ui';
import { useMe } from '@/features/auth';
import { useSignOut } from './useSignOut';

export function StaffMenu({ onOpenShortcuts }: { onOpenShortcuts: () => void }) {
  const { data: me } = useMe();
  const pop = usePopover();
  const { signOut, isPending } = useSignOut();

  if (!me) {
    return (
      <div className="flex items-center gap-2" aria-hidden="true">
        <Skeleton width={20} height={20} className="rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton width="60%" height={10} />
          <Skeleton width="35%" height={8} />
        </div>
      </div>
    );
  }

  const items: MenuItem[] = [
    { label: 'Keyboard shortcuts', icon: 'bolt', hint: '?', run: onOpenShortcuts },
    { separator: true },
    { label: 'Sign out', icon: 'logout', disabled: isPending, run: signOut },
  ];

  return (
    <>
      <button
        ref={pop.anchorRef}
        type="button"
        className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-md px-1 py-1 text-start hover:bg-hover"
        aria-haspopup="menu"
        aria-expanded={pop.open}
        aria-label={`Account menu for ${me.name}`}
        onClick={pop.toggle}
      >
        <Avatar name={me.name} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-xs font-medium">{me.name}</span>
          <span className="block truncate text-2xs text-ink3">{me.role.name}</span>
        </span>
        <Icon name="chevU" className="ic-sm text-ink3" />
      </button>
      <Menu {...pop.panelProps} items={items} align="start" width={220} label="Account" />
    </>
  );
}
