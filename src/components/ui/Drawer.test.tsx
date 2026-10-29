// Tests for Drawer: content only while open, title/badges/footer slots, Escape and close button ask the parent.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';
import './testing/dialogPolyfill';

function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open details
      </button>
      <Drawer
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="GSM-1042"
        badges={<span>Needs review</span>}
        sub="Created 12 Oct"
        footer={<button type="button">Complete</button>}
      >
        <p>Order body</p>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('renders nothing visible while closed and the slots once open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByText('Order body')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    const drawer = await screen.findByRole('dialog', { name: 'GSM-1042' });
    expect(drawer).toHaveClass('drawer');
    expect(screen.getByText('Needs review')).toBeInTheDocument();
    expect(screen.getByText('Created 12 Oct')).toBeInTheDocument();
    expect(screen.getByText('Order body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
  });

  it('closes with Escape and with the close button', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.click(screen.getByRole('button', { name: 'Close details' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('starts fresh on every opening', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Open details' }));
    expect(screen.getAllByText('Order body')).toHaveLength(1);
  });
});
