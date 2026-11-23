// The single-services path of the Add flow: what each batch of the import leaves behind (its answer and what happened to its shop
// preview), when a batch asks for a shop preview, and the words of the result. Pure, so the dialog only shows what these return.
import type { PublishScope } from '@/features/storefront';
import { isApiError, type Id } from '@/lib/api';
import { num } from '@/lib/format';
import type { ImportResult } from '../types';
import { BATCH_SIZE, BatchStopped } from './batches';
import { failureText, mergeResults } from './importPlan';
import { servicesText } from './quickAdd';

/** The most services one shop preview (a publish run of the scope `services`) takes: the same as one import batch. */
export const MAX_PREVIEW_IDS = 500;

/** The permission a console-made shop preview (`POST /admin/publish-runs`) needs; the server checks it again. */
export const SHOP_PREVIEW_PERMISSION = 'storefront:create';

/** What happened to the shop preview of one batch. */
export type ShopLine =
  /** The switch was off. */
  | { kind: 'off' }
  /** The batch created no service, so there was nothing to prepare. */
  | { kind: 'nothing' }
  /** The batch created services but the server did not list them (an older answer), so no preview could be asked for. */
  | { kind: 'unknown'; services: number }
  /** The server made a publish run (a draft the server keeps) for the services the batch created. */
  | { kind: 'started'; runId: Id; services: number }
  /**
   * The run could not be started; `message` is the server's own text. The import of the batch is done all the same. `serviceIds`
   * are the services the batch created, kept so the preview can be asked for again. `forbidden` is a 403: the role may not start a
   * preview, so asking again would not help and the line names the missing permission instead.
   */
  | { kind: 'failed'; services: number; message: string; serviceIds: Id[]; forbidden: boolean };

/** The shop line of a batch whose preview could not be started. */
export type FailedShopLine = Extract<ShopLine, { kind: 'failed' }>;

/** Which failed lines were asked for again, and what came of it: keyed by {@link retryKey}, so the line is found wherever it is kept. */
export type RetriedLines = Readonly<Record<string, ShopLine>>;

/** What one batch of the import answered, with what became of its shop preview. */
export type BatchOutcome = {
  /** How many supplier services the batch sent. */
  sent: number;
  result: ImportResult;
  shop: ShopLine;
};

/** What a batch asks the server for after its import: nothing, or one publish run for these ids. */
export type ShopPlan =
  { kind: 'prepare'; ids: Id[] } | Extract<ShopLine, { kind: 'off' | 'nothing' | 'unknown' }>;

/**
 * Decides what a batch does for the shop once its import answered: with the switch off or no service created it does nothing;
 * created services whose ids the server did not send cannot be prepared (it says so); else it prepares exactly the ids the
 * server named, which are never more than one preview takes.
 */
export function shopPlan(wanted: boolean, result: ImportResult): ShopPlan {
  if (!wanted) return { kind: 'off' };
  if (result.created === 0) return { kind: 'nothing' };
  const ids = result.createdServiceIds ?? [];
  if (ids.length === 0) return { kind: 'unknown', services: result.created };
  return { kind: 'prepare', ids: ids.slice(0, MAX_PREVIEW_IDS) };
}

/** What names a failed line: the first service its batch created (a service is created by one batch only). */
export function retryKey(line: FailedShopLine): string {
  return String(line.serviceIds[0]);
}

/** Whether asking for the preview again can help: not after a 403, which the same role gets again. */
export function canTryAgain(line: ShopLine): line is FailedShopLine {
  return line.kind === 'failed' && !line.forbidden;
}

/** The outcomes with each failed line replaced by what came of asking for it again (a line that was not asked for stays as it is). */
export function withRetries(
  outcomes: readonly BatchOutcome[],
  retried: RetriedLines,
): readonly BatchOutcome[] {
  return outcomes.map((outcome) => {
    const again = outcome.shop.kind === 'failed' ? retried[retryKey(outcome.shop)] : undefined;
    return again ? { ...outcome, shop: again } : outcome;
  });
}

/** How many supplier services the batches in `outcomes` sent, answered ones only. */
export function sentOf(outcomes: readonly BatchOutcome[]): number {
  return outcomes.reduce((sum, outcome) => sum + outcome.sent, 0);
}

/**
 * Whether the server refused the list itself (400 or 422, for example a service of a type it cannot import): the same list sent
 * again gets the same refusal, so "Continue" cannot help; the person must untick what it names. Other failures (a timeout, a 409 that
 * says "sync first") may pass on the next try.
 */
export function isRefusal(failure: unknown): boolean {
  const reason = failure instanceof BatchStopped ? failure.reason : failure;
  return isApiError(reason) && (reason.status === 400 || reason.status === 422);
}

/** What the dialog's error slot says when the import stopped: how far it got, the server's words and, for a refusal, the way out. */
export function addStoppedText(failure: unknown): string {
  const text = failureText(failure, 'added');
  return isRefusal(failure) ? `${text} Go back, untick the services it names and preview again.` : text;
}

/**
 * The subtitle of the last step once the import stopped after some batches were answered. "Added" only when a batch created
 * services; a stop after batches that only changed costs says "updated". A refusal sends the person back; any other stop may go on.
 */
export function stoppedSub(done: ImportResult, refused: boolean): string {
  const verb = done.created > 0 ? 'added' : done.updated > 0 ? 'updated' : 'checked';
  return refused
    ? `Some services were ${verb}. The server refused the rest as picked: go back and untick the services it names.`
    : `Some services were ${verb}. Continue to do the rest, or go back to change the picks.`;
}

/** The body of the publish run for the services a batch created: exactly those ids, nothing else of the supplier. */
export function previewScope(ids: readonly Id[]): PublishScope {
  return { kind: 'services', serviceIds: [...ids] };
}

/** How many batches a list of this many ids goes in. */
export function batchCount(total: number): number {
  return Math.ceil(total / BATCH_SIZE);
}

/** The answers of the batches as one: the counts added up, and the ids of the services they created. */
export function totalOf(outcomes: readonly BatchOutcome[]): ImportResult {
  return mergeResults(outcomes.map((outcome) => outcome.result));
}

/** "2 services added, 1 service updated, 3 unchanged": the first line of the result. */
export function addedLine(result: Pick<ImportResult, 'created' | 'updated' | 'unchanged'>): string {
  const parts = [
    result.created > 0 && `${servicesText(result.created)} added`,
    result.updated > 0 && `${servicesText(result.updated)} updated`,
    result.unchanged > 0 && `${num(result.unchanged)} unchanged`,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Nothing changed';
}

/** Whether a line says something to the person: the runs, the refusals and the services the server did not name. */
export function isShown(line: ShopLine): boolean {
  return line.kind === 'started' || line.kind === 'failed' || line.kind === 'unknown';
}

/** The start of a line of a long list that went in several batches: "Batch 2 of 3: ". Empty for a list of one batch. */
function batchLabel(batch: number, batches: number): string {
  return batches > 1 ? `Batch ${num(batch)} of ${num(batches)}: ` : '';
}

/**
 * The sentence for one batch's shop preview. `batch` counts from 1, `batches` is how many batches the whole list goes in. The
 * refusal carries the server's own words.
 */
export function shopLineText(line: ShopLine, batch: number, batches: number): string {
  const label = batchLabel(batch, batches);
  switch (line.kind) {
    case 'started':
      return `${label}A shop preview is ready for ${servicesText(line.services)}.`;
    case 'failed':
      return `${label}The shop preview for ${servicesText(line.services)} could not be started. ${
        line.forbidden ? `You need the ${SHOP_PREVIEW_PERMISSION} permission.` : line.message
      }`;
    case 'unknown':
      return `${label}${servicesText(line.services)} added, but the server did not say which, so no shop preview was prepared.`;
    default:
      return '';
  }
}
