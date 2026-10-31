// SupplierCells: the cells of the supplier table that are more than a number: name link, health badge with "since", an "ago"
// time, the balance with its state, and Pause or Resume. Suppliers card of the Orders & suppliers tab.
import { Link } from 'react-router';
import { Badge, Icon, cx } from '@/components/ui';
import { supplierPath } from '@/features/suppliers';
import { ago, fmtDate } from '@/lib/format';
import { ActionButton, HealthBadge } from '../../components';
import { NO_DATA, sinceText, stateMeta, toneTextClass } from '../../lib';
import type { SupplierHealth } from '../../types';
import { balanceStateText, balanceText, statusChangeFor, type StatusChange } from './suppliersModel';

/** The id of a supplier's name, so its Pause button can name it for a screen reader (the button's own name stays "Pause"). */
const nameId = (id: number) => `health-supplier-${id}`;

/** The name, as a link to the Suppliers page when the staff member may read it, plain text otherwise. */
export function NameCell({ supplier, canOpen }: { supplier: SupplierHealth; canOpen: boolean }) {
  return canOpen ? (
    <Link id={nameId(supplier.id)} className="link font-medium" to={supplierPath(supplier.id)}>
      {supplier.name}
    </Link>
  ) : (
    <span id={nameId(supplier.id)} className="font-medium">
      {supplier.name}
    </span>
  );
}

/** Paused and Disabled are the switch's words and win over the checks. Otherwise the health the server judged. */
function SupplierBadge({ supplier }: { supplier: Pick<SupplierHealth, 'status' | 'health'> }) {
  if (supplier.status === 'disabled') {
    return (
      <Badge tone="neutral" icon="ban">
        Disabled
      </Badge>
    );
  }
  return <HealthBadge status={supplier.status === 'paused' ? 'paused' : supplier.health} />;
}

/**
 * The badge and, for an active supplier that is not fine, since when it has been like that. The "since" line may wrap
 * (at its spaces; the age keeps its two units together): a long one, with the date, must not push the table wider than
 * its card on a narrow screen.
 */
export function HealthCell({ supplier, now }: { supplier: SupplierHealth; now: number }) {
  const since =
    supplier.status === 'active' && supplier.health !== 'ok' ? sinceText(supplier.since, now) : null;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <SupplierBadge supplier={supplier} />
      {since && <span className="text-xs text-ink3">{since}</span>}
    </div>
  );
}

/** "2m ago" with the exact time as a tooltip. A missing time is "No data", never "never". */
export function AgoCell({ at, now }: { at: string | null; now: number }) {
  const text = at ? ago(at, now) : '';
  if (!text) return <span className="text-ink3">No data</span>;
  return (
    <span className="whitespace-nowrap" title={fmtDate(at)}>
      {text}
    </span>
  );
}

/**
 * The balance in money, with the server's low-balance state. A warn or critical balance is often the only reason a supplier
 * whose checks are fine is on the list, so it says so in words under the amount ("Low balance") and the amount takes the
 * tone of the state. The icon sits with the words, not after the digits, so the amounts of the column stay in line. An
 * unknown state gets neutral words; an unreadable amount is "No data". (`MeasureValue` prints numbers with units, not money.)
 * The words may wrap under the amount, so a long one ("Very low balance") never forces the table wider than the card; the
 * amount itself never breaks.
 */
export function BalanceCell({ balance }: { balance: SupplierHealth['balance'] }) {
  const text = balanceText(balance);
  const noData = text === NO_DATA;
  const meta = stateMeta(balance.state);
  const tone = toneTextClass(meta.tone);
  // Only a judged balance colours the amount; a neutral state keeps the plain text colour.
  const judged = balance.state === 'warn' || balance.state === 'crit';
  const words = noData ? null : balanceStateText(balance.state);
  return (
    <span
      className="inline-flex flex-col items-end gap-0.5"
      title={balance.checkedAt ? `Balance checked ${fmtDate(balance.checkedAt)}` : undefined}
    >
      <span
        className={cx('whitespace-nowrap tabular-nums', noData && 'text-ink3', judged && !noData && tone)}
      >
        {text}
      </span>
      {words && (
        // Inline, not a flex row: when the words wrap, the icon stays with the first line instead of floating off. (Tailwind
        // draws every svg as a block, hence `inline-block`.)
        <span className={cx('text-end text-xs', tone)}>
          <Icon name={meta.icon} className="ic-xs mr-1 inline-block align-[-2px]" />
          {words}
        </span>
      )}
    </span>
  );
}

/** Pause for an active supplier, Resume for a paused one, nothing for a disabled one (the Suppliers page enables it). */
export function ActionCell({
  supplier,
  onChange,
}: {
  supplier: SupplierHealth;
  onChange: (change: StatusChange) => void;
}) {
  const change = statusChangeFor(supplier);
  if (!change) return null;
  return (
    <ActionButton
      permission="suppliers:update"
      size="sm"
      aria-describedby={nameId(supplier.id)}
      onClick={() => onChange(change)}
    >
      {change.status === 'paused' ? 'Pause' : 'Resume'}
    </ActionButton>
  );
}
