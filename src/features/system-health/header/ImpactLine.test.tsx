// Tests for ImpactLine: the orders-and-money sentence of the verdict, its links, and its own failure text.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/mockApi';
import { hookKit } from '../test/testKit';
import type { Measure, OrdersHealth } from '../types';
import { ImpactLine } from './ImpactLine';

setupMockApi();

const measure = (value: number | null, unit: Measure['unit'], state: Measure['state'] = 'ok'): Measure => ({
  value,
  unit,
  state,
});

function orders(over: { late?: number | null; held?: string; dispatch?: number | null } = {}): OrdersHealth {
  const { late = 23, held = '1240.0000', dispatch = 250 } = over;
  return {
    checkedAt: '2026-10-31T10:00:00.000Z',
    stuck: { total: measure(late, 'count', 'crit'), heldAmount: held, byStatus: [], trend: [] },
    needsAttention: 0,
    dispatchP95: measure(dispatch, 's'),
    byServiceType: [],
    heldByRisk: { count: 0, amount: '0.0000', oldestAt: null },
  };
}

function show(answer: OrdersHealth | Response, permissions = ['system:read', 'orders:read']) {
  mockServer.use(
    http.get('*/admin/system/orders-health', () =>
      answer instanceof Response ? answer : HttpResponse.json(answer),
    ),
  );
  const { Wrapper } = hookKit({ permissions });
  return render(<ImpactLine />, { wrapper: Wrapper });
}

describe('ImpactLine', () => {
  it('says how many orders are past SLA, how much money is held and the dispatch time, and links the count to the Orders list', async () => {
    show(orders());
    const link = await screen.findByRole('link', { name: '23 past SLA' });
    expect(link).toHaveAttribute('href', '/orders?pastSla=true');
    expect(link.closest('p')).toHaveTextContent('Orders: 23 past SLA · $1,240.00 held · dispatch p95 4m 10s');
  });

  it('is a quiet sentence with no link when no order is past SLA', async () => {
    show(orders({ late: 0, held: '0.0000', dispatch: 38 }));
    const text = await screen.findByText(/Orders:/);
    expect(text.closest('p')).toHaveTextContent('Orders: none past SLA · dispatch p95 38s');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('says unknown, not zero, when the server has no count or no dispatch time', async () => {
    show(orders({ late: null, dispatch: null }));
    const text = await screen.findByText(/Orders:/);
    expect(text.closest('p')).toHaveTextContent('Orders: past SLA unknown · dispatch p95 unknown');
  });

  it('shows the count as plain text when the role may not open the Orders page', async () => {
    show(orders(), ['system:read']);
    const text = await screen.findByText(/Orders:/);
    expect(text.closest('p')).toHaveTextContent('Orders: 23 past SLA · $1,240.00 held');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a loading line first', () => {
    show(orders());
    expect(screen.getByRole('status', { name: 'Loading order impact' })).toBeInTheDocument();
  });

  it('says "Order impact unavailable" with the server reason when the read fails, and shows the sentence after Retry', async () => {
    let failing = true;
    mockServer.use(
      http.get('*/admin/system/orders-health', () =>
        failing
          ? problem(400, 'BAD_REQUEST', 'Bad request', 'The order pipeline could not be read.')
          : HttpResponse.json(orders()),
      ),
    );
    const { Wrapper } = hookKit({ permissions: ['*'] });
    render(<ImpactLine />, { wrapper: Wrapper });
    expect(await screen.findByText('Order impact unavailable')).toBeInTheDocument();
    expect(screen.getByText('The order pipeline could not be read.')).toBeInTheDocument();
    failing = false;
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText('Order impact unavailable')).not.toBeInTheDocument());
    expect(await screen.findByRole('link', { name: '23 past SLA' })).toBeInTheDocument();
  });
});
