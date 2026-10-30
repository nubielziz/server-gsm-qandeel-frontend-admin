// Tests for AuthButton: the loading state keeps the name and the focus, and blocks a second submit.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthButton } from './AuthButton';

describe('AuthButton', () => {
  it('keeps its name and focus while loading, and says it is busy', () => {
    render(<AuthButton loading>Sign in</AuthButton>);
    const button = screen.getByRole('button', { name: 'Sign in' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    // Not `disabled`: that would drop the keyboard focus the button holds.
    expect(button).toBeEnabled();
  });

  it('ignores clicks and does not submit its form while loading', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: SubmitEvent) => event.preventDefault());
    const onClick = vi.fn();
    const { rerender } = render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <AuthButton type="submit" loading onClick={onClick}>
          Sign in
        </AuthButton>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(
      <form onSubmit={(event) => onSubmit(event.nativeEvent as SubmitEvent)}>
        <AuthButton type="submit" onClick={onClick}>
          Sign in
        </AuthButton>
      </form>,
    );
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
