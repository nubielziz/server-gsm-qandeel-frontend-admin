// Tests for PhoneField: the box and its value, the flag that follows the number, and the list of calling codes.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { PhoneField, type PhoneFieldProps } from './PhoneField';

/** The box with its own state, as a form holds it. */
function Field({ start = '', ...props }: Partial<PhoneFieldProps> & { start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <PhoneField label="Phone" {...props} value={value} onValueChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const box = () => screen.getByRole('textbox', { name: 'Phone' });
const codeButton = () => screen.getByRole('button', { name: /^Country calling code/ });
const flag = () => codeButton().querySelector('img')?.getAttribute('src') ?? null;

describe('PhoneField', () => {
  it('is one left-to-right text box named by its label, with a globe while the number names no country', () => {
    render(<Field start="0791234567" hint="Optional." />);
    expect(box()).toHaveValue('0791234567');
    expect(box()).toHaveAttribute('dir', 'ltr');
    expect(box()).toHaveAttribute('inputmode', 'tel');
    expect(box()).toHaveAccessibleDescription('Optional.');
    expect(flag()).toBeNull();
    expect(codeButton()).toHaveAccessibleName('Country calling code');
  });

  it('shows the flag of the number as it is typed, and says its calling code in the button', async () => {
    const user = userEvent.setup();
    render(<Field />);
    await user.type(box(), '+962 79');
    expect(flag()).toBe('/flags/jo.svg');
    expect(codeButton()).toHaveAccessibleName('Country calling code: +962');
    expect(screen.getByTestId('value')).toHaveTextContent('+962 79');
  });

  it("lets the form's country decide between the countries of a shared calling code", () => {
    const { unmount } = render(<Field start="+1 " countryHint="CA" />);
    expect(flag()).toBe('/flags/ca.svg');
    unmount();
    render(<Field start="+1 242 555 0100" countryHint="CA" />);
    expect(flag()).toBe('/flags/bs.svg');
  });

  it('writes the calling code of the country chosen in its list, found by name or by code', async () => {
    const user = userEvent.setup();
    render(<Field start="079 123 4567" />);
    await user.click(codeButton());
    await user.keyboard('jord');
    const rows = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Jordan');
    expect(rows[0]).toHaveTextContent('+962');
    await user.keyboard('{Enter}');
    // The local number loses its leading 0 and gets the code.
    expect(box()).toHaveValue('+962 791234567');
    expect(flag()).toBe('/flags/jo.svg');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(codeButton());
    await user.keyboard('+44{Enter}');
    expect(box()).toHaveValue('+44 791234567');
    expect(flag()).toBe('/flags/gb.svg');
  });

  it('does not double the code when a whole number is pasted after choosing a country', async () => {
    const user = userEvent.setup();
    render(<Field />);
    await user.click(codeButton());
    await user.keyboard('jordan{Enter}');
    expect(box()).toHaveValue('+962 ');
    await user.click(box());
    await user.paste('+962 79 123 4567');
    expect(box()).toHaveValue('+962 79 123 4567');
  });

  it('marks the box invalid with its error and turns the box and the button off when disabled', () => {
    render(<Field error="Use at most 40 characters." disabled />);
    expect(box()).toHaveAttribute('aria-invalid', 'true');
    expect(box()).toBeDisabled();
    expect(codeButton()).toBeDisabled();
    expect(screen.getByText('Use at most 40 characters.')).toBeInTheDocument();
  });
});
