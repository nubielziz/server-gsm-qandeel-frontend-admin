// The trial balance as the demo draws it: account names and types, and one line per account with its debit or credit.
// Ports ACCOUNTS (10-data.js) and accountsTab (45-p-finance.js). The server sends the balances; this only names and splits them.
import { toAmount } from '@/lib/format';
import { plainWords } from './kinds';
import type { TrialBalance, TrialBalanceRow } from '../types';

type AccountInfo = { name: string; type: string };

/** The chart of accounts in the demo's order: assets, liabilities, income, expenses, equity. */
export const ACCOUNT_INFO: Readonly<Record<string, AccountInfo>> = {
  bank: { name: 'Bank', type: 'Asset' },
  gateway_clearing: { name: 'Gateway clearing', type: 'Asset' },
  supplier_prepaid: { name: 'Supplier prepaid', type: 'Asset' },
  client_wallet: { name: 'Client wallets', type: 'Liability' },
  client_hold: { name: 'Client holds', type: 'Liability' },
  customer_funds: { name: 'Customer funds', type: 'Liability' },
  vat_payable: { name: 'VAT payable', type: 'Liability' },
  revenue: { name: 'Revenue', type: 'Income' },
  fee_income: { name: 'Fee income', type: 'Income' },
  cogs: { name: 'Cost of goods sold', type: 'Expense' },
  commission_expense: { name: 'Commission expense', type: 'Expense' },
  gateway_fees: { name: 'Gateway fees', type: 'Expense' },
  chargeback_loss: { name: 'Chargeback losses', type: 'Expense' },
  adjustments: { name: 'Adjustments', type: 'Expense' },
  owner_capital: { name: 'Owner capital', type: 'Equity' },
};

const KNOWN = Object.keys(ACCOUNT_INFO);

/** The account's name; a kind the console has no name for reads as plain words (`gift_cards` is "Gift cards"). */
export function accountName(kind: string): string {
  return Object.hasOwn(ACCOUNT_INFO, kind) ? ACCOUNT_INFO[kind].name : plainWords(kind, 'Account');
}

/** One row of the trial balance table: a balance is shown as a debit or as a credit, never both. */
export type TrialLine = {
  kind: string;
  name: string;
  type: string;
  accounts: number;
  debit: string | null;
  credit: string | null;
};

/**
 * Splits each signed balance into the debit or credit column (positive is a debit, negative a credit, a zero balance
 * shows in neither) and puts the lines in the demo's order, kinds the demo did not have last. Display only: the totals
 * come from the server.
 */
export function toTrialLines(rows: readonly TrialBalanceRow[]): TrialLine[] {
  const rank = (kind: string) => {
    const at = KNOWN.indexOf(kind);
    return at === -1 ? KNOWN.length : at;
  };
  return rows
    .map((row): TrialLine => {
      const balance = toAmount(row.balance);
      return {
        kind: row.kind,
        name: accountName(row.kind),
        type: Object.hasOwn(ACCOUNT_INFO, row.kind) ? ACCOUNT_INFO[row.kind].type : '',
        accounts: row.accounts,
        debit: balance > 0 ? row.balance : null,
        credit: balance < 0 ? row.balance.replace(/^-/, '') : null,
      };
    })
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name));
}

/** Whether the server's debit and credit totals are the same number: the first integrity check of the demo. */
export function booksBalance(trial: Pick<TrialBalance, 'totalDebit' | 'totalCredit'>): boolean {
  return toAmount(trial.totalDebit) === toAmount(trial.totalCredit);
}

/** The balance of one account kind, signed as the ledger lines are, or undefined when the server did not send it. */
export function balanceOf(rows: readonly TrialBalanceRow[], kind: string): TrialBalanceRow | undefined {
  return rows.find((row) => row.kind === kind);
}
