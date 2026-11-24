// Tests for MerchantNote: the banner of an account that is still pending says it is not active yet (no queue of approvals, and
// nothing about verification of documents, MISMATCHES M278), and a server that still sends the retired `kycStatus` word on the
// merchant changes nothing in it.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MerchantNote } from './MerchantNote';

const NOT_ACTIVE = 'The merchant cannot place orders until staff activate the account.';

describe('MerchantNote', () => {
  it('says a merchant that is still pending is not active yet', () => {
    render(<MerchantNote client={{ status: 'pending', suspension: null }} />);
    const note = screen.getByRole('note');
    expect(note).toHaveTextContent('Not active yet');
    expect(note).toHaveTextContent(NOT_ACTIVE);
    expect(note).not.toHaveTextContent(/approv/i);
  });

  it('ignores a retired verification word that an older server still sends', () => {
    render(<MerchantNote client={{ status: 'pending', suspension: null, ...{ kycStatus: 'rejected' } }} />);
    expect(screen.getByRole('note')).toHaveTextContent(NOT_ACTIVE);
    expect(screen.getByRole('note')).not.toHaveTextContent(/rejected|in review|verified/i);
  });

  it('shows the reason of a suspension, and nothing for an active merchant', () => {
    const now = Date.parse('2026-06-01T12:00:00.000Z');
    const { rerender } = render(
      <MerchantNote
        client={{
          status: 'suspended',
          suspension: {
            at: '2026-05-31T12:00:00.000Z',
            reason: 'Chargeback dispute',
            by: { id: 1, name: 'Rami K.' },
          },
        }}
        now={now}
      />,
    );
    expect(screen.getByRole('note')).toHaveTextContent('Reason: Chargeback dispute · by Rami K.');
    rerender(<MerchantNote client={{ status: 'active', suspension: null }} now={now} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
