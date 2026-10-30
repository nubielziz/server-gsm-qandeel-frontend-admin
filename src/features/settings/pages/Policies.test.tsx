// Tests for the Policies tab, run through the whole app against the dev mock API: the eight rules with their saved values, a switch, a number
// box, the server's message under a rule, the check before a request, the warnings, and permissions.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
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

const POLICIES = '/settings?tab=policies';
const box = (name: RegExp) => screen.getByRole('textbox', { name });

describe('the rules', () => {
  it('shows the eight policies with the values the settings hold', async () => {
    await openSettings(POLICIES);
    expect(await screen.findByRole('switch', { name: 'Turn off: Guest checkout' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('switch', { name: 'Turn off: Require 3D Secure' })).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: 'Turn off: Check the IMEI before payment' }),
    ).toBeInTheDocument();
    expect(box(/^Cancel freely within/)).toHaveValue('1');
    expect(box(/^Send a reminder after/)).toHaveValue('60');
    expect(box(/^Keep the IMEI for/)).toHaveValue('180');
    expect(screen.getByText('days after the order')).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(5);
  });
});

describe('a switch', () => {
  it('turns a policy off through the storefront settings route and says so', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(POLICIES);
    await user.click(await screen.findByRole('switch', { name: 'Turn off: Guest checkout' }));
    expect(await screen.findByText('Guest checkout is off')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/storefront/settings')[0].body).toEqual({ guestCheckout: false });
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Turn on: Guest checkout' })).toHaveAttribute(
        'aria-checked',
        'false',
      ),
    );
    expect((await getSettings()).guestCheckout).toBe(false);
  });

  it('warns that 3D Secure and the cancel-right waiver matter once they are off', async () => {
    const user = userEvent.setup();
    await openSettings(POLICIES);
    expect(screen.queryByText(/Without 3D Secure/)).not.toBeInTheDocument();
    await user.click(await screen.findByRole('switch', { name: 'Turn off: Require 3D Secure' }));
    expect(
      await screen.findByText('Without 3D Secure the bank can blame you for fraud chargebacks.'),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('switch', { name: 'Turn off: Ask for the cancel-right waiver at checkout' }),
    );
    expect(await screen.findByText(/customers can cancel for 14 days/)).toBeInTheDocument();
  });

  it('shows the server’s refusal under the rule and keeps the switch as it was', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/storefront/settings', () =>
        problem(403, 'FORBIDDEN', 'No permission', 'Only an owner may turn off 3D Secure.'),
      ),
    );
    await openSettings(POLICIES);
    await user.click(await screen.findByRole('switch', { name: 'Turn off: Require 3D Secure' }));
    expect(await screen.findByText('Only an owner may turn off 3D Secure.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Turn off: Require 3D Secure' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });
});

describe('a number', () => {
  it('saves the number when the box loses focus', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(POLICIES);
    await screen.findByRole('switch', { name: 'Turn off: Guest checkout' });
    await user.clear(box(/^Cancel freely within/));
    await user.type(box(/^Cancel freely within/), '6');
    await user.tab();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/storefront/settings')[0].body).toEqual({
      refundHoursBeforeDispatch: 6,
    });
    expect((await getSettings()).refundHoursBeforeDispatch).toBe(6);
  });

  it('saves on Enter, and sends nothing when the number did not change', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(POLICIES);
    await screen.findByRole('switch', { name: 'Turn off: Guest checkout' });
    await user.click(box(/^Send a reminder after/));
    await user.tab();
    expect(recorder.to('PATCH', '/admin/storefront/settings')).toHaveLength(0);
    await user.clear(box(/^Send a reminder after/));
    await user.type(box(/^Send a reminder after/), '90{Enter}');
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/storefront/settings')[0].body).toEqual({ abandonedMinutes: 90 });
  });

  it('shows the server’s message under the box and keeps what was typed', async () => {
    const user = userEvent.setup();
    await openSettings(POLICIES);
    await screen.findByRole('switch', { name: 'Turn off: Guest checkout' });
    await user.clear(box(/^Cancel freely within/));
    await user.type(box(/^Cancel freely within/), '99');
    await user.tab();
    expect(await screen.findByText('Enter 0 to 72 hours.')).toBeInTheDocument();
    expect(box(/^Cancel freely within/)).toHaveAttribute('aria-invalid', 'true');
    expect(box(/^Cancel freely within/)).toHaveValue('99');
    expect((await getSettings()).refundHoursBeforeDispatch).toBe(1);
    // A good number then clears the message.
    await user.clear(box(/^Cancel freely within/));
    await user.type(box(/^Cancel freely within/), '12{Enter}');
    await waitFor(() => expect(screen.queryByText('Enter 0 to 72 hours.')).not.toBeInTheDocument());
    expect((await getSettings()).refundHoursBeforeDispatch).toBe(12);
  });

  it('asks for a whole number before it calls the server', async () => {
    const user = userEvent.setup();
    const recorder = recordRequests();
    await openSettings(POLICIES);
    await screen.findByRole('switch', { name: 'Turn off: Guest checkout' });
    await user.clear(box(/^Keep the IMEI for/));
    await user.type(box(/^Keep the IMEI for/), 'many{Enter}');
    expect(await screen.findByText('Enter a whole number.')).toBeInTheDocument();
    expect(recorder.to('PATCH', '/admin/storefront/settings')).toHaveLength(0);
  });
});

describe('the read', () => {
  it('says so, with a Retry, when the policies could not be loaded', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/settings', () => problem(500, 'INTERNAL', 'Server error', 'Settings are down.')),
    );
    await openSettings(POLICIES);
    expect(await screen.findByText('Could not load the policies')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('switch', { name: 'Turn off: Guest checkout' })).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader see the policies but not change them, and names the missing permission', async () => {
    await openSettings(POLICIES, { permissions: ['settings:read'] });
    const guest = await screen.findByRole('switch', { name: 'Turn off: Guest checkout' });
    expect(guest).toBeDisabled();
    expect(guest).toHaveAttribute('title', 'You need the settings:storefront permission');
    expect(box(/^Cancel freely within/)).toBeDisabled();
  });

  it('lets a role with settings:storefront change them', async () => {
    await openSettings(POLICIES, { permissions: ['settings:read', 'settings:storefront'] });
    expect(await screen.findByRole('switch', { name: 'Turn off: Guest checkout' })).toBeEnabled();
  });
});
