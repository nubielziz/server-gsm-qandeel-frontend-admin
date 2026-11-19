// Quick add's keys, counts and words: how a group is told apart, what the picks add up to, the body that starts a run, and the
// lines that tell where a run is. Pure, so the dialog only shows what these return. The server decides what is added; the
// counts here are for the review step.
import { ago, num } from '@/lib/format';
import type {
  QuickAddBody,
  QuickAddGroupRef,
  QuickAddRun,
  QuickAddServiceStatus,
  ServiceGroup,
} from '../types';

/** The most groups one request can name; more than that is `all`. */
export const MAX_QUICK_ADD_GROUPS = 500;

/** Above this many services the review step asks for a tick box before it adds them. */
export const CONFIRM_ABOVE = 500;

/** How often the dialog asks for the run while it is `queued` or `running`. */
export const RUN_POLL_MS = 1500;

/** "1 service", "12 services" (with a thousands separator). */
export function servicesText(count: number): string {
  return `${num(count)} ${count === 1 ? 'service' : 'services'}`;
}

/** "1 group", "3 groups". */
export function groupsText(count: number): string {
  return `${num(count)} ${count === 1 ? 'group' : 'groups'}`;
}

/** The key of a group in the set of picks: its type and its name, joined by a character no name holds. */
export function groupKey(group: QuickAddGroupRef): string {
  return `${group.type}\u0000${group.remoteGroup}`;
}

/** What the group is called on screen: its name, or "No group" for the empty name (the import files those under "Imported"). */
export function groupName(group: QuickAddGroupRef): string {
  return group.remoteGroup === '' ? 'No group' : group.remoteGroup;
}

/** "Apple iPhone (IMEI)": the group in a list that has no room for a tag. */
export function groupOption(group: QuickAddGroupRef): string {
  return `${group.remoteGroup} (${group.type.toUpperCase()})`;
}

/** The value of a group in a `<select>`: the pair as JSON, so any text a group name holds survives the round trip. */
export function groupValue(group: QuickAddGroupRef): string {
  return JSON.stringify([group.type, group.remoteGroup]);
}

/** Whether a group shows for the text typed in the search box (name or type, any case). */
export function matchesSearch(group: QuickAddGroupRef, text: string): boolean {
  const needle = text.trim().toLowerCase();
  if (needle === '') return true;
  return `${groupName(group)} ${group.type}`.toLowerCase().includes(needle);
}

/** The groups that have something to add; a group with nothing to add cannot be picked. */
export function pickable(groups: readonly ServiceGroup[]): ServiceGroup[] {
  return groups.filter((group) => group.addable > 0);
}

/** What "Select all groups" stands for: the keys of every group that has something to add, how many they are, and what they add. */
export function allPickable(groups: readonly ServiceGroup[]): {
  keys: string[];
  groups: number;
  services: number;
} {
  const chosen = pickable(groups);
  return {
    keys: chosen.map(groupKey),
    groups: chosen.length,
    services: chosen.reduce((total, group) => total + group.addable, 0),
  };
}

/** The picked groups that still have something to add, in the order of the list. A pick of a group that has vanished or emptied is ignored. */
export function pickedGroups(groups: readonly ServiceGroup[], picked: ReadonlySet<string>): ServiceGroup[] {
  return pickable(groups).filter((group) => picked.has(groupKey(group)));
}

/** How many groups are picked and how many services they would add. */
export function pickedTotals(
  groups: readonly ServiceGroup[],
  picked: ReadonlySet<string>,
): { groups: number; services: number } {
  const chosen = pickedGroups(groups, picked);
  return { groups: chosen.length, services: chosen.reduce((total, group) => total + group.addable, 0) };
}

/**
 * The body of the start request. When every group that has something to add is picked, the scope is `all` (no group list, no
 * limit of 500); otherwise it names the picked groups. `serviceStatus` is sent only for "Switched off": on sale is the
 * server's default. `publish` (the tick box "Also put them on the shop") adds `publish: { listed: true }`; the dialog passes
 * it only for services added on sale, since the server refuses it for switched off ones.
 */
export function quickAddBody(
  groups: readonly ServiceGroup[],
  picked: ReadonlySet<string>,
  serviceStatus: QuickAddServiceStatus,
  publish = false,
): QuickAddBody {
  const chosen = pickedGroups(groups, picked);
  const extras = {
    ...(serviceStatus === 'disabled' ? ({ serviceStatus } as const) : {}),
    ...(publish ? { publish: { listed: true } } : {}),
  };
  if (chosen.length > 0 && chosen.length === pickable(groups).length) return { scope: 'all', ...extras };
  return {
    scope: 'groups',
    groups: chosen.map(({ type, remoteGroup }) => ({ type, remoteGroup })),
    ...extras,
  };
}

/** True when the body names more groups than a request can carry. */
export function tooManyGroups(body: QuickAddBody): boolean {
  return body.scope === 'groups' && body.groups.length > MAX_QUICK_ADD_GROUPS;
}

/** A run that is still going: waiting for the worker or working. */
export function isLive(run: Pick<QuickAddRun, 'status'>): boolean {
  return run.status === 'queued' || run.status === 'running';
}

/** How far a run is, 0 to 1, for the progress bar. A run with nothing to do yet is at 0. */
export function progressRatio(run: Pick<QuickAddRun, 'processed' | 'total' | 'status'>): number {
  if (run.status === 'succeeded') return 1;
  if (run.total <= 0) return 0;
  return Math.min(1, Math.max(0, run.processed / run.total));
}

/** "12 of 40 services, 10 added": the line under the progress bar. */
export function progressLine(run: Pick<QuickAddRun, 'processed' | 'total' | 'created'>): string {
  return `${num(run.processed)} of ${servicesText(run.total)}, ${num(run.created)} added`;
}

/** The lines of a finished run: what was added, and each count that is not zero. */
export function resultLines(
  run: Pick<QuickAddRun, 'created' | 'skipped' | 'categoriesCreated' | 'failed'>,
): string[] {
  const lines = [`${servicesText(run.created)} added`];
  if (run.skipped > 0)
    lines.push(`${num(run.skipped)} skipped (already in the console or no longer available)`);
  if (run.categoriesCreated > 0) {
    lines.push(
      `${num(run.categoriesCreated)} ${run.categoriesCreated === 1 ? 'category' : 'categories'} created`,
    );
  }
  if (run.failed > 0) lines.push(`${num(run.failed)} could not be added`);
  return lines;
}

/** The muted line on the first step about the supplier's newest run; nothing while a run is still going. */
export function lastRunLine(run: QuickAddRun | null, now: number = Date.now()): string | null {
  if (run === null || isLive(run)) return null;
  const when = ago(run.finishedAt ?? run.startedAt ?? run.createdAt, now);
  return run.status === 'succeeded'
    ? `Last quick add ${when}: ${num(run.created)} added`
    : `Last quick add ${when} stopped: ${run.error ?? 'it did not finish'}`;
}
