// OrderDetails: the drawer's facts. A buyer's note is not a field of an order any more; a server that still sends one is ignored.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import type { OrderGrants } from '../hooks/useOrderGrants';
import type { Order } from '../types';
import { OrderDetails } from './OrderDetails';

const grants = { can: () => false } as unknown as OrderGrants;
const NOW = Date.parse('2026-01-01T12:00:00.000Z');

function show(row: Order) {
  render(
    <MemoryRouter>
      <OrderDetails order={row} now={NOW} grants={grants} />
    </MemoryRouter>,
  );
}

describe('OrderDetails', () => {
  it('shows the internal note when the order has one', () => {
    show(order({ adminNote: 'Checked with the supplier' }));
    expect(screen.getByText('Internal note')).toBeInTheDocument();
    expect(screen.getByText('Checked with the supplier')).toBeInTheDocument();
  });

  it('shows no buyer note, even when an older server still sends one', () => {
    show({ ...order(), clientNote: 'Please be quick' } as Order);
    expect(screen.queryByText('Note from the buyer')).not.toBeInTheDocument();
    expect(screen.queryByText('Please be quick')).not.toBeInTheDocument();
  });
});
