// RefundStrip: the four figures above the tabs (refunded in 30 days, waiting for you, card disputes open, lost to chargebacks).
// Ports `refundStrip` of 53-p-refunds.js. The figures are built by `stripCells` from server counts and totals; a figure the
// staff member may not read is left out.
import { StatGrid } from '@/components/ui';
import { useNow } from '@/lib/format';
import { stripCells, type RefundFigures } from '../lib/figures';

export interface RefundStripProps {
  figures: RefundFigures;
  can: (permission: string) => boolean;
}

export function RefundStrip({ figures, can }: RefundStripProps) {
  const now = useNow();
  const cells = stripCells(figures, now, can);
  if (cells.length === 0) return null;
  return <StatGrid cells={cells} label="Refund and dispute figures" />;
}
