// A test of the command palette inside the whole app: typing a service name lists matching services from the server under the
// Services heading, and choosing one opens the list of that service's kind on the Product / Services page, filtered by that name.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { currentLink, kindStrip, openProducts, servicesTable } from '../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the command palette', () => {
  it('finds a service by name and opens the list of its kind filtered by it', async () => {
    const user = userEvent.setup();
    const app = await openProducts('/products?view=groups');
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'chimera');
    // Orders of that service are found too (labelled with their number), so pick the service by its own label.
    const hit = await screen.findByRole('option', { name: /^Chimera Tool 1 Month/ });
    expect(within(hit).getByText('SRV-CHM-1M')).toBeInTheDocument();
    await user.click(hit);
    await waitFor(() => expect(app.location()).toBe('/products?view=all&type=server&q=Chimera+Tool+1+Month'));
    // Chimera Tool is a Server service, so the strip moves to the Server kind.
    await waitFor(async () => expect(currentLink(await kindStrip())).toBe('Server Service'));
    const table = within(await servicesTable());
    expect(await table.findByText('Chimera Tool 1 Month', {}, { timeout: 10_000 })).toBeInTheDocument();
  });
});
