// ServiceSearchList: the popup of the Add listing dialog's Service search: the matching services as listbox options (name and
// code, in the menu style of the console), and the states around them: searching, no match, a failed search with Retry, and
// more services on the server than shown. New in feature 30 (it replaces a select capped at 200 names).
import type { MouseEvent } from 'react';
import { Button, cx, errorText, Icon } from '@/components/ui';
import type { Service } from '@/features/services';
import type { ApiError } from '@/lib/api';
import { num } from '@/lib/format';

export interface ServiceSearchListProps {
  /** Id of the listbox, which the input names in `aria-controls`. */
  listId: string;
  open: boolean;
  /** The services of the current answer (empty while none has come). */
  rows: readonly Service[];
  /** How many services match on the server (`x-total-count`). */
  total: number;
  /** Index of the option the arrows reached, or -1. */
  active: number;
  optionId: (index: number) => string;
  /** True while the typed text waits for its pause or its answer. */
  searching: boolean;
  /** The failure of the last search, or null. */
  error: ApiError | null;
  /** The text the answer is for (empty: the first services by name). */
  q: string;
  onPick: (service: Service) => void;
  onRetry: () => void;
}

// A press anywhere in the popup (a row, Retry, the scrollbar) must not take focus from the input: the combobox keeps it
// the whole time, and losing it would close the list under the pointer.
const keepFocus = (event: MouseEvent) => event.preventDefault();

/** The line under the options: what the list is doing, or why it is short. Null when the options say it all. */
function stateText(rows: number, total: number, searching: boolean, q: string): string | null {
  if (searching) return 'Searching…';
  if (rows === 0) return q ? `No service matches “${q}”.` : 'No active IMEI service yet.';
  if (total > rows) return `${num(rows)} of ${num(total)} shown. Type to search more.`;
  return null;
}

/** The options under the field. It is always in the page (the input points at it), hidden while closed. */
export function ServiceSearchList({
  listId,
  open,
  rows,
  total,
  active,
  optionId,
  searching,
  error,
  q,
  onPick,
  onRetry,
}: ServiceSearchListProps) {
  const failed = error !== null && !searching;
  const state = failed ? null : stateText(rows.length, total, searching, q);
  return (
    <div hidden={!open} className="menu absolute inset-x-0 top-full z-20 mt-1" onMouseDown={keepFocus}>
      <ul
        id={listId}
        role="listbox"
        aria-label="Services"
        className="m-0 max-h-52 list-none overflow-y-auto p-0"
      >
        {rows.map((service, index) => (
          <li
            key={service.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            aria-label={`${service.name} (${service.code})`}
            className={cx('menu-item cursor-pointer', index === active && 'bg-sunken')}
            onClick={() => onPick(service)}
          >
            <span className="min-w-0 flex-1 truncate">{service.name}</span>
            <span className="mono shrink-0 text-ink3">{service.code}</span>
          </li>
        ))}
      </ul>
      {/* Always in the popup, so a screen reader hears the line when it changes. */}
      <p
        role="status"
        className={cx(
          'm-0 flex items-center gap-2 px-2 py-1.5 text-ink3',
          !state && 'hidden',
          searching || rows.length === 0 ? 'text-sm' : 'mt-1 border-t border-line text-xs',
        )}
      >
        {searching && <Icon name="loader" className="ic-sm animate-spin" />}
        {state}
      </p>
      {failed && (
        <div className="flex items-center gap-2 px-2 py-1.5">
          <p className="m-0 min-w-0 flex-1 text-xs text-crit-fg" role="alert">
            {errorText(error)}
          </p>
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}
