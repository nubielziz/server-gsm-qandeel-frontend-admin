// NameLink: the name in a list row's first cell. A real link when the page can be opened, so keyboard users can follow it;
// plain text when the staff member may not open the page.
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** A link when `to` is given, plain bold text when not. */
export function NameLink({ to, children }: { to: string | undefined; children: ReactNode }) {
  return to ? (
    <Link to={to} className="font-medium hover:underline">
      {children}
    </Link>
  ) : (
    <span className="font-medium">{children}</span>
  );
}
