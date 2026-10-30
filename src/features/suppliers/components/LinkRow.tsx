// LinkRow: one place in a service's supplier chain, inside the "Edit links" dialog: its role (Primary, Fallback…), the supplier and
// the supplier's service it uses, and the buttons that move it up or down or take it out. A supplier just added has no service
// picked yet, so the row shows a menu of that supplier's own services.
import { Button, Icon } from '@/components/ui';
import { roleLabel, type DraftStep } from '../lib/links';
import type { SupplierService } from '../types';
import { LinkServicePicker } from './LinkServicePicker';

export interface LinkRowProps {
  step: DraftStep;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onPick: (key: string, item: SupplierService) => void;
}

/** One step of the chain with its move and remove buttons. Moving only reorders the draft; nothing is saved until Save links. */
export function LinkRow({ step, index, count, onMove, onRemove, onPick }: LinkRowProps) {
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-md border border-line px-3 py-2">
      <span className="w-20 flex-none pt-0.5 text-xs font-medium text-ink3">{roleLabel(index + 1)}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{step.supplierName}</p>
        {step.supplierServiceId === null ? (
          <LinkServicePicker step={step} onPick={(item) => onPick(step.key, item)} />
        ) : (
          <p className="truncate text-xs text-ink3">{step.supplierServiceName}</p>
        )}
      </div>
      <div className="flex flex-none items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Move ${step.supplierName} up`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <Icon name="arrowUp" className="ic-sm" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Move ${step.supplierName} down`}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <Icon name="arrowDown" className="ic-sm" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Remove ${step.supplierName}`}
          onClick={() => onRemove(index)}
        >
          <Icon name="x" className="ic-sm" />
        </Button>
      </div>
    </li>
  );
}
