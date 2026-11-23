// StockToolbar: the Quick Search box above the stored codes (the status filter) and the tool at its right (refresh), in the list grammar.
import { LegendBox, RefreshTool, SelectField } from '@/components/ui';
import type { InventoryStatus } from '../../../../../types';
import { parseStockStatus, statusFilterOptions } from './stockStatus';

export interface StockToolbarProps {
  status: InventoryStatus | '';
  onStatus: (status: InventoryStatus | '') => void;
  /** Reads the counts and the list again. */
  onRefresh: () => void;
}

/** The filter applies as soon as it is chosen; there is no Search button because there is no text to search. */
export function StockToolbar({ status, onStatus, onRefresh }: StockToolbarProps) {
  return (
    <>
      <LegendBox legend="Quick Search">
        <SelectField
          aria-label="Status"
          selectWrapClassName="min-w-[12rem]"
          value={status}
          options={statusFilterOptions()}
          onChange={(event) => onStatus(parseStockStatus(event.target.value))}
        />
      </LegendBox>
      <RefreshTool onRefresh={onRefresh} />
    </>
  );
}
