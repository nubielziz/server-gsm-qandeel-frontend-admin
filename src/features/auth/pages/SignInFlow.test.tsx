// Tests for the sign-in screens, run through the whole app against the dev mock API: password, authenticator code,
// first-time setup, the `?to=` destination, the reason banners and the server's errors.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { apiPost } from '@/lib/api';
import { DEMO_CODE, DEMO_PASSWORD, OWNER, renderApp, signInAs, setupMockApi } from '@/test/renderApp';

setupMockApi();

async function signInWithPassword(user: ReturnType<typeof userEvent.setup>, email = OWNER) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('sign-in flow', () => {
  it('goes from email and password to the authenticator code to the dashboard', async () => {
    const user = userEvent.setup();
    const app = renderApp('/login');
    await signInWithPassword(user);

    const code = await screen.findByLabelText('Authentication code');
    expect(app.location()).toBe('/login/2fa');
    await user.type(code, DEMO_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // The dashboard is a lazy chunk: its first load in a busy test run can take more than a second.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/dashboard');
    expect(await screen.findByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
  });

  it('keeps the page the user asked for through both steps', async () => {
    const user = userEvent.setup();
    const app = renderApp('/login?to=%2Forders%3Ftab%3Dreview');
    await signInWithPassword(user);

    await user.type(await screen.findByLabelText('Authentication code'), DEMO_CODE);
    expect(app.location()).toBe('/login/2fa?to=%2Forders%3Ftab%3Dreview');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Orders' })).toBeInTheDocument();
    expect(app.location()).toBe('/orders?tab=review');
  });

  it('ignores a destination that leaves the console', async () => {
    const user = userEvent.setup();
    const app = renderApp('/login?to=https%3A%2F%2Fevil.example%2Fsteal');
    await signInWithPassword(user);

    await user.type(await screen.findByLabelText('Authentication code'), DEMO_CODE);
    expect(app.location()).toBe('/login/2fa');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    // The dashboard is a lazy chunk: its first load in a busy test run can take more than a second.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/dashboard');
  });

  it('shows the server error for a wrong password and stays put, keeping the destination', async () => {
    const user = userEvent.setup();
    const app = renderApp('/login?to=%2Fsupport');
    await user.type(await screen.findByLabelText('Email'), OWNER);
    await user.type(screen.getByLabelText('Password'), 'not-the-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    // Generic words with a next step, whatever the server wrote; the request id stays for support.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email or password is incorrect');
    expect(alert).toHaveTextContent('Check both and try again, or ask an Owner to send you a reset link.');
    expect(alert).toHaveTextContent('mock-req-');
    // The email stays, only the password is cleared.
    expect(screen.getByLabelText('Email')).toHaveValue(OWNER);
    expect(screen.getByLabelText('Password')).toHaveValue('');
    // No "ApiError" toast, no sign-out redirect that would drop ?to=.
    expect(screen.queryByText('ApiError')).not.toBeInTheDocument();
    expect(app.location()).toBe('/login?to=%2Fsupport');
    expect(screen.getByLabelText('Password')).toHaveFocus();
  });

  it('asks for the missing fields before calling the server', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    // The live summary names both fields for screen readers.
    expect(screen.getByRole('alert')).toHaveTextContent('2 fields need attention: Email, Password.');
  });

  it('clears a field error as soon as the value is fixed, and shows new ones only on leaving the field', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email.')).toBeInTheDocument();

    // Typing a fix clears the message at once (no blur needed), so the button never moves under the pointer.
    await user.type(screen.getByLabelText('Email'), 'rami@gsm-supply.example');
    expect(screen.queryByText('Enter your email.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();

    // A new mistake is not flagged while typing, only when the field is left.
    await user.clear(screen.getByLabelText('Email'));
    await user.type(screen.getByLabelText('Email'), 'rami');
    expect(screen.queryByText('Enter an email address such as name@company.com.')).not.toBeInTheDocument();
    await user.tab();
    expect(await screen.findByText('Enter an email address such as name@company.com.')).toBeInTheDocument();
  });

  it('tells a rate-limited user how long to wait', async () => {
    mockServer.use(
      http.post('*/admin/auth/login', () => {
        const response = problem(429, 'RATE_LIMITED', 'Too many requests', 'Slow down.');
        response.headers.set('Retry-After', '30');
        return response;
      }),
    );
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Too many sign-in attempts');
    expect(alert).toHaveTextContent('Try again in 30 seconds.');
  });

  it("puts the server's field messages under the fields", async () => {
    mockServer.use(
      http.post('*/admin/auth/login', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'email', message: 'This is not an address we know.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user);
    expect(await screen.findByText('This is not an address we know.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a field error for a wrong authenticator code and lets the user retry', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user);
    const code = await screen.findByLabelText('Authentication code');
    await user.type(code, '000000');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText('The code is not correct or has expired.')).toBeInTheDocument();
    expect(code).toHaveAttribute('aria-invalid', 'true');
    expect(code).toHaveFocus();

    await user.clear(code);
    await user.type(code, DEMO_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify' }));
    // The dashboard is a lazy chunk: its first load in a busy test run can take more than a second.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('accepts a pasted code with spaces and checks its length', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user);
    const code = await screen.findByLabelText('Authentication code');
    expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    expect(code).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText('Enter all 6 digits of the code.')).toBeInTheDocument();

    await user.click(code);
    await user.paste('123 456');
    expect(code).toHaveValue('123456');
  });

  it('runs first-time setup: QR code, key and the first code', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user, 'nadia@gsm-supply.example');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Set up two-step verification' }),
    ).toBeInTheDocument();
    const qr = await screen.findByRole('img', { name: 'QR code to scan with your authenticator app' });
    expect(qr.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
    expect(screen.getByText('JBSW Y3DP EHPK 3PXP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy setup key' })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Authentication code'), DEMO_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));
    // The dashboard is a lazy chunk: its first load in a busy test run can take more than a second.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Dashboard' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
  });

  it('shows an error with Retry when the setup cannot be started', async () => {
    mockServer.use(
      http.post('*/admin/auth/2fa/setup', () => problem(500, 'INTERNAL', 'Server error', 'Try later.')),
    );
    const user = userEvent.setup();
    renderApp('/login');
    await signInWithPassword(user, 'nadia@gsm-supply.example');
    expect(await screen.findByText('Could not start the setup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});

describe('reasons on the sign-in screen', () => {
  it('shows the good-tone note for ?reason=password-set', async () => {
    renderApp('/login?reason=password-set');
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
  });

  it('shows nothing for an unknown reason', async () => {
    renderApp('/login?reason=because');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Password updated')).not.toBeInTheDocument();
  });

  it('sends a signed-out visitor of a page to sign-in and remembers the page', async () => {
    const app = renderApp('/orders?tab=review');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(app.location()).toBe('/login?to=%2Forders%3Ftab%3Dreview');
  });

  it('turns a suspended account into the suspended screen, with the page remembered', async () => {
    await signInAs();
    // The session is valid, but the server now says the account is suspended.
    mockServer.use(
      http.get('*/admin/auth/me', () =>
        problem(403, 'ACCOUNT_SUSPENDED', 'Account suspended', 'This account is suspended.'),
      ),
    );
    const app = renderApp('/finance');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This account is suspended' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(app.location()).toBe('/login?reason=suspended&to=%2Ffinance'));
  });

  it('sends a signed-in visitor of the sign-in screen to the page they asked for', async () => {
    await signInAs();
    const app = renderApp('/login?to=%2Frisk');
    expect(await screen.findByRole('heading', { level: 1, name: 'Risk & checks' })).toBeInTheDocument();
    expect(app.location()).toBe('/risk');
  });
});

describe('first-time authenticator setup', () => {
  it('opened directly (a reload) asks the server for one setup and shows its key', async () => {
    // Step 1 for a staff member who has no authenticator yet: the session is half signed in.
    await apiPost('/admin/auth/login', { email: 'nadia@gsm-supply.example', password: DEMO_PASSWORD });
    const setupCalls: string[] = [];
    const count = ({ request }: { request: Request }) => {
      if (request.method === 'POST' && new URL(request.url).pathname === '/admin/auth/2fa/setup') {
        setupCalls.push(request.url);
      }
    };
    mockServer.events.on('request:start', count);
    try {
      renderApp('/login/setup-2fa');
      expect(await screen.findByRole('button', { name: /copy.*setup key/i })).toBeInTheDocument();
      // The sign-in area clears old queries when it opens; the setup request already in flight must survive it.
      expect(setupCalls).toHaveLength(1);
    } finally {
      mockServer.events.removeListener('request:start', count);
    }
  });
});
