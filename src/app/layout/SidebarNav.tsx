// SidebarNav: the grouped page links with their counts. Ports the <nav> part of renderNav() in 90-app.js.
// The highlight of the current page is one element that slides from the old link to the new one.
import { useRef } from 'react';
import { NavLink } from 'react-router';
import { Count, Icon } from '@/components/ui';
import { LINK_INDICATOR, SlidingMark, useSlidingIndicator } from '@/lib/motion';
import { NAV_GROUPS, type PageResource } from '../resources';
import type { NavCount, NavCounts } from './useNavCounts';

// The number chip, plus a red dot only when some of the items are past their deadline. The dot is never the only
// signal: its meaning is also in text for screen readers (DESIGN.md "The Count Is Not A Status Rule").
function NavBadge({ count }: { count: NavCount }) {
  const lateText = `${count.late} ${count.lateLabel ?? 'past SLA'}`;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Count>{count.count}</Count>
      {count.late ? (
        <>
          <span className="dot bg-crit-dot" aria-hidden="true" title={lateText} />
          <span className="sr-only">{lateText}</span>
        </>
      ) : null}
    </span>
  );
}

export interface SidebarNavProps {
  /** The pages the staff member may open; groups with no page are left out. */
  pages: readonly PageResource[];
  counts: NavCounts;
  /** Called when a link is followed, so the mobile menu can close. */
  onNavigate: () => void;
}

export function SidebarNav({ pages, counts, onNavigate }: SidebarNavProps) {
  const nav = useRef<HTMLElement>(null);
  // The nav scrolls and is positioned, so the highlight scrolls with the links. It is placed when the nav has a size (the menu of a
  // phone is laid out while closed, so it is ready when it opens).
  useSlidingIndicator(nav, LINK_INDICATOR);
  return (
    <nav ref={nav} className="relative flex-1 overflow-y-auto px-2 pb-2" aria-label="Primary">
      <SlidingMark className="nav-mark" />
      {NAV_GROUPS.map((group) => {
        const inGroup = pages.filter((page) => page.meta.group === group);
        if (inGroup.length === 0) return null;
        return (
          <div key={group}>
            <p className="nav-h">{group}</p>
            <ul className="m-0 list-none space-y-0.5 p-0">
              {inGroup.map((page) => {
                const count = counts[page.name];
                return (
                  <li key={page.name}>
                    <NavLink className="nav-link" to={page.path} onClick={onNavigate}>
                      <Icon name={page.meta.icon} />
                      <span className="min-w-0 flex-1 truncate">{page.meta.label}</span>
                      {count?.count ? <NavBadge count={count} /> : null}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
