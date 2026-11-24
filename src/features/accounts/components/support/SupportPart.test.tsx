// Tests for the Support part of an account's record, run through the whole app against the dev mock API: the support feature's list of the
// account's tickets with its link into the inbox, the words for an account that never wrote, and what a role without `support:read` is
// never asked for. Ports the Support cases of the old customer page.
import { screen, within } from '@testing-library/react';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { partsMenu, renderAccount } from '../../pages/test-utils';
import { SEED } from '../../test/apiSupport';
import { installAccountMocks } from '../../test/installAccountMocks';

setupMockApi();
installAccountMocks();
// The page is a lazy chunk and the first test of a run waits for its modules, which is slow while the whole suite runs in parallel.
vi.setConfig({ testTimeout: 30_000 });

const TYLER = /Tyler Brooks/; // 110: a guest with one ticket
const DANIEL = /Daniel Whitmore/; // 101: a retail login who never wrote

// Records the address of every read of the tickets and lets the mock answer it.
function watchTickets(): string[] {
  const seen: string[] = [];
  mockServer.use(
    http.get('*/admin/support-tickets', ({ request }) => {
      seen.push(request.url);
      return undefined;
    }),
  );
  return seen;
}

describe('the tickets of an account', () => {
  it('lists the account’s tickets (from the support feature) and links to them in Support', async () => {
    await renderAccount(110, TYLER, { tab: 'support' });
    const link = await screen.findByRole('link', { name: 'Open in Support' }, { timeout: 10_000 });
    expect(link).toHaveAttribute('href', '/support?accountId=110');
    const list = within(screen.getByRole('list', { name: 'Tickets' }));
    expect(list.getAllByRole('listitem').length).toBeGreaterThan(0);
    for (const ticket of list.getAllByRole('link')) {
      expect(ticket.getAttribute('href')).toMatch(/^\/support\?ticket=\d+$/);
    }
  });

  it('asks the server for the tickets of this account only, by its number', async () => {
    const seen = watchTickets();
    await renderAccount(110, TYLER, { tab: 'support' });
    await screen.findByRole('link', { name: 'Open in Support' }, { timeout: 10_000 });
    expect(seen.length).toBeGreaterThan(0);
    for (const url of seen) {
      const params = new URL(url).searchParams;
      expect(params.get('requesterId')).toBe('110');
      expect(params.has('customerId')).toBe(false);
      expect(params.has('requesterType')).toBe(false);
    }
  });

  it('says so when the account never contacted support, and offers no link into the inbox', async () => {
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'support' });
    expect(await screen.findByText('No tickets')).toBeInTheDocument();
    expect(screen.getByText('This account has never contacted support.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in Support' })).not.toBeInTheDocument();
  });
});

describe('a role that may not read tickets', () => {
  it('is never asked for them: the address naming Support shows Overview and the part is left out of the menu', async () => {
    const seen = watchTickets();
    await renderAccount(SEED.DANIEL, DANIEL, { tab: 'support', permissions: ['clients:read'] });
    const links = partsMenu()
      .getAllByRole('link')
      .map((link) => link.textContent);
    expect(links).toContain('Overview');
    expect(links).not.toContain('Support');
    expect(screen.queryByRole('list', { name: 'Tickets' })).not.toBeInTheDocument();
    expect(seen).toEqual([]);
  });
});
