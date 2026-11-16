// Tests for the Report section of the Search tab: the figures and tables for 7, 30 and 90 days, the actions on a no-result search
// (Add synonym…, Pin services…, Hide from popular), the hidden terms with Show again, the guard that never prints personal data,
// the permissions, and the error state.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { READER, WRITER, openSearch } from '../test/searchTab';
import { dialogOf, rowOf } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
// The request recorder spies on `fetch`; put it back so one test never sees another's calls.
afterEach(() => vi.restoreAllMocks());

const TOP = 'Top searches';
const ZERO = 'Searches with no result';
const HIDDEN = 'Hidden search terms';

/** The last request of a method the recorder saw. */
const lastOf = (requests: ReturnType<typeof recordRequests>, method: string) =>
  requests
    .sent()
    .filter((r) => r.method === method)
    .at(-1);

describe('the figures and tables', () => {
  it('shows 30 days first: totals, the 12 most searched terms and the 4 searches that found nothing', async () => {
    await openSearch('report');
    const figures = within(await screen.findByRole('region', { name: 'Search report figures' }));
    expect(figures.getByText('2,840')).toBeInTheDocument();
    expect(figures.getByText('last 30 days')).toBeInTheDocument();
    expect(figures.getByText('214')).toBeInTheDocument();
    const top = within(await screen.findByRole('table', { name: TOP }));
    expect(top.getAllByRole('row')).toHaveLength(13);
    const row = await rowOf(TOP, 'iphone 15 unlock');
    expect(row.getByText('412')).toBeInTheDocument();
    const zero = within(await screen.findByRole('table', { name: ZERO }));
    expect(zero.getAllByRole('row')).toHaveLength(5);
    expect(zero.getByText('bootloader unlock')).toBeInTheDocument();
  });

  it('shows the share of searches that found nothing for a term', async () => {
    await openSearch('report');
    const row = await rowOf(TOP, 'xiaomi mi account');
    expect(row.getByText('41 (43%)')).toBeInTheDocument();
  });

  it('asks for 7 and 90 days and keeps the figures on screen while they load', async () => {
    const user = userEvent.setup();
    await openSearch('report');
    await screen.findByRole('region', { name: 'Search report figures' });
    const requests = recordRequests();
    await user.click(screen.getByRole('button', { name: '7 days' }));
    await waitFor(() => expect(lastOf(requests, 'GET')?.url.searchParams.get('days')).toBe('7'));
    expect(await screen.findByText('last 7 days')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '90 days' }));
    expect(await screen.findByText('last 90 days')).toBeInTheDocument();
  });

  it('says what went wrong, with Retry, when the report does not load', async () => {
    mockServer.use(
      http.get('*/admin/search/report', () => problem(500, 'INTERNAL', 'Server error', 'The report failed.')),
    );
    await openSearch('report');
    expect(await screen.findByText('Could not load the search report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('a search that found nothing', () => {
  it('opens Add synonym with the words already in, and saves the rule', async () => {
    const user = userEvent.setup();
    await openSearch('report');
    await user.click(await screen.findByRole('button', { name: 'Add a synonym for bootloader unlock' }));
    const dialog = dialogOf('Add synonym');
    expect(dialog.getByRole('button', { name: 'Remove bootloader unlock' })).toBeInTheDocument();
    await user.type(
      dialog.getByRole('textbox', { name: 'Words and phrases that mean the same' }),
      'oem unlock{Enter}',
    );
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Add synonym' }));
    expect(await screen.findByText('Synonym added')).toBeInTheDocument();
    expect(lastOf(requests, 'POST')?.body).toMatchObject({
      kind: 'multi',
      terms: ['bootloader unlock', 'oem unlock'],
    });
  });

  it('opens Add pinned results with the query already in', async () => {
    const user = userEvent.setup();
    await openSearch('report');
    await user.click(await screen.findByRole('button', { name: 'Pin services for tmobile premium' }));
    const dialog = dialogOf('Add pinned results');
    expect(dialog.getByRole('textbox', { name: 'When a visitor searches for' })).toHaveValue(
      'tmobile premium',
    );
  });
});

describe('Hide from popular', () => {
  it('asks for an optional reason, hides the term and lists it', async () => {
    const user = userEvent.setup();
    await openSearch('report');
    await user.click(
      await screen.findByRole('button', { name: 'Hide bootloader unlock from popular searches' }),
    );
    const dialog = dialogOf('Hide from popular searches');
    expect(dialog.getByText('bootloader unlock')).toBeInTheDocument();
    await user.type(dialog.getByRole('textbox', { name: 'Why (optional)' }), 'Not sold here');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Hide term' }));
    expect(await screen.findByText('Hidden from popular searches')).toBeInTheDocument();
    expect(lastOf(requests, 'POST')?.body).toEqual({ term: 'bootloader unlock', note: 'Not sold here' });
    const hidden = await rowOf(HIDDEN, 'bootloader unlock');
    expect(hidden.getByText('Not sold here')).toBeInTheDocument();
    // The report row now says so instead of offering the button again.
    const zero = within(await screen.findByRole('table', { name: ZERO }));
    await waitFor(() => expect(zero.getAllByText('Hidden from popular').length).toBeGreaterThan(0));
    expect(zero.queryByRole('button', { name: 'Hide bootloader unlock from popular searches' })).toBeNull();
  });

  it('shows the server’s refusal in the dialog', async () => {
    mockServer.use(
      http.post('*/admin/search/hidden-terms', () =>
        problem(409, 'CONFLICT', 'Already hidden', '"icloud" is already hidden from the popular searches.'),
      ),
    );
    const user = userEvent.setup();
    await openSearch('report');
    await user.click(await screen.findByRole('button', { name: 'Hide icloud from popular searches' }));
    await user.click(dialogOf('Hide from popular searches').getByRole('button', { name: 'Hide term' }));
    expect(
      await dialogOf('Hide from popular searches').findByText(
        '"icloud" is already hidden from the popular searches.',
      ),
    ).toBeInTheDocument();
  });

  it('lists the hidden terms and shows one again', async () => {
    const user = userEvent.setup();
    await openSearch('report');
    const row = await rowOf(HIDDEN, 'free');
    expect(row.getByText('Not a service, only a wish.')).toBeInTheDocument();
    await user.click(row.getByRole('button', { name: 'Show free in popular searches again' }));
    expect(await screen.findByText('Shown in popular searches again')).toBeInTheDocument();
    expect(await screen.findByText('No term is hidden.')).toBeInTheDocument();
  });
});

describe('personal data', () => {
  it('never prints a term that looks like an email, a link or an IMEI, and gives it no actions', async () => {
    mockServer.use(
      http.get('*/admin/search/report', () =>
        HttpResponse.json({
          days: 30,
          totals: { searches: 40, zeroResults: 30, terms: 3 },
          topTerms: [{ term: 'someone@example.com', searches: 10, visitors: 3, zeroResults: 10 }],
          zeroResultTerms: [
            { term: '354123456789012', searches: 12, lastSeen: new Date().toISOString() },
            { term: 'https://example.com/x', searches: 8, lastSeen: new Date().toISOString() },
          ],
        }),
      ),
    );
    await openSearch('report');
    expect(await screen.findAllByText('Hidden: looks like personal data')).toHaveLength(3);
    expect(screen.queryByText('someone@example.com')).toBeNull();
    expect(screen.queryByText('354123456789012')).toBeNull();
    expect(screen.queryByText('https://example.com/x')).toBeNull();
    // No action at all for these rows, and the terms are nowhere else on the page (not in a label either).
    const term = /someone@example\.com|354123456789012|https:\/\/example\.com/;
    expect(screen.queryAllByRole('button', { name: term })).toEqual([]);
    for (const text of ['someone@example.com', '354123456789012', 'https://example.com']) {
      expect(document.body.innerHTML).not.toContain(text);
    }
  });
});

describe('permissions', () => {
  it('lets a reader read the report and names the permission the actions need', async () => {
    await openSearch('report', { permissions: READER });
    const row = await rowOf(ZERO, 'bootloader unlock');
    for (const name of [
      'Add a synonym for bootloader unlock',
      'Pin services for bootloader unlock',
      'Hide bootloader unlock from popular searches',
    ]) {
      const button = row.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', 'You need the storefront:update permission');
    }
    expect(
      (await rowOf(HIDDEN, 'free')).getByRole('button', { name: 'Show free in popular searches again' }),
    ).toBeDisabled();
  });

  it('lets storefront:update act on a row', async () => {
    await openSearch('report', { permissions: WRITER });
    const row = await rowOf(ZERO, 'bootloader unlock');
    expect(row.getByRole('button', { name: 'Add a synonym for bootloader unlock' })).toBeEnabled();
  });
});
