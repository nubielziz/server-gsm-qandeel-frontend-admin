// BuyerCell: the Buyer column. It shows the account with its rank, and how the order arrived. An account with no name is shown by the
// masked email, once, never as an empty cell.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import type { Order, OrderAccount } from '../types';
import { BuyerCell } from './BuyerCell';

const RETAIL = { id: 4, name: 'Storefront retail', kind: 'retail' } as const;
const WHOLESALE = { id: 2, name: 'Wholesale', kind: 'merchant' } as const;

const storefront = (account: Partial<OrderAccount>): Order =>
  order({
    channel: 'b2c',
    source: 'store',
    account: { id: 111, name: '', email: '', rank: RETAIL, guest: false, ...account },
  });

describe('BuyerCell', () => {
  it('shows an account’s name with its rank, and the masked email under it', () => {
    render(<BuyerCell order={storefront({ name: 'Maya Haddad', email: 'maya@example.com' })} />);
    expect(screen.getByText('Maya Haddad')).toBeInTheDocument();
    expect(screen.getByText('Storefront retail')).toBeInTheDocument();
    expect(screen.getByText(/ma•••@example\.com/)).toBeInTheDocument();
  });

  it('names an account with no name by the masked email and does not say it twice', () => {
    render(<BuyerCell order={storefront({ name: '', email: 'maya@example.com' })} />);
    expect(screen.getAllByText(/ma•••@example\.com/)).toHaveLength(1);
    expect(screen.getByText('Storefront retail')).toBeInTheDocument();
  });

  it('shows a merchant account with its rank and the way the order arrived', () => {
    render(
      <BuyerCell
        order={order({
          source: 'dhru',
          account: {
            id: 13,
            name: 'Muscat Mobile Clinic',
            email: 'a@b.example',
            rank: WHOLESALE,
            guest: false,
          },
        })}
      />,
    );
    expect(screen.getByText('Muscat Mobile Clinic')).toBeInTheDocument();
    expect(screen.getByText('Wholesale')).toBeInTheDocument();
    expect(screen.getByText('Dhru API')).toBeInTheDocument();
    // A merchant order shows its door, not the buyer's email.
    expect(screen.queryByText(/•••@/)).not.toBeInTheDocument();
  });

  it('shows the rank an account holds now, not the kind of door the order came through', () => {
    // A shop order whose account became a merchant later: the door is the shop, the rank is the merchant's.
    render(
      <BuyerCell
        order={order({
          channel: 'b2c',
          source: 'store',
          account: { id: 111, name: 'Maya Haddad', email: 'maya@example.com', rank: WHOLESALE, guest: false },
        })}
      />,
    );
    expect(screen.getByText('Wholesale')).toBeInTheDocument();
    expect(screen.queryByText('Storefront retail')).not.toBeInTheDocument();
  });

  it('falls back to the account number for an account with neither a name nor an email', () => {
    render(<BuyerCell order={storefront({ id: 111, name: '  ', email: '' })} />);
    expect(screen.getByText('Account #111')).toBeInTheDocument();
  });
});
