// BuyerCell: the Buyer column. A storefront customer with no name is shown by the masked email, once, never as an empty cell.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Order } from '../types';
import { BuyerCell } from './BuyerCell';

const storefront = (customer: { id: number; name: string; email: string } | null) =>
  ({ channel: 'b2c', customer, client: null }) as unknown as Order;

describe('BuyerCell', () => {
  it('shows a customer’s name with the masked email under it', () => {
    render(<BuyerCell order={storefront({ id: 4, name: 'Maya Haddad', email: 'maya@example.com' })} />);
    expect(screen.getByText('Maya Haddad')).toBeInTheDocument();
    expect(screen.getByText(/ma•••@example\.com/)).toBeInTheDocument();
  });

  it('names a customer with no name by the masked email and does not say it twice', () => {
    render(<BuyerCell order={storefront({ id: 4, name: '', email: 'maya@example.com' })} />);
    expect(screen.getAllByText(/ma•••@example\.com/)).toHaveLength(1);
    expect(screen.getByText('Storefront')).toBeInTheDocument();
  });

  it('shows a dash for a storefront order without a customer', () => {
    render(<BuyerCell order={storefront(null)} />);
    expect(screen.getByText('–')).toBeInTheDocument();
  });
});
