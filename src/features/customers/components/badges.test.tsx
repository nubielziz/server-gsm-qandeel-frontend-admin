// Tests for the status badge: each known value gets its word and tone, and a value the console does not know (a new status on the
// server) shows as it is in a neutral badge instead of breaking the page.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CustomerStatus } from '../types';
import { CustomerStatusBadge } from './CustomerStatusBadge';

const badgeOf = (text: string) => screen.getByText(text).closest('.badge');

describe('CustomerStatusBadge', () => {
  it('shows each status with its word and tone', () => {
    const { rerender } = render(<CustomerStatusBadge status="active" />);
    expect(badgeOf('Active')).toHaveClass('b-good');
    rerender(<CustomerStatusBadge status="suspended" />);
    expect(badgeOf('Suspended')).toHaveClass('b-warn');
    rerender(<CustomerStatusBadge status="blocked" />);
    expect(badgeOf('Blocked')).toHaveClass('b-crit');
    rerender(<CustomerStatusBadge status="anonymized" />);
    expect(badgeOf('Anonymised')).toHaveClass('b-neutral');
  });

  it('shows a status it does not know as it is, in a neutral badge', () => {
    render(<CustomerStatusBadge status={'pending_review' as CustomerStatus} />);
    expect(badgeOf('pending_review')).toHaveClass('b-neutral');
  });

  it('shows "Unknown" for an empty status', () => {
    render(<CustomerStatusBadge status={'' as CustomerStatus} />);
    expect(badgeOf('Unknown')).toHaveClass('b-neutral');
  });
});
