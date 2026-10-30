// InventoryStatusBadge: the status of one stock code as a badge with an icon and a word: available, reserved, sold or void.
import { Badge } from '@/components/ui';
import type { InventoryStatus } from '../types';

/** The status as an icon and a word. */
export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  switch (status) {
    case 'available':
      return (
        <Badge tone="good" icon="checkCircle">
          Available
        </Badge>
      );
    case 'reserved':
      return (
        <Badge tone="warn" icon="clock">
          Reserved
        </Badge>
      );
    case 'sold':
      return (
        <Badge tone="neutral" icon="check">
          Sold
        </Badge>
      );
    case 'void':
      return (
        <Badge tone="neutral" icon="ban">
          Void
        </Badge>
      );
  }
}
