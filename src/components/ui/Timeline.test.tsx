// Tests for Timeline and Meter: ordering, node colours, and tolerance of bad input.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter } from './Meter';
import { ScoreMeter } from './ScoreMeter';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  it('lists events oldest first with their author and a coloured node', () => {
    const { container } = render(
      <Timeline
        formatTime={(d) => d.toISOString().slice(11, 16)}
        events={[
          { id: 2, at: '2025-10-12T10:05:00Z', kind: 'completed', text: 'Completed', by: 'Dana' },
          { id: 1, at: '2025-10-12T09:10:00Z', kind: 'review', text: 'Moved to review', by: 'system' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('09:10Moved to reviewsystem');
    expect(items[1]).toHaveTextContent('10:05CompletedDana');
    expect(container.querySelectorAll('li > span')[0]).toHaveClass('bg-serious-dot');
    expect(container.querySelectorAll('li > span')[1]).toHaveClass('bg-good-dot');
  });

  it('shows a dash and sorts last when a date cannot be read, instead of crashing', () => {
    render(
      <Timeline
        events={[
          { at: 'not a date', text: 'Mystery' },
          { at: '2025-10-12T09:10:00Z', text: 'Known' },
        ]}
      />,
    );
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Known');
    expect(items[1]).toHaveTextContent('–Mystery');
  });
});

describe('Meter', () => {
  const fill = (container: HTMLElement) => container.querySelector('.meter > i') as HTMLElement;

  it('is neutral below 70%, warn from 70% and critical when full', () => {
    const { container, rerender } = render(<Meter ratio={0.4} className="w-14" />);
    expect(fill(container)).toHaveClass('bg-neutral-dot');
    expect(fill(container)).toHaveStyle({ width: '40%' });
    rerender(<Meter ratio={0.7} className="w-14" />);
    expect(fill(container)).toHaveClass('bg-warn-dot');
    rerender(<Meter ratio={1.4} className="w-14" />);
    expect(fill(container)).toHaveClass('bg-crit-dot');
    expect(fill(container)).toHaveStyle({ width: '100%' });
  });

  it('draws an empty bar for a ratio that is not a number', () => {
    const { container } = render(<Meter ratio={Number.NaN} />);
    expect(fill(container)).toHaveStyle({ width: '0%' });
  });

  it('becomes a named meter only when it has a label', () => {
    render(<Meter ratio={0.5} label="SLA used" />);
    expect(screen.getByRole('meter', { name: 'SLA used' })).toHaveAttribute('aria-valuenow', '50');
  });
});

describe('ScoreMeter', () => {
  it('writes the score and picks the demo band colour', () => {
    const { container } = render(<ScoreMeter score={72} />);
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(container.querySelector('.meter > i')).toHaveClass('bg-serious-dot');
  });
});
