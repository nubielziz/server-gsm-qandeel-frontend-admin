// Reads a box of names (brands, models, networks) for the draft generator.

/** A box of names as a list: commas and new lines separate, empty items go. */
export function namesOf(text: string): string[] {
  return text
    .split(/[\n,]/)
    .map((name) => name.trim())
    .filter(Boolean);
}
