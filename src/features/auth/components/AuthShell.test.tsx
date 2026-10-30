// Tests for AuthShell: the landmarks, the card and its heading, the tab title, the wordmark and footer, and that the
// page works without the artwork (the test DOM has no canvas, like a browser without one).
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { version } from '../../../../package.json';
import { AuthShell } from './AuthShell';

describe('AuthShell', () => {
  it('puts one h1 in a card inside the main landmark, with the intro, the content and the way back', () => {
    render(
      <AuthShell title="Sign in" intro="Staff accounts only." footer={<a href="/login">Back</a>}>
        <button type="button">Child</button>
      </AuthShell>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const card = within(screen.getByRole('main')).getByRole('region', { name: 'Sign in' });
    expect(within(card).getByText('Staff accounts only.')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Child' })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Back' })).toBeInTheDocument();
    expect(document.title).toBe('Sign in · GSM Supply');
  });

  it('shows the wordmark, and the product, version and development badge in the footer', () => {
    render(<AuthShell title="Sign in" />);
    expect(within(screen.getByRole('banner')).getByText('GSM Supply')).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent(`GSM Supply admin console · v${version}`);
    // Tests run as a development build.
    expect(within(footer).getByText(/^Development/)).toBeInTheDocument();
  });

  it('puts focus on the heading only when asked', () => {
    const { unmount } = render(<AuthShell title="Plain" />);
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus();
    unmount();
    render(<AuthShell title="Answer" focusTitle />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('draws no artwork where a 2D canvas is missing, and the card is still there', () => {
    render(<AuthShell title="Sign in" />);
    expect(document.querySelector('canvas')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
  });
});
