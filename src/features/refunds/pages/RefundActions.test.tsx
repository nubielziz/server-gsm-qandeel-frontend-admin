// Tests for the refund decisions on the Refunds tab, run through the whole app against the dev mock API: approve in full and
// in part, what the server refuses (shown in the dialog), decline with its message, retry, and the toast that opens the order.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { approveRefund, getRefund } from '../api';
import { dialogNamed, openRefunds, rowWith, sectionTabs, tableNamed } from '../test/refundsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** Opens "Approve…" on a request and returns its dialog. */
async function openApprove(user: ReturnType<typeof userEvent.setup>, id: string) {
  const row = await rowWith('Refunds', id);
  await user.click(row.getByRole('button', { name: 'Approve…' }));
  return dialogNamed(`Approve ${id}`);
}

describe('approve', () => {
  it('shows the customer, the order, what was paid, their reason, the delivery warning and how the money returns', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1007');
    expect(dialog.getByText('Priya Nair · SF-20467 · paid CA$27.39 ($19.99)')).toBeInTheDocument();
    expect(dialog.getByText('Unlock did not work: phone still asks for a code')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Refund amount (USD)' })).toHaveValue('19.99');
    expect(
      dialog.getByText('Up to $19.99. Enter less to refund only part of the order.'),
    ).toBeInTheDocument();
    expect(dialog.getByText(/the supplier cost of \$9\.80 is not coming back/)).toBeInTheDocument();
    expect(
      dialog.getByText('Goes back to the same card. It shows on their statement in 5 to 10 days.'),
    ).toBeInTheDocument();
    // This payment has no VAT, so the dialog does not talk about it.
    expect(dialog.queryByText(/of VAT/)).not.toBeInTheDocument();
  });

  it('refunds the amount on the request, says so in a toast and updates the row, the chip and the strip', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));

    expect(await screen.findByText('RF-1008 refunded')).toBeInTheDocument();
    expect(
      screen.getByText('$11.99 returned. Revenue and VAT were reversed in the ledger.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Approve RF-1008' })).not.toBeInTheDocument(),
    );
    await waitFor(async () => {
      const row = await rowWith('Refunds', 'RF-1008');
      expect(row.getByText('Refunded')).toBeInTheDocument();
      expect(row.getByText('Rami K.')).toBeInTheDocument();
      expect(row.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
    });
    await waitFor(() =>
      expect(sectionTabs().getByRole('tab', { name: /^Refunds/ })).toHaveTextContent('Refunds3'),
    );
  });

  it('refunds only a part when the amount is lowered', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    const amount = dialog.getByRole('textbox', { name: 'Refund amount (USD)' });
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));

    expect(
      await screen.findByText('$5.00 returned. Revenue and VAT were reversed in the ledger.'),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const row = await rowWith('Refunds', 'RF-1008');
      expect(row.getByText('Partial')).toBeInTheDocument();
      expect(row.getByText('$5.00')).toBeInTheDocument();
    });
  });

  it('sends the amount only when it was changed', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/refunds/:id/approve', async ({ request }) => {
        bodies.push(await request.clone().json());
        return problem(409, 'REFUND_NOT_PENDING', 'Refund already decided', 'Stop here.');
      }),
    );
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    await dialog.findByText('Stop here.');
    const amount = dialog.getByRole('textbox', { name: 'Refund amount (USD)' });
    await user.clear(amount);
    await user.type(amount, '3.5');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies).toEqual([{}, { amount: '3.5000' }]);
  });

  it('will not send an empty amount or one above what was paid', async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockServer.use(
      http.post('*/admin/refunds/:id/approve', () => {
        calls += 1;
        return problem(500, 'BOOM', 'Should not be called');
      }),
    );
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    const amount = dialog.getByRole('textbox', { name: 'Refund amount (USD)' });
    for (const text of ['25', '0', 'abc']) {
      await user.clear(amount);
      await user.type(amount, text);
      await user.click(dialog.getByRole('button', { name: 'Refund now' }));
      expect(await dialog.findByText('Enter an amount between $0.01 and $11.99.')).toBeInTheDocument();
      expect(amount).toHaveAttribute('aria-invalid', 'true');
    }
    expect(calls).toBe(0);
  });

  it('shows a field message from the server under the amount and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/refunds/:id/approve', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'amount', message: 'Only $4.00 can still be refunded on this payment.' },
        ]),
      ),
    );
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    expect(await dialog.findByText('Only $4.00 can still be refunded on this payment.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Refund amount (USD)' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect((await rowWith('Refunds', 'RF-1008')).getByText('Needs approval')).toBeInTheDocument();
  });

  it('shows the server’s refusal in the dialog when someone else decided the request first', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1009');
    // Another person approves it while this dialog is open; the page has not heard about it yet.
    await approveRefund(1009);
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    expect(await dialog.findByText('RF-1009 is no longer waiting for approval.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Approve RF-1009' })).toBeInTheDocument();
  });

  it('warns a person who opens a request that was already decided, and shows the server refusing it', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const dialog = await openApprove(user, 'RF-1009');
    await approveRefund(1009);
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    // The list is read again every half minute; here the dialog reads the single refund when it opens.
    const row = await rowWith('Refunds', 'RF-1009');
    await user.click(row.getByRole('button', { name: 'Approve…' }));
    const again = await dialogNamed('Approve RF-1009');
    const text = 'RF-1009 was already decided by someone else (Refunded).';
    expect(await again.findByRole('status')).toHaveTextContent(text);
    // The warning is a hint: pressing the button still asks the server, whose refusal shows in the error slot.
    await user.click(again.getByRole('button', { name: 'Refund now' }));
    await waitFor(() => expect(again.getAllByRole('alert').length).toBeGreaterThan(0));
  });

  it('opens the order’s drawer from the toast’s Show entries button', async () => {
    const user = userEvent.setup();
    const app = await openRefunds();
    const dialog = await openApprove(user, 'RF-1008');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    await user.click(await screen.findByRole('button', { name: 'Show entries' }));
    expect(app.location()).toBe('/refunds?order=20478');
    expect(await dialogNamed('SF-20478')).toBeTruthy();
  });

  it('leaves out Show entries for a staff member who cannot read the ledger', async () => {
    const user = userEvent.setup();
    await openRefunds('/refunds', {
      permissions: ['refunds:read', 'refunds:approve', 'orders:read'],
    });
    const dialog = await openApprove(user, 'RF-1008');
    await user.click(dialog.getByRole('button', { name: 'Refund now' }));
    expect(await screen.findByText('RF-1008 refunded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show entries' })).not.toBeInTheDocument();
  });

  it('explains a crypto payment instead of promising a card refund, and states the VAT of a payment that has some', async () => {
    const user = userEvent.setup();
    await openRefunds();
    // No request of the seed is paid in crypto with VAT, so the single read of one is changed for this test.
    const original = await getRefund(1007);
    mockServer.use(
      http.get('*/admin/refunds/:id', ({ params }) =>
        params.id === '1007'
          ? HttpResponse.json({
              ...original,
              payment: { ...original.payment, method: 'crypto', brand: 'USDT TRC20', taxAmount: '3.0000' },
            })
          : undefined,
      ),
    );
    const dialog = await openApprove(user, 'RF-1007');
    expect(
      await dialog.findByText(/This was paid in crypto, which the gateway cannot reverse/),
    ).toBeInTheDocument();
    expect(
      dialog.getByText(/This payment includes \$3\.00 of VAT\. It goes back in proportion/),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/Goes back to the same card/)).not.toBeInTheDocument();
  });
});

describe('decline', () => {
  it('starts from the demo’s message, asks for at least a sentence, then declines and shows the note under the reason', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const row = await rowWith('Refunds', 'RF-1008');
    await user.click(row.getByRole('button', { name: 'Decline' }));
    const dialog = await dialogNamed('Decline RF-1008');
    expect(dialog.getByText('SF-20478 · $11.99')).toBeInTheDocument();
    const message = dialog.getByRole('textbox', { name: 'Message to the customer' });
    expect((message as HTMLTextAreaElement).value).toContain(
      'Your unlock was delivered and the service started at your request',
    );
    expect(dialog.getByText('Sent by email. The reason is also kept with the order.')).toBeInTheDocument();

    await user.clear(message);
    await user.type(message, 'No');
    await user.click(dialog.getByRole('button', { name: 'Decline request' }));
    expect(await dialog.findByText('Give the customer a reason, at least a sentence.')).toBeInTheDocument();
    expect(message).toHaveFocus();

    await user.clear(message);
    await user.type(message, 'It was delivered and works, sorry.');
    await user.click(dialog.getByRole('button', { name: 'Decline request' }));
    expect(await screen.findByText('RF-1008 declined')).toBeInTheDocument();
    expect(screen.getByText('The customer has the reason by email.')).toBeInTheDocument();
    await waitFor(async () => {
      const declined = await rowWith('Refunds', 'RF-1008');
      expect(declined.getByText('Declined')).toBeInTheDocument();
      expect(declined.getByText('It was delivered and works, sorry.')).toBeInTheDocument();
    });
  });

  it('shows the server’s refusal in the dialog', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/refunds/:id/decline', () =>
        problem(
          409,
          'REFUND_NOT_PENDING',
          'Refund already decided',
          'RF-1009 is no longer waiting for approval.',
        ),
      ),
    );
    await openRefunds();
    const row = await rowWith('Refunds', 'RF-1009');
    await user.click(row.getByRole('button', { name: 'Decline' }));
    const dialog = await dialogNamed('Decline RF-1009');
    await user.click(dialog.getByRole('button', { name: 'Decline request' }));
    expect(await dialog.findByText('RF-1009 is no longer waiting for approval.')).toBeInTheDocument();
  });
});

describe('retry', () => {
  it('sends a failed refund again and says it went back to the customer', async () => {
    const user = userEvent.setup();
    await openRefunds();
    const row = await rowWith('Refunds', 'RF-1011');
    await user.click(row.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('RF-1011 refunded')).toBeInTheDocument();
    expect(screen.getByText('€4.44 went back to the customer.')).toBeInTheDocument();
    await waitFor(async () => {
      const done = await rowWith('Refunds', 'RF-1011');
      expect(done.getByText('Refunded')).toBeInTheDocument();
      expect(done.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    });
    // A crypto payment is paid out by hand, and the row says so in the note.
    expect(
      (await tableNamed('Refunds')).getByText(/Paid out manually from the treasury wallet/),
    ).toBeInTheDocument();
  });

  it('shows the server’s error as a toast when the gateway fails again, and keeps the Retry button', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/refunds/:id/retry', () =>
        problem(502, 'GATEWAY_ERROR', 'The gateway refused', 'The card issuer declined the credit again.'),
      ),
    );
    await openRefunds();
    const row = await rowWith('Refunds', 'RF-1011');
    await user.click(row.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('The gateway refused')).toBeInTheDocument();
    expect(screen.getByText(/The card issuer declined the credit again\./)).toBeInTheDocument();
    expect((await rowWith('Refunds', 'RF-1011')).getByRole('button', { name: 'Retry' })).toBeEnabled();
  });
});
