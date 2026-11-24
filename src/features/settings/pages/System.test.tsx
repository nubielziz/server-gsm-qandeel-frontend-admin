// Tests for the System tab, run through the whole app against the dev mock API: the setting another page edits, the keys shown
// read-only as JSON (an older server's retired keys are not among them), and what a reader sees. The Customer wallet panel has
// its own file next to this one.
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { openSettings } from '../test/settingsPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const SYSTEM = '/settings?tab=system';

describe('the other settings', () => {
  it('shows the restriction another page edits, with a link to it', async () => {
    await openSettings(SYSTEM);
    expect(await screen.findByText('Only allowed IPs can open the console')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Admins and access' })).toHaveAttribute(
      'href',
      '/access?tab=allow',
    );
  });

  it('has no box for how long an IMEI is kept, which was retired with the IMEI check', async () => {
    await openSettings(SYSTEM);
    expect(await screen.findByText('Only allowed IPs can open the console')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^IMEI retention/ })).not.toBeInTheDocument();
  });

  it('shows keys the console does not know as read-only JSON, and leaves the policies to their own tab', async () => {
    mockServer.use(
      http.get('*/admin/settings', () =>
        HttpResponse.json({
          adminAllowlistOnly: false,
          guestCheckout: true,
          maintenanceBanner: { enabled: true, text: 'Back at noon' },
          supportEmail: 'help@gsm.example',
        }),
      ),
    );
    await openSettings(SYSTEM);
    const other = within(
      (await screen.findByRole('heading', { name: 'Other settings' })).closest('section') as HTMLElement,
    );
    expect(other.getByText('maintenanceBanner')).toBeInTheDocument();
    expect(other.getByText(/"text": "Back at noon"/)).toBeInTheDocument();
    expect(other.getByText('supportEmail')).toBeInTheDocument();
    expect(other.getByText(/"help@gsm.example"/)).toBeInTheDocument();
    expect(other.queryByText('guestCheckout')).not.toBeInTheDocument();
    expect(other.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not show the key of a retired feature that a backend still sends', async () => {
    mockServer.use(
      http.get('*/admin/settings', () =>
        HttpResponse.json({ imeiRetentionDays: 180, adminAllowlistOnly: false, abandonedMinutes: 60 }),
      ),
    );
    await openSettings(SYSTEM);
    expect(await screen.findByText('There are no other settings.')).toBeInTheDocument();
    expect(screen.queryByText('abandonedMinutes')).not.toBeInTheDocument();
  });

  it('does not show the two keys of the retired IMEI check that an older server still sends', async () => {
    mockServer.use(
      http.get('*/admin/settings', () =>
        HttpResponse.json({ adminAllowlistOnly: false, imeiPrecheck: true, imeiRetentionDays: 180 }),
      ),
    );
    await openSettings(SYSTEM);
    expect(await screen.findByText('There are no other settings.')).toBeInTheDocument();
    expect(screen.queryByText('imeiRetentionDays')).not.toBeInTheDocument();
    expect(screen.queryByText('imeiPrecheck')).not.toBeInTheDocument();
  });

  it('says there are no other settings when the server has none', async () => {
    await openSettings(SYSTEM);
    expect(await screen.findByText('There are no other settings.')).toBeInTheDocument();
  });
});
