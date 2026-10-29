// Tests for the form fields: label wiring, hint and error text, aria-invalid, and react-hook-form's register().
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { CheckboxField } from './CheckboxField';
import { RadioGroup } from './RadioGroup';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
import { TextField } from './TextField';

describe('TextField', () => {
  it('ties the label, hint and error text to the input', () => {
    render(<TextField label="Contact email" hint="Visible to staff only." error="Enter a valid email." />);
    const input = screen.getByLabelText('Contact email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Visible to staff only. Enter a valid email.');
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument();
  });

  it('is not invalid without an error and accepts a react-hook-form style error object', () => {
    const { rerender } = render(<TextField label="Name" />);
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
    rerender(<TextField label="Name" error={{ message: 'Enter a name.' }} />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter a name.')).toBeInTheDocument();
  });

  it('forwards its ref to the input element', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<TextField label="Name" ref={ref} />);
    expect(ref.current).toBe(screen.getByLabelText('Name'));
  });

  it('works with register() from react-hook-form', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    function Form() {
      const { register, handleSubmit } = useForm<{
        name: string;
        note: string;
        plan: string;
        agree: boolean;
        mode: string;
      }>({
        defaultValues: { mode: 'b' },
      });
      return (
        <form onSubmit={handleSubmit(onValid)}>
          <TextField label="Name" {...register('name')} />
          <TextareaField label="Note" {...register('note')} />
          <SelectField
            label="Plan"
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'pro', label: 'Pro' },
            ]}
            {...register('plan')}
          />
          <CheckboxField label="I agree" {...register('agree')} />
          <RadioGroup
            legend="Mode"
            options={[
              { value: 'a', label: 'Mode A' },
              { value: 'b', label: 'Mode B' },
            ]}
            {...register('mode')}
          />
          <button type="submit">Send</button>
        </form>
      );
    }
    render(<Form />);
    await user.type(screen.getByLabelText('Name'), 'Acme');
    await user.type(screen.getByLabelText('Note'), 'Hello');
    await user.selectOptions(screen.getByLabelText('Plan'), 'pro');
    await user.click(screen.getByLabelText('I agree'));
    await user.click(screen.getByLabelText('Mode A'));
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onValid).toHaveBeenCalledTimes(1);
    expect(onValid.mock.calls[0][0]).toEqual({
      name: 'Acme',
      note: 'Hello',
      plan: 'pro',
      agree: true,
      mode: 'a',
    });
  });
});

describe('SelectField', () => {
  it('renders just the select wrapper when it has no label (toolbar filter)', () => {
    const { container } = render(
      <SelectField aria-label="Filter by type" options={[{ value: '', label: 'All types' }]} />,
    );
    expect(screen.getByRole('combobox', { name: 'Filter by type' })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass('select-wrap');
  });
});

describe('RadioGroup', () => {
  it('shows the legend, the descriptions and the controlled choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RadioGroup
        legend="Password"
        name="pw"
        value="reset"
        onChange={onChange}
        options={[
          { value: 'reset', label: 'Send a reset link', description: 'They choose a new password.' },
          { value: 'temp', label: 'Set a temporary password' },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'Password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Send a reset link/)).toBeChecked();
    expect(screen.getByText('They choose a new password.')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/Set a temporary password/));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
