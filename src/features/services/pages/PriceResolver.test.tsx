// Tests for the Price resolver tab, run through the whole app against the dev mock API: the price and the steps the server gives for
// a merchant and a service (a client override, a group price, the base price with the category rule, a price raised to the floor),
// the choice kept in the address, and the states when the server cannot answer.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { openServices } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

// The mock's merchants and services (taken from the demo): Cairo GSM Lab is VIP with its own price for the AT&T unlock.
const ATT = 5;
const CHIMERA = 17;
const CAIRO = 5; // VIP, client override 15.20 on the AT&T unlock
const ZAIN = 1; // VIP, no override: pays the VIP group price 15.90
const ERBIL = 6; // Standard: pays the base price with the category rule

const steps = () => within(screen.getByRole('list', { name: 'Resolution steps' }));
const step = (label: string) => within(steps().getByText(label).closest('li') as HTMLElement);

describe('the price and the steps', () => {
  it('shows a merchant’s own price first: the client override wins and the rest is skipped', async () => {
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${CAIRO}`);
    expect(await screen.findByText('Cairo GSM Lab pays')).toBeInTheDocument();
    expect(screen.getByText('$15.20', { selector: 'p.text-3xl' })).toBeInTheDocument();
    expect(screen.getByText('client override', { selector: 'strong' })).toBeInTheDocument();
    expect(step('Client override').getByText('Used')).toBeInTheDocument();
    expect(step('Client override').getByText('Fixed price set for this merchant')).toBeInTheDocument();
    expect(step('Group service price').getByText('Skipped')).toBeInTheDocument();
    expect(step('Category rule').getByText('Skipped')).toBeInTheDocument();
    expect(step('Floor check').getByText('Above floor')).toBeInTheDocument();
    expect(
      step('Floor check').getByText(/Cost \$13\.50 plus minimum profit \$0\.81 = \$14\.31\./),
    ).toBeInTheDocument();
  });

  it('uses the group price when the merchant has no override', async () => {
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${ZAIN}`);
    expect(await screen.findByText('Zain Mobile Hub pays')).toBeInTheDocument();
    expect(screen.getByText('$15.90', { selector: 'p.text-3xl' })).toBeInTheDocument();
    expect(screen.getByText('group price', { selector: 'strong' })).toBeInTheDocument();
    expect(step('Client override').getByText('Not set')).toBeInTheDocument();
    expect(step('Group service price').getByText('Used')).toBeInTheDocument();
    expect(step('Group service price').getByText('VIP price for this service')).toBeInTheDocument();
  });

  it('takes the base price through the category rule for a merchant with no fixed price', async () => {
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${ERBIL}`);
    expect(await screen.findByText('Erbil Mobile Parts pays')).toBeInTheDocument();
    expect(screen.getByText('$16.93', { selector: 'p.text-3xl' })).toBeInTheDocument();
    expect(screen.getByText('base price', { selector: 'strong' })).toBeInTheDocument();
    expect(step('Base price').getByText('Applied')).toBeInTheDocument();
    expect(step('Base price').getByText('$17.28')).toBeInTheDocument();
    const category = step('Category rule');
    expect(category.getByText('Applied')).toBeInTheDocument();
    expect(category.getByText('−2%')).toBeInTheDocument();
    expect(category.getByText('= $16.93')).toBeInTheDocument();
    expect(step('Group discount').getByText('Not set')).toBeInTheDocument();
    // Profit and margin are the server’s figures.
    expect(screen.getByText(/per order, 20\.3% margin\./)).toBeInTheDocument();
  });

  it('shows what the same service costs every group', async () => {
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${ERBIL}`);
    const table = within(await screen.findByRole('table', { name: 'Same service, other groups' }));
    expect(table.getAllByRole('row')).toHaveLength(3);
    expect(
      within(table.getByText('Standard').closest('tr') as HTMLElement).getByText('$16.93'),
    ).toBeInTheDocument();
    expect(
      within(table.getByText('Wholesale').closest('tr') as HTMLElement).getByText('$16.26'),
    ).toBeInTheDocument();
    expect(
      within(table.getByText('VIP').closest('tr') as HTMLElement).getByText('$15.90'),
    ).toBeInTheDocument();
    expect(screen.getByText('Group rows ignore this merchant’s personal override.')).toBeInTheDocument();
  });

  it('names each merchant’s group in the menu, leaves out merchants waiting for approval and marks the merchant’s own group', async () => {
    mockServer.use(
      http.get('*/admin/clients', () =>
        HttpResponse.json(
          [
            { id: 6, name: 'Erbil Mobile Parts', status: 'active', group: { id: 1, name: 'Standard' } },
            { id: 2, name: 'Al-Noor Telecom', status: 'active', group: { id: 2, name: 'Wholesale' } },
            { id: 20, name: 'Waiting Trader', status: 'pending', group: { id: 1, name: 'Standard' } },
          ],
          { headers: { 'x-total-count': '3' } },
        ),
      ),
    );
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${ERBIL}`);
    const merchant = await screen.findByRole('combobox', { name: 'Merchant' });
    expect(
      within(merchant)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Erbil Mobile Parts (Standard)', 'Al-Noor Telecom (Wholesale)']);
    const table = within(await screen.findByRole('table', { name: 'Same service, other groups' }));
    expect(
      within(table.getByText('Standard').closest('tr') as HTMLElement).getByText('(this merchant)'),
    ).toBeInTheDocument();
  });

  it('says the price was raised to the floor, with the price before and after', async () => {
    await openServices(`/services?tab=resolver&service=${CHIMERA}&merchant=${ERBIL}`);
    expect(await screen.findByText('Erbil Mobile Parts pays')).toBeInTheDocument();
    expect(screen.getByText('$20.99', { selector: 'p.text-3xl' })).toBeInTheDocument();
    const floor = step('Floor check');
    expect(floor.getByText('Raised to floor')).toBeInTheDocument();
    expect(floor.getByText('$19.50 → $20.99')).toBeInTheDocument();
  });
});

describe('the choice', () => {
  it('opens on the first service and merchant, and keeps a change in the address', async () => {
    const user = userEvent.setup();
    const app = await openServices('/services?tab=resolver');
    const service = await screen.findByRole('combobox', { name: 'Service' });
    await waitFor(() => expect(service).toHaveDisplayValue('Apple Warranty & Activation Date'));
    expect(await screen.findByText(/ pays$/)).toBeInTheDocument();

    await user.selectOptions(service, 'T-Mobile USA Unlock');
    await waitFor(() => expect(app.location()).toBe('/services?tab=resolver&service=6'));
    // The merchants feature's mock serves the names, with the group after each one ("Cairo GSM Lab (VIP)").
    const merchant = screen.getByRole('combobox', { name: 'Merchant' });
    const cairo = within(merchant).getByRole('option', { name: /^Cairo GSM Lab/ }) as HTMLOptionElement;
    await user.selectOptions(merchant, cairo);
    await waitFor(() =>
      expect(app.location()).toBe(`/services?tab=resolver&service=6&merchant=${cairo.value}`),
    );
    expect(await screen.findByText('Cairo GSM Lab pays')).toBeInTheDocument();
  });

  it('keeps a service from the address that is not among the first names', async () => {
    await openServices('/services?tab=resolver&service=999&merchant=5');
    expect(await screen.findByRole('combobox', { name: 'Service' })).toHaveDisplayValue('Service 999');
  });
});

describe('when the server cannot answer', () => {
  it('shows the server’s message with a way to try again', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/pricing/resolve', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'That merchant has no price list yet.'),
      ),
    );
    await openServices(`/services?tab=resolver&service=${ATT}&merchant=${CAIRO}`);
    expect(await screen.findByText('Could not resolve the price')).toBeInTheDocument();
    expect(screen.getByText(/That merchant has no price list yet\./)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
  });

  it('needs clients:read to choose a merchant', async () => {
    await openServices('/services?tab=resolver', { permissions: ['catalog:read', 'pricing:read'] });
    expect(await screen.findByText('Choose a merchant')).toBeInTheDocument();
    expect(screen.getByText(/You need the clients:read permission/)).toBeInTheDocument();
  });
});
