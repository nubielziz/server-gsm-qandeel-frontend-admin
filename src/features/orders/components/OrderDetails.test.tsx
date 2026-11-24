// OrderDetails: the drawer's facts. The buyer is one account row that links to its record. A buyer's note is not a field of an order
// any more; a server that still sends one is ignored.
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

  it('links the buyer to its account record and names its rank', () => {
    show(order());
    expect(screen.getByText('Account')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Muscat Mobile Clinic' });
    expect(link).toHaveAttribute('href', '/accounts/13');
    expect(screen.getByText(/Wholesale/)).toBeInTheDocument();
  });

  it('never links a buyer to the old merchant or customer pages', () => {
    show(order({ channel: 'b2c', source: 'store', account: { ...order().account, id: 111 } }));
    expect(screen.getByRole('link', { name: 'Muscat Mobile Clinic' })).toHaveAttribute(
      'href',
      '/accounts/111',
    );
    expect(screen.queryByText('Merchant')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer')).not.toBeInTheDocument();
  });

  it('shows the masked email of an account that has a name, and marks a guest', () => {
    show(order({ account: { ...order().account, email: 'maya@example.com', guest: true } }));
    expect(screen.getByText(/ma•••@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/guest/)).toBeInTheDocument();
  });

  it('names an account with no name by the masked email, once', () => {
    show(order({ account: { ...order().account, name: '', email: 'maya@example.com' } }));
    expect(screen.getAllByText(/ma•••@example\.com/)).toHaveLength(1);
  });
});
