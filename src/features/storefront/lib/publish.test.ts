// Tests for what the Publish tab says about a run: whether it is working, the words of its status, its progress, the headline of a
// finished run, the scope in words, the line of counts and what a refusal reads like. The headline is the one that never says "on
// the shop" for a run created switched off.
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import type { PublishRun } from '../types';
import {
  countsLine,
  headline,
  isAlreadyRunning,
  isFinished,
  isRunLive,
  isSwitchLive,
  isWorking,
  leftOutCount,
  progressLine,
  progressRatio,
  publishedProgress,
  refusalText,
  scopeText,
  servicesText,
  SHOP_SERVICE_TYPES,
  statusWords,
} from './publish';

const counts = (over: Partial<PublishRun['counts']> = {}): PublishRun['counts'] => ({
  ready: 0,
  review: 0,
  blocked: 0,
  included: 0,
  noRule: 0,
  published: 0,
  skipped: 0,
  refused: 0,
  pending: 0,
  ...over,
});
const noSwitch: PublishRun['switch'] = { status: null, listed: null, switched: 0, skipped: 0, error: null };

describe('whether a run is working', () => {
  it('says a run that is preparing, queued or running is live, and every other run is not', () => {
    expect(['preparing', 'queued', 'running'].map((status) => isRunLive({ status } as PublishRun))).toEqual([
      true,
      true,
      true,
    ]);
    expect(
      ['draft', 'succeeded', 'failed', 'cancelled'].map((status) => isRunLive({ status } as PublishRun)),
    ).toEqual([false, false, false, false]);
    expect(isRunLive(undefined)).toBe(false);
  });

  it('says a switch that is queued or running is live', () => {
    expect(isSwitchLive({ switch: { ...noSwitch, status: 'queued' } })).toBe(true);
    expect(isSwitchLive({ switch: { ...noSwitch, status: 'running' } })).toBe(true);
    expect(isSwitchLive({ switch: { ...noSwitch, status: 'done' } })).toBe(false);
    expect(isSwitchLive({ switch: noSwitch })).toBe(false);
  });

  it('polls while either the run or its switch works, and a finished run is over', () => {
    const run = (status: PublishRun['status'], switchStatus: PublishRun['switch']['status']) =>
      ({ status, switch: { ...noSwitch, status: switchStatus } }) as PublishRun;
    expect(isWorking(run('running', null))).toBe(true);
    expect(isWorking(run('succeeded', 'running'))).toBe(true);
    expect(isWorking(run('succeeded', 'done'))).toBe(false);
    expect(isFinished(run('failed', null))).toBe(true);
    expect(isFinished(run('draft', null))).toBe(false);
  });
});

describe('statusWords', () => {
  it('gives each status an icon and a word', () => {
    const words = (status: PublishRun['status']) =>
      statusWords({ status, listed: true, switch: noSwitch }).label;
    expect(
      ['preparing', 'draft', 'queued', 'running', 'succeeded', 'failed', 'cancelled'].map((s) =>
        words(s as PublishRun['status']),
      ),
    ).toEqual(['Preparing', 'Draft', 'Waiting to start', 'Publishing', 'Done', 'Failed', 'Cancelled']);
    expect(statusWords({ status: 'failed', listed: true, switch: noSwitch })).toMatchObject({
      tone: 'crit',
      icon: 'xCircle',
    });
  });

  it('says a run that was created switched off is done switched off, until it is switched on', () => {
    expect(statusWords({ status: 'succeeded', listed: false, switch: noSwitch }).label).toBe(
      'Done, switched off',
    );
    expect(
      statusWords({
        status: 'succeeded',
        listed: false,
        switch: { ...noSwitch, status: 'done', listed: true },
      }).label,
    ).toBe('Done');
  });

  it('says plain Done while a take-off is queued, running or failed, and switched off once it is done', () => {
    // The server holds the switch's target in `listed` from the moment the switch is asked for.
    for (const status of ['queued', 'running', 'failed'] as const) {
      expect(
        statusWords({ status: 'succeeded', listed: false, switch: { ...noSwitch, status, listed: false } })
          .label,
      ).toBe('Done');
    }
    expect(
      statusWords({
        status: 'succeeded',
        listed: false,
        switch: { ...noSwitch, status: 'done', listed: false },
      }).label,
    ).toBe('Done, switched off');
  });
});

describe('scopeText', () => {
  it('names each scope, a category and a supplier by number (a run keeps no names)', () => {
    expect(scopeText({ kind: 'all' })).toBe('Everything not on the shop yet');
    expect(scopeText({ kind: 'category', categoryId: 4 })).toBe('Category 4');
    expect(scopeText({ kind: 'supplier', supplierId: 2 })).toBe('Supplier 2');
    expect(scopeText({ kind: 'services', serviceIds: [1, 2, 3] })).toBe('3 services picked');
    expect(scopeText({ kind: 'services', serviceIds: [1] })).toBe('1 service picked');
    expect(scopeText({ kind: 'quickAddRun', runId: 7 })).toBe('What Quick add 7 made');
    expect(scopeText({ kind: 'run', runId: 3 })).toBe('Run 3 again');
  });
});

describe('progress', () => {
  it('counts the included rows that have a result, not the left-out rows', () => {
    const run = {
      counts: counts({ included: 40, pending: 28, published: 10, refused: 2, skipped: 20 }),
      listed: true,
    };
    expect(publishedProgress(run)).toEqual({ done: 12, of: 40 });
    expect(progressRatio(run)).toBeCloseTo(0.3);
    expect(progressLine(run)).toBe('12 of 40 services, 10 on the shop');
  });

  it('starts at nothing for a run that has not begun, and never goes past the included rows', () => {
    expect(publishedProgress({ counts: counts({ included: 30, pending: 60 }) })).toEqual({ done: 0, of: 30 });
    expect(publishedProgress({ counts: counts({ included: 30, pending: 0 }) })).toEqual({ done: 30, of: 30 });
    expect(progressRatio({ counts: counts() })).toBe(0);
  });

  it('says "created" for a run that publishes switched off', () => {
    expect(progressLine({ counts: counts({ included: 5, pending: 3, published: 2 }), listed: false })).toBe(
      '2 of 5 services, 2 created',
    );
  });
});

describe('headline', () => {
  const run = (over: Partial<Pick<PublishRun, 'listed' | 'switch'>> & { published: number }) => ({
    listed: true,
    switch: noSwitch,
    ...over,
    counts: counts({ published: over.published }),
  });

  it('says how many are on the shop', () => {
    expect(headline(run({ published: 9 }))).toBe('9 services are on the shop');
    expect(headline(run({ published: 1 }))).toBe('1 service is on the shop');
  });

  it('never says "on the shop" for a run created switched off', () => {
    expect(headline(run({ published: 6, listed: false }))).toBe('6 services were created switched off');
    expect(headline(run({ published: 1, listed: false }))).toBe('1 service was created switched off');
  });

  it('says a run that was taken off the shop was switched off, and a run put back is on the shop again', () => {
    const off = { status: 'done' as const, listed: false, switched: 9, skipped: 0, error: null };
    expect(headline(run({ published: 9, listed: false, switch: off }))).toBe(
      '9 services were switched off the shop',
    );
    expect(headline(run({ published: 9, listed: true, switch: { ...off, listed: true } }))).toBe(
      '9 services are on the shop',
    );
  });

  it('says so when nothing was published', () => {
    expect(headline(run({ published: 0 }))).toBe('Nothing was published');
  });

  // The server sets the run's `listed` to the switch's target the moment the switch is asked for, so a run that is being taken
  // off the shop (or put back) already reads `listed: false` (or `true`) while its listings are part way.
  it.each(['queued', 'running', 'failed'] as const)(
    'only says how many were published while a switch is %s, whichever way it goes',
    (status) => {
      const asked = (listed: boolean) => ({ status, listed, switched: 3, skipped: 0, error: null });
      expect(headline(run({ published: 9, listed: false, switch: asked(false) }))).toBe(
        '9 services were published',
      );
      expect(headline(run({ published: 9, listed: true, switch: asked(true) }))).toBe(
        '9 services were published',
      );
      expect(headline(run({ published: 1, listed: false, switch: asked(false) }))).toBe(
        '1 service was published',
      );
    },
  );

  it('still says nothing was published for a run that published none, switch or not', () => {
    const running = { status: 'running' as const, listed: false, switched: 0, skipped: 0, error: null };
    expect(headline(run({ published: 0, listed: false, switch: running }))).toBe('Nothing was published');
  });

  it('goes back to the switched or on-the-shop words once the switch is done', () => {
    const done = (listed: boolean) => ({
      status: 'done' as const,
      listed,
      switched: 9,
      skipped: 0,
      error: null,
    });
    expect(headline(run({ published: 9, listed: false, switch: done(false) }))).toBe(
      '9 services were switched off the shop',
    );
    expect(headline(run({ published: 9, listed: true, switch: done(true) }))).toBe(
      '9 services are on the shop',
    );
  });
});

describe('the rest', () => {
  it('counts the rows a finished run did not publish, and writes the line of counts', () => {
    const run = { total: 12, counts: counts({ published: 9, skipped: 2, refused: 1 }) };
    expect(leftOutCount(run)).toBe(3);
    expect(countsLine(run)).toBe('9 published, 2 left out, 1 refused');
    expect(leftOutCount({ total: 5, counts: counts({ published: 9 }) })).toBe(0);
  });

  it('writes a number of services', () => {
    expect([servicesText(0), servicesText(1), servicesText(1234)]).toEqual([
      '0 services',
      '1 service',
      '1,234 services',
    ]);
  });

  it('offers the three types that can be on the shop, never a file service', () => {
    expect([...SHOP_SERVICE_TYPES]).toEqual(['imei', 'server', 'remote']);
  });
});

describe('what a refusal says', () => {
  it('shows the first field message the server gave, else its own text', () => {
    const field = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      title: 'Check the form',
      detail: 'Some fields need attention.',
      fieldErrors: { scope: ['Nothing to publish.'] },
    });
    expect(refusalText(field)).toBe('Nothing to publish.');
    const plain = new ApiError({
      status: 409,
      code: 'CONFLICT',
      title: 'Not in the right state',
      detail: 'This run is no longer a draft.',
    });
    expect(refusalText(plain)).toBe('This run is no longer a draft.');
    expect(refusalText(new Error('Boom'))).toBe('Boom');
  });

  it('knows the 409 that says a job is already going', () => {
    expect(isAlreadyRunning(new ApiError({ status: 409, code: 'JOB_ALREADY_RUNNING' }))).toBe(true);
    expect(isAlreadyRunning(new ApiError({ status: 409, code: 'CONFLICT' }))).toBe(false);
    expect(isAlreadyRunning(new Error('x'))).toBe(false);
  });
});
