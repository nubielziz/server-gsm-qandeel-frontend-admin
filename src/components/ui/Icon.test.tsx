// Tests for the icons the Product / Services page added to the set: each one is drawn by Icon on the 24 px grid.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Icon } from './Icon';
import { ICON_PATHS, type IconName } from './iconPaths';

const ADDED: IconName[] = ['squarePen', 'chevFirst', 'chevLast', 'dollar'];

describe('Icon', () => {
  it.each(ADDED)('draws %s with its own markup', (name) => {
    const { container } = render(<Icon name={name} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(ICON_PATHS[name].length).toBeGreaterThan(0);
    expect(svg?.childElementCount).toBeGreaterThan(0);
  });

  it('keeps the arrows the sort buttons already use', () => {
    expect(ICON_PATHS.arrowUp).toBeTruthy();
    expect(ICON_PATHS.arrowDown).toBeTruthy();
  });
});
