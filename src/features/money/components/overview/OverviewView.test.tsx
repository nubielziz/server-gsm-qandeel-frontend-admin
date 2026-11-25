// Tests for the Money Overview: the two features' figures first, then "Waiting for you" with a row and a link for each queue that has
// something in it, "Nothing is waiting." when all is zero, and no panel for a role that works no queue.
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { usableViews } from '../../lib/moneyViews';
import { fakeModules, type FakeOptions } from '../../test/fakeModules';
import { OverviewView } from './OverviewView';

async function draw(options: FakeOptions, permissions = ['*']) {
  const modules = await fakeModules({
    financeOverview: () => <p>Finance figures</p>,
    refundsOverview: () => <p>Refund figures</p>,
    ...options,
  });
  return render(
    <MemoryRouter>
      <OverviewView usable={usableViews(permissions)} modules={modules} />
    </MemoryRouter>,
  );
}
const panel = () => within(screen.getByRole('region', { name: 'Waiting for you' }));

describe('OverviewView', () => {
  it('draws the Finance figures, then the refund figures, then what is waiting', async () => {
    const { container } = await draw({ deposits: 1 });
    const texts = [...(container.firstElementChild?.children ?? [])].map((child) => child.textContent);
    expect(texts[0]).toBe('Finance figures');
    expect(texts[1]).toBe('Refund figures');
    expect(texts[2]).toContain('Waiting for you');
  });

  it('lists each queue with its count and a link to the view that works it', async () => {
    await draw({ deposits: 3, refunds: 2, disputes: 1 });
    const rows = panel().getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('deposits to review')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('3')).toBeInTheDocument();
    expect(panel().getByRole('link', { name: 'Open Deposits' })).toHaveAttribute(
      'href',
      '/money?view=deposits',
    );
    expect(panel().getByText('refunds to decide or retry')).toBeInTheDocument();
    expect(panel().getByRole('link', { name: 'Open Refunds' })).toHaveAttribute(
      'href',
      '/money?view=refunds',
    );
    expect(panel().getByText('card dispute needs evidence')).toBeInTheDocument();
    expect(panel().getByRole('link', { name: 'Open Card disputes' })).toHaveAttribute(
      'href',
      '/money?view=disputes',
    );
  });

  it('draws no row for a queue that is empty', async () => {
    await draw({ deposits: 0, refunds: 2, disputes: 0 });
    expect(panel().getAllByRole('listitem')).toHaveLength(1);
    expect(panel().queryByRole('link', { name: 'Open Deposits' })).not.toBeInTheDocument();
  });

  it('says nothing is waiting when every known count is zero', async () => {
    await draw({ deposits: 0, refunds: 0, disputes: 0 });
    expect(panel().getByText('Nothing is waiting.')).toBeInTheDocument();
    expect(panel().queryByRole('list')).not.toBeInTheDocument();
  });

  it('shows a loading mark while no count is known yet', async () => {
    await draw({});
    expect(panel().getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(panel().queryByText('Nothing is waiting.')).not.toBeInTheDocument();
  });

  it('lists only the queues a role may work, and draws no panel for a role that may work none', async () => {
    const { unmount } = await draw({ deposits: 5, refunds: 2, disputes: 4 }, ['refunds:read']);
    expect(panel().getAllByRole('listitem')).toHaveLength(1);
    expect(panel().getByRole('link', { name: 'Open Refunds' })).toBeInTheDocument();
    unmount();
    await draw({ deposits: 5 }, ['ledger:read']);
    expect(screen.queryByRole('region', { name: 'Waiting for you' })).not.toBeInTheDocument();
    expect(screen.getByText('Finance figures')).toBeInTheDocument();
  });
});
