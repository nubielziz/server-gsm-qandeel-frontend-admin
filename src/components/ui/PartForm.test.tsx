// Tests for the frame of a part that is a form: the pinned Save bar (off while nothing changed or the role may not save), what the save
// result means ("Saved", the error slot, fields that show their own errors) and that a second submit is ignored while one runs.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PartForm, type PartFormProps } from './PartForm';

function setup(props: Partial<PartFormProps> = {}) {
  const onSubmit = vi.fn<PartFormProps['onSubmit']>(() => undefined);
  const view = render(
    <PartForm onSubmit={onSubmit} dirty {...props}>
      <label>
        Name
        <input />
      </label>
    </PartForm>,
  );
  return { onSubmit, ...view, user: userEvent.setup() };
}

const save = () => screen.getByRole('button', { name: 'Save' });

describe('PartForm', () => {
  it('draws its fields and the Save button in the pinned bar', () => {
    setup();
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(save().closest('.pinned-bar')).not.toBeNull();
    expect(save()).toHaveAttribute('type', 'submit');
  });

  it('keeps Save off while nothing changed', () => {
    setup({ dirty: false });
    expect(save()).toBeDisabled();
  });

  it('runs the submit when Save is clicked, though the button sits outside the form, and says Saved', async () => {
    const { onSubmit, user } = setup();
    await user.click(save());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('says what it is told to after a save', async () => {
    const { user } = setup({ savedText: 'Overview saved' });
    await user.click(save());
    expect(await screen.findByText('Overview saved')).toBeInTheDocument();
  });

  it('shows no Saved and no error when the submit says false (the fields show their own errors)', async () => {
    const { onSubmit, user } = setup();
    onSubmit.mockResolvedValue(false);
    await user.click(save());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('shows a sentence the submit returns in the error slot', async () => {
    const { onSubmit, user } = setup();
    onSubmit.mockResolvedValue('Nothing to send yet.');
    await user.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('Nothing to send yet.');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('shows the words of an error the submit throws', async () => {
    const { onSubmit, user } = setup();
    onSubmit.mockRejectedValue(new Error('The server said no.'));
    await user.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('The server said no.');
  });

  it('clears the old error when the next save starts', async () => {
    const { onSubmit, user } = setup();
    onSubmit.mockResolvedValueOnce('First problem.');
    await user.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('First problem.');
    await user.click(save());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('ignores a second submit while the first one runs', async () => {
    const { onSubmit, user } = setup();
    let finish: () => void = () => undefined;
    onSubmit.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await user.click(save());
    expect(save()).toBeDisabled();
    await user.click(save());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('keeps Save off for a missing permission and says why beside it', async () => {
    const { onSubmit, user } = setup({
      lock: { disabled: true, title: 'You need the catalog:update permission' },
    });
    expect(save()).toBeDisabled();
    expect(screen.getByText('You need the catalog:update permission')).toBeInTheDocument();
    await user.click(save());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses the words it is given for the button', () => {
    setup({ submitLabel: 'Apply' });
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });
});
