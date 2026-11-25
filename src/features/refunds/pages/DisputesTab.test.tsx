// Tests for the Card disputes view (Money back), run through the whole app against the dev mock API: the table and its deadlines, the dispute
// dialog with the evidence pack, submitting evidence, accepting the loss, what the server refuses, and the permission hints.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getDispute } from '../api';
import { DISPUTES_VIEW, dialogNamed, openRefunds, rowWith, tableNamed } from '../test/refundsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

/** Opens the dialog of a dispute from its row and waits for the evidence pack. */
async function openDispute(
  user: ReturnType<typeof userEvent.setup>,
  id: string,
  button: string,
  name: string,
) {
  const row = await rowWith('Card disputes', id);
  await user.click(row.getByRole('button', { name: button }));
  const dialog = await dialogNamed(name);
  await dialog.findByText('Payment record');
  return dialog;
}

describe('the disputes table', () => {
  it('lists the disputes with the soonest deadline first, as the demo does', async () => {
    await openRefunds(DISPUTES_VIEW);
    const table = await tableNamed('Card disputes');
    await table.findByText('DP-2004');
    const ids = table.getAllByRole('row').map((row) => /DP-\d+/.exec(row.textContent ?? '')?.[0]);
    expect(ids).toEqual([undefined, 'DP-2001', 'DP-2002', 'DP-2003', 'DP-2004', 'DP-2005']);
    expect(screen.getByText('5 rows')).toBeInTheDocument();
  });

  it('shows the amount at stake with the fee, the reason and the deadline in the critical colour inside three days', async () => {
    await openRefunds(DISPUTES_VIEW);
    const soon = await rowWith('Card disputes', 'DP-2004');
    expect(soon.getByRole('button', { name: 'SF-20405' })).toBeInTheDocument();
    expect(soon.getByRole('link', { name: 'Olivia Grant' })).toHaveAttribute('href', '/accounts/125');
    expect(soon.getByText('Fraudulent (10.4)')).toBeInTheDocument();
    expect(soon.getByText('Customer says they did not make this purchase')).toBeInTheDocument();
    expect(soon.getByText('$11.99')).toBeInTheDocument();
    expect(soon.getByText('+ $15 fee')).toBeInTheDocument();
    expect(soon.getByText('Evidence needed')).toBeInTheDocument();
    expect(soon.getByText(/^in 1d|^in 2d/)).toHaveClass('text-crit-fg');
    expect(soon.getByRole('button', { name: 'Prepare evidence' })).toHaveClass('btn-primary');

    const later = await rowWith('Card disputes', 'DP-2005');
    expect(later.getByText('£12.32')).toBeInTheDocument();
    expect(later.getByText(/^in [56]d/)).not.toHaveClass('text-crit-fg');
  });

  it('says when evidence was sent or the dispute closed, instead of a deadline', async () => {
    await openRefunds(DISPUTES_VIEW);
    const review = await rowWith('Card disputes', 'DP-2003');
    expect(review.getByText(/^Sent \d+d ago$/)).toBeInTheDocument();
    expect(review.getByText('With the card network')).toBeInTheDocument();
    expect(review.getByRole('button', { name: 'View' })).not.toHaveClass('btn-primary');
    const won = await rowWith('Card disputes', 'DP-2002');
    expect(won.getByText(/^Closed \d+d ago$/)).toBeInTheDocument();
    expect(won.getByText('Won')).toBeInTheDocument();
    expect((await rowWith('Card disputes', 'DP-2001')).getByText('Lost')).toBeInTheDocument();
  });

  it('sorts on the server and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openRefunds(DISPUTES_VIEW);
    await user.click(await screen.findByRole('button', { name: 'Evidence due' }));
    expect(app.location()).toBe('/money?view=disputes&sort=evidenceDueAt&dir=desc');
    await waitFor(async () =>
      expect((await tableNamed('Card disputes')).getAllByRole('row')[1]).toHaveTextContent('DP-2005'),
    );
  });

  it('opens an order’s drawer in place from its link', async () => {
    const user = userEvent.setup();
    const app = await openRefunds(DISPUTES_VIEW);
    await user.click((await rowWith('Card disputes', 'DP-2004')).getByRole('button', { name: 'SF-20405' }));
    expect(app.location()).toBe('/money?view=disputes&order=20405');
    expect(await dialogNamed('SF-20405')).toBeTruthy();
  });
});

describe('the dispute dialog', () => {
  it('shows the deadline, what winning and losing mean, and the evidence pack with its strength', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    expect(dialog.getByText(/^Olivia Grant · SF-20405 · \$11\.99 · opened /)).toBeInTheDocument();
    expect(
      dialog.getByText(/Winning keeps \$11\.99; losing costs that plus a \$15 fee\./),
    ).toBeInTheDocument();
    expect(dialog.getByRole('heading', { name: 'Evidence pack' })).toBeInTheDocument();
    expect(dialog.getByText('compiled from the order record')).toBeInTheDocument();
    for (const title of [
      'Payment record',
      '3D Secure authentication',
      'Proof of delivery',
      'Terms the customer accepted',
      'Order history',
      'Customer contact',
    ]) {
      expect(dialog.getByText(title)).toBeInTheDocument();
    }
    expect(dialog.getByText(/The cardholder passed the bank’s own check/)).toBeInTheDocument();
    expect(
      dialog.getByText(/Terms of service v3\.2; Privacy policy v2\.1; Refund policy/),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Recorded from IP 203\.0\.113\./)).toBeInTheDocument();
    expect(dialog.getByText(/^(Strong|Fair|Weak)$/)).toBeInTheDocument();
    // Everything that supports the case is ticked to start with.
    expect(dialog.getByRole('checkbox', { name: 'Include Payment record' })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: 'Include 3D Secure authentication' })).toBeChecked();
    expect(dialog.getByRole('button', { name: 'Not now' })).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Accept the loss' })).toHaveClass('btn-danger');
    expect(dialog.getByRole('button', { name: 'Submit evidence' })).toHaveClass('btn-primary');
  });

  it('is read-only for a dispute that is closed or with the card network', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    const won = await openDispute(user, 'DP-2002', 'View', 'DP-2002 · Product unacceptable (13.3)');
    expect(
      won.getByText(
        /Won\. The bank accepted the proof and kept the payment\. The \$15 fee stays with the gateway\./,
      ),
    ).toBeInTheDocument();
    expect(won.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(won.queryByRole('button', { name: 'Submit evidence' })).not.toBeInTheDocument();
    expect(won.queryByRole('button', { name: 'Accept the loss' })).not.toBeInTheDocument();
    await user.click(won.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const review = await openDispute(user, 'DP-2003', 'View', 'DP-2003 · Fraudulent (10.4)');
    expect(
      review.getByText(/Evidence sent \d+d ago\. The card network decides in 30 to 75 days\./),
    ).toBeInTheDocument();
    await user.click(review.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const lost = await openDispute(user, 'DP-2001', 'View', 'DP-2001 · Fraudulent (10.4)');
    expect(lost.getByText(/Lost\. \$15\.59 and the \$15 fee were taken back\./)).toBeInTheDocument();
    // The demo also said the customer is blocked; the map's accept does not promise that.
    expect(lost.queryByText(/blocked/)).not.toBeInTheDocument();
  });

  it('advises accepting a weak case', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    const original = await getDispute(2005);
    mockServer.use(
      http.get('*/admin/disputes/:id', ({ params }) =>
        params.id === '2005' ? HttpResponse.json({ ...original, strength: 'weak' }) : undefined,
      ),
    );
    const dialog = await openDispute(
      user,
      'DP-2005',
      'Prepare evidence',
      'DP-2005 · Product not received (13.1)',
    );
    expect(await dialog.findByText('Weak')).toBeInTheDocument();
    expect(dialog.getByText(/The case is weak: little in the pack supports us\./)).toBeInTheDocument();
  });

  it('shows the error with Retry when the pack cannot be read, and will not submit', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    mockServer.use(
      http.get('*/admin/disputes/:id', () =>
        problem(500, 'INTERNAL', 'Could not build the pack', 'Try again.'),
      ),
    );
    const row = await rowWith('Card disputes', 'DP-2004');
    await user.click(row.getByRole('button', { name: 'Prepare evidence' }));
    const dialog = await dialogNamed('DP-2004 · Fraudulent (10.4)');
    expect(await dialog.findByText('Could not load the evidence pack')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Submit evidence' })).toBeDisabled();
  });
});

describe('submit evidence', () => {
  it('sends the ticked lines and the note, moves the dispute to the card network and thanks the person', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.post('*/admin/disputes/:id/evidence', async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined; // the mock route answers
      }),
    );
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('checkbox', { name: 'Include Order history' }));
    await user.type(
      dialog.getByRole('textbox', { name: 'Note to the card network (optional)' }),
      'Delivered by email.',
    );
    await user.click(dialog.getByRole('button', { name: 'Submit evidence' }));

    expect(await screen.findByText('Evidence submitted')).toBeInTheDocument();
    expect(
      screen.getByText('DP-2004 is now with the card network. You will be told the result.'),
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toMatchObject({ note: 'Delivered by email.' });
    const items = (bodies[0] as { items: string[] }).items;
    expect(items).toContain('payment');
    expect(items).not.toContain('history');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /DP-2004/ })).not.toBeInTheDocument());
    await waitFor(async () => {
      const row = await rowWith('Card disputes', 'DP-2004');
      expect(row.getByText('With the card network')).toBeInTheDocument();
      expect(row.getByRole('button', { name: 'View' })).toBeInTheDocument();
    });
    expect((await getDispute(2004)).status).toBe('under_review');
  });

  it('will not submit with nothing ticked', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    for (const box of dialog.getAllByRole('checkbox')) {
      if ((box as HTMLInputElement).checked) await user.click(box);
    }
    const submit = dialog.getByRole('button', { name: 'Submit evidence' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('title', 'Tick at least one line of the pack');
  });

  it('shows the server’s refusal in the dialog and keeps it open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/disputes/:id/evidence', () =>
        problem(
          409,
          'EVIDENCE_DEADLINE_PASSED',
          'The deadline has passed',
          'The card network no longer takes evidence for DP-2004.',
        ),
      ),
    );
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Submit evidence' }));
    expect(
      await dialog.findByText('The card network no longer takes evidence for DP-2004.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'DP-2004 · Fraudulent (10.4)' })).toBeInTheDocument();
    expect((await getDispute(2004)).status).toBe('needs_response');
  });

  it('shows a message about the note under the note', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/disputes/:id/evidence', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'note', message: 'Keep the note under 1000 characters.' },
        ]),
      ),
    );
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Submit evidence' }));
    expect(await dialog.findByText('Keep the note under 1000 characters.')).toBeInTheDocument();
    expect(dialog.getByRole('textbox', { name: 'Note to the card network (optional)' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});

describe('accept the loss', () => {
  it('asks first, naming the amount and the fee, then closes the dispute as lost and lowers the count on the link', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    // The page's link counts the disputes that wait for evidence: 2 before, 1 once DP-2004 is lost.
    expect(await screen.findByRole('link', { name: 'Card disputes (2)' })).toBeInTheDocument();
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Accept the loss' }));

    const confirm = await dialogNamed('Accept the loss on DP-2004?');
    expect(
      confirm.getByText('$11.99 and the $15 dispute fee are recorded as a chargeback loss.'),
    ).toBeInTheDocument();
    expect(
      confirm.getByText(/This can’t be undone\. Blocking the customer is a separate step on their page\./),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'DP-2004 · Fraudulent (10.4)' })).not.toBeInTheDocument();
    await user.click(confirm.getByRole('button', { name: 'Accept the loss' }));

    expect(await screen.findByText('DP-2004 closed as lost')).toBeInTheDocument();
    expect(screen.getByText('The loss is recorded as a chargeback loss.')).toBeInTheDocument();
    await waitFor(async () =>
      expect((await rowWith('Card disputes', 'DP-2004')).getByText('Lost')).toBeInTheDocument(),
    );
    expect(await screen.findByRole('link', { name: 'Card disputes (1)' })).toBeInTheDocument();
    expect((await getDispute(2004)).status).toBe('lost');
  });

  it('refreshes the "Lost to chargebacks" figure of the Overview once the loss is accepted', async () => {
    const user = userEvent.setup();
    await openRefunds('/money');
    const figures = async () =>
      within(await screen.findByRole('region', { name: 'Refund and dispute figures' }));
    // The Overview reads the figure once; the query stays in the cache while the disputes view is on screen (nothing re-reads it by itself).
    expect(await (await figures()).findByText('$46')).toBeInTheDocument();
    const sections = () => within(screen.getByRole('navigation', { name: 'Money sections' }));
    await user.click(sections().getByRole('link', { name: /^Money back/ }));
    await user.click(await screen.findByRole('link', { name: /^Card disputes/ }));
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Accept the loss' }));
    const confirm = await dialogNamed('Accept the loss on DP-2004?');
    await user.click(confirm.getByRole('button', { name: 'Accept the loss' }));
    expect(await screen.findByText('DP-2004 closed as lost')).toBeInTheDocument();

    // Back on the Overview the figure is read again: $45.59 before, plus $11.99 and the $15 fee.
    await user.click(sections().getByRole('link', { name: 'Overview' }));
    expect(await (await figures()).findByText('$73')).toBeInTheDocument();
    expect((await figures()).queryByText('$46')).not.toBeInTheDocument();
  });

  it('can be cancelled without changing anything', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Accept the loss' }));
    const confirm = await dialogNamed('Accept the loss on DP-2004?');
    await user.click(confirm.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect((await getDispute(2004)).status).toBe('needs_response');
  });

  it('shows the server’s refusal in the confirm', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/disputes/:id/accept', () =>
        problem(
          409,
          'DISPUTE_NOT_OPEN',
          'Dispute is not waiting for evidence',
          'DP-2004 is lost, so it cannot be answered.',
        ),
      ),
    );
    await openRefunds(DISPUTES_VIEW);
    const dialog = await openDispute(user, 'DP-2004', 'Prepare evidence', 'DP-2004 · Fraudulent (10.4)');
    await user.click(dialog.getByRole('button', { name: 'Accept the loss' }));
    const confirm = await dialogNamed('Accept the loss on DP-2004?');
    await user.click(confirm.getByRole('button', { name: 'Accept the loss' }));
    expect(await confirm.findByText('DP-2004 is lost, so it cannot be answered.')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader look at the pack but not answer: the buttons are disabled and name the permission', async () => {
    const user = userEvent.setup();
    await openRefunds(DISPUTES_VIEW, { permissions: ['disputes:read'] });
    const row = await rowWith('Card disputes', 'DP-2004');
    await user.click(row.getByRole('button', { name: 'Prepare evidence' }));
    const dialog = await dialogNamed('DP-2004 · Fraudulent (10.4)');
    await dialog.findByText('Payment record');
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    for (const name of ['Accept the loss', 'Submit evidence']) {
      const button = dialog.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the disputes:manage permission');
    }
    expect(dialog.getByRole('button', { name: 'Not now' })).toBeEnabled();
  });
});
