// Tests for RuleStatus: a rule that is on has a green square and the word On, a rule that is off a hollow one and the word Off.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RuleStatus } from './RuleStatus';

describe('RuleStatus', () => {
  it('draws On with a green square', () => {
    render(<RuleStatus on />);
    const word = screen.getByText('On');
    expect(word.firstElementChild).toHaveClass('status-sq', 'status-sq-ok');
    expect(word.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('draws Off with a hollow square', () => {
    render(<RuleStatus on={false} />);
    expect(screen.getByText('Off').firstElementChild).toHaveClass('status-sq', 'status-sq-off');
  });
});
