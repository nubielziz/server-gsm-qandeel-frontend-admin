// Tests for the buttons of the single-services path on each screen: what the primary button says while a long list goes, after a batch
// failed, and when it is all done.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SinglesFooter, type SinglesFooterProps } from './SinglesFooter';

function show(props: Partial<SinglesFooterProps>) {
  const onBack = vi.fn();
  const onClose = vi.fn();
  const footer = (changes: Partial<SinglesFooterProps>) => (
    <SinglesFooter
      stage="pick"
      busy={false}
      selecting={false}
      picked={0}
      importable={0}
      previewRun={null}
      importRun={null}
      began={false}
      done={false}
      lock={{ disabled: false }}
      onBack={onBack}
      onClose={onClose}
      {...changes}
    />
  );
  const view = render(footer(props));
  return {
    onBack,
    onClose,
    unmount: view.unmount,
    /** Shows the same footer with other props, the way the dialog does when the step changes. */
    change: (changes: Partial<SinglesFooterProps>) => view.rerender(footer({ ...props, ...changes })),
  };
}

describe('the picker', () => {
  it('has Back, and Preview with the count once something is picked', () => {
    show({ picked: 3 });
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Preview (3)' })).toBeEnabled();
  });

  it('holds Preview back with nothing picked', () => {
    show({ picked: 0 });
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
  });

  it('holds Preview back while the select-all box reads ids', () => {
    show({ picked: 3, selecting: true });
    expect(screen.getByRole('button', { name: 'Preview (3)' })).toBeDisabled();
  });

  it('says how far a long preview is, and cannot be left meanwhile', () => {
    show({ picked: 1_132, busy: true, previewRun: { upTo: 500, handled: 0, total: 1_132 } });
    expect(screen.getByRole('button', { name: 'Previewing 500 of 1,132…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('goes back to the first step', async () => {
    const { onBack } = show({ picked: 1 });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('without the permission to add services', () => {
  const lock = { disabled: true, title: 'You need the catalog:create permission' };

  it('holds Preview and Start back and says what is missing', () => {
    const { unmount } = show({ picked: 3, lock });
    expect(screen.getByRole('button', { name: 'Preview (3)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview (3)' })).toHaveAttribute('title', lock.title);
    unmount();
    show({ stage: 'finish', importable: 3, lock });
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('title', lock.title);
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
  });
});

describe('the preview', () => {
  it('goes on with Next, or says there is nothing to add', () => {
    show({ stage: 'preview', importable: 2 });
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('is disabled when every picked service already matches', () => {
    show({ stage: 'preview', importable: 0 });
    expect(screen.getByRole('button', { name: 'Nothing to add' })).toBeDisabled();
  });
});

describe('the last step', () => {
  it('starts with Start, after Back', () => {
    show({ stage: 'finish', importable: 3 });
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('says how far a long import is', () => {
    show({
      stage: 'finish',
      busy: true,
      importable: 1_132,
      importRun: { upTo: 1_000, handled: 500, total: 1_132 },
      began: true,
    });
    expect(screen.getByRole('button', { name: 'Adding 1,000 of 1,132…' })).toBeDisabled();
  });

  it('offers Back, Close and Continue after a batch failed with some already added', async () => {
    const user = userEvent.setup();
    const { onBack, onClose } = show({
      stage: 'finish',
      importable: 1_132,
      importRun: { upTo: null, handled: 500, total: 1_132 },
      began: true,
    });
    expect(screen.getByRole('button', { name: 'Continue adding (632 left)' })).toBeEnabled();
    // Back returns to the picks, where the services the server refused can be unticked: a stopped run is not a dead end.
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('holds Back and Close while a batch is going', () => {
    show({
      stage: 'finish',
      busy: true,
      importable: 1_132,
      importRun: { upTo: 1_000, handled: 500, total: 1_132 },
      began: true,
    });
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });

  it('keeps Back and Start after the first batch failed (nothing went through)', () => {
    show({
      stage: 'finish',
      importable: 1_132,
      importRun: { upTo: null, handled: 0, total: 1_132 },
      began: false,
    });
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
  });

  it('has only Done when every batch was answered', async () => {
    const { onClose } = show({ stage: 'finish', importable: 3, began: true, done: true });
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('the primary button of each step', () => {
  it('is a new button on each step, so a second press on Next cannot land on Start', () => {
    const { change } = show({ stage: 'preview', importable: 3 });
    const next = screen.getByRole('button', { name: 'Next' });
    change({ stage: 'finish' });
    const start = screen.getByRole('button', { name: 'Start' });
    expect(start).not.toBe(next);
    expect(next).not.toBeInTheDocument();
  });

  it('is a new button when the picker goes on to the preview, too', () => {
    const { change } = show({ stage: 'pick', picked: 3 });
    const preview = screen.getByRole('button', { name: 'Preview (3)' });
    change({ stage: 'preview', importable: 3 });
    expect(preview).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).not.toBe(preview);
  });
});
