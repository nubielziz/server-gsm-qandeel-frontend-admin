// Tests for Figure: a figure with its unit, the state word for screen readers, "No data" for a null or missing measure,
// and the room kept for a state icon.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Measure, MetricState } from '../../types';
import { Figure } from './Figure';

const ms = (value: number | null, state: MetricState): Measure => ({
  value,
  unit: 'ms',
  state,
  warn: 800,
  crit: 1500,
  direction: 'above',
});

describe('Figure', () => {
  it('prints an ok figure with its unit and no state word', () => {
    render(<Figure measure={ms(412, 'ok')} />);
    expect(screen.getByText('412 ms')).toBeInTheDocument();
    expect(screen.queryByText('Critical')).not.toBeInTheDocument();
    expect(screen.queryByText('Warn')).not.toBeInTheDocument();
  });

  it('adds the state word and an icon to a figure the server marked', () => {
    const { container } = render(<Figure measure={ms(2100, 'crit')} />);
    expect(screen.getByText('2.1 s')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toHaveClass('sr-only');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('says No data, never a number, for a null value and for a measure the server left out', () => {
    const { rerender } = render(<Figure measure={ms(null, 'ok')} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    rerender(<Figure measure={undefined} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByText(/ms$/)).not.toBeInTheDocument();
  });

  it('keeps the room of a state icon free for a figure that has none, so a column lines up', () => {
    const { container } = render(<Figure measure={ms(412, 'ok')} />);
    expect(container.querySelector('span[aria-hidden="true"].ic-xs')).not.toBeNull();
    const marked = render(<Figure measure={ms(2100, 'crit')} />);
    expect(marked.container.querySelector('span[aria-hidden="true"].ic-xs')).toBeNull();
  });
});
