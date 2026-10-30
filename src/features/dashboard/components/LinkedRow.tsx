// LinkedRow: a table row that opens a page, for the supplier, merchant and customer lists. Ports the demo's
// `<tr class="row" data-act="go">`. The row is a mouse target; the keyboard path is the link in the first cell (NameLink),
// as in the kit's DataTable.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';

// Controls inside the row keep their own click; only the empty parts of the row open the page.
const INTERACTIVE = 'a, button, input, select, textarea, label, summary, [role="button"], [data-stop]';

/** `to` is the page the row opens, or `undefined` when the staff member may not open it (the row is then plain). */
export function LinkedRow({ to, children }: { to: string | undefined; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <tr
      className={to ? 'row' : undefined}
      onClick={
        to
          ? (event) => {
              if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
              void navigate(to);
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}
