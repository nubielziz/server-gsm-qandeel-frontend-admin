// Tests for Freshness: "Updated 8s ago" that ticks, the refresh interval, and "Stale" after two intervals.
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Freshness } from './Freshness';

const NOW = 1_700_000_000_000;

afterEach(() => vi.useRealTimers());

describe('Freshness', () => {
  it('says how long ago the data arrived', () => {
    render(<Freshness updatedAt={NOW - 8_000} interval={15_000} now={NOW} />);
    expect(screen.getByText('Updated 8s ago')).toBeInTheDocument();
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  it('says "just now" for a fresh answer', () => {
    render(<Freshness updatedAt={NOW - 500} interval={15_000} now={NOW} />);
    expect(screen.getByText('Updated just now')).toBeInTheDocument();
  });

  it('can add the refresh interval', () => {
    render(<Freshness updatedAt={NOW - 8_000} interval={15_000} now={NOW} showInterval />);
    expect(screen.getByText('· refreshes every 15s')).toBeInTheDocument();
  });

  it('does not mention an interval for a card that does not poll', () => {
    render(<Freshness updatedAt={NOW - 8_000} interval={0} now={NOW} showInterval />);
    expect(screen.queryByText(/refreshes every/)).not.toBeInTheDocument();
  });

  it('is stale only after more than two intervals', () => {
    const { rerender } = render(<Freshness updatedAt={NOW - 30_000} interval={15_000} now={NOW} />);
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
    rerender(<Freshness updatedAt={NOW - 31_000} interval={15_000} now={NOW} />);
    // A word with an icon, not a colour alone.
    expect(screen.getByText('Stale').closest('.badge')).toHaveClass('b-warn');
    expect(screen.getByText('Updated 31s ago')).toBeInTheDocument();
  });

  it('says so when nothing has arrived yet', () => {
    render(<Freshness updatedAt={0} interval={15_000} now={NOW} />);
    expect(screen.getByText('Not updated yet')).toBeInTheDocument();
    expect(screen.queryByText('Stale')).not.toBeInTheDocument();
  });

  it('ticks every second and turns stale on its own', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    vi.setSystemTime(NOW);
    render(<Freshness updatedAt={NOW - 8_000} interval={15_000} />);
    expect(screen.getByText('Updated 8s ago')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByText('Updated 11s ago')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(screen.getByText('Updated 31s ago')).toBeInTheDocument();
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });
});
