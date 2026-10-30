// Tests for AuthLayout: the landmarks and heading, the tab title, and the facts on the sheet and on the phone line.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { version } from '../../../../package.json';
import { AuthLayout } from './AuthLayout';

afterEach(() => vi.unstubAllEnvs());

describe('AuthLayout', () => {
  it('has one h1 inside the main landmark, the tab title, the intro and the footer', () => {
    render(
      <AuthLayout title="Sign in" intro="Staff accounts only." footer="Ask an owner.">
        <button type="button">Child</button>
      </AuthLayout>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
    expect(within(main).getByText('Staff accounts only.')).toBeInTheDocument();
    expect(within(main).getByRole('button', { name: 'Child' })).toBeInTheDocument();
    expect(within(main).getByText('Ask an owner.')).toBeInTheDocument();
    expect(document.title).toBe('Sign in · GSM Supply');
    expect(screen.getByText('GSM Supply')).toBeInTheDocument();
    expect(screen.getByText('/ admin')).toBeInTheDocument();
  });

  it('puts focus on the heading only when asked', () => {
    const { unmount } = render(<AuthLayout title="Plain" />);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
    unmount();
    render(<AuthLayout title="Answer" focusTitle />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('shows the real facts as a list on the sheet and as one line under the form', () => {
    vi.stubEnv('MODE', 'development');
    vi.stubEnv('VITE_API_MOCKS', 'true');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.gsm-supply.example');
    render(<AuthLayout title="Sign in" />);

    const sheet = screen.getByRole('complementary', { name: 'Console status' });
    const terms = within(sheet)
      .getAllByRole('term')
      .map((term) => term.textContent);
    expect(terms).toEqual(['env', 'api', 'build', 'time']);
    expect(within(sheet).getByText('development · mock data')).toBeInTheDocument();
    expect(within(sheet).getByText('api.gsm-supply.example')).toBeInTheDocument();
    expect(within(sheet).getByText(`v${version}`)).toBeInTheDocument();
    expect(within(sheet).getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC[+-]\d/)).toBeInTheDocument();

    const line = screen.getByRole('contentinfo');
    expect(line).toHaveTextContent(`development · mock data · api.gsm-supply.example · v${version}`);
  });
});
