// Sidebar: brand block, page navigation and the foot with API health and the staff menu.
// Ports renderNav() of 90-app.js; the demo's "synthetic data" note is replaced by the API health line.
import type { RefObject } from 'react';
import { Button, Icon, Skeleton } from '@/components/ui';
import { HealthIndicator } from '@/features/system';
import type { PageResource } from '../resources';
import { SidebarNav } from './SidebarNav';
import { StaffMenu } from './StaffMenu';
import type { NavCounts } from './useNavCounts';

export interface SidebarProps {
  /** Pages the staff member may open; undefined while that is being worked out. */
  pages: readonly PageResource[] | undefined;
  counts: NavCounts;
  /** Off-canvas state on small screens (the sidebar is always visible from 1024px). */
  open: boolean;
  onClose: () => void;
  onOpenShortcuts: () => void;
  sidebarRef: RefObject<HTMLElement | null>;
}

// Placeholder rows while the permitted pages are loading, so the nav does not jump when they arrive.
function NavSkeleton() {
  return (
    <div className="flex-1 space-y-2 px-4 py-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_row, index) => (
        <Skeleton key={index} width={`${55 + ((index * 17) % 35)}%`} height={12} />
      ))}
    </div>
  );
}

export function Sidebar({ pages, counts, open, onClose, onOpenShortcuts, sidebarRef }: SidebarProps) {
  return (
    <aside
      id="sidebar"
      ref={sidebarRef}
      aria-label="Sidebar"
      data-open={open}
      // Off-canvas below 1024px. `invisible` keeps the closed menu out of the tab order and the reading order.
      // Visibility flips at once when opening (so focus can move in) and only after the slide when closing.
      className="invisible fixed inset-y-0 start-0 z-40 flex w-[260px] -translate-x-full flex-col border-e border-line bg-side transition-[transform,visibility] duration-[150ms,0ms] delay-[0ms,150ms] data-[open=true]:visible data-[open=true]:delay-0 data-[open=true]:translate-x-0 rtl:translate-x-full lg:visible lg:sticky lg:top-0 lg:h-dvh lg:w-auto lg:translate-x-0 lg:rtl:translate-x-0"
    >
      <div className="flex h-12 flex-none items-center gap-2.5 border-b border-line px-3.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md bg-ink text-2xs font-semibold text-surface"
          aria-hidden="true"
        >
          GS
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">GSM Supply</p>
          <p className="truncate text-2xs text-ink3">Admin console</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon
          className="lg:hidden"
          aria-label="Close menu"
          onClick={onClose}
        >
          <Icon name="x" />
        </Button>
      </div>
      {pages ? <SidebarNav pages={pages} counts={counts} onNavigate={onClose} /> : <NavSkeleton />}
      <div className="flex-none space-y-2 border-t border-line p-3">
        <HealthIndicator />
        <StaffMenu onOpenShortcuts={onOpenShortcuts} />
      </div>
    </aside>
  );
}
