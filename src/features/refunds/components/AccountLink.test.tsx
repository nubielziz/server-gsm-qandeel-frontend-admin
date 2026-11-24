// AccountLink: the name of an account that links to its record. An account can have an empty name, so the link must still have text.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountLink } from './AccountLink';

let canOpen: boolean | undefined = true;
const asked: string[] = [];
vi.mock('@/lib/auth/useCanOpenPage', () => ({
  useCanOpenPage: (name: string) => {
    asked.push(name);
    return canOpen;
  },
}));

const draw = (account: { id: number; name: string } | null) =>
  render(
    <MemoryRouter>
      <AccountLink account={account} />
    </MemoryRouter>,
  );

describe('AccountLink', () => {
  beforeEach(() => {
    canOpen = true;
    asked.length = 0;
  });

  it('links the name to the account record', () => {
    draw({ id: 111, name: 'Priya Nair' });
    expect(screen.getByRole('link', { name: 'Priya Nair' })).toHaveAttribute('href', '/accounts/111');
  });

  it('never builds the old customer address', () => {
    draw({ id: 111, name: 'Priya Nair' });
    expect(screen.getByRole('link')).not.toHaveAttribute('href', expect.stringContaining('/customers/'));
  });

  it('gives an account with no name a link text, the account number', () => {
    draw({ id: 111, name: '' });
    expect(screen.getByRole('link', { name: 'Account #111' })).toHaveAttribute('href', '/accounts/111');
  });

  it('treats a name of only spaces as no name', () => {
    draw({ id: 112, name: '   ' });
    expect(screen.getByRole('link', { name: 'Account #112' })).toHaveAttribute('href', '/accounts/112');
  });

  it('shows the same text without a link to a person who cannot open the Accounts page', () => {
    canOpen = false;
    draw({ id: 111, name: '' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Account #111')).toBeInTheDocument();
    expect(asked).toContain('accounts');
  });

  it('says Unknown when the row has no account', () => {
    draw(null);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
