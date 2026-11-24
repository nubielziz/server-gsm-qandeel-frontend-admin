// Tests for the resolver of an old record number (`/accounts/<n>?from=customer|merchant|client`): the page shows only a loader and never reads
// account <n> on that road (a customer's old number may be another account's number), asks the server which account the old record became,
// then replaces the history entry with that account's own address, keeping the part and the order the old address named. A record that is
// gone is told in words, and a failed lookup has a Retry.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { installAccountMocks } from '../test/installAccountMocks';
import { renderAccounts } from './test-utils';

setupMockApi();
installAccountMocks();
vi.setConfig({ testTimeout: 30_000 });

// Records every account the page reads, then lets the dev mock answer.
function watchReads(): string[] {
  const seen: string[] = [];
  mockServer.use(
    http.get('*/admin/clients/:id', ({ params }) => {
      // The counts of the strip have a route of their own that this pattern also matches; only account numbers count here.
      if (/^\d+$/.test(String(params.id))) seen.push(String(params.id));
      return undefined;
    }),
  );
  return seen;
}

describe('the resolver', () => {
  it('never reads or draws account 7 for /accounts/7?from=customer, and lands on the account the old customer became', async () => {
    const reads = watchReads();
    const app = await renderAccounts('/accounts/7?from=customer');
    await waitFor(() => expect(app.location()).toBe('/accounts/107'));
    expect(await screen.findByRole('heading', { level: 2, name: /Erik Lindqvist/ })).toBeInTheDocument();
    // Customer 7 is account 107; the merchant that has the number 7 was never read.
    expect(reads).not.toContain('7');
    expect(reads).toContain('107');
    expect(screen.queryByText('Tripoli Repair Group')).not.toBeInTheDocument();
  });

  it('shows only a loader while it asks', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mockServer.use(
      http.get('*/admin/legacy-accounts/:type/:id', async () => {
        await gate;
        return HttpResponse.json({ accountId: 107 });
      }),
    );
    const reads = watchReads();
    const app = await renderAccounts('/accounts/7?from=customer');
    expect(screen.getByText('Finding the account…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
    expect(reads).toEqual([]);
    release();
    await waitFor(() => expect(app.location()).toBe('/accounts/107'));
  });

  it('keeps the part the old address named', async () => {
    const app = await renderAccounts('/accounts/1?from=customer&tab=wallet');
    await waitFor(() => expect(app.location()).toBe('/accounts/101?tab=wallet'));
    expect(await screen.findByRole('heading', { level: 2, name: /Daniel Whitmore/ })).toBeInTheDocument();
  });

  it('keeps an order the old address named', async () => {
    const app = await renderAccounts('/accounts/1?from=customer&order=48100');
    await waitFor(() => expect(app.location()).toBe('/accounts/101?order=48100'));
  });

  it.each(['merchant', 'client'])(
    'keeps the number of an old %s: a merchant is the same account',
    async (type) => {
      const app = await renderAccounts(`/accounts/1?from=${type}`);
      await waitFor(() => expect(app.location()).toBe('/accounts/1'));
      expect(await screen.findByRole('heading', { level: 2, name: /Zain Mobile Hub/ })).toBeInTheDocument();
    },
  );

  it('replaces the history entry, so Back does not return to the old address', async () => {
    const user = userEvent.setup();
    const app = await renderAccounts('/accounts/1?from=customer');
    await waitFor(() => expect(app.location()).toBe('/accounts/101'));
    expect(await screen.findByRole('heading', { level: 2, name: /Daniel Whitmore/ })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to All' }));
    await waitFor(() => expect(app.location()).toBe('/accounts'));
  });

  it('says in words that a customer record moved or is gone, with a way back', async () => {
    await renderAccounts('/accounts/999?from=customer');
    expect(await screen.findByText('This customer record moved or no longer exists')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to All' })).toHaveAttribute('href', '/accounts');
  });

  it.each(['merchant', 'client'])('says the same of an old %s record in its own words', async (type) => {
    await renderAccounts(`/accounts/999?from=${type}`);
    expect(await screen.findByText('This merchant record moved or no longer exists')).toBeInTheDocument();
  });

  it('shows the server’s error with a Retry button when the lookup fails', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/legacy-accounts/:type/:id', () =>
        problem(503, 'UNAVAILABLE', 'Service unavailable', 'Try again soon.'),
      ),
    );
    const app = await renderAccounts('/accounts/1?from=customer');
    expect(await screen.findByText('Could not find the account', {}, { timeout: 8_000 })).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(app.location()).toBe('/accounts/101'));
  });

  it('treats a `from` it does not know as no resolver: the number is the account', async () => {
    await renderAccounts('/accounts/1?from=supplier');
    expect(await screen.findByRole('heading', { level: 2, name: /Zain Mobile Hub/ })).toBeInTheDocument();
  });

  it('needs clients:read, like the record: a role that reads only the ranks asks the server nothing', async () => {
    const reads = watchReads();
    let lookups = 0;
    mockServer.use(
      http.get('*/admin/legacy-accounts/:type/:id', () => {
        lookups += 1;
        return undefined;
      }),
    );
    await renderAccounts('/accounts/1?from=customer', { role: 'groupsOnly' });
    expect(await screen.findByText('Your role cannot read accounts')).toBeInTheDocument();
    expect(reads).toEqual([]);
    expect(lookups).toBe(0);
  });
});
