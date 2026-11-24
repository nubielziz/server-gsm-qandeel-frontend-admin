// Tests for PinnedBar: the pinned class, the alignment and the caller classes; and the rules of index.css that keep a short view at the
// window's height (the frame the bar sits at the foot of), which jsdom cannot lay out.
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PinnedBar } from './PinnedBar';

// The style sheet as text, read from the disk (the tests run from the project's folder): the test runner hands a test an empty text for
// a CSS file it imports, with `?raw` too.
const styles = readFileSync('src/styles/index.css', 'utf8');

/** What index.css declares for one selector (the rule that starts a line with exactly this selector). */
function declared(selector: string): string {
  const escaped = selector.replace(/[.\\]/g, '\\$&');
  const match = new RegExp(`^\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(styles);
  if (!match) throw new Error(`index.css has no rule for ${selector}`);
  return match[1] ?? '';
}

describe('PinnedBar', () => {
  it('holds its children in a pinned bar, aligned to the start by default', () => {
    const { container } = render(
      <PinnedBar>
        <button type="button">Add</button>
      </PinnedBar>,
    );
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('pinned-bar');
    expect(container.firstElementChild).not.toHaveClass('pinned-bar-between');
  });

  it('is kept at the foot by a frame that fills what the page leaves, and not by a height of its own', () => {
    // The page is as tall as <main> inside the window; the view takes what is left under the heading and the two rows of links.
    expect(declared('.page-frame')).toContain('min-h-[calc(100dvh-48px-2rem)]');
    expect(declared('.page-frame')).toContain('flex-col');
    expect(declared('.view-frame')).toContain('flex-1');
    expect(declared('.view-frame')).toContain('flex-col');
    // A minimum of the whole window here would be taller than the room left, and every short view would scroll.
    expect(declared('.view-frame')).not.toMatch(/min-h/);
  });

  it('lets the parts layout and the column of its part fill the same space, so a short part ends with its bar at the foot too', () => {
    expect(declared('.parts-layout')).toContain('flex-1');
    expect(declared('.parts-main')).toContain('flex-col');
    expect(declared('.parts-main')).toContain('flex-1');
  });

  it('spreads its content with align="between" and merges the caller classes', () => {
    const { container } = render(
      <PinnedBar align="between" className="extra">
        <span>left</span>
        <span>right</span>
      </PinnedBar>,
    );
    expect(container.firstElementChild).toHaveClass('pinned-bar', 'pinned-bar-between', 'extra');
  });
});
