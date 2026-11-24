// Tests for the status of an account: each status gets its word and the tone of its square, the precedence when several facts apply, and a
// status the console does not know (a new word on the server) shows as it is next to a hollow square instead of breaking the page.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { account, guest } from '../../test/fixtures';
import type { AccountRow } from '../../types';
import { AccountStatus } from './AccountStatus';

const squareOf = (name: string) => screen.getByRole('img', { name });

describe('AccountStatus', () => {
  it('shows each status with its word and the tone of its square', () => {
    const { rerender } = render(<AccountStatus account={account()} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(squareOf('Active')).toHaveClass('status-sq-ok');
    rerender(<AccountStatus account={account({ status: 'suspended' })} />);
    expect(squareOf('Suspended')).toHaveClass('status-sq-warn');
    rerender(<AccountStatus account={account({ status: 'blocked' })} />);
    expect(squareOf('Blocked')).toHaveClass('status-sq-crit');
    rerender(<AccountStatus account={account({ status: 'anonymized' })} />);
    expect(screen.getByText('Anonymized')).toBeInTheDocument();
    expect(squareOf('Anonymized')).toHaveClass('status-sq-off');
  });

  it('says Guest for an account with no login and Invitation pending for one with no password yet', () => {
    const { rerender } = render(<AccountStatus account={guest()} />);
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(squareOf('Guest')).toHaveClass('status-sq-off');
    rerender(<AccountStatus account={account({ invitationPending: true })} />);
    expect(screen.getByText('Invitation pending')).toBeInTheDocument();
    expect(squareOf('Invitation pending')).toHaveClass('status-sq-warn');
  });

  it('gives a state that applies to the whole account precedence over the sign-in facts', () => {
    render(<AccountStatus account={guest({ status: 'blocked' })} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows a status it does not know as it is, with a hollow square', () => {
    render(<AccountStatus account={account({ status: 'pending_review' as AccountRow['status'] })} />);
    expect(screen.getByText('pending_review')).toBeInTheDocument();
    expect(squareOf('pending_review')).toHaveClass('status-sq-off');
  });

  it('shows "Unknown" for an empty status', () => {
    render(<AccountStatus account={account({ status: '' as AccountRow['status'] })} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(squareOf('Unknown')).toHaveClass('status-sq-off');
  });
});
