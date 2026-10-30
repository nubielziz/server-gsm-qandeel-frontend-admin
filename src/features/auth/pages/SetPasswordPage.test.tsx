// Tests for the set-password screen against the dev mock API: a good invite link, a dead link, a refused password,
// the form's own checks, and the temporary-password case that has no token.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { staffStore } from '@/mocks/staff';
import { DEMO_PASSWORD, OWNER, renderApp, setupMockApi } from '@/test/renderApp';

setupMockApi();

const STRONG = 'long-enough-pass';

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, password: string, confirm = password) {
  await user.type(await screen.findByLabelText('New password'), password);
  await user.type(screen.getByLabelText('Confirm password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Set password' }));
}

describe('set-password screen', () => {
  it('sets the password from an invite link and goes to sign-in with a confirmation', async () => {
    const user = userEvent.setup();
    const app = renderApp('/set-password?token=demo-token');
    expect(await screen.findByText('Choose the password you will use to sign in.')).toBeInTheDocument();
    expect(screen.getByText('At least 10 characters.')).toBeInTheDocument();
    await fillAndSubmit(user, STRONG);

    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(app.location()).toBe('/login?reason=password-set');
  });

  it('lets each password field be shown on its own, and keeps new-password autocomplete', async () => {
    const user = userEvent.setup();
    renderApp('/set-password?token=demo-token');
    const password = await screen.findByLabelText('New password');
    const confirm = screen.getByLabelText('Confirm password');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(confirm).toHaveAttribute('autocomplete', 'new-password');

    await user.click(screen.getByRole('button', { name: 'Show new password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveAttribute('autocomplete', 'new-password');
    expect(confirm).toHaveAttribute('type', 'password');
    // Showing the password is not a submit: no error appears.
    expect(screen.queryByText('Enter a new password.')).not.toBeInTheDocument();
  });

  it('shows a dead link as a status card that takes the form away', async () => {
    const user = userEvent.setup();
    renderApp('/set-password?token=expired');
    await fillAndSubmit(user, STRONG);

    const heading = await screen.findByRole('heading', { level: 1, name: 'Link no longer valid' });
    expect(heading).toHaveFocus();
    expect(
      screen.getByText('This link has expired or was already used. Ask an owner for a new one.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login');
  });

  it("shows the server's weak-password message under the password field", async () => {
    mockServer.use(
      http.post('*/admin/auth/password/set', () =>
        problem(422, 'WEAK_PASSWORD', 'Password too weak', 'This password is on a list of common passwords.'),
      ),
    );
    const user = userEvent.setup();
    renderApp('/set-password?token=demo-token');
    await fillAndSubmit(user, STRONG);

    const field = await screen.findByLabelText('New password');
    expect(await screen.findByText('This password is on a list of common passwords.')).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveFocus();
    // Nothing else changed: no banner (the live summary only names the field), the form is still there.
    expect(screen.getByRole('alert')).toHaveTextContent('New password needs attention.');
    expect(screen.queryByText('Password too weak')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set password' })).toBeInTheDocument();
  });

  it('checks length and matching before it calls the server', async () => {
    const user = userEvent.setup();
    renderApp('/set-password?token=demo-token');
    await fillAndSubmit(user, 'short', 'short');
    expect(await screen.findByText('Use at least 10 characters.')).toBeInTheDocument();
    // The hint steps aside while the same rule is shown as an error.
    expect(screen.queryByText('At least 10 characters.')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('New password'));
    await user.clear(screen.getByLabelText('Confirm password'));
    await user.type(screen.getByLabelText('New password'), STRONG);
    await user.type(screen.getByLabelText('Confirm password'), `${STRONG}-different`);
    await user.click(screen.getByRole('button', { name: 'Set password' }));
    expect(await screen.findByText('The two passwords do not match.')).toBeInTheDocument();
  });

  it('shows another failure in a banner above the form', async () => {
    mockServer.use(
      http.post('*/admin/auth/password/set', () =>
        problem(500, 'INTERNAL', 'Server error', 'Try again later.'),
      ),
    );
    const user = userEvent.setup();
    renderApp('/set-password?token=demo-token');
    await fillAndSubmit(user, STRONG);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Server error');
    expect(alert).toHaveTextContent('Try again later.');
    expect(screen.getByLabelText('New password')).toBeInTheDocument();
  });

  it('replaces a temporary password right after sign-in, without a token', async () => {
    const owner = (await staffStore()).list().find((staff) => staff.email === OWNER);
    (await staffStore()).patch(owner!.id, { mustChangePassword: true });

    const user = userEvent.setup();
    const app = renderApp('/login?to=%2Fsupport');
    await user.type(await screen.findByLabelText('Email'), OWNER);
    await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('Your password is temporary. Choose a new one to continue.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/set-password?to=%2Fsupport');
    await fillAndSubmit(user, STRONG);

    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(app.location()).toBe('/login?reason=password-set&to=%2Fsupport');
  });

  it('explains that nobody is signed in when a tokenless page is opened directly', async () => {
    const user = userEvent.setup();
    renderApp('/set-password');
    await fillAndSubmit(user, STRONG);
    expect(await screen.findByRole('alert')).toHaveTextContent('Not signed in');
  });
});
