// Tests for the Alerts & incidents tab as a whole: the three views, which of them a role may see, and the address.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

const viewNames = () =>
  within(screen.getByRole('tablist', { name: 'Alerts and incidents views' }))
    .getAllByRole('tab')
    .map((tab) => tab.textContent);

describe('the views', () => {
  it('opens on the Alerts view and offers all three to a staff member who reads alerts and incidents', async () => {
    await openHealthPage({ route: '/system-health?tab=alerts' });
    expect(await screen.findByRole('heading', { level: 2, name: 'Alerts' }, SLOW)).toBeInTheDocument();
    expect(viewNames()).toEqual(['Alerts', 'Rules', 'Incidents']);
    expect(screen.getByRole('tab', { name: 'Alerts' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens the view named in the address', async () => {
    await openHealthPage({ route: '/system-health?tab=alerts&view=rules' });
    expect(await screen.findByRole('heading', { level: 2, name: 'Alert rules' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rules' })).toHaveAttribute('aria-selected', 'true');
  });

  it("keeps the view in the address, leaves the default out, and drops the old view's own parameters", async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: '/system-health?tab=alerts&status=resolved&range=7d' });
    await screen.findByRole('heading', { level: 2, name: 'Alerts' }, SLOW);
    await user.click(screen.getByRole('tab', { name: 'Rules' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&range=7d&view=rules'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Alert rules' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Incidents' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&range=7d&view=incidents'));
    await user.click(screen.getByRole('tab', { name: 'Alerts' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&range=7d'));
    expect(await screen.findByRole('heading', { level: 2, name: 'Alerts' })).toBeInTheDocument();
  });

  it('moves between the views with the arrow keys', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: '/system-health?tab=alerts' });
    await screen.findByRole('heading', { level: 2, name: 'Alerts' }, SLOW);
    screen.getByRole('tab', { name: 'Alerts' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Rules' })).toHaveFocus();
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&view=rules'));
  });

  it('opens the Incidents view for an incident link that names no view', async () => {
    await openHealthPage({ route: '/system-health?tab=alerts&incident=5' });
    expect(await screen.findByRole('heading', { level: 2, name: 'Incidents' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Incidents' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('what a role may see', () => {
  it('lands a staff member who can only read incidents on the Incidents view, with no strip of views', async () => {
    await openHealthPage({
      permissions: ['incidents:read'],
      route: '/system-health?tab=alerts&view=rules',
    });
    expect(await screen.findByRole('heading', { level: 2, name: 'Incidents' }, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Alerts and incidents views' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alert rules' })).not.toBeInTheDocument();
  });

  it('shows Alerts and Rules, not Incidents, to a staff member who can only read alerts', async () => {
    await openHealthPage({
      permissions: ['alerts:read'],
      route: '/system-health?tab=alerts&view=incidents',
    });
    expect(await screen.findByRole('heading', { level: 2, name: 'Alerts' }, SLOW)).toBeInTheDocument();
    expect(viewNames()).toEqual(['Alerts', 'Rules']);
    expect(screen.queryByRole('heading', { name: 'Incidents' })).not.toBeInTheDocument();
  });

  it('does not offer the tab to a role that reads neither', async () => {
    await openHealthPage({ permissions: ['system:read'], route: '/system-health?tab=alerts' });
    expect(screen.queryByRole('tab', { name: 'Alerts & incidents' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Alerts and incidents views' })).not.toBeInTheDocument();
  });
});
