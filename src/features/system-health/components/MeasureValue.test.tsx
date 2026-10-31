// Tests for MeasureValue: the value with its unit, a state icon with a spoken word, "No data" for null, threshold text.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Measure } from '../types';
import { MeasureValue } from './MeasureValue';

function measure(over: Partial<Measure> = {}): Measure {
  return { value: 412, unit: 'ms', state: 'ok', warn: 800, crit: 1500, direction: 'above', ...over };
}

describe('MeasureValue', () => {
  it('prints the value with its unit, as the server sent it', () => {
    render(<MeasureValue measure={measure()} />);
    expect(screen.getByText('412 ms')).toBeInTheDocument();
  });

  it('prints other units the same way', () => {
    const { rerender } = render(<MeasureValue measure={measure({ value: 0.42, unit: 'percent' })} />);
    expect(screen.getByText('0.42 %')).toBeInTheDocument();
    rerender(<MeasureValue measure={measure({ value: 1240, unit: 'per_min' })} />);
    expect(screen.getByText('1,240 /min')).toBeInTheDocument();
    rerender(<MeasureValue measure={measure({ value: 192, unit: 's' })} />);
    expect(screen.getByText('3m 12s')).toBeInTheDocument();
    rerender(<MeasureValue measure={measure({ value: 1288490189, unit: 'bytes' })} />);
    expect(screen.getByText('1.2 GB')).toBeInTheDocument();
  });

  it('adds nothing for an ok state', () => {
    const { container } = render(<MeasureValue measure={measure()} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(container.querySelector('.sr-only')).not.toBeInTheDocument();
  });

  it.each([
    ['warn', 'Warn', 'text-warn-fg'],
    ['crit', 'Critical', 'text-crit-fg'],
    ['unknown', 'Unknown', 'text-ink3'],
  ] as const)('marks a %s state with an icon and the spoken word %s', (state, word, toneClass) => {
    const { container } = render(<MeasureValue measure={measure({ state })} />);
    expect(screen.getByText(word)).toHaveClass('sr-only');
    expect(container.querySelector('svg')).toHaveClass(toneClass);
  });

  it('prints "No data" for a null value and does not mark it as a state', () => {
    const { container } = render(<MeasureValue measure={measure({ value: null, state: 'unknown' })} />);
    expect(screen.getByText('No data')).toHaveClass('text-ink3');
    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown')).not.toBeInTheDocument();
  });

  it('shows the threshold line when asked', () => {
    render(<MeasureValue measure={measure()} threshold />);
    expect(screen.getByText('warn 800 ms')).toBeInTheDocument();
  });

  it('leaves the threshold out unless asked, and when the measure has none', () => {
    const { rerender } = render(<MeasureValue measure={measure()} />);
    expect(screen.queryByText('warn 800 ms')).not.toBeInTheDocument();
    rerender(<MeasureValue measure={measure({ warn: null, crit: null })} threshold />);
    expect(screen.queryByText(/warn|crit/)).not.toBeInTheDocument();
  });

  it('never decides a state from the thresholds: a value past crit with state ok stays ok', () => {
    const { container } = render(<MeasureValue measure={measure({ value: 5000, state: 'ok' })} />);
    expect(screen.getByText('5 s')).toBeInTheDocument();
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
