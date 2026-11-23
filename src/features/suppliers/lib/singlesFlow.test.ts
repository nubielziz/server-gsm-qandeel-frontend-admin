// Tests for the single-services path's pure parts: when a batch asks for a shop preview, what it asks for, and the words of the result.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { ImportResult } from '../types';
import { BatchStopped } from './batches';
import {
  addedLine,
  addStoppedText,
  batchCount,
  canTryAgain,
  isRefusal,
  isShown,
  MAX_PREVIEW_IDS,
  previewScope,
  retryKey,
  sentOf,
  shopLineText,
  shopPlan,
  stoppedSub,
  totalOf,
  withRetries,
  type BatchOutcome,
  type FailedShopLine,
  type ShopLine,
} from './singlesFlow';

/** A shop line whose preview could not be started: it keeps the ids of the services its batch created. */
const failed = (
  services: number,
  message: string,
  options: { forbidden?: boolean; first?: number } = {},
): FailedShopLine => ({
  kind: 'failed',
  services,
  message,
  serviceIds: Array.from({ length: services }, (_, index) => (options.first ?? 100) + index),
  forbidden: options.forbidden ?? false,
});

const result = (created: number, updated = 0, unchanged = 0, ids?: number[]): ImportResult => ({
  created,
  updated,
  unchanged,
  ...(ids ? { createdServiceIds: ids } : {}),
});

describe('what a batch does for the shop', () => {
  it('does nothing with the switch off, whatever the batch created', () => {
    expect(shopPlan(false, result(2, 0, 0, [7, 8]))).toEqual({ kind: 'off' });
  });

  it('does nothing for a batch that created no service, even one that updated some', () => {
    expect(shopPlan(true, result(0, 3, 0, []))).toEqual({ kind: 'nothing' });
    expect(shopPlan(true, result(0, 3))).toEqual({ kind: 'nothing' });
  });

  it('asks for a preview of exactly the services the server says it created, not the ones it updated', () => {
    expect(shopPlan(true, result(2, 1, 0, [7, 8]))).toEqual({ kind: 'prepare', ids: [7, 8] });
  });

  it('says so when services were created but the server did not name them', () => {
    expect(shopPlan(true, result(2))).toEqual({ kind: 'unknown', services: 2 });
    expect(shopPlan(true, result(2, 0, 0, []))).toEqual({ kind: 'unknown', services: 2 });
  });

  it('never asks for a preview of more services than one preview takes', () => {
    const ids = Array.from({ length: MAX_PREVIEW_IDS + 1 }, (_, index) => index + 1);
    const plan = shopPlan(true, result(MAX_PREVIEW_IDS + 1, 0, 0, ids));
    expect(MAX_PREVIEW_IDS).toBe(500);
    expect(plan.kind === 'prepare' && plan.ids).toHaveLength(500);
  });

  it('makes the scope of a preview from the ids, as a copy', () => {
    const ids = [3, 4];
    const scope = previewScope(ids);
    expect(scope).toEqual({ kind: 'services', serviceIds: [3, 4] });
    ids.push(5);
    expect(scope).toEqual({ kind: 'services', serviceIds: [3, 4] });
  });
});

describe('the batches of a list', () => {
  it('counts them by 500', () => {
    expect([0, 1, 500, 501, 1_000, 1_132].map(batchCount)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('adds the answers of the batches up, with the ids of the services they created in order', () => {
    const outcome = (answer: ImportResult): BatchOutcome => ({
      sent: 500,
      result: answer,
      shop: { kind: 'off' },
    });
    expect(totalOf([outcome(result(2, 1, 0, [11, 12])), outcome(result(1, 0, 4, [13]))])).toEqual({
      created: 3,
      updated: 1,
      unchanged: 4,
      createdServiceIds: [11, 12, 13],
    });
    expect(totalOf([])).toEqual({ created: 0, updated: 0, unchanged: 0 });
  });
});

describe('the words of the result', () => {
  it('names what was added, updated and left unchanged', () => {
    expect(addedLine(result(3))).toBe('3 services added');
    expect(addedLine(result(1, 2, 5))).toBe('1 service added, 2 services updated, 5 unchanged');
    expect(addedLine(result(0, 0, 4))).toBe('4 unchanged');
    expect(addedLine(result(1_200))).toBe('1,200 services added');
    expect(addedLine(result(0))).toBe('Nothing changed');
  });

  it('shows a line for a preview that was started, refused or not asked for, and none for the rest', () => {
    const lines: ShopLine[] = [
      { kind: 'off' },
      { kind: 'nothing' },
      { kind: 'unknown', services: 2 },
      { kind: 'started', runId: 9, services: 2 },
      failed(2, 'Not now.'),
    ];
    expect(lines.map(isShown)).toEqual([false, false, true, true, true]);
  });

  it('words each line, with the batch number when the list went in more than one', () => {
    const started: ShopLine = { kind: 'started', runId: 9, services: 1 };
    expect(shopLineText(started, 1, 1)).toBe('A shop preview is ready for 1 service.');
    expect(shopLineText({ kind: 'started', runId: 9, services: 500 }, 2, 3)).toBe(
      'Batch 2 of 3: A shop preview is ready for 500 services.',
    );
    expect(shopLineText(failed(500, 'A run is already going.'), 1, 2)).toBe(
      'Batch 1 of 2: The shop preview for 500 services could not be started. A run is already going.',
    );
    // A 403 names the permission the role lacks, not the server's general words.
    expect(shopLineText(failed(3, 'Forbidden.', { forbidden: true }), 1, 1)).toBe(
      'The shop preview for 3 services could not be started. You need the storefront:create permission.',
    );
    expect(shopLineText({ kind: 'unknown', services: 2 }, 1, 1)).toBe(
      '2 services added, but the server did not say which, so no shop preview was prepared.',
    );
    expect(shopLineText({ kind: 'off' }, 1, 1)).toBe('');
    expect(shopLineText({ kind: 'nothing' }, 1, 1)).toBe('');
  });
});

describe('asking again for a shop preview', () => {
  const outcome = (shop: ShopLine, sent = 500): BatchOutcome => ({
    sent,
    result: result(sent, 0, 0),
    shop,
  });

  it('offers it for a refusal, not after a 403 (the same role is refused again), and for no other line', () => {
    expect(canTryAgain(failed(2, 'Busy.'))).toBe(true);
    expect(canTryAgain(failed(2, 'Forbidden.', { forbidden: true }))).toBe(false);
    expect(canTryAgain({ kind: 'started', runId: 4, services: 2 })).toBe(false);
    expect(canTryAgain({ kind: 'unknown', services: 2 })).toBe(false);
    expect(canTryAgain({ kind: 'off' })).toBe(false);
  });

  it('names a failed line by the first service its batch created, which no other batch has', () => {
    expect(retryKey(failed(3, 'Busy.', { first: 7 }))).toBe('7');
    expect(retryKey(failed(3, 'Busy.', { first: 507 }))).toBe('507');
  });

  it('swaps a failed line for what came of asking again, and leaves every other line as it is', () => {
    const first = outcome(failed(2, 'Busy.', { first: 1 }));
    const second = outcome(failed(2, 'Busy.', { first: 501 }));
    const started = outcome({ kind: 'started', runId: 9, services: 2 });
    const again: ShopLine = { kind: 'started', runId: 41, services: 2 };
    expect(withRetries([first, started, second], { '501': again })).toEqual([
      first,
      started,
      { ...second, shop: again },
    ]);
    expect(withRetries([first], {})).toEqual([first]);
  });
});

describe('a stopped import', () => {
  const stopped = (reason: unknown) => new BatchStopped(500, 1_200, reason);
  const refusal = new ApiError({
    status: 422,
    title: 'Cannot import',
    detail: 'Bulk 0555 cannot be imported.',
  });

  it('counts what the answered batches sent', () => {
    const outcome = (sent: number): BatchOutcome => ({ sent, result: result(sent), shop: { kind: 'off' } });
    expect(sentOf([])).toBe(0);
    expect(sentOf([outcome(500), outcome(500)])).toBe(1_000);
  });

  it('tells a refusal of the list (400 or 422) from a failure that may pass', () => {
    expect(isRefusal(stopped(refusal))).toBe(true);
    expect(isRefusal(stopped(new ApiError({ status: 400 })))).toBe(true);
    expect(isRefusal(refusal)).toBe(true);
    expect(isRefusal(stopped(new ApiError({ status: 409, code: 'SYNC_NEEDED' })))).toBe(false);
    expect(isRefusal(stopped(new ApiError({ status: 503 })))).toBe(false);
    expect(isRefusal(stopped(new Error('offline')))).toBe(false);
  });

  it('adds the way out to a refusal only', () => {
    expect(addStoppedText(stopped(refusal))).toBe(
      '500 of 1,200 services were added before it stopped. Bulk 0555 cannot be imported. Go back, untick the services it names and preview again.',
    );
    expect(addStoppedText(stopped(new ApiError({ status: 503, detail: 'Busy.' })))).toBe(
      '500 of 1,200 services were added before it stopped. Busy.',
    );
  });

  it('says added only when a batch created services, updated when it only changed costs', () => {
    expect(stoppedSub(result(500), false)).toBe(
      'Some services were added. Continue to do the rest, or go back to change the picks.',
    );
    expect(stoppedSub(result(0, 400, 100), false)).toBe(
      'Some services were updated. Continue to do the rest, or go back to change the picks.',
    );
    expect(stoppedSub(result(0, 0, 500), false)).toContain('Some services were checked.');
    expect(stoppedSub(result(500), true)).toBe(
      'Some services were added. The server refused the rest as picked: go back and untick the services it names.',
    );
  });
});
