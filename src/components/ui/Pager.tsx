// Pager: "1–25 of 340" with previous/next and "Page x of y". Ports the pager strip of table() in 20-ui.js.
import { Button } from './Button';
import { formatCount } from './formatCount';
import { Icon } from './Icon';

export interface PagerProps {
  /** 1-based current page. */
  page: number;
  pageSize: number;
  /** Size of the whole result, not of the page. */
  total: number;
  onPageChange: (page: number) => void;
}

export function Pager({ page, pageSize, total, onPageChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(page, 1), pages);
  const from = (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2 text-xs text-ink3">
      <span>
        {from}–{to} of {formatCount(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          icon
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
        >
          <Icon name="chevL" className="ic-sm" />
        </Button>
        <span className="px-1 tabular-nums">
          Page {current} of {pages}
        </span>
        <Button
          size="sm"
          icon
          aria-label="Next page"
          disabled={current >= pages}
          onClick={() => onPageChange(current + 1)}
        >
          <Icon name="chevR" className="ic-sm" />
        </Button>
      </div>
    </div>
  );
}
