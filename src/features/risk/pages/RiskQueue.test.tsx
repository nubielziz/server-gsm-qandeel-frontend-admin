// Tests for the Review queue tab, run through the whole app against the dev mock API: the strip, the cards, the order drawer
// link, approving, refunding with and without a block, the server's refusals and what a missing permission disables.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { dialogOf, heldCard, openRisk, tabTexts } from '../test/riskPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API with real dialogs, so give them room.
vi.setConfig({ testTimeout: 20_000 });

const cardLabels = () => screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));

describe('the queue', () => {
  it('lists the held orders with the longest wait first', async () => {
    await openRisk();
    await screen.findByRole('article', { name: 'Held order SF-20490' });
    expect(cardLabels()).toEqual([
      'Held order SF-20490',
      'Held order SF-20491',
      'Held order SF-20494',
      'Held order SF-20495',
    ]);
  });

  it('shows what the card of a held order says: service, amount, device, score, signals and the buyer', async () => {
    await openRisk();
    const card = heldCard(
      await screen.findByRole('article', { name: 'Held order SF-20490' }).then(() => 'SF-20490'),
    );
    expect(card.getByText('EE UK Unlock')).toBeInTheDocument();
    expect(card.getByText(/\$12\.99 by card \(3ds\) · Redmi Note 12 \(23021RAAEG\)/)).toBeInTheDocument();
    expect(card.getByText('86 741205 271530 6')).toBeInTheDocument();
    expect(card.getByText('67')).toBeInTheDocument();
    expect(card.getByText(/Paid .*, the customer is waiting/)).toBeInTheDocument();
    expect(card.getByText('VPN or proxy IP')).toBeInTheDocument();
    expect(card.getByText('New customer, first order above $40')).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'Tyler Brooks' })).toHaveAttribute('href', '/customers/10');
    expect(card.getByText('Medium risk')).toBeInTheDocument();
    expect(card.getByText('ty•••@inbox.example')).toBeInTheDocument();
    expect(card.getByText('United States')).toBeInTheDocument();
    expect(card.getByText(/earlier order/)).toBeInTheDocument();
    expect(card.getByText('The supplier has not been contacted.')).toBeInTheDocument();
  });

  it('writes the amount in the customer’s currency with the dollars in brackets', async () => {
    await openRisk();
    await screen.findByRole('article', { name: 'Held order SF-20495' });
    expect(heldCard('SF-20495').getByText(/£14\.21 \(\$17\.99\) by card \(3ds\)/)).toBeInTheDocument();
  });

  it('shows the strip: what is held, the longest wait, the 30-day decisions and the share held', async () => {
    await openRisk();
    const strip = within(await screen.findByRole('region', { name: 'Risk queue figures' }));
    expect(strip.getByText('Held now')).toBeInTheDocument();
    expect(strip.getByText('4')).toBeInTheDocument();
    expect(strip.getByText(/captured, nothing sent/)).toBeInTheDocument();
    expect(strip.getByText(/^\d+[dh]/)).toBeInTheDocument();
    expect(strip.getByText('1 approved · 1 refunded')).toBeInTheDocument();
    expect(strip.getByText('5.8%')).toBeInTheDocument();
    expect(strip.getByText('Aim for under 10%')).toBeInTheDocument();
  });

  it('lists the latest decisions with who decided', async () => {
    await openRisk();
    const panel = within(await screen.findByRole('region', { name: 'Decided recently' }));
    expect(panel.getByText('Refunded')).toBeInTheDocument();
    expect(panel.getByText('Approved')).toBeInTheDocument();
    expect(panel.getByText(/Rami K\., \d+[hd] ago/)).toBeInTheDocument();
    expect(panel.getByText(/Lina S\., \d+[hd] ago/)).toBeInTheDocument();
  });

  it('opens the order drawer in place from an order number', async () => {
    const user = userEvent.setup();
    const app = await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20491' })).findByRole('button', {
        name: 'SF-20491',
      }),
    );
    expect(app.location()).toBe('/risk?order=20491');
    expect(await screen.findByRole('dialog', { name: /SF-20491/ })).toBeInTheDocument();
  });

  it('says so when nothing is held', async () => {
    mockServer.use(http.get('*/admin/risk/queue', () => HttpResponse.json({ held: [] })));
    await openRisk();
    expect(await screen.findByText('Nothing is being held')).toBeInTheDocument();
    expect(screen.getByText('Queue is clear')).toBeInTheDocument();
    // Without the server's figures the strip shows a dash, and there is no "Decided recently" list.
    expect(screen.queryByRole('region', { name: 'Decided recently' })).not.toBeInTheDocument();
  });

  it('shows the server’s error with Retry, and loads again when pressed', async () => {
    const user = userEvent.setup();
    let broken = true;
    mockServer.use(
      http.get('*/admin/risk/queue', () =>
        // A 4xx is not retried by the query, so the error state shows at once.
        broken ? problem(400, 'BAD_REQUEST', 'Queue is down', 'Try later.') : HttpResponse.json({ held: [] }),
      ),
    );
    await openRisk();
    expect(await screen.findByText('Could not load the review queue')).toBeInTheDocument();
    expect(screen.getByText('Try later.')).toBeInTheDocument();
    broken = false;
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(await screen.findByText('Nothing is being held')).toBeInTheDocument();
  });
});

describe('approving', () => {
  it('sends the order to its supplier, tells who got it and takes the card away', async () => {
    const user = userEvent.setup();
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20490' })).findByRole('button', {
        name: 'Approve and send',
      }),
    );
    expect(await screen.findByText('SF-20490 approved')).toBeInTheDocument();
    expect(
      screen.getByText('Sent to Bosphorus Unlock. The customer gets the result by email.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Held order SF-20490' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(tabTexts()[0]).toBe('Review queue3'));
    const recent = within(screen.getByRole('region', { name: 'Decided recently' }));
    expect(await recent.findByText('SF-20490')).toBeInTheDocument();
  });

  it('shows the server’s refusal as a toast and keeps the card', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/risk/orders/:id/approve', () =>
        problem(409, 'NOT_HELD', 'Not waiting for a decision', 'Another reviewer decided this order.'),
      ),
    );
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20491' })).findByRole('button', {
        name: 'Approve and send',
      }),
    );
    expect(await screen.findByText('Not waiting for a decision')).toBeInTheDocument();
    expect(screen.getByText(/Another reviewer decided this order\./)).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Held order SF-20491' })).toBeInTheDocument();
  });
});

describe('refunding', () => {
  it('refunds without blocking: the dialog says where the money goes and that the customer can order again', async () => {
    const user = userEvent.setup();
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20491' })).findByRole('button', {
        name: 'Refund only',
      }),
    );
    const dialog = dialogOf('Refund SF-20491?');
    expect(
      dialog.getByText(/goes back to .*’s card\. The supplier is never contacted\./),
    ).toBeInTheDocument();
    expect(dialog.getByText('They can still order again later.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Reason')).toHaveValue(
      'Refunded after risk review: Email on a previous chargeback',
    );
    expect(dialog.getByLabelText('Block the customer’s email')).not.toBeChecked();
    await user.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await screen.findByText('SF-20491 refunded')).toBeInTheDocument();
    expect(screen.getByText('The customer was told by email.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Held order SF-20491' })).not.toBeInTheDocument(),
    );
    // Nobody was blocked: the Blocklist tab still counts the five seeded entries.
    expect(tabTexts()[2]).toBe('Blocklist5');
  });

  it('refunds and blocks: the email is ticked from the button, the device can be ticked too, and the blocklist grows', async () => {
    const user = userEvent.setup();
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20495' })).findByRole('button', {
        name: 'Refund and block',
      }),
    );
    const dialog = dialogOf('Refund and block SF-20495?');
    expect(dialog.getByLabelText('Block the customer’s email')).toBeChecked();
    expect(dialog.getByText(/is blocked: their email can’t place another order\./)).toBeInTheDocument();
    await user.click(dialog.getByLabelText('Block the device'));
    expect(dialog.getByText('IMEI 35 460711 919542 2')).toBeInTheDocument();
    await user.clear(dialog.getByLabelText('Reason'));
    await user.type(dialog.getByLabelText('Reason'), 'Stolen card');
    await user.click(dialog.getByRole('button', { name: 'Refund and block' }));
    expect(await screen.findByText('SF-20495 refunded')).toBeInTheDocument();
    expect(screen.getByText(/ is blocked\.$/)).toBeInTheDocument();
    await waitFor(() => expect(tabTexts()[2]).toBe('Blocklist7'));
  });

  it('un-ticking the block turns the title and the button back to a plain refund', async () => {
    const user = userEvent.setup();
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20494' })).findByRole('button', {
        name: 'Refund and block',
      }),
    );
    const dialog = dialogOf('Refund and block SF-20494?');
    await user.click(dialog.getByLabelText('Block the customer’s email'));
    expect(screen.getByRole('dialog', { name: 'Refund SF-20494?' })).toBeInTheDocument();
  });

  it('keeps the dialog open and shows the server’s message under the field it names', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/risk/orders/:id/refund', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'reason', message: 'The reason is too long.' },
        ]),
      ),
    );
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20490' })).findByRole('button', {
        name: 'Refund only',
      }),
    );
    const dialog = dialogOf('Refund SF-20490?');
    await user.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await dialog.findByText('The reason is too long.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('article', { name: 'Held order SF-20490' })).toBeInTheDocument();
  });

  it('shows a refusal that names no field in the dialog’s error slot', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/risk/orders/:id/refund', () =>
        problem(409, 'NOT_HELD', 'Not waiting for a decision', 'Another reviewer decided this order.'),
      ),
    );
    await openRisk();
    await user.click(
      await within(await screen.findByRole('article', { name: 'Held order SF-20490' })).findByRole('button', {
        name: 'Refund only',
      }),
    );
    await user.click(dialogOf('Refund SF-20490?').getByRole('button', { name: 'Refund' }));
    expect(
      await dialogOf('Refund SF-20490?').findByText('Another reviewer decided this order.'),
    ).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('disables the decision buttons without risk:decide and names the permission', async () => {
    await openRisk('/risk', { permissions: ['risk:read'] });
    const card = within(await screen.findByRole('article', { name: 'Held order SF-20490' }));
    for (const name of ['Approve and send', 'Refund and block', 'Refund only']) {
      const button = card.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the risk:decide permission');
    }
  });

  it('enables them with risk:decide', async () => {
    await openRisk('/risk', { permissions: ['risk:read', 'risk:decide'] });
    const card = within(await screen.findByRole('article', { name: 'Held order SF-20490' }));
    expect(card.getByRole('button', { name: 'Approve and send' })).toBeEnabled();
    expect(card.getByRole('button', { name: 'Refund only' })).toBeEnabled();
  });
});
