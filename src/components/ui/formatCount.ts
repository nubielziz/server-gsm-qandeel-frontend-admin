// Thousands separators for row counts ("1,240"), same as the demo's num(). Kept local so the kit has no lib/ dependency.
export function formatCount(n: number): string {
  return Number(n).toLocaleString('en-US');
}
