// A value that follows another one after it has stopped changing for a while: the composer's live count waits for the staff member to pause before
// it asks the server. The value is compared by its JSON text, so a new object with the same content does not restart the wait.
import { useEffect, useState } from 'react';
import { COUNT_PAUSE_MS } from './keys';

export function useSettledValue<T>(value: T, delay = COUNT_PAUSE_MS): T {
  const [settled, setSettled] = useState(value);
  const key = JSON.stringify(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(JSON.parse(key) as T), delay);
    return () => clearTimeout(timer);
  }, [key, delay]);
  return settled;
}
