// Tests for SectionForm: the button sits in the control column (or at the left edge) and saves only when there is something to save, the
// result of the handler decides what is said (Saved, nothing, or a sentence), and a missing permission keeps the button off with its reason.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SectionForm, type SectionFormProps } from './SectionForm';

function setup(props: Partial<SectionFormProps> = {}) {
  const onSubmit = vi.fn(props.onSubmit ?? (() => undefined));
  render(
    <SectionForm submitLabel="Save shop price" {...props} onSubmit={onSubmit}>
      <label>
        Price <input name="price" />
      </label>
    </SectionForm>,
  );
  return onSubmit;
}

describe('SectionForm', () => {
  it('puts the button in a row of its own with a blank label, under the fields', () => {
    setup();
    const button = screen.getByRole('button', { name: 'Save shop price' });
    const row = button.closest('.form-row');
    expect(row).not.toBeNull();
    expect(row?.querySelector('.form-row-label')?.textContent).toBe('');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('keeps the button off while nothing is edited, and on once it is', () => {
    const { rerender } = render(
      <SectionForm submitLabel="Save" dirty={false} onSubmit={() => undefined}>
        <input aria-label="Price" />
      </SectionForm>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    rerender(
      <SectionForm submitLabel="Save" dirty onSubmit={() => undefined}>
        <input aria-label="Price" />
      </SectionForm>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('says Saved after a save, with the words it was given', async () => {
    const user = userEvent.setup();
    const onSubmit = setup({ savedText: 'Shop price saved' });
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Shop price saved')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('says nothing when the handler answers false: the fields show the problem', async () => {
    const user = userEvent.setup();
    const onSubmit = setup({ onSubmit: () => false });
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByRole('alert', { hidden: true })).toBeEmptyDOMElement();
  });

  it('shows a sentence the handler answers in the error slot, and no Saved', async () => {
    const user = userEvent.setup();
    setup({ onSubmit: () => 'No rule covers this service.' });
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No rule covers this service.');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('shows the words of a thrown error in the error slot', async () => {
    const user = userEvent.setup();
    setup({
      onSubmit: () => {
        throw new Error('The server is busy.');
      },
    });
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The server is busy.');
  });

  it('keeps the button off with the reason when a permission is missing, and sends nothing', async () => {
    const user = userEvent.setup();
    const onSubmit = setup({
      lock: { disabled: true, title: 'You need the storefront:update permission' },
    });
    const button = screen.getByRole('button', { name: 'Save shop price' });
    expect(button).toBeDisabled();
    expect(screen.getAllByText('You need the storefront:update permission').length).toBeGreaterThan(0);
    expect(screen.getByTitle('You need the storefront:update permission')).toBeInTheDocument();
    await user.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('names the form, and puts the button and the other actions at the left edge when asked', () => {
    render(
      <SectionForm
        label="Custom Fields"
        placement="edge"
        actions={<button type="button">Add a field</button>}
        onSubmit={() => undefined}
      >
        <input aria-label="Key" />
      </SectionForm>,
    );
    const form = screen.getByRole('form', { name: 'Custom Fields' });
    const save = screen.getByRole('button', { name: 'Save' });
    expect(form).toContainElement(save);
    expect(save.closest('.form-row')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add a field' })).toBeInTheDocument();
  });
});
