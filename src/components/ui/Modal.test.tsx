// Modal: who may close it. A click on the backdrop asks to close by default; a flow of several steps turns that off and keeps
// Escape and the close button.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal and its backdrop', () => {
  it('asks to close when the backdrop (the dialog element itself) is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Pick the groups">
        <p>Body text</p>
      </Modal>,
    );
    await user.click(screen.getByText('Body text'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores a click on the backdrop when backdropCloses is false, and still closes from its close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Pick the groups" backdropCloses={false}>
        <p>Body text</p>
      </Modal>,
    );
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
