// StripTabs: the level-1 strip of the Product / Services page, one link per kind of service (the layout the owner asked for).
// The raised box of the current link slides to the next one when the strip stays on the page across the navigation.
import { useRef } from 'react';
import { Link } from 'react-router';
import { LINK_INDICATOR, SlidingMark, useSlidingIndicator } from '@/lib/motion';

export interface StripTabItem {
  id: string;
  label: string;
  /** Address of the kind: each one is a view of its own, so this is a link and not a button. */
  to: string;
}

export interface StripTabsProps {
  items: readonly StripTabItem[];
  /** Id of the kind being shown. It gets aria-current="page" and is drawn raised. */
  current: string;
  /** Accessible name of the navigation. */
  ariaLabel: string;
}

/**
 * Links, not a tablist: a click changes the address, so it works with the back button, a new tab and a shared link.
 * It is a navigation landmark with a list of links, so a screen reader hears "3 items" and which one is current.
 */
export function StripTabs({ items, current, ariaLabel }: StripTabsProps) {
  const strip = useRef<HTMLUListElement>(null);
  useSlidingIndicator(strip, LINK_INDICATOR);
  return (
    <nav aria-label={ariaLabel}>
      <ul ref={strip} className="strip-tabs">
        <SlidingMark as="li" className="strip-mark" />
        {items.map((item) => (
          <li key={item.id}>
            <Link to={item.to} aria-current={item.id === current ? 'page' : undefined}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
