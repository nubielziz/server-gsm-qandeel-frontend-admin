// Tests for the keyboard shortcuts on their own: the keys, the typing guard, the open-dialog guard and the "g then …" window.
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GO_SHORTCUTS, GO_WINDOW_MS, useGlobalShortcuts, type ShortcutHandlers } from './useGlobalShortcuts';

function Harness({ handlers, withSearch = true }: { handlers: ShortcutHandlers; withSearch?: boolean }) {
  useGlobalShortcuts(handlers);
  return (
    <>
      <input aria-label="field" />
      {withSearch && <input aria-label="search" data-fk="" />}
    </>
  );
}

function setup() {
  const handlers = {
    togglePalette: vi.fn(),
    openPalette: vi.fn(),
    openShortcuts: vi.fn(),
    goTo: vi.fn(),
  };
  const view = render(<Harness handlers={handlers} />);
  return { handlers, user: userEvent.setup(), ...view };
}

afterEach(() => vi.restoreAllMocks());

describe('useGlobalShortcuts', () => {
  it('toggles the palette on Ctrl+K and ⌘K, even while typing, and keeps the browser from using the key', async () => {
    const { handlers, user } = setup();
    await user.keyboard('{Control>}k{/Control}');
    await user.keyboard('{Meta>}K{/Meta}');
    expect(handlers.togglePalette).toHaveBeenCalledTimes(2);

    await user.click(document.querySelector<HTMLInputElement>('[aria-label=field]')!);
    await user.keyboard('{Control>}k{/Control}');
    expect(handlers.togglePalette).toHaveBeenCalledTimes(3);

    const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('"/" focuses the page search field, and opens the palette when there is none', async () => {
    const { handlers, user, getByLabelText, rerender } = setup();
    await user.keyboard('/');
    expect(getByLabelText('search')).toHaveFocus();
    expect(handlers.openPalette).not.toHaveBeenCalled();

    rerender(<Harness handlers={handlers} withSearch={false} />);
    await user.keyboard('/');
    expect(handlers.openPalette).toHaveBeenCalledOnce();
  });

  it('"?" opens the shortcut list', async () => {
    const { handlers, user } = setup();
    await user.keyboard('?');
    expect(handlers.openShortcuts).toHaveBeenCalledOnce();
  });

  it.each(Object.entries(GO_SHORTCUTS))('"g" then "%s" opens %s', async (key, page) => {
    const { handlers, user } = setup();
    await user.keyboard(`g${key}`);
    expect(handlers.goTo).toHaveBeenCalledExactlyOnceWith(page);
  });

  it('matches the demo’s map: 13 pages, with audit on "a" and no key for settings, checkouts or admins', () => {
    expect(Object.keys(GO_SHORTCUTS)).toHaveLength(13);
    expect(GO_SHORTCUTS.a).toBe('audit');
    expect(Object.values(GO_SHORTCUTS)).not.toContain('settings');
    expect(Object.values(GO_SHORTCUTS)).not.toContain('access');
    expect(Object.values(GO_SHORTCUTS)).not.toContain('checkouts');
  });

  it('does nothing for a second key that is not on the map, and forgets the "g"', async () => {
    const { handlers, user } = setup();
    await user.keyboard('gz');
    await user.keyboard('o');
    expect(handlers.goTo).not.toHaveBeenCalled();
  });

  it('lets a second "g" restart the wait', async () => {
    const { handlers, user } = setup();
    await user.keyboard('ggo');
    expect(handlers.goTo).toHaveBeenCalledExactlyOnceWith('orders');
  });

  it('ignores the second key after 1.2 seconds', async () => {
    const { handlers, user } = setup();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    await user.keyboard('g');
    now.mockReturnValue(1_000_000 + GO_WINDOW_MS);
    await user.keyboard('o');
    expect(handlers.goTo).not.toHaveBeenCalled();

    now.mockReturnValue(2_000_000);
    await user.keyboard('g');
    now.mockReturnValue(2_000_000 + GO_WINDOW_MS - 1);
    await user.keyboard('o');
    expect(handlers.goTo).toHaveBeenCalledExactlyOnceWith('orders');
  });

  it('stays quiet while typing in a field', async () => {
    const { handlers, user, getByLabelText } = setup();
    await user.click(getByLabelText('field'));
    await user.keyboard('go/?');
    expect(handlers.goTo).not.toHaveBeenCalled();
    expect(handlers.openPalette).not.toHaveBeenCalled();
    expect(handlers.openShortcuts).not.toHaveBeenCalled();
    expect(getByLabelText('field')).toHaveValue('go/?');
  });

  it('stays quiet while a dialog is open', async () => {
    const { handlers, user } = setup();
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    await user.keyboard('go?/');
    expect(handlers.goTo).not.toHaveBeenCalled();
    expect(handlers.openShortcuts).not.toHaveBeenCalled();
    expect(handlers.openPalette).not.toHaveBeenCalled();
    // ⌘K still works, so the palette can be closed from inside itself.
    await user.keyboard('{Control>}k{/Control}');
    expect(handlers.togglePalette).toHaveBeenCalledOnce();
    dialog.remove();
  });

  it('does not treat shortcuts typed with Alt, Ctrl or ⌘ as its own', async () => {
    const { handlers, user } = setup();
    await user.keyboard('{Alt>}g{/Alt}o');
    await user.keyboard('g{Control>}o{/Control}');
    expect(handlers.goTo).not.toHaveBeenCalled();
  });

  it('uses the newest handlers without being registered again', async () => {
    const { handlers, user, rerender } = setup();
    const next = { ...handlers, openShortcuts: vi.fn() };
    rerender(<Harness handlers={next} />);
    await user.keyboard('?');
    expect(next.openShortcuts).toHaveBeenCalledOnce();
    expect(handlers.openShortcuts).not.toHaveBeenCalled();
  });

  it('stops listening when it unmounts', async () => {
    const { handlers, user, unmount } = setup();
    unmount();
    await user.keyboard('?');
    expect(handlers.openShortcuts).not.toHaveBeenCalled();
  });
});
