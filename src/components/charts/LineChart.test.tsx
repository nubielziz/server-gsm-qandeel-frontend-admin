// Tests for LineChart and Sparkline: drawing, the threshold line, keyboard tooltip.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LineChart, type LinePoint } from './LineChart';
import { Sparkline } from './Sparkline';

const points: LinePoint[] = [
  { value: 90, label: '1 Oct', detail: 'Wed, 1 Oct' },
  { value: 96, label: '2 Oct', detail: 'Thu, 2 Oct' },
  { value: 99, label: '3 Oct', detail: 'Fri, 3 Oct' },
];

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 400 });
});
afterAll(() => {
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('LineChart', () => {
  it('draws the line, the area and the axis labels', () => {
    const { container } = render(
      <LineChart points={points} label="Success rate" unit="%" yMax={100} yMin={80} />,
    );
    expect(screen.getByRole('img', { name: 'Success rate' })).toBeInTheDocument();
    expect(container.querySelectorAll('svg path')).toHaveLength(2);
    expect(container.querySelector('svg')).toHaveTextContent('3 Oct');
    // Gridlines: yMin..yMax in three steps.
    expect(container.querySelector('svg')).toHaveTextContent('80');
    expect(container.querySelector('svg')).toHaveTextContent('100');
  });

  it('adds a dashed threshold with its label and a critical overlay', () => {
    const { container } = render(
      <LineChart
        points={points}
        label="Success rate"
        yMax={100}
        yMin={80}
        reference={{ value: 95, label: 'SLA 95%' }}
      />,
    );
    expect(container.querySelector('svg')).toHaveTextContent('SLA 95%');
    expect(container.querySelector('line[stroke-dasharray="4 3"]')).toBeInTheDocument();
    expect(container.querySelector('path[stroke="rgb(var(--crit-dot))"]')).toBeInTheDocument();
    expect(container.querySelector('clipPath')).toBeInTheDocument();
  });

  it('shows the value and the long label for the point reached with the keyboard', async () => {
    const user = userEvent.setup();
    const { container } = render(<LineChart points={points} label="Success rate" unit="%" />);
    await user.tab();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(container.querySelector('.tip')).toHaveTextContent('96%');
    expect(container.querySelector('.tip')).toHaveTextContent('Thu, 2 Oct');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent('Thu, 2 Oct: 96%');
    expect(container.querySelector('circle')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(container.querySelector('.tip')).not.toBeInTheDocument();
  });

  it('copes with a single point', () => {
    const { container } = render(<LineChart points={[points[0]]} label="One day" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('is a hidden decorative svg with one path', () => {
    const { container } = render(<Sparkline values={[3, 5, 4, 8]} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelector('path')?.getAttribute('d')).toMatch(/^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+){3}$/);
  });

  it('draws a flat line for equal values and nothing for no values', () => {
    const { container, rerender } = render(<Sparkline values={[2, 2, 2]} />);
    expect(container.querySelector('path')).toBeInTheDocument();
    rerender(<Sparkline values={[]} />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });
});
