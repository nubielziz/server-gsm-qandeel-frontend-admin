// A service's target time as the table shows it. Ports `ageText(s.sla * MIN)` of 20-ui.js (the orders feature keeps its own
// copy of the same helper; see SERVICES SHARED-NEEDS).

/** "<1m", "45m", "2h 5m", "3d 4h": the two largest units, with non-breaking spaces. */
export function slaText(minutes: number): string {
  const nbsp = '\u00a0';
  const total = Math.max(0, Math.round(minutes));
  if (total < 1) return '<1m';
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  if (hours < 24) return `${hours}h${total % 60 ? `${nbsp}${total % 60}m` : ''}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? `${nbsp}${hours % 24}h` : ''}`;
}
