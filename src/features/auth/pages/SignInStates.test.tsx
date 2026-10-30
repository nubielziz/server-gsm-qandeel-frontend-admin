// Tests for the states of the sign-in screen that are not the happy path: the blocked-access screens (from the address
// and from the server's answer), the "continue to" note, and the Show/Hide password button. Run through the whole app
// against the dev mock API.
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { DEMO_PASSWORD, OWNER, renderApp, setupMockApi } from '@/test/renderApp';

setupMockApi();

const SUSPENDED = {
  title: 'This account is suspended',
  body: 'An owner can reactivate it from Admins and access.',
};
const BLOCKED_IP = {
  title: 'Sign-in is not allowed from this network',
  body: 'Your IP address is not on the allowed list for this console.',
  nextStep: 'Ask an owner to add it, or sign in from an approved network.',
};

async function signInWithPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Email'), OWNER);
  await user.type(screen.getByLabelText('Password'), DEMO_PASSWORD);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('blocked-access screens from the address', () => {
  it('shows the suspended screen for ?reason=suspended, with no form', async () => {
    renderApp('/login?reason=suspended');
    expect(await screen.findByRole('heading', { level: 1, name: SUSPENDED.title })).toBeInTheDocument();
    expect(screen.getByText(SUSPENDED.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use another account' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(document.title).toBe(`${SUSPENDED.title} · GSM Supply`);
  });

  it('shows the not-allowed screen for ?reason=ip, with the next step', async () => {
    renderApp('/login?reason=ip');
    expect(await screen.findByRole('heading', { level: 1, name: BLOCKED_IP.title })).toBeInTheDocument();
    expect(screen.getByText(BLOCKED_IP.body)).toBeInTheDocument();
    expect(screen.getByText(BLOCKED_IP.nextStep)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use another account' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('keeps the page the user asked for in the way back, and goes back to the form', async () => {
    const user = userEvent.setup();
    const app = renderApp('/login?reason=suspended&to=%2Ffinance');
    const link = await screen.findByRole('link', { name: 'Use another account' });
    expect(link).toHaveAttribute('href', '/login?to=%2Ffinance');
    await user.click(link);
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(app.location()).toBe('/login?to=%2Ffinance');
  });
});

describe('blocked-access screens from the sign-in call', () => {
  it.each([
    ['ACCOUNT_SUSPENDED', SUSPENDED.title, SUSPENDED.body],
    ['IP_NOT_ALLOWED', BLOCKED_IP.title, BLOCKED_IP.body],
  ])('turns a %s answer into its own screen', async (code, title, body) => {
    mockServer.use(
      http.post('*/admin/auth/login', () => problem(403, code, 'Sign-in refused', 'The server says no.')),
    );
    const user = userEvent.setup();
    const app = renderApp('/login?to=%2Fsupport');
    await signInWithPassword(user);

    const heading = await screen.findByRole('heading', { level: 1, name: title });
    expect(screen.getByText(body)).toBeInTheDocument();
    // The form is gone, so focus goes to the answer; no red banner repeats it.
    expect(heading).toHaveFocus();
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The request ID stays available for support.
    expect(screen.getByText(/mock-req-/)).toBeInTheDocument();
    expect(app.location()).toBe('/login?to=%2Fsupport');
  });

  it('"Use another account" brings back an empty form with focus on the email', async () => {
    mockServer.use(
      http.post('*/admin/auth/login', () => problem(403, 'ACCOUNT_SUSPENDED', 'Account suspended')),
    );
    const user = userEvent.setup();
    const app = renderApp('/login?to=%2Fsupport');
    await signInWithPassword(user);
    await user.click(await screen.findByRole('link', { name: 'Use another account' }));

    const email = await screen.findByLabelText('Email');
    expect(email).toHaveValue('');
    expect(email).toHaveFocus();
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.queryByText(SUSPENDED.title)).not.toBeInTheDocument();
    expect(app.location()).toBe('/login?to=%2Fsupport');
  });

  it('keeps showing a wrong password as a banner, not as a blocked screen', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    await user.type(await screen.findByLabelText('Email'), OWNER);
    await user.type(screen.getByLabelText('Password'), 'not-the-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The email or password is not correct.');
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});

describe('the "continue to" note', () => {
  it('names the page sign-in will continue to', async () => {
    renderApp('/login?to=%2Forders%3Ftab%3Dreview');
    const note = await screen.findByText(/Sign in to continue to/);
    expect(note).toHaveTextContent('Sign in to continue to /orders?tab=review');
    expect(screen.getByText('/orders?tab=review')).toHaveClass('mono');
  });

  it('is not shown without a destination, or for a destination that leaves the console', async () => {
    const { unmount } = renderApp('/login');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.queryByText(/Sign in to continue to/)).not.toBeInTheDocument();
    unmount();

    renderApp('/login?to=https%3A%2F%2Fevil.example%2Fsteal');
    await screen.findByRole('heading', { level: 1, name: 'Sign in' });
    expect(screen.queryByText(/Sign in to continue to/)).not.toBeInTheDocument();
    expect(screen.getByRole('main')).not.toHaveTextContent('evil.example');
  });

  it('steps aside for the password-updated note', async () => {
    renderApp('/login?reason=password-set&to=%2Ffinance');
    expect(await screen.findByText('Password updated')).toBeInTheDocument();
    expect(screen.queryByText(/Sign in to continue to/)).not.toBeInTheDocument();
  });

  it('is shown for an unknown reason, which counts as no reason', async () => {
    renderApp('/login?reason=because&to=%2Frisk');
    expect(await screen.findByText(/Sign in to continue to/)).toHaveTextContent('/risk');
  });
});

describe('Show and Hide password on the sign-in form', () => {
  it('reveals and hides the password without losing it or submitting the form', async () => {
    const user = userEvent.setup();
    renderApp('/login');
    const password = await screen.findByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    await user.type(password, 'a-long-secret');

    const show = screen.getByRole('button', { name: 'Show Password' });
    expect(show).toHaveAttribute('aria-pressed', 'false');
    expect(show).toHaveAttribute('aria-controls', password.id);
    await user.click(show);

    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('a-long-secret');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    const hide = screen.getByRole('button', { name: 'Hide Password' });
    expect(hide).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Enter your email.')).not.toBeInTheDocument();

    await user.click(hide);
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveValue('a-long-secret');
  });
});
