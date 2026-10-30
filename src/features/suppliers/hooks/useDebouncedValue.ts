// A value that follows another one after a pause: a search box types at once, and the request for its text goes out only when
// the typing stops, so a name is not searched letter by letter.
import { useEffect, useState } from 'react';

/** Wait this long after the last keystroke before the search text counts. */
export const SEARCH_PAUSE_MS = 300;

/** Returns `value` after it has stayed the same for `delay` ms, so a search request goes out when the typing stops. */
export function useDebouncedValue<T>(value: T, delay = SEARCH_PAUSE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
