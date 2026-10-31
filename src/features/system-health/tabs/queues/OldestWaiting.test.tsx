// Tests for OldestWaiting: "None waiting" only when nothing waits and the server calls the age fine; otherwise the measure.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Measure } from '../../types';
import { OldestWaiting } from './OldestWaiting';

function age(over: Partial<Measure> = {}): Measure {
  return { value: 0, unit: 's', state: 'ok', ...over };
}

describe('OldestWaiting', () => {
  it('says "None waiting", not "0s", when nothing waits and the age is fine', () => {
    render(<OldestWaiting measure={age()} none />);
    expect(screen.getByText('None waiting')).toHaveClass('text-ink3');
    expect(screen.queryByText('0s')).not.toBeInTheDocument();
  });

  it('prints the age while something waits, whatever the value', () => {
    render(<OldestWaiting measure={age({ value: 42 })} none={false} />);
    expect(screen.getByText('42s')).toBeInTheDocument();
    expect(screen.queryByText('None waiting')).not.toBeInTheDocument();
  });

  it('prints a worse state with its icon and spoken word, even when the count says nothing waits', () => {
    const { container } = render(<OldestWaiting measure={age({ value: 130, state: 'warn' })} none />);
    expect(screen.getByText('2m 10s')).toBeInTheDocument();
    expect(screen.getByText('Warn')).toHaveClass('sr-only');
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('None waiting')).not.toBeInTheDocument();
  });

  it('prints "No data" for a reading nobody could take, never "None waiting"', () => {
    render(<OldestWaiting measure={age({ value: null, state: 'unknown' })} none />);
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.queryByText('None waiting')).not.toBeInTheDocument();
  });
});
