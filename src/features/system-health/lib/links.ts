// Deep links to the tools beside the console: Grafana, Sentry and Bull Board. Each address comes from the Vite env
// (see .env.example); a link whose address is unset does not exist, so the page never shows a dead link.

export type DeepLinkTarget = 'grafana' | 'sentry' | 'bullBoard';

// Read on every call (and one named property per variable, so Vite can inline them) so tests can stub the env.
const ENV: Record<DeepLinkTarget, () => string | undefined> = {
  grafana: () => import.meta.env.VITE_GRAFANA_URL,
  sentry: () => import.meta.env.VITE_SENTRY_URL,
  bullBoard: () => import.meta.env.VITE_BULL_BOARD_URL,
};

/** The tool's name for link text ("Open in Grafana"). */
export const DEEP_LINK_NAME: Record<DeepLinkTarget, string> = {
  grafana: 'Grafana',
  sentry: 'Sentry',
  bullBoard: 'Bull Board',
};

const HTTP_URL = /^https?:\/\//i;

/** The configured address without a trailing slash, or null when it is unset, blank or not an http(s) address. */
export function deepLinkBase(target: DeepLinkTarget): string | null {
  const raw = ENV[target]()?.trim();
  return raw && HTTP_URL.test(raw) ? raw.replace(/\/+$/, '') : null;
}

/**
 * The address to open, or null when the tool is not configured. `path` is added to the configured address
 * ("queue/dispatch" for Bull Board). A full http(s) address in `path` (the server's own Sentry issue link) is used
 * as it is, but only while the tool is configured: unset means no link.
 */
export function deepLinkUrl(target: DeepLinkTarget, path?: string | null): string | null {
  const base = deepLinkBase(target);
  if (!base) return null;
  const tail = path?.trim();
  if (!tail) return base;
  if (HTTP_URL.test(tail)) return tail;
  return `${base}/${tail.replace(/^\/+/, '')}`;
}
