// Tests for FormSection: result kinds, pending guard, error slot, focus on the invalid field, dirty, disabled reason, "Saved".
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FormSection, type FormSectionProps } from './FormSection';
import { submitUnlessInvalid } from './formSubmit';
import { TextField } from './TextField';

type HarnessProps = Partial<Omit<FormSectionProps, 'children'>> & { invalid?: boolean };

function Harness({ onSubmit = () => {}, invalid = false, ...rest }: HarnessProps) {
  return (
    <FormSection onSubmit={onSubmit} {...rest}>
      <TextField label="Name" name="name" error={invalid ? 'Enter a name' : undefined} />
    </FormSection>
  );
}

function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<unknown>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const save = () => screen.getByRole('button', { name: 'Save' });
const formOf = (container: HTMLElement) => container.querySelector('form') as HTMLFormElement;

afterEach(() => {
  vi.useRealTimers();
});

describe('FormSection', () => {
  it('renders a form without browser validation, the fields and a Save button, and no title', () => {
    const { container } = render(<Harness />);
    expect(formOf(container)).toHaveAttribute('novalidate');
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(save()).toHaveAttribute('type', 'submit');
    expect(save()).toBeEnabled();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('uses submitLabel and savedText when given', async () => {
    const user = userEvent.setup();
    render(<Harness submitLabel="Save pricing" savedText="Pricing saved" />);
    await user.click(screen.getByRole('button', { name: 'Save pricing' }));
    expect(await screen.findByText('Pricing saved')).toBeInTheDocument();
  });

  it.each([
    ['undefined', undefined],
    ['true', true],
    ['any other value', { id: 7 }],
  ])('counts a result of %s as saved: it stays mounted and says Saved', async (_name, result) => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => Promise.resolve(result));
    render(<Harness onSubmit={onSubmit} />);
    const status = screen.getByRole('status');
    await user.click(save());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // The live region was in the page before the text appeared, and is the same element afterwards.
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Saved');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('counts a handler that returns nothing at once as saved', async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={() => {}} />);
    await user.click(save());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('clears the Saved text after a few seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(<Harness />);
    // fireEvent and act, not user-event: its waits and waitFor would hang on fake timers.
    await act(async () => {
      fireEvent.click(save());
    });
    await act(async () => {});
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('treats false as "not saved, the form showed its own errors": no text, focus on the invalid field', async () => {
    const user = userEvent.setup();
    render(<Harness invalid onSubmit={() => false} />);
    await user.click(save());
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(save()).toBeEnabled();
  });

  it('shows a returned string in the error slot, says nothing is saved and focuses the invalid field', async () => {
    const user = userEvent.setup();
    render(<Harness invalid onSubmit={() => 'Pick a name that is not taken.'} />);
    await user.click(save());
    expect(await screen.findByText('Pick a name that is not taken.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a name that is not taken.');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());
    expect(save()).toBeEnabled();
  });

  it('shows the text of an error thrown by an async handler, and lets the user try again', async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Request failed'), { detail: 'Insufficient balance.' }))
      .mockResolvedValue(undefined);
    render(<Harness onSubmit={onSubmit} />);
    await user.click(save());
    expect(await screen.findByText('Insufficient balance.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Insufficient balance.');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(save()).toBeEnabled();

    // A later save clears the error and says Saved.
    await user.click(save());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('shows the text of an error thrown at once by the handler', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        onSubmit={() => {
          throw new Error('Could not reach the server.');
        }}
      />,
    );
    await user.click(save());
    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the server.');
  });

  it('shows the pending state and ignores a second submit until the handler is done', async () => {
    const user = userEvent.setup();
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    const { container } = render(<Harness onSubmit={onSubmit} />);
    await user.click(save());
    expect(save()).toBeDisabled();
    expect(save()).toHaveAttribute('aria-busy', 'true');

    // A second press, and a submit by Enter in a field or by script: none starts a second save.
    await user.click(save());
    fireEvent.submit(formOf(container));
    fireEvent.submit(formOf(container));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(save()).toBeEnabled();
    expect(save()).not.toHaveAttribute('aria-busy');
  });

  it('ignores two submits in the same tick', () => {
    const pending = deferred();
    const onSubmit = vi.fn(() => pending.promise);
    const { container } = render(<Harness onSubmit={onSubmit} />);
    fireEvent.submit(formOf(container));
    fireEvent.submit(formOf(container));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('keeps the button off while dirty is false, and refuses a submit by Enter or by script', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container, rerender } = render(<Harness onSubmit={onSubmit} dirty={false} />);
    expect(save()).toBeDisabled();
    await user.click(save());
    fireEvent.submit(formOf(container));
    expect(onSubmit).not.toHaveBeenCalled();

    rerender(<Harness onSubmit={onSubmit} dirty />);
    expect(save()).toBeEnabled();
    await user.click(save());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('leaves the button on when dirty is not given', () => {
    render(<Harness />);
    expect(save()).toBeEnabled();
  });

  it('keeps the button off with submitDisabled and gives the reason as a tooltip and a description', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const reason = 'You need the catalog.edit permission.';
    const { container } = render(<Harness onSubmit={onSubmit} submitDisabled submitTitle={reason} />);
    expect(save()).toBeDisabled();
    expect(screen.getByTitle(reason)).toBeInTheDocument();
    expect(save()).toHaveAccessibleDescription(reason);
    await user.click(save());
    fireEvent.submit(formOf(container));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows no reason while the button is enabled or only waits for a change', () => {
    const { rerender } = render(<Harness submitTitle="Not allowed" />);
    expect(screen.queryByTitle('Not allowed')).not.toBeInTheDocument();
    rerender(<Harness submitTitle="Not allowed" dirty={false} />);
    expect(save()).toBeDisabled();
    expect(screen.queryByTitle('Not allowed')).not.toBeInTheDocument();
    expect(save()).not.toHaveAccessibleDescription('Not allowed');
  });

  it('puts className on the form', () => {
    const { container } = render(<Harness className="max-w-sm" />);
    expect(formOf(container)).toHaveClass('max-w-sm');
  });
});

describe('FormSection with react-hook-form', () => {
  function RhfHarness({ persist }: { persist: (values: { name: string }) => Promise<void> }) {
    const { register, handleSubmit, formState } = useForm<{ name: string }>();
    return (
      <FormSection onSubmit={submitUnlessInvalid(handleSubmit, persist)}>
        <TextField
          label="Name"
          error={formState.errors.name}
          {...register('name', { required: 'Enter a name' })}
        />
      </FormSection>
    );
  }

  it('does not say Saved while validation fails, and does once the values were saved', async () => {
    const user = userEvent.setup();
    const persist = vi.fn().mockResolvedValue(undefined);
    render(<RhfHarness persist={persist} />);

    await user.click(save());
    expect(await screen.findByText('Enter a name')).toBeInTheDocument();
    expect(persist).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus());

    await user.type(screen.getByLabelText('Name'), 'Acme');
    await user.click(save());
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(persist).toHaveBeenCalledWith({ name: 'Acme' }, expect.anything());
  });
});
