// Tests for the command palette's own logic: the fixed rows, their text filter, the debounced server search and the
// way the two meet in the palette component.
import { act, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaletteItem } from '@/components/ui';
import { mockMe, renderShell, setupMockApi } from '@/test/renderApp';
import { resources, toPageResource, type PageResource } from '../resources';
import { AppCommandPalette } from './AppCommandPalette';
import { buildPaletteItems } from './buildPaletteItems';
import { filterFixedItems } from './filterItems';
import { paletteSources, SEARCH_DEBOUNCE_MS, type PaletteSource } from './paletteSources';
import { useRemotePaletteItems } from './useRemotePaletteItems';

setupMockApi();
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const ALL_PAGES = resources.map(toPageResource).filter((page): page is PageResource => page !== undefined);
const pagesNamed = (...names: string[]) => ALL_PAGES.filter((page) => names.includes(page.name));

function items(pages: PageResource[], overrides: Partial<Parameters<typeof buildPaletteItems>[0]> = {}) {
  return buildPaletteItems({ pages, go: () => {}, isDark: false, toggleTheme: () => {}, ...overrides });
}

describe('buildPaletteItems', () => {
  it('offers a "Go to" row per permitted page, in the demo’s order, then the actions', () => {
    const rows = items(ALL_PAGES);
    expect(rows.filter((row) => row.group === 'Go to')).toHaveLength(14);
    expect(rows.slice(0, 3).map((row) => row.label)).toEqual(['Dashboard', 'Orders', 'Accounts']);
    expect(rows.filter((row) => row.group === 'Actions').map((row) => row.label)).toEqual([
      'Open the risk review queue',
      'Review refund requests',
      'Toggle dark mode',
      'Review orders that need attention',
      'Review pending deposits',
    ]);
  });

  it('offers each Money action only to a role that may use its view', () => {
    const actions = (permissions: string[]) =>
      items(pagesNamed('money'), { permissions })
        .filter((row) => row.group === 'Actions')
        .map((row) => row.label);
    // The Money page opens for ledger:read, but neither action's view does.
    expect(actions(['ledger:read'])).not.toContain('Review refund requests');
    expect(actions(['ledger:read'])).not.toContain('Review pending deposits');
    expect(actions(['refunds:read'])).toContain('Review refund requests');
    expect(actions(['refunds:read'])).not.toContain('Review pending deposits');
    expect(actions(['payments:read'])).toContain('Review pending deposits');
    expect(actions(['payments:read'])).not.toContain('Review refund requests');
  });

  it('offers Product / Services and Shop content, not the old page names', () => {
    const goTo = items(ALL_PAGES)
      .filter((row) => row.group === 'Go to')
      .map((row) => row.label);
    expect(goTo).toContain('Product / Services');
    expect(goTo).toContain('Shop content');
    expect(goTo).not.toContain('Services & pricing');
    expect(goTo).not.toContain('Catalog');
    expect(goTo).not.toContain('Storefront');
    // Product / Services opens its page.
    const go = vi.fn();
    items(pagesNamed('products'), { go })
      .find((row) => row.label === 'Product / Services')
      ?.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/products');
  });

  it('offers one Accounts row, which opens the Accounts page, and none for Merchants or Customers', () => {
    const goTo = items(ALL_PAGES)
      .filter((row) => row.group === 'Go to')
      .map((row) => row.label);
    expect(goTo.filter((label) => label === 'Accounts')).toHaveLength(1);
    expect(goTo).not.toContain('Merchants');
    expect(goTo).not.toContain('Customers');
    const go = vi.fn();
    items(pagesNamed('accounts'), { go })
      .find((row) => row.label === 'Accounts')
      ?.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/accounts');
  });

  it('offers one Money row in the place of Finance and Refunds & disputes, which opens the Money page', () => {
    const goTo = items(ALL_PAGES)
      .filter((row) => row.group === 'Go to')
      .map((row) => row.label);
    expect(goTo.filter((label) => label === 'Money')).toHaveLength(1);
    expect(goTo).not.toContain('Finance');
    expect(goTo).not.toContain('Refunds & disputes');
    const go = vi.fn();
    items(pagesNamed('money'), { go })
      .find((row) => row.label === 'Money')
      ?.run();
    expect(go).toHaveBeenCalledExactlyOnceWith('/money');
  });

  it('offers the two money actions with the Money page, and with no other page', () => {
    expect(items(pagesNamed('money')).map((row) => row.label)).toEqual([
      'Money',
      'Review refund requests',
      'Toggle dark mode',
      'Review pending deposits',
    ]);
  });

  it('leaves out the demo’s simulations', () => {
    expect(items(ALL_PAGES).some((row) => /simulate/i.test(row.label))).toBe(false);
  });

  it('drops pages the staff member may not open, and the actions that would open them', () => {
    const rows = items(pagesNamed('dashboard', 'orders'));
    expect(rows.map((row) => row.label)).toEqual([
      'Dashboard',
      'Orders',
      'Toggle dark mode',
      'Review orders that need attention',
    ]);
  });

  it('deep-links the actions into their pages', () => {
    const go = vi.fn();
    const rows = items(ALL_PAGES, { go });
    const run = (label: string) => rows.find((row) => row.label === label)!.run();
    run('Open the risk review queue');
    run('Review refund requests');
    run('Review orders that need attention');
    run('Review pending deposits');
    run('Money');
    expect(go.mock.calls.map(([path]) => path)).toEqual([
      '/risk?tab=queue',
      '/money?view=refunds&status=requested',
      '/orders?tab=review',
      '/money?view=deposits',
      '/money',
    ]);
  });

  it('toggles the theme and shows the icon of the theme it would switch to', () => {
    const toggleTheme = vi.fn();
    const toggle = (isDark: boolean) =>
      items([], { isDark, toggleTheme }).find((row) => row.id === 'action:toggle-theme')!;
    expect(toggle(false).icon).toBe('moon');
    expect(toggle(true).icon).toBe('sun');
    toggle(false).run();
    expect(toggleTheme).toHaveBeenCalledOnce();
  });

  it('gives every row its own id', () => {
    const ids = items(ALL_PAGES).map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('filterFixedItems', () => {
  const rows: PaletteItem[] = [
    { id: '1', label: 'Risk & checks', run: () => {} },
    { id: '2', label: 'Open the risk review queue', keywords: ['fraud'], run: () => {} },
    { id: '3', label: 'Orders', hint: 'Queue', run: () => {} },
  ];

  it('keeps everything for an empty query', () => {
    expect(filterFixedItems(rows, '  ')).toHaveLength(3);
  });

  it('needs every word, in any order and case, in the label, hint or keywords', () => {
    expect(filterFixedItems(rows, 'QUEUE risk').map((row) => row.id)).toEqual(['2']);
    expect(filterFixedItems(rows, 'queue').map((row) => row.id)).toEqual(['2', '3']);
    expect(filterFixedItems(rows, 'fraud').map((row) => row.id)).toEqual(['2']);
    expect(filterFixedItems(rows, 'zzz')).toEqual([]);
  });
});

describe('useRemotePaletteItems', () => {
  const found = (id: string, extra: Partial<PaletteItem> = {}): PaletteItem => ({
    id,
    label: id,
    run: () => {},
    ...extra,
  });

  function setup(query: string, sources: PaletteSource[]) {
    vi.useFakeTimers();
    return renderHook(({ q }) => useRemotePaletteItems(q, sources), { initialProps: { q: query } });
  }
  const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it('waits for a pause in typing, then asks every source once with the trimmed text and a signal', async () => {
    const search = vi.fn(async () => [found('o1')]);
    const { result, rerender } = setup('o', [{ id: 'orders', group: 'Orders', search }]);
    rerender({ q: 'or' });
    rerender({ q: ' ord ' });
    await wait(SEARCH_DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();
    await wait(1);
    expect(search).toHaveBeenCalledExactlyOnceWith('ord', expect.any(AbortSignal), expect.any(Function));
    expect(result.current.map((item) => item.id)).toEqual(['o1']);
  });

  it('does not search for fewer than two characters', async () => {
    const search = vi.fn(async () => [found('o1')]);
    const { result } = setup('a', [{ id: 'orders', group: 'Orders', search }]);
    await wait(1000);
    expect(search).not.toHaveBeenCalled();
    expect(result.current).toEqual([]);
  });

  it('gives results the source’s group unless they have their own', async () => {
    const source: PaletteSource = {
      id: 'accounts',
      group: 'Accounts',
      search: async () => [found('a1'), found('a2', { group: 'Elsewhere' })],
    };
    const { result } = setup('ac', [source]);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(result.current.map((item) => item.group)).toEqual(['Accounts', 'Elsewhere']);
  });

  it('keeps source order, and ignores a source that fails or throws at once', async () => {
    const sources: PaletteSource[] = [
      { id: 'a', group: 'A', search: async () => [found('a1')] },
      { id: 'broken', group: 'B', search: () => Promise.reject(new Error('offline')) },
      {
        id: 'throws',
        group: 'T',
        search: () => {
          throw new Error('bug');
        },
      },
      { id: 'c', group: 'C', search: async () => [found('c1')] },
    ];
    const { result } = setup('xy', sources);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(result.current.map((item) => item.id)).toEqual(['a1', 'c1']);
  });

  it('cancels the search of the earlier text and never shows its late answer', async () => {
    const signals: AbortSignal[] = [];
    const resolvers: ((items: PaletteItem[]) => void)[] = [];
    const source: PaletteSource = {
      id: 's',
      group: 'S',
      search: (_query, signal) => {
        signals.push(signal);
        return new Promise<PaletteItem[]>((resolve) => resolvers.push(resolve));
      },
    };
    const { result, rerender } = setup('ab', [source]);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(signals).toHaveLength(1);
    expect(signals[0].aborted).toBe(false);

    rerender({ q: 'abc' });
    expect(signals[0].aborted).toBe(true);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(signals).toHaveLength(2);

    await act(async () => resolvers[0]([found('stale')]));
    expect(result.current).toEqual([]);
    await act(async () => resolvers[1]([found('fresh')]));
    expect(result.current.map((item) => item.id)).toEqual(['fresh']);
  });

  it('keeps the last results while the next ones load, and drops them when the text gets too short', async () => {
    const source: PaletteSource = { id: 's', group: 'S', search: async (query) => [found(`hit-${query}`)] };
    const { result, rerender } = setup('ab', [source]);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(result.current.map((item) => item.id)).toEqual(['hit-ab']);

    rerender({ q: 'abc' });
    expect(result.current.map((item) => item.id)).toEqual(['hit-ab']);
    await wait(SEARCH_DEBOUNCE_MS);
    expect(result.current.map((item) => item.id)).toEqual(['hit-abc']);

    rerender({ q: 'a' });
    expect(result.current).toEqual([]);
    rerender({ q: 'ab' });
    expect(result.current).toEqual([]);
  });

  it('does nothing without sources', async () => {
    const { result } = setup('anything', []);
    await wait(1000);
    expect(result.current).toEqual([]);
  });
});

describe('paletteSources', () => {
  // The accounts feature's manifest lists `accountsPaletteSource`, and the two old features, with their Merchants and Customers
  // sources, are gone.
  it('search accounts through one source, which is the only one for merchants and customers', () => {
    const ids = paletteSources.map((source) => source.id);
    expect(ids.filter((id) => id === 'accounts')).toHaveLength(1);
    expect(ids).not.toContain('merchants');
    expect(ids).not.toContain('customers');
    const accounts = paletteSources.find((source) => source.id === 'accounts');
    expect(accounts).toMatchObject({ group: 'Accounts', permission: 'clients:read' });
  });
});

describe('AppCommandPalette', () => {
  const orderHit: PaletteItem = {
    id: 'order:7',
    label: 'ORD-48825  Apple Warranty',
    hint: 'Al-Noor Telecom',
    icon: 'orders',
    run: vi.fn(),
  };

  function PalettePage({ sources }: { sources: PaletteSource[] }) {
    const [open, setOpen] = useState(true);
    return (
      <>
        <button onClick={() => setOpen(true)}>reopen</button>
        <AppCommandPalette open={open} onClose={() => setOpen(false)} sources={sources} />
      </>
    );
  }

  function renderPalette(sources: PaletteSource[]) {
    mockMe({ permissions: ['*'] });
    return renderShell('/probe', <Route path="/probe" element={<PalettePage sources={sources} />} />);
  }

  it('shows server results under their group heading, after the fixed rows that match', async () => {
    const search = vi.fn(async () => [orderHit]);
    const user = userEvent.setup();
    renderPalette([{ id: 'orders', group: 'Orders', search }]);
    const input = await screen.findByRole('combobox');
    await user.type(input, 'ord');

    const hit = await screen.findByRole('option', { name: /ORD-48825/ });
    expect(hit).toHaveTextContent('Al-Noor Telecom');
    const list = screen.getByRole('listbox', { name: 'Results' });
    // "ord" matches the Orders page row first, then the server row (its label never had to contain "ord").
    const labels = within(list)
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(labels[0]).toBe('Orders');
    expect(labels.at(-1)).toContain('ORD-48825');
    expect(within(list).getByText('Orders', { selector: 'li[role=presentation]' })).toBeInTheDocument();
  });

  it('keeps a server result whose label does not contain the typed text', async () => {
    const imeiHit: PaletteItem = { id: 'order:9', label: 'ORD-48794  Samsung Combination', run: vi.fn() };
    const user = userEvent.setup();
    renderPalette([{ id: 'orders', group: 'Orders', search: async () => [imeiHit] }]);
    await user.type(await screen.findByRole('combobox'), '35 389011 028106');
    expect(await screen.findByRole('option', { name: /ORD-48794/ })).toBeInTheDocument();
  });

  it('runs a server result and closes', async () => {
    const run = vi.fn();
    const user = userEvent.setup();
    renderPalette([{ id: 'orders', group: 'Orders', search: async () => [{ ...orderHit, run }] }]);
    await user.type(await screen.findByRole('combobox'), 'zz9');
    await user.click(await screen.findByRole('option', { name: /ORD-48825/ }));
    expect(run).toHaveBeenCalledOnce();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('starts empty again every time it opens', async () => {
    const user = userEvent.setup();
    renderPalette([{ id: 'orders', group: 'Orders', search: async () => [orderHit] }]);
    await user.type(await screen.findByRole('combobox'), 'zz9');
    await screen.findByRole('option', { name: /ORD-48825/ });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'reopen' }));
    expect(await screen.findByRole('combobox')).toHaveValue('');
    expect(screen.queryByRole('option', { name: /ORD-48825/ })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(14));
  });

  it('shows at most 14 rows, like the demo', async () => {
    renderPalette([]);
    await screen.findByRole('combobox');
    // 14 pages and 5 actions are available; the list stops at 14.
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(14));
  });
});
