// Tests for the "Credit limit of …" dialog, run through the whole app against the dev mock API: it starts from the current limit, checks the amount,
// saves it with one Idempotency-Key per opening, lets zero remove the credit, shows the server's refusal under the box, and the figures follow.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { KEY_REUSED_WORDS } from '../../lib/keyReuse';
import { renderAccount } from '../../pages/test-utils';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const ZAIN = /Zain Mobile Hub/;
const TITLE = 'Credit limit of Zain Mobile Hub';

async function openLimit(user: ReturnType<typeof userEvent.setup>) {
  await renderAccount(1, ZAIN, { tab: 'wallet' });
  await user.click(await screen.findByRole('button', { name: 'Credit limit…' }));
  return within(await screen.findByRole('dialog', { name: TITLE }));
}

describe('the credit limit', () => {
  it('starts from the current limit, checks the amount, and the figures follow the new limit', async () => {
    const user = userEvent.setup();
    const dialog = await openLimit(user);
    const field = dialog.getByLabelText('Credit limit (USD)');
    expect(field).toHaveValue('2000.00');
    expect(
      dialog.getByText('How far below zero the wallet may go. Zero removes the credit.'),
    ).toBeInTheDocument();
    await user.clear(field);
    await user.type(field, 'lots');
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    expect(await dialog.findByText('Enter an amount like 500.00, or 0 for no credit.')).toBeInTheDocument();

    await user.clear(field);
    await user.type(field, '3,000');
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    expect(await screen.findByText('Credit limit updated')).toBeInTheDocument();
    expect(screen.getByText('Zain Mobile Hub can now go $3,000.00 below zero.')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Credit limit' })).toHaveTextContent('$3,000.00'),
    );
    expect(screen.getByRole('group', { name: 'Available' })).toHaveTextContent('$4,209.75');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: TITLE })).not.toBeInTheDocument());
  });

  it('sends the limit as four-decimal text, and lets zero remove the credit', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    mockServer.use(
      http.patch('*/admin/clients/:id/credit-limit', async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    const dialog = await openLimit(user);
    const field = dialog.getByLabelText('Credit limit (USD)');
    await user.clear(field);
    await user.type(field, '0');
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    expect(await screen.findByText('Credit limit updated')).toBeInTheDocument();
    expect(bodies).toEqual([{ creditLimit: '0.0000' }]);
    await waitFor(() =>
      expect(screen.getByRole('group', { name: 'Credit limit' })).toHaveTextContent('$0.00'),
    );
  });

  it('sends one Idempotency-Key for every retry of one opening, and a new one for the next opening', async () => {
    const user = userEvent.setup();
    const keys: (string | null)[] = [];
    mockServer.use(
      http.patch('*/admin/clients/:id/credit-limit', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return problem(409, 'X', 'Stop', 'Stopped here.');
      }),
    );
    let dialog = await openLimit(user);
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    await dialog.findByText('Stopped here.');
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    await waitFor(() => expect(keys).toHaveLength(2));
    expect(keys[0]).toMatch(/\S+/);
    expect(keys[1]).toBe(keys[0]);

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await user.click(await screen.findByRole('button', { name: 'Credit limit…' }));
    dialog = within(await screen.findByRole('dialog', { name: TITLE }));
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    await waitFor(() => expect(keys).toHaveLength(3));
    expect(keys[2]).not.toBe(keys[0]);
  });

  it('shows the server’s refusal under the box, and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/clients/:id/credit-limit', () =>
        problem(422, 'VALIDATION_FAILED', 'Invalid', 'This rank allows no credit.', [
          { field: 'creditLimit', message: 'This rank allows no credit.' },
        ]),
      ),
    );
    const dialog = await openLimit(user);
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    expect(await dialog.findByText('This rank allows no credit.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Credit limit (USD)')).toBeInvalid();
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
  });

  it('words a reused key in plain sentences and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/clients/:id/credit-limit', () =>
        problem(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'This idempotency key was already used with a different request.',
          'This idempotency key was already used with a different request.',
        ),
      ),
    );
    const dialog = await openLimit(user);
    await user.click(dialog.getByRole('button', { name: 'Save credit limit' }));
    expect(await dialog.findByText(KEY_REUSED_WORDS)).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
  });
});
