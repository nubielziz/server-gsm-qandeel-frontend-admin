// FooterPager: the footer of a list, "Results: 1 - 50 of 876", Go To, first/previous/numbers/next/last and Page size, in a PinnedBar.
import { useId, useState, type ReactNode } from 'react';
import { Button } from './Button';
import { formatCount } from './formatCount';
import { Icon } from './Icon';
import { pagerItems } from './pageNumbers';
import { PinnedBar } from './PinnedBar';
import { SelectField } from './SelectField';

// The sizes offered when the page does not give its own.
const DEFAULT_SIZES: readonly number[] = [25, 50, 100, 200];

export interface FooterPagerProps {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  /** Size of the whole result, not of the page. */
  total: number;
  /** A page was asked for (a number, first, last, Go To). The pager clamps it to the pages that exist. */
  onPage: (page: number) => void;
  /** A size was chosen. The page decides what else to reset (usually page 1). */
  onPageSize: (size: number) => void;
  /** Sizes in the Page size select. Default 25, 50, 100 and 200; the current size is added when it is not among them. */
  sizes?: readonly number[];
  /** The view's own buttons (Save prices, …): a row above the footer, in the same pinned bar, so two bars never stack at the foot. */
  actions?: ReactNode;
  /** A plain bar in the flow, for a list inside a form whose own bar (Add, Save) is the pinned one. */
  inline?: boolean;
}

/**
 * A navigation landmark named "Pagination". It is always drawn, also for one page, so the size can still be changed. The numbers
 * have aria-current on the current page; Go To takes a number and goes there on Enter, clamped to the pages that exist. It sits in a
 * PinnedBar of its own, under the view's `actions` when there are some, or in the flow when `inline`.
 */
export function FooterPager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  sizes = DEFAULT_SIZES,
  actions,
  inline = false,
}: FooterPagerProps) {
  const sizeId = useId();
  const goId = useId();
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(page, 1), pages);
  const from = total === 0 ? 0 : (current - 1) * size + 1;
  const to = Math.min(total, current * size);
  const options = (sizes.includes(pageSize) ? [...sizes] : [...sizes, pageSize])
    .sort((a, b) => a - b)
    .map((value) => ({ value, label: String(value) }));

  function go(target: number) {
    const next = Math.min(Math.max(Math.floor(target), 1), pages);
    if (next !== current) onPage(next);
  }

  const nav = (
    <nav
      aria-label="Pagination"
      className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-ink2"
    >
      <p className="tabular-nums" aria-live="polite">
        {total === 0 ? 'Results: 0' : `Results: ${from} - ${to} of ${formatCount(total)}`}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <GoTo id={goId} current={current} onGo={go} />
        <div className="flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label="First page"
            disabled={current <= 1}
            onClick={() => go(1)}
          >
            <Icon name="chevFirst" className="ic-sm" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => go(current - 1)}
          >
            <Icon name="chevL" className="ic-sm" />
          </Button>
          {pagerItems(current, pages).map((item) =>
            typeof item === 'number' ? (
              <button
                key={item}
                type="button"
                className="pager-num"
                aria-label={`Page ${item}`}
                aria-current={item === current ? 'page' : undefined}
                onClick={() => go(item)}
              >
                {item}
              </button>
            ) : (
              <span key={item} aria-hidden="true" className="px-1 text-ink3">
                …
              </span>
            ),
          )}
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label="Next page"
            disabled={current >= pages}
            onClick={() => go(current + 1)}
          >
            <Icon name="chevR" className="ic-sm" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label="Last page"
            disabled={current >= pages}
            onClick={() => go(pages)}
          >
            <Icon name="chevLast" className="ic-sm" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={sizeId}>Page size:</label>
        <SelectField
          id={sizeId}
          options={options}
          value={size}
          selectWrapClassName="select-wrap-sm"
          onChange={(e) => onPageSize(Number(e.target.value))}
        />
      </div>
    </nav>
  );
  if (inline) return <div className="pager-inline">{nav}</div>;
  if (actions !== undefined) {
    return (
      <PinnedBar className="pinned-bar-stack">
        <div className="pinned-bar-row">{actions}</div>
        <div className="pinned-bar-row">{nav}</div>
      </PinnedBar>
    );
  }
  return <PinnedBar align="between">{nav}</PinnedBar>;
}

// The Go To box keeps what is typed until Enter; leaving the box drops it, so the box never disagrees with the page.
function GoTo({ id, current, onGo }: { id: string; current: number; onGo: (page: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <span className="hidden items-center gap-1.5 sm:flex">
      <label htmlFor={id}>Go To:</label>
      <input
        id={id}
        className="input-sm w-14 text-center tabular-nums"
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(current)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={() => setDraft(null)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDraft(null);
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (draft) onGo(Number(draft));
          setDraft(null);
        }}
      />
    </span>
  );
}
