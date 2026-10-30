// Small input hints for the dialogs (email shape, country code, trimmed names). Hints only: the server validates everything
// and its field messages show under the same fields (decision 008).

/** The demo's email check: something, an @, something, a dot, something. */
export function validEmail(text: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text.trim());
}

/** An email as sent: trimmed and lower case, so "Ops@Shop.example " and "ops@shop.example" are one address. */
export function cleanEmail(text: string): string {
  return text.trim().toLowerCase();
}

/** A name or a reason as sent: trimmed, inner runs of spaces kept as typed. */
export function cleanText(text: string): string {
  return text.trim();
}

/** A country code as sent: two letters, upper case ("jo" is "JO"). */
export function cleanCountry(text: string): string {
  return text.trim().toUpperCase();
}

export function validCountry(text: string): boolean {
  return /^[A-Za-z]{2}$/.test(text.trim());
}

const DAY_MS = 86_400_000;

/** "Joined 410 days ago" for the page subtitle (the demo stored the number of days). Display only. */
export function joinedText(createdAt: string, now: number): string {
  const days = Math.max(0, Math.floor((now - Date.parse(createdAt)) / DAY_MS));
  if (Number.isNaN(days)) return '';
  if (days === 0) return 'Joined today';
  return `Joined ${days} ${days === 1 ? 'day' : 'days'} ago`;
}
