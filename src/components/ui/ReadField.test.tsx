// Tests for ReadField: a label with a plain value, whose hint and error are tied to the value group with aria-describedby, in both layouts.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadField } from './ReadField';

describe('ReadField', () => {
  it('is a group named by its label and holding the value', () => {
    render(<ReadField label="Version">3.4</ReadField>);
    const group = screen.getByRole('group', { name: 'Version' });
    expect(group).toHaveTextContent('3.4');
    expect(group).not.toHaveAttribute('aria-describedby');
  });

  it('ties the hint and the error to the value group, so they are read with the value', () => {
    render(
      <ReadField
        label="Version"
        hint="The next free number."
        error="Version 3.4 already exists for this document."
      >
        3.4
      </ReadField>,
    );
    const group = screen.getByRole('group', { name: 'Version' });
    expect(group).toHaveAccessibleDescription(
      'The next free number. Version 3.4 already exists for this document.',
    );
    const error = screen.getByText('Version 3.4 already exists for this document.');
    expect(group.getAttribute('aria-describedby')?.split(' ')).toContain(error.id);
  });

  it('ties only the error when there is no hint, and only the hint when there is no error', () => {
    const { rerender } = render(
      <ReadField label="Key" error="Key taken.">
        a_key
      </ReadField>,
    );
    expect(screen.getByRole('group', { name: 'Key' })).toHaveAccessibleDescription('Key taken.');
    rerender(
      <ReadField label="Key" hint="Made from the name.">
        a_key
      </ReadField>,
    );
    expect(screen.getByRole('group', { name: 'Key' })).toHaveAccessibleDescription('Made from the name.');
  });

  it('does the same in the row layout', () => {
    render(
      <ReadField label="Address" layout="row" hint="Where the page lives." error="Address taken.">
        /about
      </ReadField>,
    );
    expect(screen.getByRole('group', { name: 'Address' })).toHaveAccessibleDescription(
      'Where the page lives. Address taken.',
    );
  });
});
