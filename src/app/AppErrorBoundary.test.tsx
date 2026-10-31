// Tests for the error boundary: the demo's "This page failed to render" state, Retry, a new path, and the shell around it.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockMe, renderShell, setupMockApi } from '@/test/renderApp';
import { AppErrorBoundary } from './AppErrorBoundary';

setupMockApi();

let broken = true;
function Fragile() {
  if (broken) throw new Error('chart data was empty');
  return <p>all fine</p>;
}

beforeEach(() => {
  broken = true;
  // React and the boundary both log the caught error; keep the test output readable.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe('AppErrorBoundary', () => {
  it('shows the error state with the message and the "client" request, instead of a blank screen', () => {
    render(
      <AppErrorBoundary>
        <Fragile />
      </AppErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(within(alert).getByText('This page failed to render')).toBeInTheDocument();
    expect(within(alert).getByText('chart data was empty')).toBeInTheDocument();
    expect(within(alert).getByText('client')).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it('renders the page again on Retry', async () => {
    const user = userEvent.setup();
    render(
      <AppErrorBoundary>
        <Fragile />
      </AppErrorBoundary>,
    );
    broken = false;
    await user.click(screen.getByRole('button', { name: /Retry/ }));
    expect(screen.getByText('all fine')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears itself when the reset key changes, so the next page gets a clean start', () => {
    const { rerender } = render(
      <AppErrorBoundary resetKey="/orders">
        <Fragile />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    broken = false;
    rerender(
      <AppErrorBoundary resetKey="/orders">
        <Fragile />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(
      <AppErrorBoundary resetKey="/support">
        <Fragile />
      </AppErrorBoundary>,
    );
    expect(screen.getByText('all fine')).toBeInTheDocument();
  });

  it('can fill the page when nothing else is on screen', () => {
    const { container } = render(
      <AppErrorBoundary fullPage>
        <Fragile />
      </AppErrorBoundary>,
    );
    expect(container.firstElementChild).toHaveClass('mx-auto');
    expect(screen.getByText('This page failed to render')).toBeInTheDocument();
  });

  it('keeps the shell usable when a page crashes, and recovers on the next page', async () => {
    mockMe({ permissions: ['*'] });
    const user = userEvent.setup();
    renderShell(
      '/orders',
      <>
        <Route path="/orders" element={<Fragile />} />
        <Route path="/support" element={<p>support page</p>} />
      </>,
    );
    expect(await screen.findByText('This page failed to render')).toBeInTheDocument();
    const nav = within(await screen.findByRole('navigation', { name: 'Primary' }));
    // The link's name grows with its count badge once the counts load ("Support 10 …"), so match the start only.
    await user.click(await nav.findByRole('link', { name: /^Support/ }));
    expect(await screen.findByText('support page')).toBeInTheDocument();
    expect(screen.queryByText('This page failed to render')).not.toBeInTheDocument();
  });
});
