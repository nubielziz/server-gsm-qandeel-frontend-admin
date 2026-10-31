// FindingsTable: what one failing check found (reference, description, difference, age, last entry) as a table that turns
// into cards on a phone. Part of the Integrity tab (route group health, GET /admin/system/integrity). No demo screen.
import { ResponsiveTable } from '../../components';
import { Link } from 'react-router';
import type { DataTableColumn } from '@/components/ui';
import { financePath } from '@/features/finance';
import { formatDuration } from '../../lib';
import type { IntegrityFinding } from '../../types';
import { formatDifference, ledgerAccountKind, NONE } from './format';
import { When } from './When';

/**
 * The reference in mono. An account finding links to the Finance ledger filtered to that kind of account, when the staff
 * member may read the ledger and the reference starts with an account kind (the ledger cannot filter to one owner).
 */
function FindingRef({ finding, canOpenLedger }: { finding: IntegrityFinding; canOpenLedger: boolean }) {
  const kind = finding.kind === 'account' ? ledgerAccountKind(finding.ref) : null;
  if (!canOpenLedger || !kind) return <span className="mono">{finding.ref}</span>;
  return (
    <Link
      className="link mono"
      to={financePath('ledger', { account: kind })}
      title="Open the Finance ledger, filtered to this kind of account"
    >
      {finding.ref}
    </Link>
  );
}

/** The columns of one findings table. Money and ages are right-aligned numerals; a value the finding has none of is a dash. */
function columns(canOpenLedger: boolean, now: number): DataTableColumn<IntegrityFinding>[] {
  return [
    {
      key: 'ref',
      label: 'Reference',
      render: (finding) => <FindingRef finding={finding} canOpenLedger={canOpenLedger} />,
    },
    { key: 'description', label: 'Description', render: (finding) => finding.label },
    {
      key: 'difference',
      label: 'Difference',
      num: true,
      render: (finding) => formatDifference(finding.difference),
    },
    {
      key: 'age',
      label: 'Age',
      num: true,
      render: (finding) => (finding.ageSeconds === null ? NONE : formatDuration(finding.ageSeconds)),
    },
    {
      key: 'lastEntry',
      label: 'Last entry',
      render: (finding) => <When at={finding.lastEntryAt} now={now} />,
    },
  ];
}

export interface FindingsTableProps {
  findings: readonly IntegrityFinding[];
  /** The staff member may read the ledger, so an account reference can link to it. */
  canOpenLedger: boolean;
  /** The clock, so "3h ago" is counted from one moment for the whole card. */
  now: number;
  /** Accessible name of the table: the check's label. */
  caption: string;
}

/** The first findings a failing check sent, as a table that becomes cards on a phone. */
export function FindingsTable({ findings, canOpenLedger, now, caption }: FindingsTableProps) {
  return (
    <ResponsiveTable
      footer={false}
      columns={columns(canOpenLedger, now)}
      rows={findings}
      rowKey={(finding) => `${finding.kind}:${finding.id}`}
      caption={caption}
    />
  );
}
