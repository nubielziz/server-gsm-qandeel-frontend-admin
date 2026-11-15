// "Is someone looking at this page": the tab is visible and its window has focus. A read mark is only sent when this is true.
import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('focus', onChange);
  window.addEventListener('blur', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('focus', onChange);
    window.removeEventListener('blur', onChange);
  };
}

const attended = (): boolean => document.visibilityState === 'visible' && document.hasFocus();

/** True while the tab is visible and focused; it follows `visibilitychange`, `focus` and `blur`. */
export function useAttention(): boolean {
  return useSyncExternalStore(subscribe, attended, () => false);
}
