// Toaster: renders the toast store in a manual popover. Ports the #toasts host and toast() markup of 20-ui.js.
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { dismiss, getToasts, subscribe, type ToastItem, type ToastKind } from './toast';

const KIND_STYLE: Record<ToastKind, { color: string; icon: IconName }> = {
  success: { color: 'text-good-fg', icon: 'checkCircle' },
  error: { color: 'text-crit-fg', icon: 'alert' },
  info: { color: 'text-accent-ink', icon: 'info' },
};

function ToastView({ item }: { item: ToastItem }) {
  const { color, icon } = KIND_STYLE[item.kind];
  const { action } = item;
  return (
    <div className="toast" role={item.kind === 'error' ? 'alert' : 'status'}>
      <span className={`${color} mt-px`}>
        <Icon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        {item.body && <p className="mt-0.5 text-xs text-ink2">{item.body}</p>}
      </div>
      {action && (
        <Button
          size="sm"
          onClick={() => {
            action.run();
            dismiss(item.id);
          }}
        >
          {action.label}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        icon
        className="-me-1 -mt-1"
        aria-label="Dismiss notification"
        onClick={() => dismiss(item.id)}
      >
        <Icon name="x" className="ic-sm" />
      </Button>
    </div>
  );
}

/**
 * Mount once near the app root. The host is a manual popover, so it sits in the top layer above any open
 * modal dialog; it is shown again whenever a new toast arrives so it also stays above dialogs opened since.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getToasts, getToasts);
  const hostRef = useRef<HTMLDivElement>(null);
  const seen = useRef<ReadonlySet<string>>(new Set());

  useEffect(() => {
    const host = hostRef.current;
    const fresh = items.some((item) => !seen.current.has(item.id));
    seen.current = new Set(items.map((item) => item.id));
    if (!host) return;
    try {
      if (!items.length) host.hidePopover?.();
      else if (fresh) {
        host.hidePopover?.();
        host.showPopover?.();
      }
    } catch {
      // Popover API unsupported: the fixed-position host still shows the toasts, just below open dialogs.
    }
  }, [items]);

  return (
    <div id="toasts" ref={hostRef} popover="manual" role="status" aria-live="polite">
      {items.map((item) => (
        <ToastView key={item.id} item={item} />
      ))}
    </div>
  );
}
