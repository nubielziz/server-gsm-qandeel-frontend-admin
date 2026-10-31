// Tests for When: the date and the "ago" part are two pieces that never break inside, the dot goes with "ago", and a time
// the server did not send is a dash.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NONE } from './format';
import { When } from './When';

const NOW = Date.parse('2026-03-05T12:00:00.000Z');

describe('When', () => {
  it('prints the date and "· 44m ago" as two pieces that never wrap inside', () => {
    const { container } = render(<When at="2026-03-05T11:16:00.000Z" now={NOW} />);
    const pieces = container.querySelectorAll('span');
    expect(pieces).toHaveLength(2);
    expect(pieces[0].textContent).toMatch(/^\d{2} \w{3}, \d{2}:\d{2}$/);
    expect(pieces[1]).toHaveTextContent('· 44m ago');
    // Both are no-wrap, so a narrow cell breaks between them and the dot is never left at the end of a line.
    expect(pieces[0]).toHaveClass('whitespace-nowrap');
    expect(pieces[1]).toHaveClass('whitespace-nowrap');
    // The two pieces are one sentence for the eye: a plain space lets the line break between them.
    expect(container.textContent).toMatch(/^\d{2} \w{3}, \d{2}:\d{2} · 44m ago$/);
  });

  it('counts "ago" from the clock it is given', () => {
    render(<When at="2026-03-05T11:59:52.000Z" now={NOW} />);
    expect(screen.getByText('· 8s ago')).toBeInTheDocument();
  });

  it('prints a dash for a time that is missing or unreadable', () => {
    const missing = render(<When at={null} now={NOW} />);
    expect(missing.container).toHaveTextContent(NONE);
    missing.unmount();
    const unreadable = render(<When at="not a time" now={NOW} />);
    expect(unreadable.container).toHaveTextContent(NONE);
    expect(unreadable.container.querySelector('span')).toBeNull();
  });
});
