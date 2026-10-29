// Tiny class-name joiner used across the kit: falsy parts are dropped so conditional classes stay readable.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
