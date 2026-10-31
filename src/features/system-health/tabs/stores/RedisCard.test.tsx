// Tests for the Redis card, rendered with answers made by hand: status, the memory meter (tone from the server state),
// problems first, a Redis with no memory limit, "No data" for a missing reading, and the card's own states.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { CacheHealth } from '../../types';
import { RedisCard } from './RedisCard';
import { cacheHealth, measure, queryOf } from './storesFixture';

// Renders the card with an answer made by hand and returns its panel.
function card(cache: CacheHealth) {
  render(<RedisCard query={queryOf(cache)} />);
  return screen.getByRole('region', { name: 'Redis' });
}

/** The labels of the small facts, in the order they are drawn. */
const labels = (root: HTMLElement) => Array.from(root.querySelectorAll('dt')).map((dt) => dt.textContent);
/** The filled part of the memory bar: its width is the ratio and its class is the tone. */
const fill = (root: HTMLElement) => root.querySelector<HTMLElement>('.meter > i');

describe('a healthy Redis', () => {
  it('shows the status, memory used out of the limit and every figure with its unit', () => {
    const root = card(cacheHealth());
    expect(within(root).getByText('OK').closest('.badge')).toHaveClass('b-good');
    expect(within(root).getByText('412 MB of 2 GB used')).toBeInTheDocument();
    expect(within(root).getByText('20.1 %')).toBeInTheDocument();
    expect(labels(root)).toEqual(['Evictions', 'Hit rate', 'Clients', 'Latency']);
    const facts = root.querySelector('dl')?.textContent ?? '';
    expect(facts).toContain('0 /min');
    expect(facts).toContain('97.8 %');
    expect(facts).toContain('38');
    expect(facts).toContain('0.4 ms');
  });

  it('draws the bar to used over the limit in neutral grey', () => {
    const root = card(cacheHealth());
    expect(fill(root)?.style.width).toMatch(/^20\.1/);
    expect(fill(root)).toHaveClass('bg-neutral-dot');
  });
});

describe('the meter takes its tone from the server state, never from the numbers', () => {
  it('stays grey at 95 % full when the server says ok', () => {
    const cache = cacheHealth();
    const root = card({
      ...cache,
      memory: { ...cache.memory, usedBytes: Math.round(0.95 * 2 * 1024 * 1024 * 1024) },
    });
    expect(fill(root)?.style.width).toMatch(/^95/);
    expect(fill(root)).toHaveClass('bg-neutral-dot');
  });

  it('turns red on a server critical and adds a badge with icon and word', () => {
    const cache = cacheHealth();
    const root = card({
      ...cache,
      memory: { ...cache.memory, usage: measure(93, 'percent', 'crit', { warn: 75, crit: 90 }) },
    });
    expect(fill(root)).toHaveClass('bg-crit-dot');
    expect(within(root).getByText('Critical').closest('.badge')).toHaveClass('b-crit');
  });
});

describe('problems first', () => {
  const warned = () => cacheHealth({ clients: measure(480, 'count', 'warn', { warn: 400, crit: 900 }) });

  it('puts a figure the server marks warning in front, with a state badge beside the number and the limits under it', () => {
    const facts = card(warned()).querySelector('dl') as HTMLElement;
    expect(labels(facts)?.[0]).toBe('Clients');
    // The state is one badge (icon, word, tone) on the value line, as the usage meter shows it.
    expect(within(facts).getByText('Warn').closest('.badge')).toHaveClass('b-warn');
    expect(within(facts).getByText('480')).toBeInTheDocument();
    // The line under the value is only the limits the server applied: no second state word.
    expect(facts.querySelector('p')).toHaveTextContent(/^warn 400 · crit 900$/);
  });

  it('keeps each limit in one piece with the dot after it, so a narrow card never starts a line with a dot', () => {
    const facts = card(warned()).querySelector('dl') as HTMLElement;
    expect(within(facts).getByText('warn 400 ·')).toHaveClass('whitespace-nowrap');
    expect(within(facts).getByText('crit 900')).toHaveClass('whitespace-nowrap');
  });

  it('folds the OK figures into one quiet line while one is off, and Show brings them back in order', async () => {
    const user = userEvent.setup();
    const root = card(warned());
    expect(labels(root)).toEqual(['Clients']);
    expect(within(root).getByText(/^3 figures OK/)).toBeInTheDocument();
    const toggle = within(root).getByRole('button', { name: 'Show' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(labels(root)).toEqual(['Clients', 'Evictions', 'Hit rate', 'Latency']);
    expect(within(root).getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(within(root).getByRole('button', { name: 'Hide' }));
    expect(labels(root)).toEqual(['Clients']);
  });

  it('draws every figure, in the written order and with no quiet line, when all are fine', () => {
    const root = card(cacheHealth());
    expect(labels(root)).toEqual(['Evictions', 'Hit rate', 'Clients', 'Latency']);
    expect(within(root).queryByRole('button', { name: 'Show' })).not.toBeInTheDocument();
  });

  it('says "1 figure OK" for a single one', () => {
    const root = card(
      cacheHealth({
        clients: measure(480, 'count', 'warn', { warn: 400, crit: 900 }),
        evictionsPerMin: measure(30, 'per_min', 'crit', { warn: 10, crit: 100 }),
        hitRate: measure(null, 'percent', 'unknown', { warn: 90, crit: 70 }),
      }),
    );
    expect(within(root).getByText(/^1 figure OK/)).toBeInTheDocument();
    expect(labels(root)).toEqual(['Evictions', 'Clients', 'Hit rate']);
  });
});

describe('missing readings', () => {
  it('prints No data for a null figure, not zero, and no state word', () => {
    const root = card(cacheHealth({ latency: measure(null, 'ms', 'unknown', { warn: 5, crit: 25 }) }));
    expect(within(root).getByText('No data')).toBeInTheDocument();
    // A figure with no reading is still looked at first; it is not drawn as fine.
    expect(labels(root)?.[0]).toBe('Latency');
    expect(root.querySelector('dl')?.textContent).not.toContain('0 ms');
  });

  it('counts a null value as no data even when the server says ok: first in line, never among the OK figures', () => {
    const root = card(cacheHealth({ latency: measure(null, 'ms', 'ok', { warn: 5, crit: 25 }) }));
    expect(within(root).getByText('No data')).toBeInTheDocument();
    // The other three are fine and fold into the quiet line; the missing one is not counted as one of them.
    expect(labels(root)).toEqual(['Latency']);
    expect(within(root).getByText(/^3 figures OK/)).toBeInTheDocument();
    // Nothing to judge, so no state badge on it.
    expect(root.querySelector('dl .badge')).toBeNull();
  });

  it('prints No data, not "0 B of 2 GB used", when the server has no reading of the memory usage', () => {
    const cache = cacheHealth();
    const root = card({
      ...cache,
      memory: { usedBytes: 0, maxBytes: cache.memory.maxBytes, usage: measure(null, 'percent', 'unknown') },
    });
    expect(within(root).getByText('No data')).toBeInTheDocument();
    expect(root.textContent).not.toContain('used');
    expect(root.querySelector('.meter')).toBeNull();
  });

  it('says there is no memory limit and draws no bar when Redis has none', () => {
    const cache = cacheHealth();
    const root = card({
      ...cache,
      memory: {
        usedBytes: cache.memory.usedBytes,
        maxBytes: null,
        usage: measure(null, 'percent', 'unknown'),
      },
    });
    expect(within(root).getByText('412 MB used')).toBeInTheDocument();
    expect(within(root).getByText('No limit set')).toBeInTheDocument();
    expect(root.querySelector('.meter')).toBeNull();
  });
});

describe('a limit of zero', () => {
  it('counts as no limit, as Redis itself reads it, so there is no bar and no "0 B" limit', () => {
    const cache = cacheHealth();
    const root = card({ ...cache, memory: { ...cache.memory, maxBytes: 0 } });
    expect(within(root).getByText('412 MB used')).toBeInTheDocument();
    expect(root.querySelector('.meter')).toBeNull();
    expect(root.textContent).not.toContain('0 B');
  });
});

describe('other statuses', () => {
  it.each([
    ['degraded', 'Degraded', 'b-warn'],
    ['down', 'Down', 'b-crit'],
    ['unknown', 'Unknown', 'b-neutral'],
  ] as const)('shows %s as %s, and never green', (status, word, tone) => {
    const root = card(cacheHealth({ status }));
    expect(within(root).getByText(word).closest('.badge')).toHaveClass(tone);
    expect(root.querySelector('.b-good')).toBeNull();
  });
});

describe('the card states', () => {
  it('shows a skeleton while the first answer is on its way', () => {
    render(<RedisCard query={queryOf<CacheHealth>(undefined)} />);
    const root = screen.getByRole('region', { name: 'Redis' });
    expect(within(root).getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows what failed and gives no status badge when there is no answer', () => {
    const error = new ApiError({
      status: 500,
      code: 'INTERNAL_ERROR',
      title: 'Something went wrong',
      detail: 'Redis did not answer.',
      requestId: 'req_cache_1',
    });
    render(<RedisCard query={queryOf<CacheHealth>(undefined, { isError: true, error })} />);
    const root = screen.getByRole('region', { name: 'Redis' });
    expect(within(root).getByText('Could not load Redis')).toBeInTheDocument();
    expect(within(root).getByText('Redis did not answer.')).toBeInTheDocument();
    expect(within(root).getByText('req_cache_1')).toBeInTheDocument();
    expect(root.querySelector('.badge')).toBeNull();
  });
});
