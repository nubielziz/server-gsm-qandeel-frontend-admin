// Tests for the Services tab, run through the whole app against the dev mock API: the header sentence and tab counts, the table's
// columns with the server's price figures, paging, the filters in the address, and the empty states.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { openServices, serviceRow, servicesTable, tabTexts } from '../test/servicesPage';

setupMockApi();
// The page is a lazy chunk: the first test of a run waits for its modules to load, which is slow while the whole suite
// runs in parallel. Every flow here also goes through the mock API, so give them room.
vi.setConfig({ testTimeout: 20_000 });

describe('header and tabs', () => {
  it('says how many active services are under their floor, from the server’s count', async () => {
    await openServices();
    expect(
      await screen.findByText('1 service is priced below cost plus minimum profit.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Orders are charged the floor price until you update it\./)).toBeInTheDocument();
  });

  it('shows the five tabs, with the service count on the first', async () => {
    await openServices();
    await waitFor(() =>
      expect(tabTexts()).toEqual([
        'Services27',
        'Price resolver',
        'Rules and groups',
        'Categories',
        'Code inventory',
      ]),
    );
    expect(screen.getByRole('tab', { name: /^Services/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('the table', () => {
  it('shows a service with its code, type, suppliers, cost, price, margin and SLA', async () => {
    await openServices();
    const row = await serviceRow('AT&T USA Premier Unlock');
    expect(row.getByText('IMEI-ATT-USA')).toBeInTheDocument();
    expect(row.getByText('IMEI')).toBeInTheDocument();
    expect(row.getByText('Nordic GSM')).toBeInTheDocument();
    expect(row.getByText('Fallback Bosphorus Unlock')).toBeInTheDocument();
    expect(row.getByText('$13.50')).toBeInTheDocument();
    expect(row.getByText('$17.28')).toBeInTheDocument();
    expect(row.getByText('21.9%')).toBeInTheDocument();
    expect(row.getByText('2d')).toBeInTheDocument();
  });

  it('marks the service under its floor with the server’s floor price and a thin margin', async () => {
    await openServices();
    const row = await serviceRow('Chimera Tool 1 Month');
    expect(row.getByRole('button', { name: 'Edit price of Chimera Tool 1 Month, now $19.50' })).toHaveClass(
      'text-crit-fg',
    );
    expect(row.getByText('Floor $20.99')).toBeInTheDocument();
    expect(row.getByText('-1.5%')).toHaveClass('text-warn-fg');
    // The supplier raised its cost after the price was set.
    expect(row.getByText(/Supplier changed this from \$17\.00\./)).toBeInTheDocument();
    expect(row.getByText('No fallback')).toBeInTheDocument();
  });

  it('shows 25 services a page, A to Z, and pages on the server', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect((await servicesTable()).getAllByRole('row')).toHaveLength(26); // the header and 25 services
    expect(await serviceRow('Apple Warranty & Activation Date')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(app.location()).toBe('/services?page=2');
    expect(await serviceRow('Z3X Credits x10')).toBeTruthy();
    expect((await servicesTable()).getAllByRole('row')).toHaveLength(3);
  });

  it('moves an address past the last page back to the last page that has rows', async () => {
    const app = await openServices('/services?page=9');
    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(app.location()).toBe('/services?page=2');
  });

  it('sorts on the server when a column header is pressed, and keeps the sort in the address', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await user.click(await screen.findByRole('button', { name: 'Cost' }));
    expect(app.location()).toBe('/services?sort=cost&dir=asc');
    await waitFor(async () =>
      expect((await servicesTable()).getAllByRole('row')[1]).toHaveTextContent('Blacklist Status (GSMA)'),
    );
  });
});

describe('filters', () => {
  it('searches by name, code or category after a pause and clears with Clear filters', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.type(screen.getByRole('searchbox', { name: 'Search service, code, category' }), 'carrier');
    await waitFor(() => expect(app.location()).toBe('/services?q=carrier'));
    expect(await screen.findByText('6 services')).toBeInTheDocument();
    expect(await serviceRow('Orange France Unlock')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(app.location()).toBe('/services');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('filters by type', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by type' }), 'Remote');
    expect(app.location()).toBe('/services?type=remote');
    expect(await screen.findByText('4 services')).toBeInTheDocument();
  });

  it('honours /services?belowFloor=true from the dashboard and the chip toggles it', async () => {
    const user = userEvent.setup();
    const app = await openServices('/services?belowFloor=true');
    const chip = screen.getByRole('button', { name: 'Below floor' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('1 service')).toBeInTheDocument();
    expect(await serviceRow('Chimera Tool 1 Month')).toBeTruthy();

    await user.click(chip);
    expect(app.location()).toBe('/services');
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });

  it('shows only the disabled services with the Disabled chip', async () => {
    const user = userEvent.setup();
    const app = await openServices();
    await screen.findByText('27 services');
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(app.location()).toBe('/services?status=disabled');
    expect(await screen.findByText('1 service')).toBeInTheDocument();
    const row = await serviceRow('Xiaomi Mi Account Clean');
    expect(row.getByRole('switch', { name: 'Enable Xiaomi Mi Account Clean' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('says so when nothing matches and offers to clear', async () => {
    const user = userEvent.setup();
    await openServices('/services?q=zzzz-nothing');
    expect(await screen.findByText('No services match')).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('tabpanel')).getAllByRole('button', { name: 'Clear filters' })[0],
    );
    expect(await screen.findByText('27 services')).toBeInTheDocument();
  });
});

describe('ticked services', () => {
  it('are forgotten when the page changes, so nothing is changed out of sight', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    expect(screen.getByRole('region', { name: 'Selected services' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await serviceRow('Z3X Credits x10')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(await screen.findByRole('checkbox', { name: 'Select row 9' })).not.toBeChecked();
  });

  it('are forgotten when the sort changes', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(screen.getByRole('button', { name: 'Cost' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument(),
    );
  });

  it('are forgotten when a filter changes', async () => {
    const user = userEvent.setup();
    await openServices();
    await user.click(await screen.findByRole('checkbox', { name: 'Select row 9' }));
    await user.click(screen.getByRole('button', { name: 'Disabled' }));
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Selected services' })).not.toBeInTheDocument(),
    );
  });
});
