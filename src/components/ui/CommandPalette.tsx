// CommandPalette: 600px jump-to combobox in a native dialog. Ports openPalette, drawPalette and runPal of 90-app.js.
import { Fragment, useEffect, useId, useMemo, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { Icon } from './Icon';
import { Kbd } from './Kbd';
import { filterPaletteItems, type PaletteItem } from './paletteFilter';
import { useDialog } from './useDialog';

export type { PaletteItem };

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: readonly PaletteItem[];
  placeholder?: string;
  /** Most rows shown at once (the demo shows 14). */
  maxResults?: number;
  /** Tells the app what is typed, so it can add server-side results to `items`. */
  onQueryChange?: (query: string) => void;
  /** Set to false when `items` is already filtered by the app. Default true. */
  filter?: boolean;
}

interface BodyProps extends Omit<CommandPaletteProps, 'open'> {
  placeholder: string;
  maxResults: number;
  filter: boolean;
}

/** Search field, result list and key hints. Mounted only while open, so the query resets every time. */
function PaletteBody({ items, onClose, placeholder, maxResults, onQueryChange, filter }: BodyProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const listId = useId();
  const results = useMemo(
    () => (filter ? filterPaletteItems(items, query, maxResults) : items.slice(0, maxResults)),
    [items, query, maxResults, filter],
  );
  const active = Math.min(selected, Math.max(0, results.length - 1));
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [listId, active, results]);

  function run(index: number) {
    const item = results[index];
    if (!item) return;
    onClose();
    item.run();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(Math.min(results.length - 1, active + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(Math.max(0, active - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(active);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Icon name="search" className="text-ink3" />
        <input
          className="h-11 flex-1 bg-transparent text-base outline-none placeholder:text-ink3"
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results.length ? optionId(active) : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
            onQueryChange?.(e.target.value);
          }}
          onKeyDown={onKeyDown}
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Results"
        className="m-0 max-h-[52vh] list-none overflow-y-auto p-1.5"
      >
        {results.length ? (
          results.map((item, index) => (
            <Fragment key={item.id}>
              {item.group && item.group !== results[index - 1]?.group && (
                <li role="presentation" className="menu-h">
                  {item.group}
                </li>
              )}
              <li
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                className={cx(
                  'flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm',
                  index === active && 'bg-sunken',
                )}
                onClick={() => run(index)}
              >
                {item.icon && <Icon name={item.icon} className="ic-sm text-ink3" />}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="truncate text-xs text-ink3">{item.hint}</span>}
              </li>
            </Fragment>
          ))
        ) : (
          <li role="presentation" className="px-2 py-6 text-center text-sm text-ink3">
            No results for “{query}”.
          </li>
        )}
      </ul>
      <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-xs text-ink3">
        <span>
          <Kbd>↑</Kbd> <Kbd>↓</Kbd> to move
        </span>
        <span>
          <Kbd>↵</Kbd> to open
        </span>
      </div>
    </>
  );
}

/** The shell opens it on Ctrl/Cmd+K and "/" (that shortcut handling stays in the shell). */
export function CommandPalette({
  open,
  onClose,
  items,
  placeholder = 'Search orders, IMEIs, merchants, services, or jump to a page',
  maxResults = 14,
  onQueryChange,
  filter = true,
}: CommandPaletteProps) {
  const { ref, dialogProps } = useDialog({ open, onClose });
  return createPortal(
    <dialog ref={ref} className="palette" aria-label="Command palette" {...dialogProps}>
      {open && (
        <PaletteBody
          items={items}
          onClose={onClose}
          placeholder={placeholder}
          maxResults={maxResults}
          onQueryChange={onQueryChange}
          filter={filter}
        />
      )}
    </dialog>,
    document.body,
  );
}
