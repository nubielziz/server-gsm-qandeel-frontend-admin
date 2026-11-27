// Tests for the link menu of the campaign message: a stored link the menu does not know shows as "Another page…" with its text, and the
// text box keeps what is typed.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { LinkField } from './LinkField';

/** The field with the value it is given and a line that shows the value the form holds. */
function Host({ start, error }: { start: string; error?: string }) {
  const [value, setValue] = useState(start);
  return (
    <>
      <LinkField
        linkKey="customer"
        label="Link for retail accounts"
        boxLabel="Page address for retail accounts"
        placeholder="/account/orders"
        value={value}
        error={error}
        onChange={setValue}
      />
      <output aria-label="Held">{value}</output>
    </>
  );
}

describe('LinkField', () => {
  it('shows a known page as chosen, with the path it opens, and no text box', () => {
    render(<Host start="/account/wallet" />);
    expect(screen.getByRole('combobox', { name: 'Link for retail accounts' })).toHaveValue('/account/wallet');
    expect(screen.getByText('A click opens /account/wallet.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('shows a stored link the menu does not know as "Another page…" with its text', () => {
    render(<Host start="/account/settings/security" />);
    expect(screen.getByRole('combobox', { name: 'Link for retail accounts' })).toHaveDisplayValue(
      'Another page…',
    );
    expect(screen.getByRole('textbox', { name: 'Page address for retail accounts' })).toHaveValue(
      '/account/settings/security',
    );
  });

  it('shows no link as "No link"', () => {
    render(<Host start="" />);
    expect(screen.getByRole('combobox', { name: 'Link for retail accounts' })).toHaveDisplayValue('No link');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not jump back to "No link" while the box is open and empty', async () => {
    const user = userEvent.setup();
    render(<Host start="/account/orders" />);
    await user.selectOptions(screen.getByRole('combobox'), 'Another page…');
    const box = screen.getByRole('textbox', { name: 'Page address for retail accounts' });
    expect(box).toHaveValue('');
    expect(screen.getByLabelText('Held')).toHaveTextContent('');
    await user.type(box, '/abc');
    await user.clear(box);
    expect(screen.getByRole('combobox')).toHaveDisplayValue('Another page…');
    expect(screen.getByRole('textbox', { name: 'Page address for retail accounts' })).toBeInTheDocument();
  });

  it('puts the message under the box when it is open, under the menu when it is not', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Host start="/account/orders" error="Use a page of the account area." />);
    expect(screen.getByText('Use a page of the account area.')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    rerender(<Host start="/account/orders" error="Use a page of the account area." />);
    await user.selectOptions(screen.getByRole('combobox'), 'Another page…');
    expect(screen.getAllByText('Use a page of the account area.')).toHaveLength(1);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
