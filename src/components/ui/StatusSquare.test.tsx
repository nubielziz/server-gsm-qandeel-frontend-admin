// Tests for StatusSquare and SquareToggle: the spoken state, one shape per tone, and the toggle button states.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SquareToggle, StatusSquare, type SquareTone } from './StatusSquare';

describe('StatusSquare', () => {
  it('is named by its label, which is also its hover title', () => {
    render(<StatusSquare tone="ok" label="Active" />);
    const square = screen.getByRole('img', { name: 'Active' });
    expect(square).toHaveAttribute('title', 'Active');
    expect(square).toHaveClass('status-sq', 'status-sq-ok');
  });

  it.each<[SquareTone, string]>([
    ['ok', 'status-sq-ok'],
    ['off', 'status-sq-off'],
    ['warn', 'status-sq-warn'],
    ['crit', 'status-sq-crit'],
  ])('draws the %s tone with %s', (tone, className) => {
    render(<StatusSquare tone={tone} label="State" />);
    expect(screen.getByRole('img', { name: 'State' })).toHaveClass(className);
  });
});

describe('SquareToggle', () => {
  it('is a toggle button that reports its state and asks for the change on click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const { rerender } = render(<SquareToggle on={false} onToggle={onToggle} label="Active" />);
    const button = screen.getByRole('button', { name: 'Active' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.firstElementChild).toHaveClass('status-sq-off');
    await user.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<SquareToggle on onToggle={onToggle} label="Active" />);
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Active' }).firstElementChild).toHaveClass('status-sq-ok');
  });

  it('is busy while a change is saved: it asks for nothing more and keeps its focus', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SquareToggle on busy onToggle={onToggle} label="On the shop" />);
    const button = screen.getByRole('button', { name: 'On the shop' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onToggle).not.toHaveBeenCalled();
    expect(button).toHaveFocus();
  });

  it('does nothing when disabled', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<SquareToggle on={false} disabled onToggle={onToggle} label="On the shop" />);
    const button = screen.getByRole('button', { name: 'On the shop' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('uses the label as its hover text unless it is given another', () => {
    const { rerender } = render(<SquareToggle on={false} onToggle={() => {}} label="Active" />);
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('title', 'Active');
    rerender(<SquareToggle on={false} onToggle={() => {}} label="Active" title="No price yet" />);
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('title', 'No price yet');
  });
});
