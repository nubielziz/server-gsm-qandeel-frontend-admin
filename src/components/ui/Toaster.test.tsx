// Tests for the toast store and <Toaster/>: newest last, at most three, auto-dismiss, actions.
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from './Toaster';
import { clearToasts, dismiss, toast } from './toast';

beforeEach(() => {
  vi.useFakeTimers();
  clearToasts();
});

afterEach(() => {
  clearToasts();
  vi.useRealTimers();
});

describe('Toaster', () => {
  it('shows a toast with its title and body', () => {
    render(<Toaster />);
    act(() => {
      toast({ kind: 'success', title: 'Order completed', body: 'GSM-1042 was delivered.' });
    });
    expect(screen.getByText('Order completed')).toBeInTheDocument();
    expect(screen.getByText('GSM-1042 was delivered.')).toBeInTheDocument();
  });

  it('keeps at most three toasts, dropping the oldest, with the newest last', () => {
    render(<Toaster />);
    act(() => {
      for (const title of ['One', 'Two', 'Three', 'Four']) toast({ title });
    });
    expect(screen.queryByText('One')).not.toBeInTheDocument();
    const shown = screen.getAllByText(/^(Two|Three|Four)$/).map((el) => el.textContent);
    expect(shown).toEqual(['Two', 'Three', 'Four']);
  });

  it('dismisses itself after its ttl', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Saved' });
    });
    act(() => {
      vi.advanceTimersByTime(5199);
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('honours a custom ttl and keeps a toast with ttl 0 until it is closed', () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Short', ttl: 1000 });
      toast({ title: 'Sticky', ttl: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('Short')).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Sticky')).toBeInTheDocument();
  });

  it('uses role alert for errors and status for the rest', () => {
    render(<Toaster />);
    act(() => {
      toast({ kind: 'error', title: 'Payment failed' });
      toast({ kind: 'info', title: 'Copied' });
    });
    expect(screen.getByText('Payment failed').closest('.toast')).toHaveAttribute('role', 'alert');
    expect(screen.getByText('Copied').closest('.toast')).toHaveAttribute('role', 'status');
  });

  it('closes with its dismiss button', async () => {
    // user-event awaits real timers internally, which fake timers would freeze.
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Heads up' });
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('runs the action and then dismisses the toast', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const undo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Order rejected', action: { label: 'Undo', run: undo } });
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Order rejected')).not.toBeInTheDocument();
  });

  it('replaces a toast that reuses an id instead of stacking a copy', () => {
    render(<Toaster />);
    act(() => {
      toast({ id: 'sync', kind: 'info', title: 'Syncing…', ttl: 0 });
      toast({ id: 'sync', kind: 'success', title: 'Synced' });
    });
    expect(screen.queryByText('Syncing…')).not.toBeInTheDocument();
    expect(screen.getAllByText('Synced')).toHaveLength(1);
  });

  it('can be dismissed from outside by id (for the app notification provider)', () => {
    render(<Toaster />);
    let id = '';
    act(() => {
      id = toast({ title: 'Working', ttl: 0 });
    });
    act(() => dismiss(id));
    expect(screen.queryByText('Working')).not.toBeInTheDocument();
  });
});
