// Tests for the Commissions page and its Accruals tab, run through the whole app against the dev mock API: the header and strip, the
// status buttons with their counts, the agent filter, sort and page in the address, the empty and error states, and the order link.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import {
  accrualsTable,
  approveAllReady,
  dataRows,
  openCommissions,
  rowOf,
  tabTexts,
} from '../test/commissionsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const strip = () => within(screen.getByRole('region', { name: 'Commission figures' }));
const seg = () => within(screen.getByRole('group', { name: 'Accrual status' }));

describe('the header and strip', () => {
  it('says how many accruals are ready and shows the server’s counts in the strip, with dashes for the amounts', async () => {
    await openCommissions();
    expect(await screen.findByText('49 accruals are ready to approve.')).toBeInTheDocument();
    expect(
      screen.getByText(/Approving pays the agent into their wallet and posts it to the ledger\./),
    ).toBeInTheDocument();
    await waitFor(() => expect(strip().getByText('49 accruals')).toBeInTheDocument());
    expect(strip().getByText('112 accruals paid into wallets')).toBeInTheDocument();
    expect(strip().getByText('Approved plus waiting')).toBeInTheDocument();
    for (const label of ['Ready to approve', 'Approved, 30 days', 'Earned, 30 days', 'Share of revenue']) {
      expect(strip().getByText(label)).toBeInTheDocument();
    }
    // No amount or share is added up in the browser.
    expect(strip().getAllByText('–')).toHaveLength(4);
    expect(strip().queryByText(/\$/)).not.toBeInTheDocument();
  });

  it('counts the approved accruals of the last 30 days with a one-row list call, not by reading the rows', async () => {
    const requests = recordRequests();
    await openCommissions();
    await waitFor(() => expect(strip().getByText('112 accruals paid into wallets')).toBeInTheDocument());
    const lists = requests
      .sent()
      .filter((request) => request.url.pathname === '/admin/commission-accruals')
      .map((request) => request.url.searchParams);
    const since = lists.find((params) => params.has('createdAt_gte'));
    expect(since).toBeDefined();
    expect(Object.fromEntries(since as URLSearchParams)).toEqual({
      _start: '0',
      _end: '1',
      status: 'approved',
      createdAt_gte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/),
    });
    // Every list call is a one-row count or the table's own page: none reads hundreds of rows to add them up.
    for (const params of lists) {
      expect(Number(params.get('_end')) - Number(params.get('_start'))).toBeLessThanOrEqual(25);
    }
  });

  it('says nothing is waiting once every accrual is approved', async () => {
    await openCommissions('/commissions', { prepare: approveAllReady });
    expect(
      await screen.findByText('Nothing is waiting. Approved commissions are already in the agents’ wallets.'),
    ).toBeInTheDocument();
    expect(tabTexts()).toEqual(['Accruals', 'Agents', 'Plans']);
  });
});

describe('the tabs', () => {
  it('are Accruals with the ready count, Agents and Plans, and open on Accruals', async () => {
    await openCommissions();
    await waitFor(() => expect(tabTexts()).toEqual(['Accruals49', 'Agents', 'Plans']));
    expect(screen.getByRole('tab', { name: /^Accruals/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the open tab in the address and starts the new tab clean', async () => {
    const user = userEvent.setup();
    const app = await openCommissions('/commissions?status=approved&agent=1');
    await user.click(screen.getByRole('tab', { name: 'Plans' }));
    await waitFor(() => expect(app.location()).toBe('/commissions?tab=plans'));
    await user.click(screen.getByRole('tab', { name: /^Accruals/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions'));
  });
});

describe('the accruals table', () => {
  it('lists the ready accruals newest first with the demo’s columns', async () => {
    await openCommissions();
    const table = await accrualsTable();
    const headers = table.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        'Earned',
        'Accrual',
        'Agent',
        'Referred merchant',
        'Order',
        'Order revenue',
        'Rate',
        'Commission',
        'Status',
      ]),
    );
    expect(dataRows(table)).toHaveLength(25);
    const row = await rowOf('Commission accruals', 'CA-0161');
    expect(row.getByText('Cairo GSM Lab')).toBeInTheDocument();
    expect(row.getByText('Jeddah Tech Bar')).toBeInTheDocument();
    expect(row.getByText('ORD-48835')).toBeInTheDocument();
    expect(row.getByText('$20.99')).toBeInTheDocument();
    expect(row.getByText('5%')).toBeInTheDocument();
    expect(row.getByText('$1.05')).toBeInTheDocument();
    expect(row.getByText('Accrued')).toBeInTheDocument();
    expect(screen.getByText('1–25 of 49')).toBeInTheDocument();
  });

  it('pages in the address, and an old link past the last page lands on the last one', async () => {
    const user = userEvent.setup();
    const app = await openCommissions();
    await screen.findByText('1–25 of 49');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toBe('/commissions?page=2'));
    expect(await screen.findByText('26–49 of 49')).toBeInTheDocument();
    app.unmount();
    const late = await openCommissions('/commissions?page=9');
    expect(await screen.findByText('26–49 of 49')).toBeInTheDocument();
    await waitFor(() => expect(late.location()).toBe('/commissions?page=2'));
  });

  it('sorts by a column the server can sort, in the address, and flips on a second click', async () => {
    const user = userEvent.setup();
    const app = await openCommissions();
    // The Commission column: after the tick box, earned, accrual, agent, merchant, order, revenue and rate.
    const amounts = async () =>
      dataRows(await accrualsTable()).map((row) =>
        Number(within(row).getAllByRole('cell')[8].textContent?.replace('$', '')),
      );
    await screen.findByText('1–25 of 49');
    await user.click(screen.getByRole('button', { name: /^Commission/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions?sort=amount&dir=asc'));
    await waitFor(async () => expect((await amounts())[0]).toBeLessThanOrEqual(0.1));
    const ascending = await amounts();
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    await user.click(screen.getByRole('button', { name: /^Commission/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions?sort=amount&dir=desc'));
    await waitFor(async () => expect((await amounts())[0]).toBeGreaterThan(ascending[24]));
    const descending = await amounts();
    expect(descending).toEqual([...descending].sort((a, b) => b - a));
  });

  it('shows the server’s error with Retry when the list cannot be loaded', async () => {
    mockServer.use(
      http.get('*/admin/commission-accruals', () =>
        problem(500, 'INTERNAL', 'Server error', 'The list is down.'),
      ),
    );
    await openCommissions();
    expect(await screen.findByText('Could not load the accruals')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('the status buttons', () => {
  it('count the ready, approved and all accruals and open on Ready', async () => {
    await openCommissions();
    await waitFor(() => expect(seg().getByRole('button', { name: 'Ready 49' })).toBeInTheDocument());
    expect(seg().getByRole('button', { name: 'Approved 112' })).toBeInTheDocument();
    expect(seg().getByRole('button', { name: 'All 161' })).toBeInTheDocument();
    expect(seg().getByRole('button', { name: 'Ready 49' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('show the approved accruals without tick boxes, and All with every status', async () => {
    const user = userEvent.setup();
    const app = await openCommissions();
    await screen.findByRole('checkbox', { name: 'Select row 161' });
    await user.click(await seg().findByRole('button', { name: /^Approved/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions?status=approved'));
    expect(await screen.findByText('1–25 of 112')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /^Select row/ })).not.toBeInTheDocument();
    expect((await accrualsTable()).getAllByText('Approved').length).toBeGreaterThan(1);
    await user.click(seg().getByRole('button', { name: /^All/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions?status=all'));
    expect(await screen.findByText('1–25 of 161')).toBeInTheDocument();
    await user.click(seg().getByRole('button', { name: /^Ready/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions'));
  });

  it('go back to page 1 when they change', async () => {
    const user = userEvent.setup();
    const app = await openCommissions('/commissions?page=2');
    await screen.findByText('26–49 of 49');
    await user.click(await seg().findByRole('button', { name: /^Approved/ }));
    await waitFor(() => expect(app.location()).toBe('/commissions?status=approved'));
  });
});

describe('the agent filter', () => {
  it('lists the agents from the assignments and filters in the address', async () => {
    const user = userEvent.setup();
    const app = await openCommissions();
    const select = await screen.findByRole('combobox', { name: 'Filter by agent' });
    await waitFor(() =>
      expect(
        within(select)
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['All agents', 'Cairo GSM Lab', 'Zain Mobile Hub']),
    );
    await user.selectOptions(select, 'Zain Mobile Hub');
    await waitFor(() => expect(app.location()).toBe('/commissions?agent=1'));
    expect(await screen.findByText('1–25 of 30')).toBeInTheDocument();
    for (const row of dataRows(await accrualsTable())) expect(row).toHaveTextContent('Zain Mobile Hub');
    await user.selectOptions(select, 'All agents');
    await waitFor(() => expect(app.location()).toBe('/commissions'));
  });

  it('keeps the agent the address names, even before the agents have loaded', async () => {
    await openCommissions('/commissions?status=approved&agent=5');
    expect(await screen.findByText('1–25 of 52')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Filter by agent' })).toHaveValue('5');
  });
});

describe('the empty states', () => {
  it('says all caught up on Ready when everything is approved, and offers the approved ones', async () => {
    const user = userEvent.setup();
    const app = await openCommissions('/commissions', { prepare: approveAllReady });
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
    expect(
      screen.getByText(/New accruals appear when a referred merchant’s order completes\./),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'See approved' }));
    await waitFor(() => expect(app.location()).toBe('/commissions?status=approved'));
    expect(await screen.findByText('1–25 of 161')).toBeInTheDocument();
  });

  it('says there are no commissions yet when the server has none', async () => {
    mockServer.use(
      http.get(
        '*/admin/commission-accruals',
        () => new Response('[]', { headers: { 'content-type': 'application/json', 'x-total-count': '0' } }),
      ),
    );
    await openCommissions();
    expect(await screen.findByText('No commissions yet')).toBeInTheDocument();
    expect(screen.getByText(/the agent earns a commission here\./)).toBeInTheDocument();
  });
});

describe('the order number', () => {
  it('opens the order’s drawer in the address', async () => {
    const user = userEvent.setup();
    const app = await openCommissions();
    const row = await rowOf('Commission accruals', 'CA-0161');
    await user.click(row.getByRole('button', { name: 'ORD-48835' }));
    await waitFor(() => expect(app.location()).toBe('/commissions?order=48835'));
  });
});
