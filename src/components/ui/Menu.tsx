// Menu: anchored popover menu with arrow keys. Ports menuEl, openMenu and onMenuKey of 20-ui.js.
import { useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';
import { FloatingPanel, type FloatingPanelProps } from './FloatingPanel';
import { Icon, type IconName } from './Icon';
import { Kbd } from './Kbd';

export interface MenuAction {
  label: string;
  icon?: IconName;
  /** Shortcut hint shown as a key cap on the right. */
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  /** Defined (true or false) turns the row into a radio item; true also draws a check mark. */
  checked?: boolean;
  run?: () => void;
}

/** A row is an action, a thin separator or a small uppercase group header. */
export type MenuItem = MenuAction | { separator: true } | { header: string };

export interface MenuProps extends Pick<FloatingPanelProps, 'anchor' | 'open' | 'onClose' | 'align'> {
  items: readonly MenuItem[];
  /** Minimum width in px (the menu is at least 200px wide). */
  width?: number;
  /** Accessible name of the menu. */
  label?: string;
}

/**
 * Pair it with usePopover: `<Menu {...pop.panelProps} items={items} />`.
 * Focus moves to the first enabled item on open; ArrowUp/Down/Home/End move, Escape closes and returns
 * focus to the trigger, a press outside closes, Tab closes and lets focus continue from the trigger.
 */
export function Menu({ anchor, open, onClose, align, items, width, label }: MenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open && anchor) panelRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  }, [open, anchor]);

  function returnFocus() {
    if (anchor?.isConnected) anchor.focus();
  }

  function select(item: MenuAction) {
    onClose();
    returnFocus();
    item.run?.();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      e.preventDefault();
      buttons[(to + buttons.length) % buttons.length]?.focus();
    };
    if (e.key === 'ArrowDown') move(current + 1);
    else if (e.key === 'ArrowUp') move(current < 0 ? -1 : current - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(-1);
    else if (e.key === 'Tab') {
      returnFocus();
      onClose();
    }
  }

  return (
    <FloatingPanel
      anchor={anchor}
      open={open}
      onClose={onClose}
      align={align}
      panelRef={panelRef}
      className="menu"
      role="menu"
      aria-label={label}
      style={width ? { minWidth: width } : undefined}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) => {
        if ('separator' in item) return <div key={index} className="menu-sep" role="separator" />;
        if ('header' in item) {
          return (
            <div key={index} className="menu-h" role="presentation">
              {item.header}
            </div>
          );
        }
        const radio = item.checked !== undefined;
        return (
          <button
            key={index}
            type="button"
            role={radio ? 'menuitemradio' : 'menuitem'}
            aria-checked={radio ? item.checked : undefined}
            disabled={item.disabled}
            className={cx(
              'menu-item disabled:opacity-45 disabled:pointer-events-none',
              item.danger && 'text-crit-fg',
            )}
            onClick={() => select(item)}
          >
            {item.icon && <Icon name={item.icon} className="ic-sm" />}
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.checked && <Icon name="check" className="ic-sm" />}
            {item.hint && <Kbd>{item.hint}</Kbd>}
          </button>
        );
      })}
    </FloatingPanel>
  );
}
