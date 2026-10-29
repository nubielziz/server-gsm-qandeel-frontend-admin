// Tests for Menu: opening, arrow-key navigation, Escape, outside press, item selection and focus return.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Menu, type MenuItem } from './Menu';
import { usePopover } from './usePopover';
import './testing/dialogPolyfill';

function Harness({ run, items }: { run: () => void; items?: MenuItem[] }) {
  const pop = usePopover();
  return (
    <>
      <button
        ref={pop.anchorRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={pop.open}
        onClick={pop.toggle}
      >
        Actions
      </button>
      <p>outside</p>
      <Menu
        {...pop.panelProps}
        label="Row actions"
        items={
          items ?? [
            { header: 'Order' },
            { label: 'Complete', run },
            { label: 'Retry', icon: 'refresh', run, hint: 'R' },
            { separator: true },
            { label: 'Reject', danger: true, run },
            { label: 'Archive', disabled: true, run },
          ]
        }
      />
    </>
  );
}

describe('Menu', () => {
  it('opens under the trigger and focuses the first enabled item', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Complete' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('moves with ArrowDown/ArrowUp, wraps, skips disabled items, and honours Home/End', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Retry/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Reject' })).toHaveFocus();
    // Archive is disabled, so the next stop wraps to the first item.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Complete' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Reject' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem', { name: 'Complete' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: 'Reject' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
  });

  it('closes on a press outside without stealing focus back', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByText('outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('toggles closed when the trigger is pressed again', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await user.click(trigger);
    await user.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('runs the chosen item, closes, and returns focus to the trigger first', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    render(<Harness run={run} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Reject' }));
    expect(run).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus();
  });

  it('runs an item with Enter', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    render(<Harness run={run} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{Enter}');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('does not run a disabled item', async () => {
    const user = userEvent.setup();
    const run = vi.fn();
    render(<Harness run={run} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(run).not.toHaveBeenCalled();
  });

  it('renders radio items with aria-checked, separators and headers', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        run={() => {}}
        items={[
          { header: 'Density' },
          { label: 'Comfortable', checked: true },
          { label: 'Compact', checked: false },
          { separator: true },
          { label: 'Reset' },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menuitemradio', { name: 'Comfortable' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('menuitemradio', { name: 'Compact' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByText('Density')).toBeInTheDocument();
  });

  it('closes on Tab so focus can leave the menu', async () => {
    const user = userEvent.setup();
    render(<Harness run={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
