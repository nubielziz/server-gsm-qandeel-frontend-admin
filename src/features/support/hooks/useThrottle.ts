// `createThrottle` for a component: one throttle for the life of the component, running the latest function, dropped when the component goes away.
import { useEffect, useRef, useState } from 'react';
import { createThrottle, type Throttle } from '../lib/throttle';

/** A stable `call()` that runs `run` at most once every `windowMs` (first call at once, the rest as one trailing run). */
export function useThrottle(run: () => void, windowMs: number): Throttle {
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  const [throttle] = useState(() => createThrottle(() => latest.current(), windowMs));
  useEffect(() => () => throttle.cancel(), [throttle]);
  return throttle;
}
