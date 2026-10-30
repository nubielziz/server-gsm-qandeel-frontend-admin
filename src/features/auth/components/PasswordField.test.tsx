// Tests for PasswordField: the Show/Hide button, its ARIA wiring, and that the kit's hint and error text still work.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PasswordField } from './PasswordField';

describe('PasswordField', () => {
  it('starts hidden and keeps the autocomplete hint it was given', () => {
    render(<PasswordField label="New password" autoComplete="new-password" />);
    const input = screen.getByLabelText('New password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
  });

  it('toggles between password and text, and says so with aria-pressed', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" defaultValue="hunter2-hunter2" />);
    const input = screen.getByLabelText('Password');
    const show = screen.getByRole('button', { name: 'Show Password' });
    expect(show).toHaveAttribute('type', 'button');
    expect(show).toHaveAttribute('aria-pressed', 'false');
    expect(show).toHaveAttribute('aria-controls', input.id);

    await user.click(show);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide Password' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Hide Password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps the kit hint and error wiring, and a tab stop from the field to the button', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" hint="At least 10 characters." error="Enter a password." />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('At least 10 characters. Enter a password.');
    await user.click(input);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show Password' })).toHaveFocus();
  });

  it('toggles each field on its own', async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordField label="New password" />
        <PasswordField label="Confirm password" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Show New password' }));
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
  });
});
