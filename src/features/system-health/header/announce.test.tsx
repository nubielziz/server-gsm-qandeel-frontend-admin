// Tests for the live-region announcements: nothing on the first load, a sentence when a state word changes, and the words
// taken from the verdict and the tiles.
import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Measure, SystemHealth } from '../types';
import { announcementItems, changesBetween, useAnnouncement, type AnnouncementItem } from './announce';
import type { KpiModel } from './useKpis';

const item = (key: string, word: string | null, label = key): AnnouncementItem => ({ key, label, word });

describe('changesBetween', () => {
  it('remembers the first words without a message', () => {
    const { messages, changed, next } = changesBetween(new Map(), [item('overall', 'Operational')]);
    expect(messages).toEqual([]);
    expect(changed).toBe(true);
    expect(next.get('overall')).toBe('Operational');
  });

  it('says what changed, with the label and the new word', () => {
    const before = new Map([
      ['overall', 'Operational'],
      ['p95', 'OK'],
    ]);
    const { messages, next } = changesBetween(before, [
      item('overall', 'Degraded', 'System status'),
      item('p95', 'OK', 'API p95'),
    ]);
    expect(messages).toEqual(['System status is now Degraded.']);
    expect(next.get('overall')).toBe('Degraded');
  });

  it('is quiet when nothing changed, and keeps the last word of an item with no word now', () => {
    const before = new Map([['overall', 'Degraded']]);
    const quiet = changesBetween(before, [item('overall', 'Degraded'), item('p95', null)]);
    expect(quiet).toMatchObject({ messages: [], changed: false });
    expect(quiet.next.get('overall')).toBe('Degraded');
  });
});

function measure(over: Partial<Measure>): Measure {
  return { value: 1, unit: 'count', state: 'ok', ...over };
}

function tile(over: Partial<KpiModel> & { measure?: Measure }): KpiModel {
  const { measure: m, ...rest } = over;
  return {
    id: 'alerts',
    label: 'Open alerts',
    interval: 15_000,
    query: {
      data: undefined,
      error: null,
      isPending: false,
      isError: false,
      isFetching: false,
      dataUpdatedAt: 0,
      refetch: () => undefined,
    },
    figure: m ? { measure: m, trend: [], trendLabel: '24h', zeroBased: true, threshold: false } : null,
    ...rest,
  };
}

describe('announcementItems', () => {
  const health = (status: SystemHealth['status'], monitoring: 'available' | 'unavailable') =>
    ({ status, monitoring: { status: monitoring } }) as SystemHealth;

  it('puts the verdict word first, then the state word of each tile', () => {
    const items = announcementItems({ data: health('degraded', 'available'), isError: false }, [
      tile({ measure: measure({ state: 'crit' }) }),
    ]);
    expect(items).toEqual([
      { key: 'overall', label: 'System status', word: 'Degraded' },
      { key: 'alerts', label: 'Open alerts', word: 'Critical' },
    ]);
  });

  it('says Monitoring unavailable for an unknown status while monitoring is down', () => {
    const [overall] = announcementItems({ data: health('unknown', 'unavailable'), isError: false }, []);
    expect(overall.word).toBe('Monitoring unavailable');
  });

  it('says Status unavailable when the health call failed, and nothing while it is loading', () => {
    expect(announcementItems({ data: undefined, isError: true }, [])[0].word).toBe('Status unavailable');
    expect(announcementItems({ data: undefined, isError: false }, [])[0].word).toBeNull();
  });

  it('says No data for a tile without a value and Unavailable for a tile whose read failed', () => {
    const failed = tile({ id: 'oldest', label: 'Oldest queued job' });
    failed.query = { ...failed.query, isError: true, error: new Error('boom') };
    const items = announcementItems({ data: undefined, isError: false }, [
      tile({ measure: measure({ value: null, state: 'unknown' }) }),
      failed,
    ]);
    expect(items.map((entry) => entry.word)).toEqual([null, 'No data', 'Unavailable']);
  });
});

describe('useAnnouncement', () => {
  it('stays empty on the first load and announces the next change', () => {
    const { result, rerender } = renderHook(({ items }) => useAnnouncement(items), {
      initialProps: { items: [item('overall', 'Operational', 'System status')] },
    });
    expect(result.current).toBe('');
    rerender({ items: [item('overall', 'Operational', 'System status')] });
    expect(result.current).toBe('');
    rerender({ items: [item('overall', 'Outage', 'System status')] });
    expect(result.current).toBe('System status is now Outage.');
  });

  it('keeps the last announcement until the next change', () => {
    const { result, rerender } = renderHook(({ items }) => useAnnouncement(items), {
      initialProps: { items: [item('p95', 'OK', 'API p95')] },
    });
    rerender({ items: [item('p95', 'Warn', 'API p95')] });
    expect(result.current).toBe('API p95 is now Warn.');
    rerender({ items: [item('p95', 'Warn', 'API p95')] });
    expect(result.current).toBe('API p95 is now Warn.');
  });
});

describe('a polite live region fed by useAnnouncement', () => {
  it('shows the sentence in a region that announces politely', () => {
    function Region({ word }: { word: string }) {
      const message = useAnnouncement([item('overall', word, 'System status')]);
      return (
        <div role="status" aria-live="polite">
          {message}
        </div>
      );
    }
    const { rerender } = render(<Region word="Operational" />);
    act(() => rerender(<Region word="Degraded" />));
    expect(screen.getByRole('status')).toHaveTextContent('System status is now Degraded.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
