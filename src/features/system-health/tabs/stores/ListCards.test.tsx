// Tests for the slow queries and long transactions cards, rendered with answers made by hand: rows, mono ids, the statement
// cut by the layout but whole in the page, the copy button, the quiet line for an empty list, and the phone cards.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getToasts } from '@/components/ui';
import { ApiError } from '@/lib/api';
import type { DatabaseHealth, LongTransaction } from '../../types';
import { LongTransactionsCard } from './LongTransactionsCard';
import { SlowQueriesCard } from './SlowQueriesCard';
import { databaseHealth, queryOf } from './storesFixture';

afterEach(() => vi.restoreAllMocks());

const LONG_QUERY =
  'SELECT le.account_id, SUM(le.amount) FROM ledger_entries le WHERE le.account_id = ANY($1) GROUP BY le.account_id';

/** A long transaction that has been idle in a transaction for 6m 52s. */
const transaction = (over: Partial<LongTransaction> = {}): LongTransaction => ({
  pid: 31_822,
  durationSeconds: 412,
  state: 'idle in transaction',
  query: 'UPDATE orders SET status = $1 WHERE id = $2',
  ...over,
});

// Each helper renders one card with an answer made by hand and returns its panel.
function slowQueries(db: DatabaseHealth) {
  render(<SlowQueriesCard query={queryOf(db)} />);
  return screen.getByRole('region', { name: 'Slow queries' });
}

function longTransactions(db: DatabaseHealth) {
  render(<LongTransactionsCard query={queryOf(db)} />);
  return screen.getByRole('region', { name: 'Long transactions' });
}

// A stand-in for matchMedia that answers the phone query with `narrow`.
function stubScreen(narrow: boolean) {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: narrow,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

describe('slow queries', () => {
  it('lists each statement with its id in mono, calls, mean and total, in the order the server sent', () => {
    const root = slowQueries(databaseHealth());
    const table = within(root).getByRole('table', { name: 'Slow queries' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Query id', 'Query', 'Calls', 'Mean', 'Total']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0]);
    expect(first.getByText('2210948872210445613')).toHaveClass('mono');
    expect(first.getByText('9,804')).toBeInTheDocument();
    expect(first.getByText('34 ms')).toBeInTheDocument();
    expect(first.getByText('5m 28s')).toBeInTheDocument();
    const second = within(rows[1]);
    expect(second.getByText('-5094417722198840017')).toHaveClass('mono');
    expect(second.getByText('13 ms')).toBeInTheDocument();
    expect(second.getByText('13m 4s')).toBeInTheDocument();
  });

  it('keeps the whole statement in the page in mono, cut by the layout to one line, with the full text as a title', () => {
    const root = slowQueries(databaseHealth());
    const statement = within(root).getByText(LONG_QUERY);
    expect(statement).toHaveClass('mono', 'truncate');
    expect(statement).toHaveAttribute('title', LONG_QUERY);
  });

  it('lets the statement take all the room the copy button leaves, so the buttons line up from row to row', () => {
    const root = slowQueries(databaseHealth());
    const statements = Array.from(root.querySelectorAll('code'));
    expect(statements).toHaveLength(2);
    for (const statement of statements) expect(statement).toHaveClass('flex-1');
  });

  it('copies the full statement', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const root = slowQueries(databaseHealth());
    await user.click(within(root).getByRole('button', { name: 'Copy query 2210948872210445613' }));
    expect(writeText).toHaveBeenCalledWith(LONG_QUERY);
    // The kit confirms a copy with a toast.
    await waitFor(() =>
      expect(getToasts().map((toast) => toast.title)).toContain('Copied query 2210948872210445613'),
    );
  });

  it('gives every row its own copy button name', () => {
    const root = slowQueries(databaseHealth());
    expect(within(root).getAllByRole('button', { name: /^Copy query / })).toHaveLength(2);
  });

  it('says there are none in one quiet line when the database is up and sent nothing', () => {
    const root = slowQueries(databaseHealth({ slowQueries: [] }));
    expect(within(root).getByText('No slow queries.')).toBeInTheDocument();
    expect(within(root).queryByRole('table')).not.toBeInTheDocument();
    expect(root.querySelector('.b-good')).toBeNull();
  });

  it('says it could not be read, not "none", when the database is down', () => {
    const root = slowQueries(databaseHealth({ status: 'down', slowQueries: [] }));
    expect(within(root).getByText('Postgres is down, so slow queries cannot be read.')).toBeInTheDocument();
    expect(within(root).queryByText('No slow queries.')).not.toBeInTheDocument();
  });

  it('shows the error of its own read with a Retry', () => {
    const error = new ApiError({ status: 500, title: 'Something went wrong', detail: 'Read failed.' });
    render(<SlowQueriesCard query={queryOf<DatabaseHealth>(undefined, { isError: true, error })} />);
    const root = screen.getByRole('region', { name: 'Slow queries' });
    expect(within(root).getByText('Could not load the slow queries')).toBeInTheDocument();
    expect(within(root).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('becomes cards on a phone, headed by the statement, with the id, calls, mean and total as lines', () => {
    stubScreen(true);
    const root = slowQueries(databaseHealth());
    expect(within(root).queryByRole('table')).not.toBeInTheDocument();
    const cards = within(within(root).getByRole('list', { name: 'Slow queries' })).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    const first = within(cards[0]);
    // On a phone the statement may take three lines.
    expect(first.getByText(LONG_QUERY)).toHaveClass('line-clamp-3');
    expect(first.getByText('Query id')).toBeInTheDocument();
    expect(first.getByText('2210948872210445613')).toHaveClass('mono');
    expect(first.getByText('Calls')).toBeInTheDocument();
    expect(first.getByText('Mean')).toBeInTheDocument();
    expect(first.getByText('Total')).toBeInTheDocument();
  });
});

describe('long transactions', () => {
  it('lists the pid in mono, how long it is open, its state as a sentence and the statement', () => {
    const root = longTransactions(databaseHealth({ longTransactions: [transaction()] }));
    const table = within(root).getByRole('table', { name: 'Long transactions' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['PID', 'Open for', 'State', 'Query']);
    const row = within(within(table).getAllByRole('row')[1]);
    expect(row.getByText('31822')).toHaveClass('mono');
    expect(row.getByText('6m 52s')).toBeInTheDocument();
    expect(row.getByText('Idle in transaction')).toBeInTheDocument();
    const statement = row.getByText('UPDATE orders SET status = $1 WHERE id = $2');
    expect(statement).toHaveClass('mono', 'truncate');
    expect(row.getByRole('button', { name: 'Copy query of PID 31822' })).toBeInTheDocument();
  });

  it('puts the transaction open longest first', () => {
    const root = longTransactions(
      databaseHealth({
        longTransactions: [
          transaction({ pid: 1, durationSeconds: 60 }),
          transaction({ pid: 2, durationSeconds: 900 }),
          transaction({ pid: 3, durationSeconds: 300 }),
        ],
      }),
    );
    const pids = within(root)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0].textContent);
    expect(pids).toEqual(['2', '3', '1']);
  });

  it('says there are none in one quiet line, not a large empty state', () => {
    const root = longTransactions(databaseHealth());
    expect(within(root).getByText('No long transactions.')).toBeInTheDocument();
    expect(within(root).queryByRole('heading', { name: 'No data' })).not.toBeInTheDocument();
    expect(root.querySelector('.b-good')).toBeNull();
  });

  it('says it could not be read, not "none", when the database is down or its status is unknown', () => {
    const down = longTransactions(databaseHealth({ status: 'down' }));
    expect(
      within(down).getByText('Postgres is down, so long transactions cannot be read.'),
    ).toBeInTheDocument();
  });

  it('says the status is unknown when it is', () => {
    const root = longTransactions(databaseHealth({ status: 'unknown' }));
    expect(
      within(root).getByText('The status of Postgres is unknown, so long transactions cannot be read.'),
    ).toBeInTheDocument();
  });

  it('becomes cards on a phone', () => {
    stubScreen(true);
    const root = longTransactions(databaseHealth({ longTransactions: [transaction()] }));
    const cards = within(within(root).getByRole('list', { name: 'Long transactions' })).getAllByRole(
      'listitem',
    );
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Open for')).toBeInTheDocument();
    expect(within(cards[0]).getByText('6m 52s')).toBeInTheDocument();
  });
});
