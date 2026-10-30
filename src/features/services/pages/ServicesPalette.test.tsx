// A test of the command palette inside the whole app: typing a service name lists matching services from the server under the
// Services heading, and choosing one opens the Services tab filtered by that name.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import { openServices, serviceRow } from '../test/servicesPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the command palette', () => {
  it('finds a service by name and opens the Services tab filtered by it', async () => {
    const user = userEvent.setup();
    const app = await openServices('/services?tab=categories');
    await user.keyboard('{Control>}k{/Control}');
    await user.type(await screen.findByRole('combobox'), 'chimera');
    // Orders of that service are found too (labelled with their number), so pick the service by its own label.
    const hit = await screen.findByRole('option', { name: /^Chimera Tool 1 Month/ });
    expect(within(hit).getByText('SRV-CHM-1M')).toBeInTheDocument();
    await user.click(hit);
    await waitFor(() => expect(app.location()).toBe('/services?q=Chimera+Tool+1+Month'));
    expect(await screen.findByText('1 service')).toBeInTheDocument();
    expect(await serviceRow('Chimera Tool 1 Month')).toBeTruthy();
  });
});
