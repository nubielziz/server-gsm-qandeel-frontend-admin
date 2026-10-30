// The facts shown on the sign-in screens: environment, API host, build and local time. Every value is read from
// the running app, nothing is made up (docs/login-design.md).
import { apiBaseUrl } from '@/lib/api';
import { useNow } from '@/lib/format';
import { version } from '../../../../package.json';

/** The four facts, already formatted for display. */
export interface AuthEnvironment {
  /** `development`, `production`… from the Vite mode, with "· mock data" when the dev mock layer answers. */
  env: string;
  /** Host of the API, or "same origin" when the console calls its own address. */
  api: string;
  /** The version in package.json, such as `v0.1.0`. */
  build: string;
  /** Local time with its offset from UTC, such as `2026-10-30 14:05 UTC+3`. */
  time: string;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** `UTC+3`, `UTC-5`, `UTC+5:30`. Takes the minutes the local time is ahead of UTC (the sign `getTimezoneOffset` flips). */
export function formatUtcOffset(minutesAhead: number): string {
  const sign = minutesAhead < 0 ? '-' : '+';
  const total = Math.abs(minutesAhead);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `UTC${sign}${hours}${minutes ? `:${pad(minutes)}` : ''}`;
}

/** `YYYY-MM-DD HH:mm UTC±h` in the viewer's own time zone. */
export function formatLocalTime(date: Date): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return `${day} ${clock} ${formatUtcOffset(-date.getTimezoneOffset())}`;
}

// A base URL that is empty, or only a path such as "/api", points at the page's own origin.
function apiHost(): string {
  const base = apiBaseUrl();
  if (!base) return 'same origin';
  try {
    return new URL(base).host;
  } catch {
    return 'same origin';
  }
}

/** The facts for a moment in time. The environment is read on every call, so a test can change it. */
export function describeEnvironment(now: number): AuthEnvironment {
  const mocked = import.meta.env.VITE_API_MOCKS === 'true';
  return {
    env: mocked ? `${import.meta.env.MODE} · mock data` : import.meta.env.MODE,
    api: apiHost(),
    build: `v${version}`,
    time: formatLocalTime(new Date(now)),
  };
}

/**
 * The facts for the sign-in screens. The clock is checked every 15 seconds, so the minute on screen is never more than
 * 15 seconds late; the text itself only changes when the minute does.
 */
export function useAuthEnvironment(): AuthEnvironment {
  return describeEnvironment(useNow(15_000));
}
