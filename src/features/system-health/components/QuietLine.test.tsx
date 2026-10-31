// Tests for QuietLine: the words, a Show / Hide button that names what it acts on, its state, and the hairline.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuietLine } from './QuietLine';

describe('QuietLine', () => {
  it('says what is folded and offers Show, named for screen readers, collapsed', async () => {
    const onToggle = vi.fn();
    render(
      <QuietLine text="5 suppliers healthy" what="the healthy suppliers" open={false} onToggle={onToggle} />,
    );
    expect(screen.getByText('5 suppliers healthy')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Show the healthy suppliers' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.setup().click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('offers Hide while the items are shown, and points at the list it controls', () => {
    render(
      <QuietLine
        text="3 checks passed"
        what="the passed checks"
        open
        onToggle={() => {}}
        controls="checks-list"
      />,
    );
    const button = screen.getByRole('button', { name: 'Hide the passed checks' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'checks-list');
  });

  it('draws a hairline only when a list stands above it', () => {
    const { container, rerender } = render(
      <QuietLine text="4 surfaces OK" what="the healthy surfaces" open={false} onToggle={() => {}} />,
    );
    expect(container.firstElementChild).not.toHaveClass('border-t');
    rerender(
      <QuietLine text="4 surfaces OK" what="the healthy surfaces" open={false} onToggle={() => {}} divided />,
    );
    expect(container.firstElementChild).toHaveClass('border-t');
  });
});
