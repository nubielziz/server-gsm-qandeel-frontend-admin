// CountryList: the inside of a country panel: a search box and the list it filters, each row a flag, the country's name and, in a phone
// box, its calling code. Used by CountryField and PhoneField, which own the panel (a FloatingPanel) and mount this list when it opens, so
// the search starts empty each time. The same list as the shop's website (decision 040).
// Keyboard: the search box keeps the focus; Up, Down, Home and End move the marked row, Enter chooses it, Tab closes the panel (`onTab`)
// and Escape is the panel's own. Enter never reaches a form around the field. A screen reader hears the marked row
// (`aria-activedescendant`). A search typed in any script is kept as typed (`dir="auto"`); digits find a calling code.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { searchCountries, type CountryRow } from '@/lib/phone/dial';
import { cx } from './cx';
import { Flag } from './Flag';
import { Icon } from './Icon';

/** The height of a row in px (`menu-item` is h-8), and how many rows show before the list scrolls. */
const ROW = 32;
const ROWS_SHOWN = 8;

export interface CountryListProps {
  /** The id of the list box (the opener's `aria-controls`). */
  id: string;
  /** The id of the element that names the list (the control that opens it). */
  labelledBy: string;
  /** The rows; a row with an empty code is a choice that means "none" (it draws a globe). */
  rows: readonly CountryRow[];
  /** The chosen code: its row carries the check mark and is marked when the list opens. */
  selected?: string;
  /** What the search box starts with (a letter typed on the closed control). */
  initialQuery?: string;
  onSelect: (code: string) => void;
  /** Tab was pressed in the search box: close the panel and let the focus go on from the control. */
  onTab?: () => void;
}

export function CountryList({
  id,
  labelledBy,
  rows,
  selected,
  initialQuery = '',
  onSelect,
  onTab,
}: CountryListProps) {
  const [query, setQuery] = useState(initialQuery);
  const shown = useMemo(() => searchCountries(rows, query), [rows, query]);
  // The marked row, by its place in the shown rows. It starts on the chosen country; a list opened by a typed letter starts on its best
  // answer, the first row, so Enter chooses what the letter found.
  const [marked, setMarked] = useState(() =>
    initialQuery === ''
      ? Math.max(
          0,
          shown.findIndex((row) => row.code === selected),
        )
      : 0,
  );
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const at = Math.min(marked, shown.length - 1);
  const rowId = (code: string) => `${id}-${code || 'none'}`;

  // The list mounts when its panel opens: the search box takes the focus then.
  useEffect(() => {
    search.current?.focus();
  }, []);

  // The panel is placed once, when it opens (FloatingPanel). Below its control it may get shorter while a search narrows the list. Above
  // its control it must keep its height, or it would leave the control: the list is then held at its full height.
  useEffect(() => {
    const opener = document.getElementById(labelledBy);
    const box = list.current;
    if (!opener || !box) return;
    if (box.getBoundingClientRect().top < opener.getBoundingClientRect().top)
      box.style.height = box.style.maxHeight;
  }, [labelledBy]);

  // The marked row stays in sight (the first time, the chosen country is scrolled to). jsdom has no scrollIntoView.
  useEffect(() => {
    list.current?.querySelector('[data-marked="true"]')?.scrollIntoView?.({ block: 'nearest' });
  }, [at, shown]);

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // An input method's Enter confirms its text; it does not choose a row.
    if (event.nativeEvent.isComposing) return;
    const move = (to: number) => {
      event.preventDefault();
      if (shown.length > 0) setMarked((to + shown.length) % shown.length);
    };
    if (event.key === 'ArrowDown') move(at + 1);
    else if (event.key === 'ArrowUp') move(at - 1);
    else if (event.key === 'Home' && query === '') move(0);
    else if (event.key === 'End' && query === '') move(shown.length - 1);
    else if (event.key === 'Enter') {
      // Never a form's submit, with or without a row to choose.
      event.preventDefault();
      if (shown[at]) onSelect(shown[at].code);
    } else if (event.key === 'Tab') onTab?.();
  }

  return (
    <div className="flex flex-col">
      <div className="relative border-b border-line p-1">
        <Icon
          name="search"
          className="ic-sm pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink3"
        />
        <input
          ref={search}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={id}
          aria-autocomplete="list"
          aria-activedescendant={shown[at] ? rowId(shown[at].code) : undefined}
          aria-label="Search countries"
          placeholder="Search countries"
          dir="auto"
          autoComplete="off"
          spellCheck={false}
          className="input ps-7"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setMarked(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      <ul
        ref={list}
        id={id}
        role="listbox"
        aria-labelledby={labelledBy}
        className="overflow-y-auto overscroll-contain p-1"
        style={{ maxHeight: Math.min(rows.length, ROWS_SHOWN) * ROW + 8 }}
      >
        {shown.map((row, index) => (
          <li
            key={row.code}
            id={rowId(row.code)}
            role="option"
            aria-selected={row.code === selected}
            data-code={row.code}
            data-marked={index === at}
            className="menu-item cursor-pointer data-[marked=true]:bg-hover"
            onPointerMove={() => {
              if (index !== at) setMarked(index);
            }}
            onClick={() => onSelect(row.code)}
          >
            <Flag code={row.code} />
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            {row.detail && (
              <span dir="ltr" className="mono flex-none text-2xs text-ink3">
                {row.detail}
              </span>
            )}
            <Icon name="check" className={cx('ic-sm flex-none', row.code !== selected && 'opacity-0')} />
          </li>
        ))}
        {shown.length === 0 && (
          <li role="presentation" className="px-2 py-3 text-center text-xs text-ink3">
            No country found.
          </li>
        )}
      </ul>
    </div>
  );
}
