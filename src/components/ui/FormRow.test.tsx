// Tests for FormRow, SectionHeading and layout="row" on the fields: label ties, the decorative star, hint and error ids, groups.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckboxField } from './CheckboxField';
import { FieldFrame } from './FieldFrame';
import { FormRow } from './FormRow';
import { SectionHeading } from './SectionHeading';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
import { TextField } from './TextField';

describe('FormRow', () => {
  it('ties the label to the control and keeps the star out of the name', () => {
    render(
      <FormRow label="Service Name" htmlFor="svc-name" required>
        <input id="svc-name" required />
      </FormRow>,
    );
    expect(screen.getByRole('textbox', { name: 'Service Name' })).toBeRequired();
    const star = screen.getByText('*');
    expect(star).toHaveAttribute('aria-hidden', 'true');
    expect(star.closest('label')).toHaveAttribute('for', 'svc-name');
  });

  it('draws no star unless the row is required', () => {
    render(
      <FormRow label="Code" htmlFor="svc-code">
        <input id="svc-code" />
      </FormRow>,
    );
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });

  it('gives the hint and the error the ids the kit uses, so the control can point to them', () => {
    render(
      <FormRow label="Credit" htmlFor="svc-credit" hint="In USD." error="Enter a price.">
        <input id="svc-credit" aria-describedby="svc-credit-hint svc-credit-error" />
      </FormRow>,
    );
    expect(document.getElementById('svc-credit-hint')).toHaveTextContent('In USD.');
    expect(document.getElementById('svc-credit-error')).toHaveTextContent('Enter a price.');
    expect(screen.getByRole('textbox', { name: 'Credit' })).toHaveAccessibleDescription(
      'In USD. Enter a price.',
    );
  });

  it('is a group named by its label when it holds several controls', () => {
    render(
      <FormRow label="Delivery Time">
        <input aria-label="Amount" />
        <select aria-label="Unit">
          <option>Minutes</option>
        </select>
      </FormRow>,
    );
    const group = screen.getByRole('group', { name: 'Delivery Time' });
    expect(within(group).getByRole('textbox', { name: 'Amount' })).toBeInTheDocument();
    expect(within(group).getByRole('combobox', { name: 'Unit' })).toBeInTheDocument();
  });

  it('leaves the label column blank for an empty label', () => {
    const { container } = render(
      <FormRow label={null}>
        <span>Only the control</span>
      </FormRow>,
    );
    expect(container.querySelector('.form-row-label')).toBeEmptyDOMElement();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByText('Only the control')).toBeInTheDocument();
  });
});

describe('layout="row" on the fields', () => {
  it('puts a TextField in a label-left row, wired like the stacked one', () => {
    const { container } = render(
      <TextField
        layout="row"
        label="Service Name"
        required
        hint="Shown to merchants."
        error="Enter a name."
      />,
    );
    expect(container.querySelector('.form-row')).not.toBeNull();
    const input = screen.getByRole('textbox', { name: 'Service Name' });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Shown to merchants. Enter a name.');
    expect(screen.getByText('*')).toBeInTheDocument();
    // The layout is a prop of the field, not an attribute of the input; the input does not fill a wide view.
    expect(input).not.toHaveAttribute('layout');
    expect(input).toHaveClass('input', 'row-control');
  });

  it('keeps the label above the control by default', () => {
    const { container } = render(<TextField label="Service Name" required />);
    expect(container.querySelector('.form-row')).toBeNull();
    expect(screen.getByText('Service Name')).toHaveClass('label');
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Service Name' })).not.toHaveClass('row-control');
  });

  it('puts a SelectField in a row, also without a label', () => {
    const options = [
      { value: 'a', label: 'Group A' },
      { value: 'b', label: 'Group B' },
    ];
    const { container, rerender } = render(
      <SelectField layout="row" label="Service Listed In Group" options={options} />,
    );
    expect(container.querySelector('.form-row')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: 'Service Listed In Group' })).toBeInTheDocument();
    rerender(<SelectField layout="row" aria-label="Unit" options={options} />);
    expect(container.querySelector('.form-row')).not.toBeNull();
    expect(container.querySelector('.form-row-label')).toBeEmptyDOMElement();
    rerender(<SelectField aria-label="Unit" options={options} />);
    expect(container.querySelector('.form-row')).toBeNull();
  });

  it('puts a TextareaField in a row', () => {
    const { container } = render(<TextareaField layout="row" label="IP Range" hint="One range per line." />);
    expect(container.querySelector('.form-row')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'IP Range' })).toHaveAccessibleDescription(
      'One range per line.',
    );
  });

  it('puts a CheckboxField in the control column, under a blank label column', () => {
    const { container } = render(
      <CheckboxField layout="row" label="Add services from a supplier" hint="Opens the supplier form." />,
    );
    expect(container.querySelector('.form-row-label')).toBeEmptyDOMElement();
    const box = screen.getByRole('checkbox', { name: 'Add services from a supplier' });
    expect(within(container.querySelector('.form-row-body') as HTMLElement).getByRole('checkbox')).toBe(box);
    expect(box).toHaveAccessibleDescription('Opens the supplier form.');
  });

  it('draws a FieldFrame as a row when asked', () => {
    const { container } = render(
      <FieldFrame id="free" label="Credit" layout="row">
        <input id="free" />
      </FieldFrame>,
    );
    expect(container.querySelector('.form-row')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Credit' })).toBeInTheDocument();
  });
});

describe('SectionHeading', () => {
  it('is an h2 by default and an h3 on request', () => {
    const { rerender } = render(<SectionHeading>Bind Login</SectionHeading>);
    expect(screen.getByRole('heading', { level: 2, name: 'Bind Login' })).toHaveClass('section-heading');
    rerender(<SectionHeading as="h3">Allow Country</SectionHeading>);
    expect(screen.getByRole('heading', { level: 3, name: 'Allow Country' })).toBeInTheDocument();
  });

  it('adds the caller classes', () => {
    render(<SectionHeading className="mt-0">Overview</SectionHeading>);
    expect(screen.getByRole('heading', { name: 'Overview' })).toHaveClass('section-heading', 'mt-0');
  });
});
