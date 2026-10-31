// Pure helpers of the Overview tab's component list (route group `health`): which rows show, which component the chart
// draws, and the chart's series. They order and pick by the status the server sent; they never decide a status.
import { sortProblemsFirst } from '../../lib';
import type { CheckBucket, ComponentKind, HealthComponent, SeriesPoint } from '../../types';

/** The list split in two: what needs a look is shown, what is fine collapses into one quiet line. */
export interface ComponentGroups {
  /** Down, degraded and unknown, in that order; the server's order inside a status. */
  attention: HealthComponent[];
  /** Status `ok`, in the server's order. */
  healthy: HealthComponent[];
}

/**
 * Problems first. Only the status `ok` counts as fine: a status the console does not know (the contract is assumed)
 * stays in view as a row, because hiding it would be a guess that it is healthy.
 */
export function groupComponents(components: readonly HealthComponent[]): ComponentGroups {
  const sorted = sortProblemsFirst(components, (component) => component.status);
  return {
    attention: sorted.filter((component) => component.status !== 'ok'),
    healthy: sorted.filter((component) => component.status === 'ok'),
  };
}

/**
 * "11 components operational" for the quiet line that stands in for the healthy rows. With `others` a healthy row already
 * stands in the list above it, so the line counts the rest: "10 other components operational".
 */
export function operationalLine(count: number, others = false): string {
  return `${count} ${others ? 'other ' : ''}${count === 1 ? 'component' : 'components'} operational`;
}

/** What the list shows: the rows, and what the quiet line under them says. */
export interface ComponentList {
  rows: HealthComponent[];
  /** The quiet line's count, and whether a healthy row already stands above it. Null when there is nothing to fold or hide. */
  line: { count: number; others: boolean } | null;
}

/**
 * Problems are always rows. The healthy ones wait behind the quiet line until it is opened. The exception is the one the
 * address named (`pinned`): its row stays while the rest is folded, so the list still shows what the chart is about.
 */
export function listComponents(groups: ComponentGroups, open: boolean, pinned: string | null): ComponentList {
  if (open) {
    const { healthy } = groups;
    return {
      rows: [...groups.attention, ...healthy],
      line: healthy.length > 0 ? { count: healthy.length, others: false } : null,
    };
  }
  const kept = groups.healthy.find((component) => component.key === pinned);
  const folded = groups.healthy.length - (kept ? 1 : 0);
  return {
    rows: kept ? [...groups.attention, kept] : groups.attention,
    line: folded > 0 ? { count: folded, others: kept !== undefined } : null,
  };
}

/**
 * The component the chart shows when none is picked: the first one that is down, else the first degraded, else the first
 * that is fine. A component with no check data (`unknown`) comes last, because it has no response time to draw.
 */
export function defaultComponent(components: readonly HealthComponent[]): HealthComponent | undefined {
  return (
    components.find((component) => component.status === 'down') ??
    components.find((component) => component.status === 'degraded') ??
    components.find((component) => component.status === 'ok') ??
    components[0]
  );
}

/** What `?component=` resolved to. */
export interface ResolvedComponent {
  /** The key to chart. Null while it cannot be known yet, or when there is no component at all. */
  key: string | null;
  /** The address named a key the summary does not know, so the default is shown instead. */
  unknownAsked: string | null;
  /** `key` is the one the address named (a click on a row, or a link), not the default: its row must stay in the list. */
  fromAddress: boolean;
}

/**
 * The picked component. A key in the address wins when the summary lists it. Before the summary has answered the key is
 * trusted as it is (the check history says if it does not exist). An unknown key falls back to the default and is
 * reported, so the card can say why it shows something else.
 */
export function resolveComponent(
  asked: string | null,
  components: readonly HealthComponent[] | undefined,
): ResolvedComponent {
  const wanted = asked?.trim() || null;
  if (components === undefined) return { key: wanted, unknownAsked: null, fromAddress: wanted !== null };
  if (wanted !== null && components.some((component) => component.key === wanted)) {
    return { key: wanted, unknownAsked: null, fromAddress: true };
  }
  return { key: defaultComponent(components)?.key ?? null, unknownAsked: wanted, fromAddress: false };
}

const KIND_WORD: Record<ComponentKind, string> = { core: 'Core', supplier: 'Supplier', gateway: 'Gateway' };

/** The kind in words. A kind the console does not know prints as the server sent it. */
export function kindWord(kind: string): string {
  return Object.hasOwn(KIND_WORD, kind) ? KIND_WORD[kind as ComponentKind] : kind;
}

/**
 * The response time of a component as a chart series: the p95 of each check bucket. A bucket with no check has no
 * latency (null), which the chart draws as a gap and never as zero.
 */
export function latencyPoints(buckets: readonly CheckBucket[]): SeriesPoint[] {
  return buckets.map((bucket) => ({ at: bucket.start, value: bucket.latencyMs ?? null }));
}
