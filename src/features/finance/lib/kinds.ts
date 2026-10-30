// The names of ledger entry kinds. Ports KIND_LABEL of 10-data.js (used by the ledger table and the order drawer's money trail).

/** Entry kind to the words the console shows. */
export const LEDGER_KIND_LABEL: Readonly<Record<string, string>> = {
  opening: 'Opening balance',
  deposit: 'Deposit',
  order_hold: 'Order hold',
  order_settle: 'Order settled',
  order_release: 'Hold released',
  adjustment: 'Adjustment',
  commission: 'Commission',
  withdrawal: 'Withdrawal',
  supplier_topup: 'Supplier top-up',
  settlement: 'Gateway settlement',
  b2c_payment: 'Customer payment',
  gateway_fee: 'Gateway fee',
  refund: 'Customer refund',
  chargeback: 'Chargeback',
};

/** The words of a snake_case id: `order_refund` reads "Order refund". `empty` stands in for an id with no letters. */
export function plainWords(id: string, empty = 'Entry'): string {
  const words = id.replace(/[_-]+/g, ' ').trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : empty;
}

/** The label of a kind; a kind the console does not know yet reads as "Order refund" for `order_refund`. */
export function ledgerKindLabel(kind: string): string {
  const known = Object.hasOwn(LEDGER_KIND_LABEL, kind) ? LEDGER_KIND_LABEL[kind] : undefined;
  return known ?? plainWords(kind);
}

/** An entry's number as the demo wrote it: 25 is "JRN-00025". Display only. */
export function journalLabel(id: number): string {
  return `JRN-${String(id).padStart(5, '0')}`;
}
