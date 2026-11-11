// Tests for useDialog in React Strict Mode: a dialog that is mounted already open (a parent that renders it only while
// it is needed) must stay open in development, where React simulates an unmount and a re-mount.
import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';
import { Modal } from './Modal';
import './testing/dialogPolyfill';

const realClose = HTMLDialogElement.prototype.close;

afterEach(() => {
  HTMLDialogElement.prototype.close = realClose;
});

/**
 * Browsers deliver a dialog's `close` event in a later task, not inside close(). The test polyfill fires it at once,
 * which hides the problem, so these tests make it late like a browser.
 */
function closeLikeABrowser() {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.open) return;
    this.removeAttribute('open');
    setTimeout(() => this.dispatchEvent(new Event('close')), 0);
  };
}

const later = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('a dialog mounted already open, in Strict Mode', () => {
  it('stays open: the late close event of the simulated unmount is not a request to close', async () => {
    closeLikeABrowser();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Modal open onClose={onClose} title="Add an admin">
          <p>Body</p>
        </Modal>
      </StrictMode>,
    );
    await later();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Add an admin' })).toHaveAttribute('open');
  });

  it('works the same for a drawer', async () => {
    closeLikeABrowser();
    const onClose = vi.fn();
    render(
      <StrictMode>
        <Drawer open onClose={onClose} title="Lina S.">
          <p>Details</p>
        </Drawer>
      </StrictMode>,
    );
    await later();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Lina S.' })).toHaveAttribute('open');
  });

  it('still reports a close the parent did not ask for', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Add an admin">
        <p>Body</p>
      </Modal>,
    );
    screen.getByRole('dialog', { name: 'Add an admin' }).dispatchEvent(new Event('close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

/** A drawer that opens a dialog from inside, like the campaign composer opening the people picker. */
function DrawerWithPicker({ onDrawerClose }: { onDrawerClose: () => void }) {
  const [picker, setPicker] = useState(false);
  return (
    <Drawer open onClose={onDrawerClose} title="New campaign">
      <button type="button" onClick={() => setPicker(true)}>
        Exclude people
      </button>
      {picker && (
        <Modal open onClose={() => setPicker(false)} title="Leave out people">
          <p>Picker</p>
        </Modal>
      )}
    </Drawer>
  );
}

// React passes a dialog's cancel and close events up its component tree, through portals, to the dialogs around it.
describe('a dialog opened from inside a drawer', () => {
  it('opens in Strict Mode and leaves the drawer open', async () => {
    closeLikeABrowser();
    const onDrawerClose = vi.fn();
    render(
      <StrictMode>
        <DrawerWithPicker onDrawerClose={onDrawerClose} />
      </StrictMode>,
    );
    await later();
    fireEvent.click(screen.getByRole('button', { name: 'Exclude people' }));
    await later();
    expect(onDrawerClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'New campaign' })).toHaveAttribute('open');
    expect(screen.getByRole('dialog', { name: 'Leave out people' })).toHaveAttribute('open');
  });

  it('closes alone on Escape: the drawer stays open', () => {
    const onDrawerClose = vi.fn();
    render(<DrawerWithPicker onDrawerClose={onDrawerClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exclude people' }));
    const escape = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog', { name: 'Leave out people' }), escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(screen.queryByRole('dialog', { name: 'Leave out people' })).not.toBeInTheDocument();
    expect(onDrawerClose).not.toHaveBeenCalled();
  });

  it('closes alone when the browser closes it: the drawer stays open', () => {
    const onDrawerClose = vi.fn();
    render(<DrawerWithPicker onDrawerClose={onDrawerClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Exclude people' }));
    fireEvent(screen.getByRole('dialog', { name: 'Leave out people' }), new Event('close'));
    expect(screen.queryByRole('dialog', { name: 'Leave out people' })).not.toBeInTheDocument();
    expect(onDrawerClose).not.toHaveBeenCalled();
  });
});
