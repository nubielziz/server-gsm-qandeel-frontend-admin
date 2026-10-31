// Tests for the edges of the lists in the Alerts & incidents tab: paging, the "Open" list that is two reads, and an answer the
// console cannot draw (one view fails, the strip and the other views stay). Against the dev mock API, with a few reads replaced.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupHealthMocks } from '../../mocks/testing';
import { openHealthPage } from '../../test/openHealthPage';
import { SLOW } from '../../test/pageQueries';

setupHealthMocks();
// The page is a lazy chunk and every flow goes through the mock API, so give the first test of a file room.
vi.setConfig({ testTimeout: 30_000 });

/** A complete alert row, resolved, with an id and a rule name made from it. */
const alertRow = (id: number) => ({
  id,
  ruleId: 1,
  value: 21,
  subjectType: 'system',
  subjectId: 0,
  startedAt: '2026-10-30T10:00:00.000Z',
  acknowledgedAt: null,
  resolvedAt: '2026-10-30T10:10:00.000Z',
  status: 'resolved',
  severity: 'warning',
  rule: {
    id: 1,
    key: 'api_p95_latency',
    name: `Alert number ${id}`,
    metric: 'api.p95',
    comparator: 'gt',
    threshold: 1500,
    windowSeconds: 300,
    unit: 'ms',
  },
  subjectLabel: null,
  acknowledgedBy: null,
  note: null,
  incidentId: null,
});

/** Answers `GET /admin/alerts` with `total` alerts, serving the row range asked for; returns the ranges seen. */
function serveAlerts(total: number) {
  const ranges: string[] = [];
  mockServer.use(
    http.get('*/admin/alerts', ({ request }) => {
      const url = new URL(request.url);
      const start = Number(url.searchParams.get('_start') ?? 0);
      const end = Math.min(Number(url.searchParams.get('_end') ?? total), total);
      ranges.push(`${start}-${end}`);
      const rows = Array.from({ length: Math.max(0, end - start) }, (_, i) => alertRow(start + i + 1));
      return HttpResponse.json(rows, { headers: { 'x-total-count': String(total) } });
    }),
  );
  return ranges;
}

describe('paging', () => {
  it('reads one page of 25 at a time, keeps the page in the address, and asks the next range', async () => {
    const user = userEvent.setup();
    const ranges = serveAlerts(60);
    const app = await openHealthPage({ route: '/system-health?tab=alerts&status=all' });
    const table = within(await screen.findByRole('table', { name: 'Alerts' }, SLOW));
    expect(table.getAllByRole('row').slice(1)).toHaveLength(25);
    expect(screen.getByText('1–25 of 60')).toBeInTheDocument();
    expect(ranges).toContain('0-25');

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=all&page=2'));
    await waitFor(() => expect(ranges).toContain('25-50'), SLOW);
    expect(await screen.findByText('Alert number 26', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('26–50 of 60')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=all'));
  });

  it('goes back to the last page that has rows when the address names one past the end', async () => {
    serveAlerts(60);
    const app = await openHealthPage({ route: '/system-health?tab=alerts&status=all&page=9' });
    await screen.findByRole('table', { name: 'Alerts' }, SLOW);
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=all&page=3'), SLOW);
    expect(await screen.findByText('51–60 of 60', undefined, SLOW)).toBeInTheDocument();
  });

  it('goes back to page 1 when the filter changes', async () => {
    const user = userEvent.setup();
    serveAlerts(60);
    const app = await openHealthPage({ route: '/system-health?tab=alerts&status=all&page=2' });
    await screen.findByRole('table', { name: 'Alerts' }, SLOW);
    await user.click(screen.getByRole('button', { name: 'Resolved' }));
    await waitFor(() => expect(app.location()).toBe('/system-health?tab=alerts&status=resolved'));
  });
});

describe('the Open list', () => {
  it('says so when there are more open alerts than the first page of each kind, and where to page', async () => {
    mockServer.use(
      http.get('*/admin/alerts', ({ request }) => {
        const status = new URL(request.url).searchParams.get('status');
        const rows = status === 'firing' ? Array.from({ length: 25 }, (_, i) => alertRow(i + 1)) : [];
        return HttpResponse.json(
          rows.map((row) => ({ ...row, status: 'firing', resolvedAt: null })),
          { headers: { 'x-total-count': String(status === 'firing' ? 40 : 0) } },
        );
      }),
    );
    await openHealthPage({ route: '/system-health?tab=alerts' });
    const table = within(await screen.findByRole('table', { name: 'Alerts' }, SLOW));
    expect(table.getAllByRole('row').slice(1)).toHaveLength(25);
    expect(
      screen.getByText(/There are 40 open alerts; the newest of each kind are listed/),
    ).toBeInTheDocument();
    // "Open" is not paged: the table ends with a row count, not a pager.
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('shows no such note when everything fits', async () => {
    await openHealthPage({ scenario: 'degraded', route: '/system-health?tab=alerts' });
    await screen.findByRole('table', { name: 'Alerts' }, SLOW);
    expect(screen.queryByText(/the newest of each kind are listed/)).not.toBeInTheDocument();
  });

  it('fails as a whole when half of it fails on the first read, so a missing half never reads as "nothing firing"', async () => {
    mockServer.use(
      http.get('*/admin/alerts', ({ request }) =>
        new URL(request.url).searchParams.get('status') === 'firing'
          ? HttpResponse.json(
              {
                title: 'Something went wrong',
                code: 'INTERNAL_ERROR',
                status: 500,
                detail: 'The firing alerts could not be read.',
              },
              { status: 500, headers: { 'content-type': 'application/problem+json' } },
            )
          : HttpResponse.json([], { headers: { 'x-total-count': '0' } }),
      ),
    );
    await openHealthPage({ route: '/system-health?tab=alerts' });
    expect(await screen.findByText('Could not load the alerts', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('The firing alerts could not be read.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No open alerts' })).not.toBeInTheDocument();
  });
});

describe('an answer the console cannot draw', () => {
  it('shows a note for that view only, and the strip and the other views keep working', async () => {
    const user = userEvent.setup();
    mockServer.use(
      // Rows without a rule: the table cannot be drawn.
      http.get('*/admin/alerts', () => HttpResponse.json([{ id: 1 }], { headers: { 'x-total-count': '1' } })),
    );
    await openHealthPage({ route: '/system-health?tab=alerts' });
    expect(
      await screen.findByRole('heading', { name: 'The alerts view cannot be shown' }, SLOW),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Rules' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Rules' }));
    expect(await screen.findByRole('table', { name: 'Alert rules' }, SLOW)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'The alerts view cannot be shown' }),
    ).not.toBeInTheDocument();
  });
});

describe('Declare incident from an acknowledged alert', () => {
  it('prefills the severity from the alert and asks for a component when the alert names none', async () => {
    const user = userEvent.setup();
    await openHealthPage({ scenario: 'maintenance', route: '/system-health?tab=alerts' });
    const table = within(await screen.findByRole('table', { name: 'Alerts' }, SLOW));
    await user.click(table.getByRole('button', { name: 'Declare incident' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Declare incident' }));
    expect(dialog.getByLabelText('Title')).toHaveValue('Ledger mismatch · Wallet · Basra Unlock Center');
    expect(dialog.getByLabelText('Severity')).toHaveValue('critical');
    expect((dialog.getByLabelText('Summary') as HTMLTextAreaElement).value).toMatch(
      /^Ledger mismatch for Wallet · Basra Unlock Center: 1 > 0 for 1m\./,
    );
    await dialog.findByRole('checkbox', { name: 'Postgres' }, SLOW);
    expect(dialog.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked)).toHaveLength(
      0,
    );
    await user.click(dialog.getByRole('button', { name: 'Declare incident' }));
    expect(await dialog.findByText('Choose at least one affected component.')).toBeInTheDocument();
  });
});
