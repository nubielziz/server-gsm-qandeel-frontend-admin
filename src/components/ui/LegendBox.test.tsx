// Tests for LegendBox: a fieldset named by its legend, holding the controls of the Quick Search row.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LegendBox } from './LegendBox';

describe('LegendBox', () => {
  it('is a group named by its legend, and holds its children', () => {
    render(
      <LegendBox legend="Quick Search">
        <input aria-label="Search service" />
        <button type="button">Search</button>
      </LegendBox>,
    );
    const group = screen.getByRole('group', { name: 'Quick Search' });
    expect(group.tagName).toBe('FIELDSET');
    expect(group.querySelector('legend')).toHaveTextContent('Quick Search');
    expect(within(group).getByRole('textbox', { name: 'Search service' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('adds the caller classes to the box itself', () => {
    render(
      <LegendBox legend="Filters" className="mb-4">
        <span>x</span>
      </LegendBox>,
    );
    expect(screen.getByRole('group', { name: 'Filters' })).toHaveClass('legend-box', 'mb-4');
  });
});
