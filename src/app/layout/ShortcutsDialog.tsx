// ShortcutsDialog: the keyboard shortcut list. Ports shortcutsDialog() of 90-app.js (same rows).
import { Kbd, Modal } from '@/components/ui';

const ROWS: readonly (readonly [keys: string, action: string])[] = [
  ['⌘K', 'Command palette'],
  ['/', 'Focus search'],
  ['?', 'This list'],
  ['g then d / o / m', 'Go to dashboard / orders / merchants'],
  ['g then k / s / i', 'Go to customers / support / risk'],
  ['g then p / u / t', 'Go to pricing / suppliers / storefront'],
  ['g then f / c / r / a', 'Go to finance / commissions / refunds / audit'],
  ['j / k', 'Move down / up in the orders table'],
  ['Enter', 'Open the highlighted order'],
  ['x', 'Select the highlighted order'],
  ['Esc', 'Close a panel or dialog'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {ROWS.map(([keys, action]) => (
          <div key={keys} className="contents">
            <dt>
              <Kbd>{keys}</Kbd>
            </dt>
            <dd className="m-0 text-ink2">{action}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
