// Tests for HealthCard: one test per state of the design brief's States table, and the content only when there is data.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { HealthCard, type HealthCardProps, type HealthQuery } from './HealthCard';

interface Answer {
  items: string[];
}

const GOOD: Answer = { items: ['postgres', 'redis'] };

// A query result in the shape of React Query's, with the fields a test cares about.
function query(over: Partial<HealthQuery<Answer>> = {}): HealthQuery<Answer> {
  return {
    data: GOOD,
    error: null,
    isPending: false,
    isError: false,
    isFetching: false,
    dataUpdatedAt: Date.now(),
    refetch: vi.fn(),
    ...over,
  };
}

function card(q: HealthQuery<Answer>, props: Partial<HealthCardProps<Answer>> = {}) {
  return render(
    <HealthCard title="Components" sub="Checked every minute" query={q} interval={15_000} {...props}>
      {(data) => <p>Seen: {data.items.join(', ')}</p>}
    </HealthCard>,
  );
}

const state = (container: HTMLElement) => container.querySelector('[data-state]')?.getAttribute('data-state');

describe('HealthCard content', () => {
  it('shows the title, the subtitle, the right slot and the content', () => {
    card(query(), { right: <button type="button">Add</button> });
    expect(screen.getByRole('heading', { name: 'Components' })).toBeInTheDocument();
    expect(screen.getByText('Checked every minute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Seen: postgres, redis')).toBeInTheDocument();
  });

  it('calls the content only when there is data', () => {
    const children = vi.fn(() => <p>content</p>);
    render(
      <HealthCard title="Components" query={query({ data: undefined, isPending: true })} interval={15_000}>
        {children}
      </HealthCard>,
    );
    expect(children).not.toHaveBeenCalled();
  });
});

describe('HealthCard states', () => {
  it('shows a skeleton on the first load', () => {
    const { container } = card(
      query({ data: undefined, isPending: true, isFetching: true, dataUpdatedAt: 0 }),
    );
    expect(state(container)).toBe('loading');
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText(/Seen:/)).not.toBeInTheDocument();
  });

  it('shows the skeleton the card brings in the shape of its content', () => {
    card(query({ data: undefined, isPending: true }), { skeleton: <div>table skeleton</div> });
    expect(screen.getByText('table skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
  });

  it('keeps the content while it refreshes, with no skeleton and no stale badge', () => {
    const { container } = card(query({ isFetching: true }));
    expect(state(container)).toBe('ready');
    expect(screen.getByText('Seen: postgres, redis')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Stale/)).not.toBeInTheDocument();
  });

  it('keeps the content when a new key loads over the old data (data, but nothing fetched yet)', () => {
    card(query({ isFetching: true, dataUpdatedAt: 0 }));
    expect(screen.getByText('Seen: postgres, redis')).toBeInTheDocument();
    expect(screen.queryByText(/Stale/)).not.toBeInTheDocument();
  });

  it('says "No data" in neutral, and what the card would show, when the answer is empty', () => {
    const { container } = card(query({ data: { items: [] } }), {
      isEmpty: (data) => data.items.length === 0,
      emptyText: 'Components show up here once the first check has run.',
    });
    expect(state(container)).toBe('empty');
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Components show up here once the first check has run.')).toBeInTheDocument();
    expect(screen.queryByText(/Seen:/)).not.toBeInTheDocument();
  });

  it('says "Monitoring unavailable" with the server detail and offers Retry', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const error = new ApiError({
      status: 503,
      code: 'MONITORING_UNAVAILABLE',
      title: 'Service Unavailable',
      detail: 'Prometheus did not answer in 5 s.',
    });
    const { container } = card(query({ data: undefined, isError: true, error, refetch, dataUpdatedAt: 0 }));
    expect(state(container)).toBe('unavailable');
    expect(screen.getByText('Monitoring unavailable')).toBeInTheDocument();
    expect(screen.getByText('Prometheus did not answer in 5 s.')).toBeInTheDocument();
    // It is not an error block: nothing here is red or green.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('uses its own words for monitoring unavailable when the server sends no detail', () => {
    const error = new ApiError({ status: 503, code: 'MONITORING_UNAVAILABLE' });
    card(query({ data: undefined, isError: true, error }));
    expect(screen.getByText(/did not answer/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing here counts as healthy/)).toBeInTheDocument();
  });

  it('shows what failed, the request id and Retry for any other failure', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const error = new ApiError({
      status: 500,
      code: 'INTERNAL',
      title: 'Internal Server Error',
      detail: 'The queue service threw.',
      requestId: 'req_7f3a',
    });
    const { container } = card(query({ data: undefined, isError: true, error, refetch }), {
      errorTitle: 'Could not load the queues',
    });
    expect(state(container)).toBe('error');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Could not load the queues')).toBeInTheDocument();
    expect(screen.getByText('The queue service threw.')).toBeInTheDocument();
    expect(screen.getByText('req_7f3a')).toHaveClass('mono');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('treats another 503 (a database that is down) as an error, not as monitoring unavailable', () => {
    const error = new ApiError({ status: 503, code: 'DATABASE_UNAVAILABLE', detail: 'Database is down.' });
    const { container } = card(query({ data: undefined, isError: true, error }));
    expect(state(container)).toBe('error');
    expect(screen.queryByText('Monitoring unavailable')).not.toBeInTheDocument();
  });
});

describe('HealthCard stale data', () => {
  it('keeps the last good data and adds "Stale · updated 2m ago" with Retry when the refresh failed', async () => {
    const user = userEvent.setup();
    const refetch = vi.fn();
    const error = new ApiError({ status: 500, title: 'Internal Server Error', detail: 'Queue read failed.' });
    const { container } = card(query({ isError: true, error, refetch, dataUpdatedAt: Date.now() - 125_000 }));
    expect(state(container)).toBe('ready');
    expect(screen.getByText('Seen: postgres, redis')).toBeInTheDocument();
    const badge = screen.getByText('Stale · updated 2m ago');
    expect(badge.closest('.badge')).toHaveClass('b-warn');
    // The reason is on the badge for a hover.
    expect(badge.closest('[title]')).toHaveAttribute('title', 'The last refresh failed: Queue read failed.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('adds the badge when the data is older than two intervals', () => {
    card(query({ dataUpdatedAt: Date.now() - 45_000 }));
    expect(screen.getByText('Stale · updated 45s ago')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('adds no badge for a card that does not poll, however old the data is', () => {
    card(query({ dataUpdatedAt: Date.now() - 3_600_000 }), { interval: 0 });
    expect(screen.queryByText(/Stale/)).not.toBeInTheDocument();
  });

  it('shows a spinner on Retry while the retry runs', () => {
    card(query({ dataUpdatedAt: Date.now() - 45_000, isFetching: true }));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeDisabled();
  });
});

describe('HealthCard forbidden', () => {
  it('names the permission when the staff member lacks it, and shows no content', () => {
    const { container } = card(query({ data: undefined, isPending: true }), {
      forbidden: true,
      permission: 'alerts:read',
    });
    expect(state(container)).toBe('forbidden');
    expect(screen.getByText('You need the alerts:read permission')).toBeInTheDocument();
    expect(screen.queryByText(/Seen:/)).not.toBeInTheDocument();
  });

  it('shows the same block for a 403 from the server, with the server words', () => {
    const error = new ApiError({ status: 403, code: 'FORBIDDEN', detail: 'Missing permission alerts:read.' });
    const { container } = card(query({ data: undefined, isError: true, error }), {
      permission: 'alerts:read',
    });
    expect(state(container)).toBe('forbidden');
    expect(screen.getByText('You need the alerts:read permission')).toBeInTheDocument();
    expect(screen.getByText('Missing permission alerts:read.')).toBeInTheDocument();
  });

  it('hides old data when the server starts answering 403, and has no stale badge', () => {
    const error = new ApiError({ status: 403, code: 'FORBIDDEN' });
    card(query({ isError: true, error }), { permission: 'system:read' });
    expect(screen.queryByText(/Seen:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Stale/)).not.toBeInTheDocument();
  });

  it('does not name a permission it was not told about', () => {
    card(query({ data: undefined }), { forbidden: true });
    expect(screen.getByText('You do not have access to this')).toBeInTheDocument();
  });
});
