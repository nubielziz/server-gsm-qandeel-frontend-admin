// A small throttle with a leading and a trailing run: the first call runs at once, calls that follow inside the window become one run at the window's end.
// The live hooks use it so a burst of ticket events asks the server for the inbox once, not once per event (no request storms).

export interface Throttle {
  /** Runs now when the window is free, else schedules one run at the window's end (more calls inside the window add nothing). */
  call(): void;
  /** Drops a scheduled run (the screen went away). */
  cancel(): void;
}

/** `windowMs` is the least time between two runs. `now` and the timers can be replaced by a test. */
export function createThrottle(run: () => void, windowMs: number, now: () => number = Date.now): Throttle {
  let lastRun = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function fire() {
    timer = undefined;
    lastRun = now();
    run();
  }

  return {
    call() {
      if (timer !== undefined) return;
      const wait = lastRun + windowMs - now();
      if (wait <= 0) fire();
      else timer = setTimeout(fire, wait);
    },
    cancel() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
