// Tests for CountryField: the button and its value, the list with its search, the keyboard, the empty choice, and react-hook-form.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useController, useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { CountryField, type CountryFieldProps } from './CountryField';
import { chooseCountry, countryRowTexts } from './testing/countryField';

const OPTIONS = [
  { value: '', label: 'Any country' },
  { value: 'DE', label: 'Germany' },
  { value: 'JO', label: 'Jordan' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
];

/** The field with its own state, as a page holds it. */
function Field({
  start = '',
  onPick,
  ...props
}: Partial<CountryFieldProps> & { start?: string; onPick?: (code: string) => void }) {
  const [value, setValue] = useState(start);
  return (
    <CountryField
      label="Country"
      options={OPTIONS}
      {...props}
      value={value}
      onValueChange={(code) => {
        setValue(code);
        onPick?.(code);
      }}
    />
  );
}

const field = () => screen.getByRole('combobox', { name: 'Country' });

describe('CountryField', () => {
  it('is a closed button named by its label that shows the chosen country with its flag', () => {
    render(<Field start="JO" hint="Sets the currency." />);
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(field()).toHaveAttribute('data-value', 'JO');
    expect(field()).toHaveTextContent('Jordan');
    expect(field().querySelector('img')).toHaveAttribute('src', '/flags/jo.svg');
    expect(field()).toHaveAccessibleDescription('Sets the currency.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the empty choice by its words, with no flag', () => {
    render(<Field />);
    expect(field()).toHaveTextContent('Any country');
    expect(field().querySelector('img')).toBeNull();
  });

  it('opens a list of the options with the chosen one marked, and chooses on a click', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Field start="DE" onPick={onPick} />);
    expect(await countryRowTexts(user, field())).toEqual([
      'Any country',
      'Germany',
      'Jordan',
      'United Kingdom',
      'United States',
    ]);
    await user.click(field());
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Germany' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('combobox', { name: 'Search countries' })).toHaveFocus();
    await user.click(screen.getByRole('option', { name: 'Jordan' }));
    expect(onPick).toHaveBeenCalledWith('JO');
    expect(field()).toHaveTextContent('Jordan');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(field()).toHaveFocus();
  });

  it('searches by name or code and chooses the marked row with Enter, without submitting a form around it', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <form onSubmit={onSubmit}>
        <Field />
      </form>,
    );
    await user.click(field());
    await user.keyboard('unit');
    expect(
      within(screen.getByRole('listbox'))
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['United Kingdom', 'United States']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(field()).toHaveAttribute('data-value', 'US');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('says so when the search finds no country, and Enter then chooses nothing', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Field onPick={onPick} />);
    await user.click(field());
    await user.keyboard('zzz{Enter}');
    expect(screen.getByText('No country found.')).toBeInTheDocument();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('opens from the keyboard: an arrow opens the list, a letter opens it with that letter in the search box', async () => {
    const user = userEvent.setup();
    render(<Field />);
    field().focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(field()).toHaveFocus();
    await user.keyboard('j');
    expect(screen.getByRole('combobox', { name: 'Search countries' })).toHaveValue('j');
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1);
    await user.keyboard('{Escape}');
    // A list opened by a letter marks its first answer, not the row chosen before: with United States chosen, "u" and Enter take
    // United Kingdom, the first name that starts with the letter.
    await chooseCountry(user, field(), 'US');
    field().focus();
    await user.keyboard('u{Enter}');
    expect(field()).toHaveAttribute('data-value', 'GB');
  });

  it('goes back to the empty choice', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Field start="GB" onPick={onPick} />);
    await chooseCountry(user, field(), '');
    expect(onPick).toHaveBeenCalledWith('');
    expect(field()).toHaveTextContent('Any country');
  });

  it('still shows a saved code the options do not hold', () => {
    render(<Field start="XK" />);
    expect(field()).toHaveTextContent('XK');
    expect(field()).toHaveAttribute('data-value', 'XK');
  });

  it('marks the button invalid, describes it by the error, and does not open while disabled', async () => {
    const user = userEvent.setup();
    render(<Field error="Choose a country." disabled />);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription('Choose a country.');
    await user.click(field());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders just the control without a label (a toolbar filter)', () => {
    const { container } = render(
      <CountryField aria-label="Country" options={OPTIONS} value="" onValueChange={() => {}} />,
    );
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
    expect(container.querySelector('label')).toBeNull();
  });

  it('works with useController of react-hook-form: the value, the check and the focus on the invalid field', async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    function Form() {
      const { control, handleSubmit, formState } = useForm<{ country: string }>({
        defaultValues: { country: '' },
      });
      const { field: country } = useController({
        name: 'country',
        control,
        rules: { validate: (value) => value !== '' || 'Choose a country.' },
      });
      return (
        <form onSubmit={handleSubmit(onValid)}>
          <CountryField
            label="Country"
            options={OPTIONS}
            error={formState.errors.country}
            ref={country.ref}
            name={country.name}
            value={country.value}
            onValueChange={country.onChange}
            onBlur={country.onBlur}
          />
          <button type="submit">Send</button>
        </form>
      );
    }
    render(<Form />);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Choose a country.')).toBeInTheDocument();
    expect(onValid).not.toHaveBeenCalled();
    expect(field()).toHaveFocus();
    await chooseCountry(user, field(), 'JO');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(onValid.mock.calls[0][0]).toEqual({ country: 'JO' });
  });
});
