// BulkStrip: "Check All / Uncheck All   With selected: [Suspend…] [Reactivate…] [Sign out everywhere]" under the table. Each
// button counts only the ticked accounts it applies to and is disabled, with the reason, when none does; it opens the many-account form
// of its dialog with those accounts. Nothing that moves money or limits spending (adjust, hold, credit limit, rank), nothing irreversible
// or with a legal or fraud effect (anonymize, block, export) and nothing that mails people is offered in bulk, on purpose.
import { Button, WithSelected, type RowSelection } from '@/components/ui';
import type { AccountRow } from '../../types';
import { bulkOffer, type BulkAction } from '../frame/actionRules';
import type { AccountGrants } from '../frame/useAccountGrants';
import type { OpenAction } from '../types';

export interface BulkStripProps {
  /** The accounts on the page. */
  rows: readonly AccountRow[];
  selection: RowSelection<number>;
  grants: AccountGrants;
  onAction: OpenAction;
}

const BUTTONS: readonly { action: BulkAction; label: string }[] = [
  { action: 'suspend', label: 'Suspend…' },
  { action: 'reactivate', label: 'Reactivate…' },
  { action: 'signout', label: 'Sign out everywhere' },
];

/** The strip: the tick controls and the three buttons. */
export function BulkStrip({ rows, selection, grants, onAction }: BulkStripProps) {
  const ticked = rows.filter((row) => selection.has(row.id));
  return (
    <WithSelected
      count={ticked.length}
      onCheckAll={() =>
        selection.setMany(
          rows.map((row) => row.id),
          true,
        )
      }
      onUncheckAll={selection.clear}
    >
      {BUTTONS.map(({ action, label }) => {
        const { targets, lock } = bulkOffer(action, ticked, grants);
        return (
          <Button
            key={action}
            size="sm"
            disabled={lock.disabled}
            title={lock.title}
            onClick={() => onAction(action, targets)}
          >
            {label}
          </Button>
        );
      })}
    </WithSelected>
  );
}
