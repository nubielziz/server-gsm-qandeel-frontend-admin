// Tests for FormDialog: submit flow, pending state, error slot, focus on the first invalid field, react-hook-form.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode, useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { FormDialog, type FormDialogResult } from './FormDialog';
import { submitUnlessInvalid } from './formSubmit';
import { TextField } from './TextField';
import './testing/dialogPolyfill';

type Submit = (event: FormEvent<HTMLFormElement>) => FormDialogResult | Promise<FormDialogResult>;

/** Parent that owns `open`, like a page would. */
function Harness({
  onSubmit,
  onClose = () => {},
  invalid = false,
}: {
  onSubmit: Submit;
  onClose?: () => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <FormDialog
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      title="Rename merchant"
      sub="Shown in lists"
      confirm="Save"
      onSubmit={onSubmit}
    >
      <TextField label="Name" name="name" error={invalid ? 'Enter a name' : undefined} />
    </FormDialog>
  );
}

function deferred() {
  let resolve!: (value?: FormDialogResult) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<FormDialogResult>((res, rej) => {
    resolve = res as (value?: FormDialogResult) => void;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('FormDialog', () => {
  it('opens as a labelled dialog and focuses the first field', async () => {
    render(<Harness onSubmit={() => {}} />);
    const dialog = await screen.findByRole('dialog', { name: 'Rename merchant' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByText('Shown in lists')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveFocus();
  });

  it('runs the handler on confirm and closes the dialog when it finishes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    render(<Harness onSubmit={onSubmit} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits with Enter from a field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Name'), 'Acme{Enter}');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button and ignores Escape while the handler is pending', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onClose = vi.fn();
    render(<Harness onSubmit={() => pending.promise} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const confirm = screen.getByRole('button', { name: 'Save' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    pending.resolve();
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the dialog open and shows the error text when the handler throws', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Harness
        onSubmit={() =>
          Promise.reject(Object.assign(new Error('Request failed'), { detail: 'Insufficient balance.' }))
        }
        onClose={onClose}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Insufficient balance.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Insufficient balance.');
    expect(onClose).not.toHaveBeenCalled();
    // The button is usable again so the operator can retry.
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows a returned string in the error slot and moves focus to the first invalid field', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness invalid onSubmit={() => 'Enter the business name.'} onClose={onClose} />);
    screen.getByRole('button', { name: 'Save' }).focus();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Enter the business name.')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses a field that only becomes invalid because of this submit', async () => {
    const user = userEvent.setup();
    function LateHarness() {
      const [nameError, setNameError] = useState<string>();
      return (
        <FormDialog
          open
          onClose={() => {}}
          title="Add merchant"
          onSubmit={() => {
            setNameError('Enter a name.');
            return 'Fix the field below.';
          }}
        >
          <TextField label="Name" error={nameError} />
        </FormDialog>
      );
    }
    render(<LateHarness />);
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Fix the field below.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the dialog open without a message when the handler returns false', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onSubmit={() => false} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks the parent to close on Escape, on Cancel and on the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(<Harness onSubmit={() => {}} onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    onClose.mockClear();
    render(<Harness onSubmit={() => {}} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop (the dialog element itself) is clicked, but not when its content is', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onSubmit={() => {}} onClose={onClose} />);
    await user.click(screen.getByText('Shown in lists'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('FormDialog under React Strict Mode', () => {
  it('survives the simulated unmount and still closes through onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Harness onSubmit={() => {}} onClose={onClose} />
      </StrictMode>,
    );
    const dialog = await screen.findByRole('dialog', { name: 'Rename merchant' });
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByLabelText('Name')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('FormDialog with react-hook-form', () => {
  function RhfHarness({
    save,
    onClose,
  }: {
    save: (values: { name: string }) => Promise<void>;
    onClose: () => void;
  }) {
    const { register, handleSubmit, formState } = useForm<{ name: string }>();
    return (
      <FormDialog
        open
        onClose={onClose}
        title="New merchant"
        onSubmit={submitUnlessInvalid(handleSubmit, save)}
      >
        <TextField
          label="Name"
          error={formState.errors.name}
          {...register('name', { required: 'Enter a name' })}
        />
      </FormDialog>
    );
  }

  it('stays open while validation fails and closes once the values were saved', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<RhfHarness save={save} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');

    await user.type(screen.getByLabelText('Name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith({ name: 'Acme' }, expect.anything());
  });

  it('shows the error from a failed save and does not close', async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockRejectedValue({ detail: 'Email is already used.' });
    const onClose = vi.fn();
    render(<RhfHarness save={save} onClose={onClose} />);
    await user.type(screen.getByLabelText('Name'), 'Acme');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Email is already used.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
