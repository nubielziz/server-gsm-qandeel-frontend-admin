// Words the dashboard repeats: the channel and period names, and the severity badges of "Needs attention".
// Ports SCOPE_LABEL and the segment lists of 40-p-dashboard.js and sevLabel of 20-ui.js.
import type { BadgeTone, IconName, SegmentItem } from '@/components/ui';
import type { AttentionSeverity, DashboardDays, DashboardScope } from '../types';

/** The channel in a sentence: "Showing all channels". */
export const SCOPE_LABEL: Readonly<Record<DashboardScope, string>> = {
  all: 'all channels',
  b2b: 'merchants',
  b2c: 'the storefront',
};

/** The Channel control. */
export const SCOPE_ITEMS: readonly SegmentItem<DashboardScope>[] = [
  { value: 'all', label: 'All' },
  { value: 'b2b', label: 'Merchants' },
  { value: 'b2c', label: 'Storefront' },
];

/** The Period control. */
export const PERIOD_ITEMS: readonly SegmentItem<DashboardDays>[] = [
  { value: 1, label: '24h' },
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
];

/** The period in a sentence: "last 24 hours", "last 14 days". */
export function periodWords(days: DashboardDays): string {
  return days === 1 ? '24 hours' : `${days} days`;
}

/** The period as a short tag: "24h", "7D". */
export function periodTag(days: DashboardDays): string {
  return days === 1 ? '24h' : `${days}D`;
}

/** How one severity looks: the word, the badge colour and the icon that pairs with it (status is never colour alone). */
export type SeverityLook = { word: string; tone: BadgeTone; icon: IconName; solid: boolean };

const SEVERITY: Readonly<Record<AttentionSeverity, SeverityLook>> = {
  critical: { word: 'Critical', tone: 'crit', icon: 'xCircle', solid: true },
  high: { word: 'High', tone: 'serious', icon: 'alert', solid: false },
  medium: { word: 'Medium', tone: 'warn', icon: 'clock', solid: false },
  low: { word: 'Low', tone: 'neutral', icon: 'info', solid: false },
};

/** The look of a severity word from the server. A word this console does not know (a newer server) looks like Low. */
export function severityLook(severity: string): SeverityLook {
  return Object.hasOwn(SEVERITY, severity) ? SEVERITY[severity as AttentionSeverity] : SEVERITY.low;
}
