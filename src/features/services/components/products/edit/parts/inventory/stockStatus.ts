// The words and the square of the status of a stored code, for the Inventory part of the edit view (the list, its filter and the counts).
import type { SquareTone } from '@/components/ui';
import type { InventoryStatus } from '../../../../../types';

/** The four statuses, in the order the counts and the filter list them. */
export const STOCK_STATUSES: readonly InventoryStatus[] = ['available', 'reserved', 'sold', 'void'];

const WORDS: Record<InventoryStatus, string> = {
  available: 'Available',
  reserved: 'Reserved',
  sold: 'Sold',
  void: 'Void',
};

// Green: can be sold. Amber: an open order holds it. Hollow: done (sold). Red: taken out of stock for good.
const TONES: Record<InventoryStatus, SquareTone> = {
  available: 'ok',
  reserved: 'warn',
  sold: 'off',
  void: 'crit',
};

/** "Available", "Reserved", "Sold" or "Void". */
export function stockWord(status: InventoryStatus): string {
  return WORDS[status];
}

/** The tone of the status square. */
export function stockTone(status: InventoryStatus): SquareTone {
  return TONES[status];
}

/** The choices of the status filter: every status, or none (all). */
export function statusFilterOptions(): { value: string; label: string }[] {
  return [
    { value: '', label: 'All statuses' },
    ...STOCK_STATUSES.map((status) => ({ value: status, label: WORDS[status] })),
  ];
}

/** Reads the filter's value back: one of the statuses, or '' for all. */
export function parseStockStatus(value: string): InventoryStatus | '' {
  return STOCK_STATUSES.find((status) => status === value) ?? '';
}
