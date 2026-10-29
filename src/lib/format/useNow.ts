// A clock for relative times: re-renders the component every `intervalMs` (the demo refreshed every 30 s).
import { useEffect, useState } from 'react';

/** Current time in epoch ms, refreshed on an interval. Pass it to `ago(time, now)` so "5m ago" keeps moving. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
