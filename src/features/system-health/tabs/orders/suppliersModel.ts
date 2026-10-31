// Pure helpers of the Suppliers card: which suppliers need a look and in what order, the line under the table, the balance
// as money with the words of its state, and the words of the Pause and Resume dialog. They read the states the server sent
// and decide none.
import type { Id } from '@/lib/api';
import { money, toAmount } from '@/lib/format';
import { NO_DATA, problemRank, type HealthStatus } from '../../lib';
import type { CircuitState, MetricState, SupplierHealth } from '../../types';

/** Suppliers from this rank on need no attention. It is the rank of "ok": healthy suppliers and disabled ones. */
const QUIET_FROM = problemRank('ok');

/** A disabled supplier comes after the healthy ones: nothing is checked on it, so it is neither a problem nor a pass. */
const DISABLED_RANK = QUIET_FROM + 1;

const CIRCUIT_STATUS: Record<CircuitState, HealthStatus> = { closed: 'ok', half_open: 'warn', open: 'crit' };

/** The circuit on the scale of the checks, only to order rows. A value the console does not know counts as "unknown". */
function circuitStatus(circuit: CircuitState): HealthStatus {
  return Object.hasOwn(CIRCUIT_STATUS, circuit) ? CIRCUIT_STATUS[circuit] : 'unknown';
}

/**
 * Where a supplier sits when problems come first: 0 critical, 1 warning, 2 no data, 3 paused, 4 healthy, 5 disabled. An
 * active supplier takes the worst of everything the server judged about it: its checks, latency, error and timeout
 * rates, balance and circuit. A paused supplier is already handled but stays in view so it can be resumed.
 */
export function supplierRank(supplier: SupplierHealth): number {
  if (supplier.status === 'disabled') return DISABLED_RANK;
  if (supplier.status === 'paused') return problemRank('paused');
  const judged: HealthStatus[] = [
    supplier.health,
    supplier.latency.state,
    supplier.errorRate.state,
    supplier.timeoutRate.state,
    supplier.balance.state,
    circuitStatus(supplier.circuit),
  ];
  return Math.min(...judged.map(problemRank));
}

/** What the card needs to draw its rows and the quiet line. */
export interface SupplierGroups {
  /** Every supplier: problems first, then healthy ones, then disabled ones. Equal ranks keep the server's order. */
  all: SupplierHealth[];
  /** The suppliers that need a look: a problem, no data, or paused. */
  attention: SupplierHealth[];
  /** The rest: healthy suppliers (every state ok), then disabled ones. */
  quiet: SupplierHealth[];
  healthy: number;
  disabled: number;
}

/** Sorts the suppliers by `supplierRank` and splits off the ones that need no attention. */
export function groupSuppliers(suppliers: readonly SupplierHealth[]): SupplierGroups {
  const ranked = suppliers.map((supplier) => ({ supplier, rank: supplierRank(supplier) }));
  // `sort` is stable, so suppliers of one rank stay in the server's order.
  ranked.sort((a, b) => a.rank - b.rank);
  const attention = ranked.filter((entry) => entry.rank < QUIET_FROM).map((entry) => entry.supplier);
  const quiet = ranked.filter((entry) => entry.rank >= QUIET_FROM).map((entry) => entry.supplier);
  const disabled = quiet.filter((supplier) => supplier.status === 'disabled').length;
  return {
    all: ranked.map((entry) => entry.supplier),
    attention,
    quiet,
    healthy: quiet.length - disabled,
    disabled,
  };
}

/** The one quiet line under the problem rows: "5 suppliers healthy · 1 disabled". With no problem at all it says so first. */
export function quietText({ attention, healthy, disabled }: SupplierGroups): string {
  const parts: string[] = [];
  if (healthy > 0) parts.push(`${healthy} ${healthy === 1 ? 'supplier' : 'suppliers'} healthy`);
  if (disabled > 0) parts.push(`${disabled} disabled`);
  const text = parts.join(' · ');
  return attention.length === 0 ? `No supplier needs attention · ${text}` : text;
}

/** The card's sub line: how many suppliers there are and how many need a look. */
export function suppliersSummary({ all, attention }: SupplierGroups): string {
  const total = `${all.length} ${all.length === 1 ? 'supplier' : 'suppliers'}`;
  if (attention.length === 0) return `${total} · none need attention`;
  return `${total} · ${attention.length} ${attention.length === 1 ? 'needs' : 'need'} attention`;
}

/**
 * The balance in the supplier's own currency: "$1,850.00" for USD, "EUR 1,850.00" for any other code, so the unit is
 * always there. "No data" when the amount cannot be read. It only formats; the server judged the balance.
 */
export function balanceText(balance: { amount: string; currency: string }): string {
  // `Number('')` and `Number(null)` are 0, which would read as an empty balance: only a real number counts.
  const readable = typeof balance.amount === 'string' && balance.amount.trim() !== '';
  if (!readable || !Number.isFinite(toAmount(balance.amount))) return NO_DATA;
  const usd = money(balance.amount);
  if (!balance.currency || balance.currency === 'USD') return usd;
  // `money` puts the sign before the dollar sign and always prints the dollar sign: swap it for the currency code.
  const sign = usd.startsWith('-') ? '-' : '';
  return `${sign}${balance.currency} ${usd.replace(/^-?\$/, '')}`;
}

/**
 * The words that say why a balance is marked, so a supplier whose checks are fine does not look fine for no reason:
 * "Low balance" for the server's warn, "Very low balance" for critical, "Balance unknown" for a state it could not judge
 * (or one the console does not know). Null for ok: nothing to say. It names the state the server sent; it never compares
 * the amount with anything.
 */
export function balanceStateText(state: MetricState): string | null {
  if (state === 'ok') return null;
  if (state === 'warn') return 'Low balance';
  if (state === 'crit') return 'Very low balance';
  return 'Balance unknown';
}

/** What a click on Pause or Resume asks for: the supplier and the status it should get. */
export interface StatusChange {
  id: Id;
  name: string;
  status: 'paused' | 'active';
}

/** Pause for an active supplier, Resume for a paused one. A disabled supplier has no button: enabling it is the Suppliers page's job. */
export function statusChangeFor(
  supplier: Pick<SupplierHealth, 'id' | 'name' | 'status'>,
): StatusChange | null {
  if (supplier.status === 'active') return { id: supplier.id, name: supplier.name, status: 'paused' };
  if (supplier.status === 'paused') return { id: supplier.id, name: supplier.name, status: 'active' };
  return null;
}

/** The dialog's title, the sentence that states the effect before the confirm button, and the confirm button's words. */
export function statusDialogWords(change: StatusChange): { title: string; effect: string; confirm: string } {
  if (change.status === 'paused') {
    return {
      title: `Pause ${change.name}?`,
      effect: 'New orders go to the next supplier by priority; orders already sent stay as they are.',
      confirm: 'Pause supplier',
    };
  }
  return {
    title: `Resume ${change.name}?`,
    effect: `${change.name} takes new orders again in its priority order.`,
    confirm: 'Resume supplier',
  };
}
