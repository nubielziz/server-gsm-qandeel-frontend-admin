// Tests for DeepLink: nothing is rendered unless the tool's address is set; a set address opens in a new tab.
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepLink } from './DeepLink';

afterEach(() => vi.unstubAllEnvs());

describe('DeepLink', () => {
  it('renders nothing while the address is unset, so there is never a dead link', () => {
    vi.stubEnv('VITE_GRAFANA_URL', '');
    const { container } = render(<DeepLink to="grafana" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an address that is not http or https', () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'javascript:alert(1)');
    const { container } = render(<DeepLink to="grafana" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens the configured address in a new tab, and says so', () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/d/api');
    render(<DeepLink to="grafana" />);
    const link = screen.getByRole('link', { name: 'Open in Grafana (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://grafana.example.com/d/api');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('link');
  });

  it('adds the path for Bull Board, per queue', () => {
    vi.stubEnv('VITE_BULL_BOARD_URL', 'https://api.example.com/admin/queues/');
    render(
      <DeepLink to="bullBoard" path="queue/order-dispatch" variant="button">
        Bull Board
      </DeepLink>,
    );
    const link = screen.getByRole('link', { name: 'Bull Board (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://api.example.com/admin/queues/queue/order-dispatch');
    expect(link).toHaveClass('btn', 'btn-ghost');
  });

  it('opens the servers own Sentry issue when Sentry is configured, and shows nothing when it is not', () => {
    vi.stubEnv('VITE_SENTRY_URL', 'https://sentry.example.com');
    const { rerender, container } = render(
      <DeepLink to="sentry" path="https://sentry.example.com/issues/42/" />,
    );
    expect(screen.getByRole('link', { name: /Open in Sentry/ })).toHaveAttribute(
      'href',
      'https://sentry.example.com/issues/42/',
    );
    vi.stubEnv('VITE_SENTRY_URL', '');
    rerender(<DeepLink to="sentry" path="https://sentry.example.com/issues/42/" />);
    expect(container).toBeEmptyDOMElement();
  });
});
