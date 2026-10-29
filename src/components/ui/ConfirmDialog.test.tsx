// Tests for ConfirmDialog: the review step before a money-moving or destructive action.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';
import './testing/dialogPolyfill';

function Harness({
  onConfirm,
  onClose = () => {},
  kind = 'danger',
}: {
  onConfirm: () => void | Promise<void>;
  onClose?: () => void;
  kind?: 'primary' | 'danger';
}) {
  const [open, setOpen] = useState(true);
  return (
    <ConfirmDialog
      open={open}
      onClose={() => {
        onClose();
        setOpen(false);
      }}
      title="Refund order"
      body="This returns $24.00 to the merchant wallet."
      confirm="Refund"
      kind={kind}
      onConfirm={onConfirm}
    />
  );
}

describe('ConfirmDialog', () => {
  it('states the consequence before the confirm button', async () => {
    render(<Harness onConfirm={() => {}} />);
    expect(await screen.findByRole('dialog', { name: 'Refund order' })).toBeInTheDocument();
    expect(screen.getByText('This returns $24.00 to the merchant wallet.')).toBeInTheDocument();
  });

  it('runs the confirm handler once and then closes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<Harness onConfirm={onConfirm} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('disables the confirm button while the action runs, so it cannot be sent twice', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onConfirm = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(screen.getByRole('button', { name: 'Refund' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the error and stays open when the action fails', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Harness onConfirm={() => Promise.reject(new Error('The wallet is frozen.'))} onClose={onClose} />,
    );
    await user.click(screen.getByRole('button', { name: 'Refund' }));
    expect(await screen.findByText('The wallet is frozen.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Refund' })).toBeEnabled();
  });

  it('uses the solid critical fill for a danger confirm and the ink fill otherwise', () => {
    const { unmount } = render(<Harness onConfirm={() => {}} kind="danger" />);
    expect(screen.getByRole('button', { name: 'Refund' })).toHaveClass('btn-danger-solid');
    unmount();
    render(<Harness onConfirm={() => {}} kind="primary" />);
    expect(screen.getByRole('button', { name: 'Refund' })).toHaveClass('btn-primary');
  });
});
