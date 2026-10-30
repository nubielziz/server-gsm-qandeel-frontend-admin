// Tests for the Deposits tab, run through the whole app against the dev mock API: the sub-tabs with counts, the review dialog,
// Approve and Reject with the server’s answer (a refusal included), the deep link and what a role without payments:approve sees.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { financeTabs, openFinance, rowWith, tableNamed, tabTexts } from '../test/financePage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

const problem = (status: number, code: string, title: string, detail: string, errors?: unknown[]) =>
  HttpResponse.json(
    { title, status, code, detail, errors },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const subTab = (name: RegExp | string) =>
  within(screen.getByRole('group', { name: 'Deposit status' })).getByRole('button', { name });

describe('the queue', () => {
  it('opens on Pending with the count of every sub-tab, and no Status column', async () => {
    const app = await openFinance('/finance?tab=payments');
    expect(await screen.findByRole('button', { name: 'Pending 6' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('button', { name: 'Approved 46' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejected 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All 54' })).toBeInTheDocument();
    const table = await tableNamed('Deposits');
    expect(table.getAllByRole('row')).toHaveLength(7); // the header and six deposits
    expect(table.queryByRole('columnheader', { name: /Status/ })).not.toBeInTheDocument();
    const large = await rowWith('Deposits', 'PAY-1048');
    expect(large.getByText('Phone Doctor FZE')).toBeInTheDocument();
    expect(
      large.getByText('Large deposit. Check the tx hash on-chain before approving.'),
    ).toBeInTheDocument();
    expect(large.getByText('USDT (TRC20)')).toBeInTheDocument();
    expect(large.getByText('$2,500.00')).toBeInTheDocument();
    expect(large.getByText('$2,475.00')).toBeInTheDocument();
    expect(large.getByText('fee $25.00')).toBeInTheDocument();
    expect(large.getByText('Review')).toBeInTheDocument();
    expect(app.location()).toBe('/finance?tab=payments');
  });

  it('switches sub-tab through the address and shows the Status column on All', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=payments');
    await user.click(await screen.findByRole('button', { name: 'Rejected 2' }));
    expect(app.location()).toBe('/finance?tab=payments&status=rejected');
    const row = await rowWith('Deposits', 'PAY-1032');
    expect(row.getByText('Transaction hash not found on-chain')).toBeInTheDocument();
    expect(row.getByText('Details')).toBeInTheDocument();

    await user.click(subTab(/^All/));
    expect(app.location()).toBe('/finance?tab=payments&status=all');
    expect(await screen.findByRole('columnheader', { name: /Status/ })).toBeInTheDocument();
    expect((await rowWith('Deposits', 'PAY-1048')).getByText('Pending')).toBeInTheDocument();
    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument();
  });

  it('says nothing waits, and offers all deposits, when Pending is empty', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/payments', ({ request }) => {
        const pending = new URL(request.url).searchParams.get('status') === 'pending';
        return HttpResponse.json([], { headers: { 'x-total-count': pending ? '0' : '5' } });
      }),
    );
    const app = await openFinance('/finance?tab=payments');
    expect(await screen.findByText('No deposits waiting')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See all deposits' }));
    expect(app.location()).toBe('/finance?tab=payments&status=all');
  });
});

describe('the review dialog', () => {
  it('shows the deposit’s facts and the warning while it is pending', async () => {
    const user = userEvent.setup();
    const app = await openFinance('/finance?tab=payments');
    await user.click(await screen.findByRole('button', { name: 'PAY-1048' }));
    expect(app.location()).toBe('/finance?tab=payments&payment=1048');
    const dialog = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' }));
    expect(dialog.getByText('Phone Doctor FZE · USDT (TRC20)')).toBeInTheDocument();
    expect(dialog.getByRole('note')).toHaveTextContent('Large deposit. Check the tx hash on-chain');
    expect(dialog.getByRole('link', { name: 'Phone Doctor FZE' })).toHaveAttribute('href', '/merchants/3');
    expect(dialog.getByText('$25.00 (1%)')).toBeInTheDocument();
    expect(dialog.getByText('Credited to wallet')).toBeInTheDocument();
    expect(dialog.getByText('Wallet now')).toBeInTheDocument();
    expect(dialog.getByText(/Check that the amount on the proof matches/)).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Approve and credit $2,475.00' })).toBeEnabled();
  });

  it('approves: the dialog closes, the toast says what was credited and the counts move', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=payments&payment=1048');
    const dialog = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' }));
    await user.click(await dialog.findByRole('button', { name: 'Approve and credit $2,475.00' }));
    expect(await screen.findByText('PAY-1048 approved')).toBeInTheDocument();
    expect(
      screen.getByText(/\$2,475\.00 credited to Phone Doctor FZE\. Wallet is now \$/),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /PAY-1048/ })).not.toBeInTheDocument());
    expect(await screen.findByRole('button', { name: 'Pending 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approved 47' })).toBeInTheDocument();
    expect(financeTabs().getByRole('tab', { name: /Deposits/ })).toHaveTextContent('5');
  });

  it('keeps the dialog open and shows the server’s message when the approval is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/payments/:id/approve', () =>
        problem(
          409,
          'PAYMENT_ALREADY_REVIEWED',
          'Already decided',
          'PAY-1048 was already approved by Lina S.',
        ),
      ),
    );
    await openFinance('/finance?tab=payments&payment=1048');
    const dialog = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' }));
    await user.click(await dialog.findByRole('button', { name: 'Approve and credit $2,475.00' }));
    expect(await dialog.findByText('PAY-1048 was already approved by Lina S.')).toBeInTheDocument();
    expect(screen.queryByText('PAY-1048 approved')).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Approve and credit $2,475.00' })).toBeEnabled();
  });

  it('rejects with a reason and a message, sent as one reason', async () => {
    const user = userEvent.setup();
    let body: unknown;
    mockServer.use(
      http.post('*/admin/payments/:id/reject', async ({ request, params }) => {
        body = await request.json();
        return HttpResponse.json({ id: Number(params.id), status: 'rejected' });
      }),
    );
    await openFinance('/finance?tab=payments&payment=1048');
    const review = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' }));
    await user.click(await review.findByRole('button', { name: 'Reject…' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Reject PAY-1048' }));
    await user.click(dialog.getByRole('button', { name: 'Reject deposit' }));
    expect(await dialog.findByText('Choose a reason so the merchant knows what to fix.')).toBeInTheDocument();
    expect(body).toBeUndefined();

    await user.selectOptions(dialog.getByLabelText('Reason'), 'Transaction hash not found on-chain');
    await user.type(dialog.getByLabelText('Message to merchant'), 'Send the hash again');
    await user.click(dialog.getByRole('button', { name: 'Reject deposit' }));
    expect(await screen.findByText('PAY-1048 rejected')).toBeInTheDocument();
    expect(body).toEqual({ reason: 'Transaction hash not found on-chain. Send the hash again' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /PAY-1048/ })).not.toBeInTheDocument());
  });

  it('shows the server’s message under the reason field when a rejection is refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/payments/:id/reject', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'reason', message: 'The reason is too short for the merchant to act on.' },
        ]),
      ),
    );
    await openFinance('/finance?tab=payments&payment=1048');
    await user.click(await screen.findByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject PAY-1048' }));
    await user.selectOptions(dialog.getByLabelText('Reason'), 'Other');
    await user.click(dialog.getByRole('button', { name: 'Reject deposit' }));
    expect(
      await dialog.findByText('The reason is too short for the merchant to act on.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('PAY-1048 rejected')).not.toBeInTheDocument();
  });

  it('goes back to the review when Cancel is pressed on the reject dialog', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=payments&payment=1048');
    await user.click(await screen.findByRole('button', { name: 'Reject…' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Reject PAY-1048' }));
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' })).toBeInTheDocument();
  });
});

describe('a decided deposit', () => {
  it('opens from a link and shows who rejected it and why', async () => {
    await openFinance('/finance?tab=payments&status=all&payment=1032');
    const rejected = within(await screen.findByRole('dialog', { name: 'Deposit PAY-1032' }));
    expect(await rejected.findByRole('note')).toHaveTextContent('Rejected by Omar T.');
    expect(rejected.getByRole('note')).toHaveTextContent('Transaction hash not found on-chain');
    expect(rejected.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
  });

  it('lists the ledger entries of an approved deposit and comes back to it', async () => {
    const user = userEvent.setup();
    await openFinance('/finance?tab=payments&status=all&payment=1000');
    const approved = within(await screen.findByRole('dialog', { name: 'Deposit PAY-1000' }));
    expect(await approved.findByText('Approved by')).toBeInTheDocument();
    await user.click(approved.getByRole('button', { name: 'View ledger entries' }));
    const entries = within(await screen.findByRole('dialog', { name: 'Ledger entries for PAY-1000' }));
    expect(await entries.findByText('1 journal posted. Debits equal credits in each.')).toBeInTheDocument();
    expect(entries.getByText('Deposit PAY-1000 (Bank transfer)')).toBeInTheDocument();
    await user.click(entries.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('dialog', { name: 'Deposit PAY-1000' })).toBeInTheDocument();
  });

  it('shows the server’s error with Retry when a linked deposit does not exist', async () => {
    await openFinance('/finance?tab=payments&payment=999999');
    expect(await screen.findByText('Could not load this deposit')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('leaves Approve and Reject… disabled, with the permission in the title, without payments:approve', async () => {
    await openFinance('/finance?tab=payments&payment=1048', { permissions: ['payments:read'] });
    const dialog = within(await screen.findByRole('dialog', { name: 'Review deposit PAY-1048' }));
    const approve = await dialog.findByRole('button', { name: /^Approve and credit/ });
    expect(approve).toBeDisabled();
    expect(approve).toHaveAttribute('title', 'You need the payments:approve permission');
    expect(dialog.getByRole('button', { name: 'Reject…' })).toBeDisabled();
  });

  it('counts the deposits waiting for a role that can only read payments', async () => {
    await openFinance('/finance', { permissions: ['payments:read'] });
    await waitFor(() => expect(tabTexts()).toEqual(['Deposits6']));
  });
});
