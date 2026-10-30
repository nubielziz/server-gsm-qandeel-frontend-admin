// SupplierStat: one figure of the stats grid: a label, a big value and a muted line under it. Ports `supStat` of 44-p-suppliers.js.
import type { ReactNode } from 'react';
import { cx } from '@/components/ui';

export interface SupplierStatProps {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  /** Extra classes for the value, for example a warning colour. */
  className?: string;
}

export function SupplierStat({ label, value, sub, className }: SupplierStatProps) {
  return (
    <div className="p-3.5">
      <p className="text-xs text-ink3">{label}</p>
      <p className={cx('mt-1 text-xl font-semibold tabular-nums tracking-tight', className)}>{value}</p>
      <p className="mt-0.5 text-xs text-ink3">{sub}</p>
    </div>
  );
}
