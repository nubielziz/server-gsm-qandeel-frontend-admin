// ViewLinks: the level-2 row of plain text links under the strip (All | Pricing | +Add Service ...), the active one underlined.
import { Link } from 'react-router';

export interface ViewLinkItem {
  id: string;
  label: string;
  to: string;
  /** Draws a "+" before the label ("+Add Service"). The plus is decoration: the link is named by its label. */
  add?: boolean;
  /** Draws a thin vertical divider after this link, to set a group of links apart. */
  after?: 'divider';
}

export interface ViewLinksProps {
  items: readonly ViewLinkItem[];
  /** Id of the view being shown. It gets aria-current="page", bold text and an underline. */
  current: string;
  /** Accessible name of the navigation. */
  ariaLabel: string;
}

/** Every link is a full view of the page (no dialog, no side panel), so each one has its own address. */
export function ViewLinks({ items, current, ariaLabel }: ViewLinksProps) {
  return (
    <nav aria-label={ariaLabel}>
      <ul className="view-links">
        {items.map((item) => (
          <ViewLink key={item.id} item={item} active={item.id === current} />
        ))}
      </ul>
    </nav>
  );
}

function ViewLink({ item, active }: { item: ViewLinkItem; active: boolean }) {
  return (
    <>
      <li>
        <Link to={item.to} aria-current={active ? 'page' : undefined}>
          {item.add && <span aria-hidden="true">+</span>}
          {item.label}
        </Link>
      </li>
      {item.after === 'divider' && (
        <li className="view-links-divider" role="presentation" aria-hidden="true" />
      )}
    </>
  );
}
