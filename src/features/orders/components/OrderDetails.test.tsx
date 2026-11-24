// OrderDetails: the drawer's facts. The buyer is one account row that links to its record. A buyer's note is not a field of an order
// any more; a server that still sends one is ignored.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { order } from '@/test/fixtures/orderRows';
import type { OrderGrants } from '../hooks/useOrderGrants';
import type { Order, OrderAnswer } from '../types';
import { OrderDetails } from './OrderDetails';

const grants = { can: () => false } as unknown as OrderGrants;
const NOW = Date.parse('2026-01-01T12:00:00.000Z');

function show(row: Order, answers?: OrderAnswer[]) {
  render(
    <MemoryRouter>
      <OrderDetails order={row} answers={answers} now={NOW} grants={grants} />
    </MemoryRouter>,
  );
}

describe('OrderDetails', () => {
  it('shows one row per answer to a custom field, the label then the value', () => {
    show(order(), [
      { key: 'account', label: 'Z3X account', value: 'maya_01' },
      { key: 'plan', label: 'Plan', value: 'Pro' },
    ]);
    expect(screen.getByText('Z3X account').closest('dt')).not.toBeNull();
    expect(screen.getByText('maya_01').closest('dd')).toBe(
      screen.getByText('Z3X account').closest('dt')?.nextElementSibling,
    );
    expect(screen.getByText('Plan').closest('dt')?.nextElementSibling).toHaveTextContent('Pro');
  });

  it("shows the main input once: an answer that is the order's input is not listed again", () => {
    show(order({ service: { ...order().service, type: 'server' }, imei: 'user1' }), [
      { key: 'account', label: 'Z3X account', value: ' user1 ' },
      { key: 'plan', label: 'Plan', value: 'Pro' },
    ]);
    expect(screen.getAllByText('user1')).toHaveLength(1);
    expect(screen.queryByText('Z3X account')).not.toBeInTheDocument();
    expect(screen.getByText('Plan')).toBeInTheDocument();
  });

  it('leaves out only the first answer that repeats the input, and never when the order has no input', () => {
    show(order({ imei: 'same' }), [
      { key: 'a', label: 'First', value: 'same' },
      { key: 'b', label: 'Second', value: 'same' },
    ]);
    expect(screen.queryByText('First')).not.toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('lists an answer with no input to compare it to', () => {
    show(order({ imei: '' }), [{ key: 'a', label: 'Empty', value: '' }]);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('keeps the line breaks of a multi-line answer and lets the label read in its own direction', () => {
    show(order(), [{ key: 'note', label: 'Notes', value: 'line one\nline two' }]);
    const value = screen.getByText('Notes').closest('dt')?.nextElementSibling?.firstElementChild;
    expect(value).toHaveTextContent('line one line two');
    expect(value?.textContent).toBe('line one\nline two');
    expect(value).toHaveClass('whitespace-pre-line');
    expect(value).toHaveAttribute('dir', 'auto');
    expect(screen.getByText('Notes')).toHaveAttribute('dir', 'auto');
  });

  it('lets each answer read in its own direction, so a buyer who typed Arabic letters sees them whole', () => {
    // Written as escapes: the repository holds no Arabic script (decision 039); the answer is text a buyer typed.
    const typed = '\u0645\u062D\u0645\u062F';
    show(order(), [{ key: 'note', label: 'Name', value: typed }]);
    expect(screen.getByText(typed)).toHaveAttribute('dir', 'auto');
  });

  it('shows no answer row when the order has none, and no longer reads a device out of the inputs', () => {
    show(order({ inputs: { device: 'iPhone 15' } }));
    expect(screen.queryByText('Device')).not.toBeInTheDocument();
    expect(screen.queryByText('iPhone 15')).not.toBeInTheDocument();
  });

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
