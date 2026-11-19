// Tests for the words and rules of "Also put them on the shop": the lock of the tick box, which refusal is "no rule", when step 3 has
// a line, what it says for each state of the publish run, and when the page asks again. Pure functions; the dialog is in
// `pages/SupplierQuickAddPublish.test.tsx`.
import { describe, expect, it } from 'vitest';
import type { PublishRun } from '@/features/storefront';
import { ApiError } from '@/lib/api';
import {
  isNoRuleRefusal,
  PUBLISH_NEEDS_PERMISSION,
  PUBLISH_POLL_MS,
  PUBLISH_SWITCHED_OFF,
  PUBLISH_WAIT_MS,
  publishLine,
  publishLock,
  publishPollDelay,
  wantsPublishLine,
} from './quickAddPublish';

const ENDED = '2026-11-18T10:00:30.000Z';
const quick = {
  createdAt: '2026-11-18T10:00:00.000Z',
  startedAt: '2026-11-18T10:00:01.000Z',
  finishedAt: ENDED,
};
const endedMs = Date.parse(ENDED);

const publishRun = (
  changes: Partial<PublishRun> = {},
  counts: Partial<PublishRun['counts']> = {},
): PublishRun => ({
  id: 11,
  status: 'succeeded',
  source: 'quick_add',
  quickAddRunId: 9,
  scope: { kind: 'quickAddRun', runId: 9 },
  listed: true,
  auto: true,
  total: 10,
  counts: {
    ready: 0,
    review: 0,
    blocked: 0,
    included: 7,
    noRule: 0,
    published: 7,
    skipped: 3,
    refused: 0,
    pending: 0,
    ...counts,
  },
  switch: { status: null, listed: null, switched: 0, skipped: 0, error: null },
  replacedBy: null,
  error: null,
  requestedBy: null,
  requestedByName: null,
  createdAt: ENDED,
  preparedAt: ENDED,
  startedAt: ENDED,
  finishedAt: ENDED,
  ...changes,
});

describe('the lock of the tick box', () => {
  it('is open for services added on sale to a role that may publish', () => {
    expect(publishLock('active', true)).toBeUndefined();
  });

  it('says the server’s words for switched off services, whoever asks', () => {
    expect(publishLock('disabled', true)).toBe(PUBLISH_SWITCHED_OFF);
    expect(publishLock('disabled', false)).toBe(PUBLISH_SWITCHED_OFF);
    expect(PUBLISH_SWITCHED_OFF).toBe('Services added switched off cannot go on the shop.');
  });

  it('names the permission a role without it needs', () => {
    expect(publishLock('active', false)).toBe(PUBLISH_NEEDS_PERMISSION);
    expect(PUBLISH_NEEDS_PERMISSION).toBe('You need the storefront:publish permission');
  });
});

describe('which refusal is "no rule"', () => {
  const refusal = (status: number, fieldErrors: Record<string, string[]>, code?: string) =>
    new ApiError({ status, code, fieldErrors });

  it('is a 422 on the publish field, or with the code no_rule', () => {
    expect(isNoRuleRefusal(refusal(422, { publish: ['Set a retail pricing rule first.'] }))).toBe(true);
    expect(isNoRuleRefusal(refusal(422, {}, 'no_rule'))).toBe(true);
  });

  it('is not another refusal, another status or something that is no API error', () => {
    expect(isNoRuleRefusal(refusal(422, { scope: ['Nothing to add.'] }))).toBe(false);
    expect(isNoRuleRefusal(refusal(403, { publish: ['No.'] }))).toBe(false);
    expect(isNoRuleRefusal(new Error('boom'))).toBe(false);
    expect(isNoRuleRefusal(undefined)).toBe(false);
  });
});

describe('when step 3 has a line', () => {
  const ended = { status: 'succeeded' as const, publish: 'listed' as const, created: 5 };

  it('wants one for an ended run that asked to publish and made something', () => {
    expect(wantsPublishLine(ended)).toBe(true);
    expect(wantsPublishLine({ ...ended, publish: 'unlisted' })).toBe(true);
    // A stopped run that created services is handed over as well (plan 6.3).
    expect(wantsPublishLine({ ...ended, status: 'failed' })).toBe(true);
  });

  it('wants none while the run goes on, when it did not ask, or when it made nothing', () => {
    expect(wantsPublishLine({ ...ended, status: 'queued' })).toBe(false);
    expect(wantsPublishLine({ ...ended, status: 'running' })).toBe(false);
    expect(wantsPublishLine({ ...ended, publish: 'none' })).toBe(false);
    expect(wantsPublishLine({ ...ended, created: 0 })).toBe(false);
  });
});

describe('what step 3 says about the publish run', () => {
  const line = (run: PublishRun | undefined, readAt = endedMs + 1000) => publishLine(quick, run, readAt);

  it('says preparing until two minutes after the end, then that the preview was not prepared', () => {
    expect(line(undefined, endedMs + 1000)).toEqual({ kind: 'preparing' });
    expect(line(undefined, endedMs + PUBLISH_WAIT_MS - 1)).toEqual({ kind: 'preparing' });
    expect(line(undefined, endedMs + PUBLISH_WAIT_MS)).toEqual({ kind: 'missing' });
  });

  it('counts the two minutes from the start when the run has no end, and from its creation when it has neither', () => {
    const noEnd = { ...quick, finishedAt: null };
    expect(publishLine(noEnd, undefined, Date.parse(quick.startedAt) + PUBLISH_WAIT_MS)).toEqual({
      kind: 'missing',
    });
    const neither = { createdAt: quick.createdAt, startedAt: null, finishedAt: null };
    expect(publishLine(neither, undefined, Date.parse(quick.createdAt) + PUBLISH_WAIT_MS - 1)).toEqual({
      kind: 'preparing',
    });
  });

  it('says the preview was not prepared for a run that failed before its preview was ready', () => {
    expect(line(publishRun({ status: 'failed', preparedAt: null }))).toEqual({ kind: 'missing' });
  });

  it('says preparing while the run is being prepared', () => {
    expect(line(publishRun({ status: 'preparing', preparedAt: null }))).toEqual({ kind: 'preparing' });
  });

  it('reads a finished run as what is on the shop and what needs a look, the run’s own counts', () => {
    const done = publishRun();
    expect(line(done)).toEqual({ kind: 'run', run: done, text: '7 on the shop, 3 need a look' });
    const all = publishRun({ total: 7 }, { skipped: 0 });
    expect(line(all)).toMatchObject({ text: '7 on the shop' });
    const one = publishRun({ total: 2 }, { published: 1, skipped: 1 });
    expect(line(one)).toMatchObject({ text: '1 on the shop, 1 need a look' });
  });

  it('says created switched off for a run made unlisted, and switched off the shop once its switch is done', () => {
    expect(line(publishRun({ listed: false }))).toMatchObject({
      text: '7 created switched off, 3 need a look',
    });
    const taken = publishRun({
      switch: { status: 'done', listed: false, switched: 7, skipped: 0, error: null },
    });
    expect(line(taken)).toMatchObject({ text: '7 switched off the shop, 3 need a look' });
    // A switch that is still going keeps the words of the run.
    const going = publishRun({
      switch: { status: 'running', listed: false, switched: 3, skipped: 0, error: null },
    });
    expect(line(going)).toMatchObject({ text: '7 on the shop, 3 need a look' });
  });

  it('says what a run waiting to start, publishing, or a draft with nothing ticked looks like', () => {
    expect(line(publishRun({ status: 'queued' }, { published: 0, skipped: 0, pending: 7 }))).toMatchObject({
      text: 'waiting to start',
    });
    expect(line(publishRun({ status: 'running' }, { published: 4, skipped: 0, pending: 3 }))).toMatchObject({
      text: '4 on the shop so far',
    });
    expect(line(publishRun({ status: 'draft' }, { published: 0, included: 0, skipped: 0 }))).toMatchObject({
      text: 'nothing went on the shop yet, 10 need a look',
    });
  });

  it('says a stopped run stopped, with what it did', () => {
    expect(line(publishRun({ status: 'failed' }, { published: 4, skipped: 0, pending: 6 }))).toMatchObject({
      text: 'stopped, 4 on the shop, 6 need a look',
    });
    expect(line(publishRun({ status: 'cancelled' }, { published: 4, skipped: 0, pending: 6 }))).toMatchObject(
      {
        text: 'stopped, 4 on the shop, 6 need a look',
      },
    );
  });
});

describe('when the page asks again', () => {
  const poll = (run: PublishRun | undefined, readAt = endedMs + 1000) => publishPollDelay(quick, run, readAt);

  it('asks every 5 seconds while the run is preparing, queued or running', () => {
    expect(PUBLISH_POLL_MS).toBe(5000);
    for (const status of ['preparing', 'queued', 'running'] as const) {
      expect(poll(publishRun({ status }))).toBe(5000);
    }
  });

  it('stops once the run is a draft or over', () => {
    for (const status of ['draft', 'succeeded', 'failed', 'cancelled'] as const) {
      expect(poll(publishRun({ status }))).toBe(false);
    }
  });

  it('keeps asking for a run that is not there yet, until two minutes after the end', () => {
    expect(poll(undefined, endedMs + 1000)).toBe(5000);
    expect(poll(undefined, endedMs + PUBLISH_WAIT_MS - 1)).toBe(5000);
    expect(poll(undefined, endedMs + PUBLISH_WAIT_MS)).toBe(false);
  });
});
