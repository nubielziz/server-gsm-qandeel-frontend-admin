// CustomerLink: a customer's name that links to their page. A customer can have an empty name, so the link must still have text.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerLink } from './CustomerLink';

let canOpen: boolean | undefined = true;
vi.mock('@/lib/auth/useCanOpenPage', () => ({ useCanOpenPage: () => canOpen }));

const draw = (customer: { id: number; name: string } | null) =>
  render(
    <MemoryRouter>
      <CustomerLink customer={customer} />
    </MemoryRouter>,
  );

describe('CustomerLink', () => {
  beforeEach(() => {
    canOpen = true;
  });

  it('links the name to the customer page', () => {
    draw({ id: 11, name: 'Priya Nair' });
    expect(screen.getByRole('link', { name: 'Priya Nair' })).toHaveAttribute('href', '/customers/11');
  });

  it('gives a customer with no name a link text, the customer number', () => {
    draw({ id: 11, name: '' });
    expect(screen.getByRole('link', { name: 'Customer #11' })).toHaveAttribute('href', '/customers/11');
  });

  it('treats a name of only spaces as no name', () => {
    draw({ id: 12, name: '   ' });
    expect(screen.getByRole('link', { name: 'Customer #12' })).toHaveAttribute('href', '/customers/12');
  });

  it('shows the same text without a link to a person who cannot open the Customers page', () => {
    canOpen = false;
    draw({ id: 11, name: '' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Customer #11')).toBeInTheDocument();
  });

  it('says Unknown when the row has no customer', () => {
    draw(null);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
