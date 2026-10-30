// A search box that keeps its own text while the user types and tells the page only after a pause. The page keeps the text in
// the address, and a request goes out for each value it commits, so committing every keystroke would flood the API.
import { useEffect, useRef, useState } from 'react';

/** Wait this long after the last keystroke before the page is told. */
export const SEARCH_PAUSE_MS = 300;

/**
 * `value` is the committed text (from the address). The returned `text` follows the keys at once; `commit` runs
 * after a pause. When `value` changes from outside (Clear filters), the box shows it again.
 */
export function useDebouncedCommit(value: string, commit: (text: string) => void, delay = SEARCH_PAUSE_MS) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }

  const latest = useRef(commit);
  useEffect(() => {
    latest.current = commit;
  });

  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => latest.current(text), delay);
    return () => clearTimeout(timer);
  }, [text, value, delay]);

  return { text, setText };
}
