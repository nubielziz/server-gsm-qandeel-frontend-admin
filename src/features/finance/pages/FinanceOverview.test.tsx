// Tests for the finance half of the Money page's Overview, run through the whole app against the dev mock API: the five key figures, the
// line about deposits waiting, and Run reconciliation with its dialog (no differences, differences, the server's error, no permission).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openFinance, strip } from '../test/financePage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('the key figures', () => {
  it('shows the five figures from the server', async () => {
    await openFinance('/money');
    await waitFor(() => expect(strip().getByText('Bank').nextElementSibling).toHaveTextContent(/^\$\d/));
    expect(strip().getByText('Merchant wallets')).toBeInTheDocument();
    expect(strip().getByText('Held in open orders')).toBeInTheDocument();
    expect(strip().getByText('Supplier prepaid')).toBeInTheDocument();
    expect(await strip().findByText('deposits to approve or reject')).toBeInTheDocument();
    // The caption is drawn while the count still loads (a grey bar), so wait for the number itself.
    await waitFor(
      () => expect(strip().getByText('Waiting for review').nextElementSibling).toHaveTextContent('7'),
      {
        timeout: 10_000,
      },
    );
  });

  it('leaves out the figures a role may not read', async () => {
    await openFinance('/money', { permissions: ['payments:read'] });
    expect(await strip().findByText('Waiting for review')).toBeInTheDocument();
    expect(strip().queryByText('Bank')).not.toBeInTheDocument();
    expect(strip().queryByText('Merchant wallets')).not.toBeInTheDocument();
    expect(strip().queryByText('Supplier prepaid')).not.toBeInTheDocument();
  });
});

describe('a role that may read few of the figures', () => {
  const BOOKS = 'Every balance below comes from posted ledger entries.';
  const refundFigures = () => screen.findByRole('region', { name: 'Refund and dispute figures' });

  it('draws nothing of the finance half when the role may read none of its figures; the refund figures still show', async () => {
    await openFinance('/money', { permissions: ['refunds:read'] });
    expect(await refundFigures()).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Key figures' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run reconciliation' })).not.toBeInTheDocument();
    expect(screen.queryByText(BOOKS)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nothing is waiting/)).not.toBeInTheDocument();
    expect(screen.queryByText(/deposits? needs? a decision/)).not.toBeInTheDocument();
  });

  it('shows the deposits sentence with payments:read, without the books sentence or the reconcile button', async () => {
    await openFinance('/money', { permissions: ['payments:read'] });
    expect(await screen.findByText('7 deposits need a decision.')).toBeInTheDocument();
    expect(screen.queryByText(BOOKS)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run reconciliation' })).not.toBeInTheDocument();
  });

  it('says only that nothing is waiting, with no books sentence, when no deposit is pending and no balance is shown', async () => {
    mockServer.use(
      http.get('*/admin/payments', () =>
        HttpResponse.json([], {
          headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
        }),
      ),
    );
    await openFinance('/money', { permissions: ['payments:read'] });
    // The Waiting panel says it too, so the sentence beside the button is told apart by what it must not add.
    expect((await screen.findAllByText('Nothing is waiting.')).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Every balance below/)).not.toBeInTheDocument();
  });

  it('shows the books sentence with a balance on screen, and no deposits sentence without payments:read', async () => {
    await openFinance('/money', { permissions: ['reports:read'] });
    expect(await screen.findByText(BOOKS)).toBeInTheDocument();
    expect(await strip().findByText('Merchant wallets')).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is waiting|need a decision/)).not.toBeInTheDocument();
    // reports:read is not ledger:read: no reconcile button.
    expect(screen.queryByRole('button', { name: 'Run reconciliation' })).not.toBeInTheDocument();
  });

  it('offers Run reconciliation only to a role with ledger:read', async () => {
    await openFinance('/money', { permissions: ['ledger:read'] });
    expect(await screen.findByRole('button', { name: 'Run reconciliation' })).toBeInTheDocument();
    expect(screen.getByText(BOOKS)).toBeInTheDocument();
  });
});

describe('the line about deposits', () => {
  it('says how many deposits need a decision', async () => {
    await openFinance('/money');
    expect(await screen.findByText('7 deposits need a decision.')).toBeInTheDocument();
    expect(screen.getByText(/Deposits change real balances, so each one is reviewed\./)).toBeInTheDocument();
  });

  it('says that nothing is waiting when no deposit is pending', async () => {
    mockServer.use(
      http.get('*/admin/payments', () =>
        HttpResponse.json([], {
          headers: { 'x-total-count': '0', 'access-control-expose-headers': 'x-total-count' },
        }),
      ),
    );
    await openFinance('/money');
    expect(
      await screen.findByText('Nothing is waiting. Every balance below comes from posted ledger entries.'),
    ).toBeInTheDocument();
  });
});

describe('Run reconciliation', () => {
  it('shows the server’s result when every account matches', async () => {
    const user = userEvent.setup();
    await openFinance('/money');
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reconciliation finished' }));
    expect(
      dialog.getByText('No differences. Every account matches the entries behind it.'),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Checked \d+ accounts and [\d,]+ entries/)).toBeInTheDocument();
    await user.click(dialog.getAllByRole('button', { name: 'Close' }).at(-1) as HTMLElement);
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Reconciliation finished' })).not.toBeInTheDocument(),
    );
  });

  it('lists the accounts that differ', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/ledger/reconcile', () =>
        HttpResponse.json({
          ranAt: new Date().toISOString(),
          accountsChecked: 41,
          entriesChecked: 3902,
          differences: [
            {
              accountId: 7,
              kind: 'client_wallet',
              ownerName: 'Zain Mobile Hub',
              stored: '120.0000',
              expected: '100.0000',
              difference: '20.0000',
            },
          ],
        }),
      ),
    );
    await openFinance('/money');
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reconciliation found differences' }));
    expect(dialog.getByText('1 account differs from its entries.')).toBeInTheDocument();
    const row = within(dialog.getByText(/Merchant wallets/).closest('tr') as HTMLElement);
    expect(row.getByText(/Zain Mobile Hub/)).toBeInTheDocument();
    expect(row.getByText('$120.00')).toBeInTheDocument();
    expect(row.getByText('$100.00')).toBeInTheDocument();
    expect(row.getByText('$20.00')).toBeInTheDocument();
  });

  it('shows the server’s error when the run fails', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/ledger/reconcile', () =>
        HttpResponse.json(
          {
            title: 'Reconciliation already running',
            status: 409,
            code: 'CONFLICT',
            detail: 'Wait for the first run.',
          },
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    await openFinance('/money');
    await user.click(screen.getByRole('button', { name: 'Run reconciliation' }));
    expect(await screen.findByText('Reconciliation already running')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Reconciliation/ })).not.toBeInTheDocument();
  });

  it('is disabled, with the missing permission in its title, without ledger:reconcile', async () => {
    await openFinance('/money', { permissions: ['ledger:read'] });
    const button = screen.getByRole('button', { name: 'Run reconciliation' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'You need the ledger:reconcile permission');
  });
});
