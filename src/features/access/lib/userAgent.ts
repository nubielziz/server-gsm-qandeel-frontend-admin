// A short, readable device name for the sessions table ("Chrome on Windows"), read from the browser's user-agent text.
// Best effort: an agent it does not know is shown as it came, cut to a sensible length.

const BROWSERS: [name: string, pattern: RegExp][] = [
  // Order matters: Edge and Opera also say "Chrome", and Chrome also says "Safari".
  ['Edge', /\bEdg(?:e|A|iOS)?\//],
  ['Opera', /\bOPR\//],
  ['Firefox', /\b(?:Firefox|FxiOS)\//],
  ['Chrome', /\b(?:Chrome|CriOS)\//],
  ['Safari', /\bVersion\/[\d.]+.*\bSafari\//],
  ['curl', /^curl\//i],
  ['Postman', /^PostmanRuntime\//i],
];

const SYSTEMS: [name: string, pattern: RegExp][] = [
  // iOS agents also contain "Mac OS X", and Android agents also contain "Linux".
  ['iOS', /\b(?:iPhone|iPad|iPod)\b/],
  ['Android', /\bAndroid\b/],
  ['Windows', /\bWindows\b/],
  ['macOS', /\bMac OS X\b|\bMacintosh\b/],
  ['Linux', /\bLinux\b|\bX11\b/],
];

const MAX_RAW = 48;

/** "Chrome on Windows", "Safari on iOS", "curl"; an unknown agent comes back trimmed, an empty one as "Unknown device". */
export function describeUserAgent(userAgent: string | null | undefined): string {
  const text = (userAgent ?? '').trim();
  if (!text) return 'Unknown device';
  const browser = BROWSERS.find(([, pattern]) => pattern.test(text))?.[0];
  const system = SYSTEMS.find(([, pattern]) => pattern.test(text))?.[0];
  if (browser && system) return `${browser} on ${system}`;
  if (browser) return browser;
  if (system) return system;
  return text.length > MAX_RAW ? `${text.slice(0, MAX_RAW - 1)}…` : text;
}
