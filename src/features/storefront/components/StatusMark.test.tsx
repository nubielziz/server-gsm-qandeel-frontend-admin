// Tests for StatusMark: every tone of the words of this feature has its square, the square is hidden from assistive technology and the word
// stays visible (a status is never colour alone).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusMark } from './StatusMark';

describe('StatusMark', () => {
  it.each([
    ['good', 'status-sq-ok'],
    ['neutral', 'status-sq-off'],
    ['accent', 'status-sq-warn'],
    ['warn', 'status-sq-warn'],
    ['serious', 'status-sq-warn'],
    ['crit', 'status-sq-crit'],
  ] as const)('draws the tone %s with the square %s', (tone, square) => {
    render(<StatusMark tone={tone}>Word</StatusMark>);
    const mark = screen.getByText('Word').previousElementSibling;
    expect(mark).toHaveClass('status-sq', square);
    expect(mark).toHaveAttribute('aria-hidden', 'true');
  });

  it('is not a badge', () => {
    const { container } = render(<StatusMark tone="good">Done</StatusMark>);
    expect(container.querySelector('.badge')).toBeNull();
  });
});
