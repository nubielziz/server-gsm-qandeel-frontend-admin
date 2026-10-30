// Tests for the IMEI checks tab, run through the whole app against the dev mock API: the figures, the table, search and
// filters in the address, paging, sorting, the details drawer, an IMEI the server has hashed, and the empty and error states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { openRisk, tableNamed } from '../test/riskPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

const bodyRows = async () => (await tableNamed('IMEI checks')).getAllByRole('row').slice(1);

describe('figures and table', () => {
  it('counts the checks the server can count: all, free checker, before an order and blacklisted found', async () => {
    await openRisk('/risk?tab=checks');
    const strip = within(await screen.findByRole('region', { name: 'IMEI check figures' }));
    await waitFor(() => expect(strip.getByText('907')).toBeInTheDocument());
    expect(strip.getByText('621')).toBeInTheDocument();
    expect(strip.getByText('286')).toBeInTheDocument();
    expect(strip.getByText('29')).toBeInTheDocument();
    expect(strip.getByText('3.2% of checks · saved from a bad sale')).toBeInTheDocument();
  });

  it('shows the demo’s columns, the newest check first, 15 to a page', async () => {
    await openRisk('/risk?tab=checks');
    const table = await tableNamed('IMEI checks');
    for (const name of ['IMEI', 'Device', 'Check', 'Result', 'From', 'Country', 'Order', 'When']) {
      expect(await table.findByRole('columnheader', { name: new RegExp(`^${name}`) })).toBeInTheDocument();
    }
    const rows = await bodyRows();
    expect(rows).toHaveLength(15);
    expect(within(rows[0]).getByText('86 741205 546570 1')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Xiaomi Redmi Note 12')).toBeInTheDocument();
    expect(within(rows[0]).getByText('iCloud status')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Clean')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Free checker')).toBeInTheDocument();
    expect(await screen.findByText('907 checks')).toBeInTheDocument();
  });

  it('links the order a check led to', async () => {
    await openRisk('/risk?tab=checks&q=358480116422751');
    await waitFor(async () => expect(await bodyRows()).toHaveLength(1));
    expect(within((await bodyRows())[0]).getByRole('button', { name: 'SF-20406' })).toBeInTheDocument();
  });
});

describe('filters, paging and sort', () => {
  it('filters by check type and by result, keeps them in the address and clears them', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks');
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Filter by check type' }), 'icloud');
    expect(app.location()).toBe('/risk?tab=checks&kind=icloud');
    expect(await screen.findByText('148 checks')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by result' }), 'locked');
    expect(app.location()).toBe('/risk?tab=checks&kind=icloud&result=locked');
    await waitFor(async () => {
      for (const row of await bodyRows()) expect(within(row).getByText('Locked')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/risk?tab=checks');
    expect(await screen.findByText('907 checks')).toBeInTheDocument();
  });

  it('searches the IMEI or the model after a pause and keeps the text in the address', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks');
    await user.type(await screen.findByRole('searchbox', { name: 'Search IMEI or model' }), 'pixel');
    await waitFor(() => expect(app.location()).toBe('/risk?tab=checks&q=pixel'));
    await waitFor(async () => {
      const rows = await bodyRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(within(row).getByText(/Pixel/)).toBeInTheDocument();
    });
  });

  it('says what to do when nothing matches', async () => {
    await openRisk('/risk?tab=checks&q=zzzz');
    expect(await screen.findByText('No checks found')).toBeInTheDocument();
    expect(screen.getByText('Try another search or check type.')).toBeInTheDocument();
    expect(screen.getByText('0 checks')).toBeInTheDocument();
  });

  it('pages and moves an address past the last page back to the last page', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks');
    expect(await screen.findByText('Page 1 of 61')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/risk?tab=checks&page=2');
    expect(await screen.findByText('Page 2 of 61')).toBeInTheDocument();
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openRisk('/risk?tab=checks&page=999');
    expect(await screen.findByText('Page 61 of 61')).toBeInTheDocument();
    expect(app.location()).toBe('/risk?tab=checks&page=61');
  });

  it('sorts on the server when a column header is pressed', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks');
    await user.click(await screen.findByRole('button', { name: 'Result' }));
    expect(app.location()).toBe('/risk?tab=checks&sort=status&dir=asc');
    await waitFor(async () =>
      expect(within((await bodyRows())[0]).getByText('Blacklisted')).toBeInTheDocument(),
    );
  });
});

describe('details', () => {
  it('opens a check from its IMEI, keeps it in the address and closes it again', async () => {
    const user = userEvent.setup();
    const app = await openRisk('/risk?tab=checks');
    await user.click(await screen.findByRole('button', { name: '86 741205 546570 1' }));
    expect(app.location()).toBe('/risk?tab=checks&check=9900');
    const drawer = within(await screen.findByRole('dialog', { name: 'IMEI check' }));
    expect(await drawer.findByText('Xiaomi Redmi Note 12')).toBeInTheDocument();
    expect(drawer.getByText('iCloud status')).toBeInTheDocument();
    expect(drawer.getByText('Free checker')).toBeInTheDocument();
    expect(drawer.getByText('US')).toBeInTheDocument();
    expect(drawer.getByText('$0.04')).toBeInTheDocument();
    expect(drawer.getByText('What the lookup returned')).toBeInTheDocument();
    expect(drawer.getByText('Find my')).toBeInTheDocument();
    await user.click(drawer.getByRole('button', { name: 'Close details' }));
    await waitFor(() => expect(app.location()).toBe('/risk?tab=checks'));
  });

  it('opens a check from a link that has no row yet', async () => {
    await openRisk('/risk?tab=checks&check=9899');
    expect(await screen.findByRole('dialog', { name: 'IMEI check' })).toBeInTheDocument();
  });

  it('shows an IMEI the server has hashed as it sends it, in the table and in the details', async () => {
    const user = userEvent.setup();
    await openRisk('/risk?tab=checks&q=sha256');
    const rows = await waitFor(async () => {
      const found = await bodyRows();
      expect(found).toHaveLength(6);
      return found;
    });
    const hash = within(rows[0]).getByRole('button', { name: /^sha256:/ });
    const shown = hash.textContent as string;
    await user.click(hash);
    const drawer = within(await screen.findByRole('dialog', { name: 'IMEI check' }));
    expect(await drawer.findByText(shown)).toBeInTheDocument();
  });

  it('says so when a check cannot be loaded', async () => {
    mockServer.use(
      http.get('*/admin/imei-checks/:id', () => problem(404, 'NOT_FOUND', 'Not found', 'No such check.')),
    );
    await openRisk('/risk?tab=checks&check=1');
    expect(await screen.findByText('Could not load this check')).toBeInTheDocument();
  });
});

describe('errors', () => {
  it('shows the server’s error in the table with Retry', async () => {
    mockServer.use(
      http.get('*/admin/imei-checks', () => problem(400, 'BAD_REQUEST', 'Checks are down', 'Try later.')),
    );
    await openRisk('/risk?tab=checks');
    expect(await screen.findByText('Could not load the IMEI checks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});
