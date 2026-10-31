// Tabs: controlled tab strip with counts. Ports tabsEl() of 20-ui.js and adds arrow-key navigation.
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { cx } from './cx';
import { Count } from './Count';

export interface TabItem<V extends string = string> {
  value: V;
  label: string;
  /** Neutral number chip after the label. A count is never a status colour. */
  count?: number | string | null;
}

export interface TabsProps<V extends string = string> {
  items: readonly TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Accessible name of the tab list. */
  label: string;
  className?: string;
}

// Index a navigation key leads to (before wrapping), or null for any other key.
function targetIndex(key: string, from: number, count: number, rtl: boolean): number | null {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowRight') return from + (rtl ? -1 : 1);
  if (key === 'ArrowLeft') return from + (rtl ? 1 : -1);
  return null;
}

/**
 * The selected tab is the only tab stop (roving tabindex). ArrowLeft/ArrowRight (mirrored in right-to-left
 * layouts), Home and End move focus and select the tab at once, so the content follows the keyboard.
 */
export function Tabs<V extends string = string>({ items, value, onChange, label, className }: TabsProps<V>) {
  const strip = useRef<HTMLDivElement>(null);
  const buttons = useRef(new Map<V, HTMLButtonElement>());
  const selected = items.findIndex((item) => item.value === value);

  // On a phone the strip scrolls sideways. Keep the selected tab in view (after a load from an address, and after a
  // change), moving only the strip, never the page.
  useEffect(() => {
    const box = strip.current;
    const button = buttons.current.get(value);
    if (!box || !button || box.scrollWidth <= box.clientWidth) return;
    const edge = 16;
    const boxRect = box.getBoundingClientRect();
    const rect = button.getBoundingClientRect();
    if (rect.left < boxRect.left) box.scrollLeft -= boxRect.left - rect.left + edge;
    else if (rect.right > boxRect.right) box.scrollLeft += rect.right - boxRect.right + edge;
  }, [value]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const focused = items.findIndex((item) => buttons.current.get(item.value) === document.activeElement);
    const to = targetIndex(e.key, focused >= 0 ? focused : Math.max(0, selected), items.length, rtl);
    if (to === null) return;
    e.preventDefault();
    const next = items[(to + items.length) % items.length];
    onChange(next.value);
    buttons.current.get(next.value)?.focus();
  }

  return (
    <div
      ref={strip}
      className={cx('tabs', className)}
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          ref={(el) => {
            if (el) buttons.current.set(item.value, el);
            else buttons.current.delete(item.value);
          }}
          type="button"
          role="tab"
          aria-selected={item.value === value}
          // With no selected tab the first one stays reachable.
          tabIndex={item.value === value || (selected < 0 && index === 0) ? 0 : -1}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count != null && <Count>{item.count}</Count>}
        </button>
      ))}
    </div>
  );
}
