// Tests for TopErrorsCard on its own, with a plain query object: mono codes and request IDs, a missing request ID, the Sentry
// column and links, the order the server sent, the total in the subtitle and the empty list.
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HealthQuery } from '../../components';
import type { ErrorGroup, ErrorsResponse } from '../../types';
import { TopErrorsCard } from './TopErrorsCard';

afterEach(() => vi.unstubAllEnvs());

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

const group = (over: Partial<ErrorGroup> = {}): ErrorGroup => ({
  code: 'SUPPLIER_TIMEOUT',
  status: 504,
  method: 'POST',
  endpoint: '/v1/orders',
  surface: 'v1',
  count: 1284,
  firstSeenAt: minutesAgo(38),
  lastSeenAt: minutesAgo(0),
  lastRequestId: 'req_8f3a1c9d2e4b',
  sentryUrl: 'https://sentry.example.com/organizations/gsm/issues/4821/',
  ...over,
});

const answer = (groups: ErrorGroup[], total = 5000): ErrorsResponse => ({ range: '24h', total, groups });

// A query result in the shape of React Query's, with an answer already there.
function query(data: ErrorsResponse): HealthQuery<ErrorsResponse> {
  return {
    data,
    error: null,
    isPending: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
  };
}

function renderCard(data: ErrorsResponse, surface?: string) {
  return render(
    <TopErrorsCard
      query={query(data)}
      range="24h"
      surface={surface}
      scope={surface ? 'Merchant API v1' : 'All surfaces'}
    />,
  );
}

describe('TopErrorsCard rows', () => {
  it('prints the code, the endpoint and the request ID in mono, with a button that names the ID it copies', () => {
    renderCard(answer([group()]));
    expect(screen.getByText('SUPPLIER_TIMEOUT')).toHaveClass('mono');
    expect(screen.getByText('req_8f3a1c9d2e4b')).toHaveClass('mono');
    expect(screen.getByRole('button', { name: 'Copy request ID req_8f3a1c9d2e4b' })).toBeInTheDocument();
    const row = screen.getAllByRole('row')[1]!;
    expect(row).toHaveTextContent('POST /v1/orders');
    expect(row).toHaveTextContent('504');
    expect(row).toHaveTextContent('1,284');
  });

  it('says when each error was first and last seen, with the exact time in the tooltip', () => {
    const first = minutesAgo(38);
    renderCard(answer([group({ firstSeenAt: first, lastSeenAt: minutesAgo(0) })]));
    const times = within(screen.getAllByRole('row')[1]!).getAllByText(/ago|just now/);
    expect(times.map((time) => time.textContent)).toEqual(['38m ago', 'just now']);
    expect(times[0]).toHaveAttribute('datetime', first);
    expect(times[0]!.getAttribute('title')).toMatch(/^\d{2} \w{3,4}, \d{2}:\d{2}$/);
  });

  it('says None, with no copy button, for a group without a request ID', () => {
    renderCard(answer([group({ lastRequestId: null })]));
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Copy request ID/ })).not.toBeInTheDocument();
  });

  it('keeps the order the server sent: the most frequent group is not moved', () => {
    renderCard(
      answer([
        group({ code: 'FIRST_CODE', count: 900 }),
        group({ code: 'SECOND_CODE', count: 40, endpoint: '/v1/orders/:id' }),
        group({ code: 'THIRD_CODE', count: 3 }),
      ]),
    );
    const codes = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0]!.textContent);
    expect(codes).toEqual(['FIRST_CODE', 'SECOND_CODE', 'THIRD_CODE']);
  });
});

describe('TopErrorsCard Sentry links', () => {
  it('has no Sentry column and no link while VITE_SENTRY_URL is unset, even when the server sent an issue', () => {
    vi.stubEnv('VITE_SENTRY_URL', '');
    renderCard(answer([group()]));
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Code',
      'Status',
      'Endpoint',
      'Count',
      'First seen',
      'Last seen',
      'Request ID',
    ]);
  });

  it('links each group that has an issue, and leaves the others without a link', () => {
    vi.stubEnv('VITE_SENTRY_URL', 'https://sentry.example.com');
    renderCard(
      answer([
        group({ code: 'WITH_ISSUE' }),
        group({ code: 'WITHOUT_ISSUE', sentryUrl: null, endpoint: '/v1/other' }),
      ]),
    );
    const link = screen.getByRole('link', { name: 'Sentry issue of WITH_ISSUE (opens in a new tab)' });
    expect(link).toHaveAttribute('href', 'https://sentry.example.com/organizations/gsm/issues/4821/');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    // The column exists for every row, so the header stays and a row without an issue has an empty cell.
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
  });
});

describe('TopErrorsCard header and empty list', () => {
  it('puts the total of the range, the scope and the range in the subtitle', () => {
    renderCard(answer([group()], 5000), 'v1');
    expect(screen.getByText(/5,000 errors/)).toHaveTextContent(
      '5,000 errors · Merchant API v1 (v1) · Last 24 hours',
    );
  });

  it('writes "1 error" for a total of one', () => {
    renderCard(answer([group({ count: 1 })], 1));
    expect(screen.getByText(/1 error/)).toHaveTextContent('1 error · All surfaces · Last 24 hours');
  });

  it('says No data, and what the card is for, when no error group was reported', () => {
    renderCard(answer([], 0));
    expect(screen.getByRole('heading', { name: 'No data' })).toBeInTheDocument();
    expect(screen.getByText(/None were reported in this range/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
