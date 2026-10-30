// Tests for PasswordField: the Show/Hide button (its name, type and wiring), and the error and hint wiring of AuthField.
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

  it('toggles between password and text with a plain button whose label says what it does', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" defaultValue="hunter2-hunter2" />);
    const input = screen.getByLabelText('Password');
    const show = screen.getByRole('button', { name: 'Show password' });
    expect(show).toHaveAttribute('type', 'button');
    expect(show).toHaveAttribute('aria-controls', input.id);
    expect(show).toHaveTextContent('Show');

    await user.click(show);
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('hunter2-hunter2');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('ties the error to the field with aria-invalid, aria-errormessage and the description', async () => {
    const user = userEvent.setup();
    render(<PasswordField label="Password" hint="At least 10 characters." error="Enter a password." />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-errormessage', `${input.id}-error`);
    expect(document.getElementById(`${input.id}-error`)).toHaveTextContent('Enter a password.');
    expect(input).toHaveAccessibleDescription('Enter a password. At least 10 characters.');
    await user.click(input);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus();
  });

  it('has no error wiring while the value is fine', () => {
    render(<PasswordField label="Password" />);
    const input = screen.getByLabelText('Password');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-errormessage');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('toggles each field on its own', async () => {
    const user = userEvent.setup();
    render(
      <>
        <PasswordField label="New password" />
        <PasswordField label="Confirm password" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Show new password' }));
    expect(screen.getByLabelText('New password')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute('type', 'password');
  });
});
