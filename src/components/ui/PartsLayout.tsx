// PartsLayout: the left menu of a record's parts and the view of the chosen part on its right (the layout the owner asked for).
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Count } from './Count';
import { Icon } from './Icon';

export interface PartsLayoutItem {
  id: string;
  label: string;
  /** Address of the part: each part is a view of its own and is saved on its own. */
  to: string;
  /** A neutral number after the label (never a status colour). */
  count?: number;
}

export interface PartsLayoutProps {
  /** The record: its name. Drawn as an h2 above the menu. */
  title: ReactNode;
  /** A second line under the name (the code, the kind). */
  sub?: ReactNode;
  /** A link back to the list the record came from, above the name. */
  back?: { label: string; to: string };
  items: readonly PartsLayoutItem[];
  /** Id of the part being shown. It gets aria-current="page" and bold text. */
  current: string;
  /** Accessible name of the menu. Default "Parts". */
  menuLabel?: string;
  /** The chosen part. */
  children: ReactNode;
}

/**
 * The menu is a navigation landmark of links; it stays in view beside a long part from lg up, and sits above the part on a phone. The
 * layout and the column of the part fill the space left in the page (a flex column), so a short part's `view-frame` ends with its
 * pinned bar at the foot of the window.
 */
export function PartsLayout({
  title,
  sub,
  back,
  items,
  current,
  menuLabel = 'Parts',
  children,
}: PartsLayoutProps) {
  return (
    <div className="parts-layout">
      <div className="parts-side">
        {back && (
          <Link to={back.to} className="parts-back">
            <Icon name="chevL" className="ic-xs" />
            {back.label}
          </Link>
        )}
        <h2 className="parts-title">{title}</h2>
        {sub && <p className="parts-sub">{sub}</p>}
        <nav aria-label={menuLabel}>
          <ul className="parts-menu">
            {items.map((item) => (
              <li key={item.id}>
                <Link to={item.to} aria-current={item.id === current ? 'page' : undefined}>
                  {item.label}
                  {item.count != null && <Count>{item.count}</Count>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="parts-main">{children}</div>
    </div>
  );
}
