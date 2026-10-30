// Tests for the Settings page frame, run through the whole app against the dev mock API: the seven tabs, the address (`?tab=`), the
// tabs a role may open, the stale-rate count, and the exports other features already use (the access and customers pages).
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { setupMockApi } from '@/test/renderApp';
import * as settings from '..';
import { openSettings, openTab, sectionTabs, tabTexts } from '../test/settingsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });

describe('the tabs', () => {
  it('shows the demo’s four tabs and the three the map adds, with the stale rates counted on Tax and currency', async () => {
    await openSettings();
    // The demo's SEK rate is days old, so one currency is stale.
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /^Tax and currency/ })).toHaveTextContent('Tax and currency1'),
    );
    expect(tabTexts()).toEqual([
      'Payment methods',
      'Tax and currency1',
      'Policies',
      'Customer emails',
      'Notification log',
      'Webhook deliveries',
      'System',
    ]);
    expect(sectionTabs().getByRole('tab', { name: 'Payment methods' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('opens a tab from the address, and keeps the address in step with the tab', async () => {
    const user = userEvent.setup();
    const app = await openSettings('/settings?tab=tax');
    expect(sectionTabs().getByRole('tab', { name: /^Tax and currency/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('table', { name: 'Currencies' })).toBeInTheDocument();
    await openTab(user, 'Policies');
    expect(app.location()).toBe('/settings?tab=policies');
    await openTab(user, 'Payment methods');
    expect(app.location()).toBe('/settings');
  });

  it('falls back to the first tab when the address names a tab that does not exist', async () => {
    await openSettings('/settings?tab=nonsense');
    expect(sectionTabs().getByRole('tab', { name: 'Payment methods' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByRole('article', { name: 'Card gateway' })).toBeInTheDocument();
  });
});

describe('what a role may open', () => {
  it('hides the tabs the role cannot read and starts on the first one it can', async () => {
    await openSettings('/settings?tab=payments', { permissions: ['notifications:read'] });
    expect(tabTexts()).toEqual(['Customer emails', 'Notification log']);
    expect(sectionTabs().getByRole('tab', { name: 'Customer emails' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('gives a webhook reader just the webhook log', async () => {
    await openSettings('/settings', { permissions: ['webhooks:read'] });
    expect(tabTexts()).toEqual(['Webhook deliveries']);
    expect(await screen.findByRole('table', { name: 'Webhook deliveries' })).toBeInTheDocument();
  });

  it('shows Tax and currency to a role that can read only the tax rates', async () => {
    await openSettings('/settings?tab=tax', { permissions: ['tax:read'] });
    expect(await screen.findByRole('table', { name: 'Tax by country' })).toBeInTheDocument();
    expect(screen.getByText('Currencies are hidden for your role')).toBeInTheDocument();
  });
});

describe('what other features use', () => {
  it('still exports the settings functions, the read hook and its key, and adds the link helper', () => {
    expect(typeof settings.getSettings).toBe('function');
    expect(typeof settings.updateSettings).toBe('function');
    expect(typeof settings.useSettings).toBe('function');
    expect(settings.SETTINGS_KEY).toEqual(['api', 'settings']);
    expect(settings.settingsPath('tax')).toBe('/settings?tab=tax');
  });
});
