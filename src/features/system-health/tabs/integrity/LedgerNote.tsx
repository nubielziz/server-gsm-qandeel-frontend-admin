// LedgerNote: the quiet note at the foot of the Integrity tab: the check only reads, and a difference is fixed in Finance.
// Part of the Integrity tab (route group health). No demo screen.
import { Link } from 'react-router';
import { Icon } from '@/components/ui';
import { financePath } from '@/features/finance';
import { useHealthGrants } from '../../hooks';

/** "Finance" is a link to the ledger only for a staff member who may read it (a hint; the Finance page checks too). */
export function LedgerNote() {
  const grants = useHealthGrants();
  const finance = grants.can('ledger:read') ? (
    <Link className="link" to={financePath('ledger')}>
      Finance
    </Link>
  ) : (
    'Finance'
  );
  return (
    <p className="flex items-start gap-2 text-sm text-ink3">
      <Icon name="info" className="ic-sm mt-0.5 shrink-0" />
      <span>This check only reads the ledger. Fix a difference with a reversing entry in {finance}.</span>
    </p>
  );
}
