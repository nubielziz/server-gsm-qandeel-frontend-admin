// More page tests of the API tab: the latency percentile switch and the chart thresholds, a staff member who can only read,
// the Grafana and Sentry links, the phone layout, and data that is missing (never drawn as healthy).
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupHealthMocks } from '../../mocks/testing';
import { mockServer } from '@/mocks/node';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';
import { API_TAB, card, rowsOf, surfacesCard } from './apiTabKit';

setupHealthMocks();
vi.setConfig({ testTimeout: 30_000 });

describe('the latency percentile', () => {
  // jsdom has no layout: give the chart box a width so the SVG (and its threshold label) is drawn.
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 480 });
  });
  afterAll(() => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
    else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  });

  it('starts at p95 and the switch changes the series, the server threshold line and the table view', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: API_TAB });
    const latency = await card('Latency');
    const chart = await within(latency).findByRole(
      'img',
      { name: 'p95 latency, All surfaces, last 24 hours' },
      SLOW,
    );
    expect(within(latency).getByRole('button', { name: 'p95' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(latency).getByText('Milliseconds')).toBeInTheDocument();
    // The threshold is the server's for this percentile (1,500 ms is 1.5 s). The healthy line stays far below it, so
    // it is named above the chart instead of stretching the axis.
    expect(chart).toBeInTheDocument();
    expect(within(latency).getByText('crit 1.5 s, above the chart')).toBeInTheDocument();

    await user.click(within(latency).getByRole('button', { name: 'p99' }));
    expect(within(latency).getByRole('button', { name: 'p99' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(latency).getByRole('img', { name: 'p99 latency, All surfaces, last 24 hours' }),
    ).toBeInTheDocument();
    expect(within(latency).getByText('crit 4 s, above the chart')).toBeInTheDocument();

    await user.click(within(latency).getByRole('button', { name: 'p50' }));
    expect(
      within(latency).getByRole('img', { name: 'p50 latency, All surfaces, last 24 hours' }),
    ).toBeInTheDocument();
    expect(within(latency).getByText('crit 800 ms, above the chart')).toBeInTheDocument();

    await user.click(within(latency).getByRole('button', { name: 'Table view' }));
    expect(within(latency).getByRole('columnheader', { name: 'p50 latency' })).toBeInTheDocument();
    expect(within(latency).getAllByText(/^[\d,.]+ ms$/).length).toBeGreaterThan(10);
  });

  it('names the 5xx threshold in percent on the 5xx chart', async () => {
    await openHealthPage({ route: API_TAB });
    const rate = await card('5xx rate');
    const chart = await within(rate).findByRole(
      'img',
      { name: '5xx rate, All surfaces, last 24 hours' },
      SLOW,
    );
    expect(chart).toBeInTheDocument();
    expect(within(rate).getByText('Percent')).toBeInTheDocument();
    expect(within(rate).getByText('crit 2 %, above the chart')).toBeInTheDocument();
  });
});

describe('a staff member who can only read', () => {
  it('sees all the data and the read-only note, and no button that changes anything', async () => {
    await openHealthPage({ scenario: 'readonly', permissions: ['system:read'], route: API_TAB });
    const surfaces = await surfacesCard();
    expect(screen.getByRole('note')).toHaveTextContent('read-only access');
    expect(rowsOf(surfaces).length).toBeGreaterThan(0);
    const errors = await card('Top errors');
    await within(errors).findAllByText('SUPPLIER_TIMEOUT', undefined, SLOW);

    const panel = screen.getByRole('tabpanel', { name: 'API' });
    const names = within(panel)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label') ?? button.textContent ?? '');
    expect(names.length).toBeGreaterThan(0);
    for (const name of names)
      expect(name).not.toMatch(/^(Pause|Resume|Acknowledge|Run|Retry all|Turn|Maintenance)/);
  });
});

describe('links to Grafana and Sentry', () => {
  it('leaves Grafana to the page header and shows one Sentry link per error that has an issue, when both are configured', async () => {
    vi.stubEnv('VITE_GRAFANA_URL', 'https://grafana.example.com/d/api');
    vi.stubEnv('VITE_SENTRY_URL', 'https://sentry.example.com');
    await openHealthPage({ scenario: 'degraded', route: API_TAB });
    const surfaces = await surfacesCard();
    expect(within(surfaces).queryByRole('link', { name: /^Open in Grafana/ })).not.toBeInTheDocument();

    const errors = await card('Top errors');
    const links = await within(errors).findAllByRole(
      'link',
      { name: /^Sentry issue of SUPPLIER_TIMEOUT/ },
      SLOW,
    );
    expect(links.map((link) => link.getAttribute('href'))).toContain(
      'https://sentry.example.com/organizations/gsm-supply/issues/4822/',
    );
    for (const link of links) expect(link).toHaveAttribute('target', '_blank');
    // INSUFFICIENT_FUNDS has no Sentry issue: its row has no link, not a link to the Sentry home page.
    const plain = rowsOf(errors).find((row) => row.textContent?.includes('INSUFFICIENT_FUNDS'));
    expect(plain).toBeDefined();
    expect(within(plain as HTMLElement).queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('on a phone', () => {
  const original = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = original;
  });

  it('folds six healthy surfaces into one quiet line, so the charts are not pushed down, and shows them as cards on request', async () => {
    const user = userEvent.setup();
    await openHealthPage({ route: API_TAB });
    const surfaces = await card('Surfaces');
    expect(await within(surfaces).findByText(/6 surfaces OK/, undefined, SLOW)).toBeInTheDocument();
    // Only the line: neither a table nor a card is drawn.
    expect(within(surfaces).queryByRole('list', { name: 'API surfaces' })).not.toBeInTheDocument();
    expect(within(surfaces).queryByRole('table')).not.toBeInTheDocument();
    expect(within(surfaces).queryByRole('button', { name: 'Merchant API v1' })).not.toBeInTheDocument();

    await user.click(within(surfaces).getByRole('button', { name: 'Show the healthy surfaces' }));
    const list = within(surfaces).getByRole('list', { name: 'API surfaces' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
    const first = within(list).getAllByRole('listitem')[0]!;
    for (const label of ['Status', 'Requests', 'p95', '5xx rate', 'p95 trend']) {
      expect(within(first).getByText(label)).toBeInTheDocument();
    }
    expect(within(surfaces).queryByRole('table')).not.toBeInTheDocument();

    await user.click(within(surfaces).getByRole('button', { name: 'Hide the healthy surfaces' }));
    expect(within(surfaces).queryByRole('list', { name: 'API surfaces' })).not.toBeInTheDocument();
    expect(surfaces).toHaveTextContent('6 surfaces OK');
  });

  it('shows the surfaces with a problem as cards first and folds the OK ones into the same line', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'degraded', route: API_TAB });
    const surfaces = await card('Surfaces');
    const list = await within(surfaces).findByRole('list', { name: 'API surfaces' }, SLOW);
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('Merchant API v1');
    expect(cards[1]).toHaveTextContent('Dhru Fusion API');
    expect(surfaces).toHaveTextContent('4 surfaces OK');

    await user.click(within(surfaces).getByRole('button', { name: 'Show the healthy surfaces' }));
    expect(within(list).getAllByRole('listitem')).toHaveLength(6);
  });

  it('keeps the picked surface as a card and folds the five others', async () => {
    await openHealthPage({ route: `${API_TAB}&surface=store` });
    const surfaces = await card('Surfaces');
    const list = await within(surfaces).findByRole('list', { name: 'API surfaces' }, SLOW);
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveTextContent('Storefront');
    expect(surfaces).toHaveTextContent('5 surfaces OK');
  });

  it('shows the slowest endpoints and the top errors as cards', async () => {
    await openHealthPage({ route: API_TAB });
    const slowest = await card('Slowest endpoints');
    const slowList = await within(slowest).findByRole('list', { name: 'Slowest endpoints' }, SLOW);
    expect(within(slowList).getAllByRole('listitem')).toHaveLength(10);
    const errors = await card('Top errors');
    expect(
      await within(errors).findByRole('list', { name: 'Most frequent errors' }, SLOW),
    ).toBeInTheDocument();
  });
});

describe('data that is missing', () => {
  // A surface the monitoring system knows by name but has no figures for: every value is null and every state unknown.
  const gap = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      at: new Date(Date.UTC(2026, 2, 5, 0, i * 15)).toISOString(),
      value: null,
    }));
  const unknown = (unit: string) => ({ value: null, unit, state: 'unknown' });
  const blank = (key: string, label: string) => ({
    surface: key,
    label,
    requestsPerMin: unknown('per_min'),
    p50: unknown('ms'),
    p95: unknown('ms'),
    p99: unknown('ms'),
    rate4xx: unknown('percent'),
    rate5xx: unknown('percent'),
    count429: unknown('count'),
    series: {
      requestsPerMin: gap(8),
      p50: gap(8),
      p95: gap(8),
      p99: gap(8),
      rate4xx: gap(8),
      rate5xx: gap(8),
    },
  });

  it('says No data, never OK, for a surface without figures, an empty chart and an empty list', async () => {
    const answer = {
      range: '24h',
      bucketSeconds: 900,
      total: blank('total', 'All surfaces'),
      surfaces: [blank('v1', 'Merchant API v1')],
      slowest: [],
    };
    mockServer.use(http.get('*/admin/system/metrics', () => HttpResponse.json(answer)));
    await openHealthPage({ route: API_TAB });

    const surfaces = await surfacesCard();
    const [row] = rowsOf(surfaces);
    // The badge, the seven figures and the trend all say it; nothing is drawn as healthy.
    expect(within(row!).getAllByText('No data')).toHaveLength(9);
    expect(within(surfaces).queryByText('OK')).not.toBeInTheDocument();
    expect(
      within(surfaces).queryByRole('button', { name: 'Show the healthy surfaces' }),
    ).not.toBeInTheDocument();

    const latency = await card('Latency');
    expect(await within(latency).findByRole('heading', { name: 'No data' }, SLOW)).toBeInTheDocument();
    const rate = await card('5xx rate');
    expect(await within(rate).findByRole('heading', { name: 'No data' }, SLOW)).toBeInTheDocument();
    const slowest = await card('Slowest endpoints');
    expect(await within(slowest).findByRole('heading', { name: 'No data' }, SLOW)).toBeInTheDocument();
    expect(within(slowest).queryByRole('table')).not.toBeInTheDocument();
  });

  it('counts a figure with a null value as no data even when the server called its state ok: no OK badge, no quiet line for it', async () => {
    const user = userEvent.setup();
    const fine = (unit: string) => ({ value: 10, unit, state: 'ok' });
    // The server says "ok" but sends no value: the figure reads "No data", so the surface cannot be OK.
    const nullOk = (unit: string) => ({ value: null, unit, state: 'ok' });
    const calm = (key: string, label: string) => ({
      ...blank(key, label),
      requestsPerMin: fine('per_min'),
      p50: fine('ms'),
      p95: fine('ms'),
      p99: fine('ms'),
      rate4xx: fine('percent'),
      rate5xx: fine('percent'),
      count429: fine('count'),
    });
    const answer = {
      range: '24h',
      bucketSeconds: 900,
      total: blank('total', 'All surfaces'),
      surfaces: [calm('v1', 'Merchant API v1'), { ...calm('hooks', 'Incoming webhooks'), p95: nullOk('ms') }],
      slowest: [],
    };
    mockServer.use(http.get('*/admin/system/metrics', () => HttpResponse.json(answer)));
    await openHealthPage({ route: API_TAB });

    const surfaces = await card('Surfaces');
    const hooks = await within(surfaces).findByRole('button', { name: 'Incoming webhooks' }, SLOW);
    const row = hooks.closest('tr') as HTMLElement;
    expect(within(row).getAllByText('No data').length).toBeGreaterThanOrEqual(2);
    expect(within(row).queryByText('OK')).not.toBeInTheDocument();
    // Only the surface that really is fine folds away; the one with a null figure stays in view as a problem.
    expect(rowsOf(surfaces)).toHaveLength(1);
    expect(surfaces).toHaveTextContent('1 surface OK');
    await user.click(within(surfaces).getByRole('button', { name: 'Show the healthy surfaces' }));
    expect(rowsOf(surfaces)).toHaveLength(2);
    expect(rowsOf(surfaces)[0]).toHaveTextContent('Incoming webhooks');
    expect(rowsOf(surfaces)[1]).toHaveTextContent('Merchant API v1');
  });

  it('draws a surface the server sent without any figures as a row of No data, and keeps the rest', async () => {
    const answer = {
      range: '24h',
      bucketSeconds: 900,
      total: blank('total', 'All surfaces'),
      surfaces: [{ surface: 'raw' }, blank('v1', 'Merchant API v1')],
      slowest: [],
    };
    mockServer.use(http.get('*/admin/system/metrics', () => HttpResponse.json(answer)));
    await openHealthPage({ route: API_TAB });

    const surfaces = await card('Surfaces');
    // The key stands in for the missing name.
    const raw = await within(surfaces).findByRole('button', { name: 'raw' }, SLOW);
    expect(raw.closest('tr')).toHaveTextContent('No data');
    expect(rowsOf(surfaces)).toHaveLength(2);
    expect(within(surfaces).queryByText('OK')).not.toBeInTheDocument();
    // The tab around it is still there.
    expect(screen.queryByText(/cannot be shown/)).not.toBeInTheDocument();
    expect(await card('Top errors')).toBeInTheDocument();
  });
});
