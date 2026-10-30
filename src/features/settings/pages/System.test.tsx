// Tests for the System tab, run through the whole app against the dev mock API: the typed setting with Save, the server's message under
// it, the setting another page edits, the keys shown read-only as JSON, and permissions.
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getSettings } from '../api';
import { openSettings } from '../test/settingsPage';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const SYSTEM = '/settings?tab=system';
const retention = () => screen.getByRole('textbox', { name: /^IMEI retention/ });

describe('the typed settings', () => {
  it('shows the saved number, and Save wakes up when it changes', async () => {
    const user = userEvent.setup();
    await openSettings(SYSTEM);
    await screen.findByRole('textbox', { name: /^IMEI retention/ });
    expect(retention()).toHaveValue('180');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.type(retention(), '0');
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('saves the one key and shows the new value', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(SYSTEM);
    await screen.findByRole('textbox', { name: /^IMEI retention/ });
    await user.clear(retention());
    await user.type(retention(), '90');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Setting saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/settings')[0].body).toEqual({ imeiRetentionDays: 90 });
    expect((await getSettings()).imeiRetentionDays).toBe(90);
    expect(retention()).toHaveValue('90');
  });

  it('checks the range before it calls the server', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(SYSTEM);
    await screen.findByRole('textbox', { name: /^IMEI retention/ });
    await user.clear(retention());
    await user.type(retention(), '5000');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter 0 to 3650.')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/settings')).toHaveLength(0);
  });

  it('shows the server’s message under the box', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/settings', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'imeiRetentionDays', message: 'Our legal minimum is 30 days.' },
        ]),
      ),
    );
    await openSettings(SYSTEM);
    await screen.findByRole('textbox', { name: /^IMEI retention/ });
    await user.clear(retention());
    await user.type(retention(), '10');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Our legal minimum is 30 days.')).toBeInTheDocument();
    expect(retention()).toHaveAttribute('aria-invalid', 'true');
    expect((await getSettings()).imeiRetentionDays).toBe(180);
  });
});

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

  it('shows keys the console does not know as read-only JSON, and leaves the policies to their own tab', async () => {
    mockServer.use(
      http.get('*/admin/settings', () =>
        HttpResponse.json({
          imeiRetentionDays: 180,
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

  it('says there are no other settings when the server has none', async () => {
    await openSettings(SYSTEM);
    expect(await screen.findByText('There are no other settings.')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the settings but not change them', async () => {
    await openSettings(SYSTEM, { permissions: ['settings:read'] });
    await screen.findByRole('textbox', { name: /^IMEI retention/ });
    expect(retention()).toBeDisabled();
    expect(retention()).toHaveAttribute('title', 'You need the settings:update permission');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
