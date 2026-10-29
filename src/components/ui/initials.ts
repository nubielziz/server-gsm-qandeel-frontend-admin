// Two-letter initials from a name ("Dana K. Rossi" -> "DK"). Port of initials() in 20-ui.js.
export function initials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}
