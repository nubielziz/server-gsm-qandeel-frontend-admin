// Toast store: a tiny external store behind <Toaster/>. Ports toast() of 20-ui.js (queue, max 3, auto-dismiss).
// It lives outside React so any code can raise a toast; the app adapts it to Refine's notification provider.

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastInput {
  /** Reusing an id replaces that toast in place and restarts its timer (Refine notification keys map here). */
  id?: string;
  kind?: ToastKind;
  title: string;
  body?: string;
  action?: ToastAction;
  /** Milliseconds before it dismisses itself; 0 keeps it until the user closes it. */
  ttl?: number;
}

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  body: string;
  action: ToastAction | null;
}

/** The demo keeps at most three on screen; a fourth pushes out the oldest. */
const MAX_VISIBLE = 3;
const DEFAULT_TTL = 5200;

let items: readonly ToastItem[] = [];
let seq = 0;
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

function publish(next: readonly ToastItem[]) {
  items = next;
  listeners.forEach((listener) => listener());
}

function clearTimer(id: string) {
  const timer = timers.get(id);
  if (timer !== undefined) clearTimeout(timer);
  timers.delete(id);
}

/** Removes a toast (its own close button, an action, the timer, or the app's notification provider). */
export function dismiss(id: string): void {
  clearTimer(id);
  if (items.some((item) => item.id === id)) publish(items.filter((item) => item.id !== id));
}

/** Shows a toast, newest last. Returns its id. */
export function toast({
  id,
  kind = 'success',
  title,
  body = '',
  action,
  ttl = DEFAULT_TTL,
}: ToastInput): string {
  const toastId = id ?? `toast-${++seq}`;
  clearTimer(toastId);
  const item: ToastItem = { id: toastId, kind, title, body, action: action ?? null };
  const exists = items.some((current) => current.id === toastId);
  let next = exists ? items.map((current) => (current.id === toastId ? item : current)) : [...items, item];
  while (next.length > MAX_VISIBLE) {
    clearTimer(next[0].id);
    next = next.slice(1);
  }
  publish(next);
  if (ttl > 0)
    timers.set(
      toastId,
      setTimeout(() => dismiss(toastId), ttl),
    );
  return toastId;
}

/** Removes every toast. Useful when the session ends and in tests. */
export function clearToasts(): void {
  timers.forEach((timer) => clearTimeout(timer));
  timers.clear();
  if (items.length) publish([]);
}

/** useSyncExternalStore contract: returns the unsubscribe function. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current list, oldest first. The array identity changes only when the list does. */
export function getToasts(): readonly ToastItem[] {
  return items;
}
