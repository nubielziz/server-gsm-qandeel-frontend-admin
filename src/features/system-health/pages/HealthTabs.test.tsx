// Tests for the tab strip of the System health page: the tabs a role sees, the address (`?tab=`), the placeholder panel and
// the keyboard.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../mocks/testing';
import { openHealthPage } from '../test/openHealthPage';
import { SLOW } from '../test/pageQueries';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

describe('the tabs', () => {
  it('opens the first tab when the address names none', async () => {
    await openHealthPage();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('tabpanel', { name: 'Overview' }, SLOW)).toBeInTheDocument();
  });

  it('keeps the chosen tab in the address, leaves the default out, and keeps the range', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: '/system-health?range=7d&queue=orders.dispatch' });
    await user.click(screen.getByRole('tab', { name: 'Queues & jobs' }));
    // The old tab's own parameters go, the range stays. The router switches inside a transition, so the new tab's
    // chunk loads before the address (and the screen) change.
    await waitFor(() => expect(app.location()).toBe('/system-health?range=7d&tab=queues'), SLOW);
    expect(await screen.findByRole('tabpanel', { name: 'Queues & jobs' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?range=7d'), SLOW);
  });

  it('changes nothing when the open tab is chosen again', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage({ route: '/system-health?component=postgres' });
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(app.location()).toBe('/system-health?component=postgres');
  });

  it('opens the tab named in the address', async () => {
    await openHealthPage({ route: '/system-health?tab=integrity' });
    expect(screen.getByRole('tab', { name: 'Integrity' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('tabpanel', { name: 'Integrity' })).toBeInTheDocument();
  });

  it('falls back to the first visible tab for a tab the role cannot read or that does not exist', async () => {
    await openHealthPage({ route: '/system-health?tab=alerts', permissions: ['system:read'] });
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: 'Alerts & incidents' })).not.toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    const app = await openHealthPage();
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'API' })).toHaveFocus();
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=api'), SLOW);
    await waitFor(
      () => expect(screen.getByRole('tab', { name: 'API' })).toHaveAttribute('aria-selected', 'true'),
      SLOW,
    );
  });
});
