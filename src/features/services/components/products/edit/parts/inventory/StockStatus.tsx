// StockStatus: the status of a stored code as the small square and its word (the list's grammar: a coloured square, never colour alone).
import { cx } from '@/components/ui';
import type { InventoryStatus } from '../../../../../types';
import { stockTone, stockWord } from './stockStatus';

const SQUARE_CLASS = {
  ok: 'status-sq-ok',
  off: 'status-sq-off',
  warn: 'status-sq-warn',
  crit: 'status-sq-crit',
} as const;

/** The square (hidden from assistive technology: the word beside it says the same) and the word. */
export function StockStatus({ status }: { status: InventoryStatus }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cx('status-sq', SQUARE_CLASS[stockTone(status)])} aria-hidden="true" />
      {stockWord(status)}
    </span>
  );
}
