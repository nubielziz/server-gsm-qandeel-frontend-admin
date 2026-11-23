// Tests for the words of the Catalog row's shop switch: a publish row is "ready" only when the server says so, every other answer
// becomes the server's reason with the next step, and an applied run is read back the same way. Also the switch's lock per move.
import { describe, expect, it } from 'vitest';
import type { PublishItem, PublishRun } from '@/features/storefront';
import { ApiError } from '@/lib/api';
import type { ServiceGrants } from '../hooks/useServiceGrants';
import type { Service } from '../types';
import { outcomeOf, readinessOf, refusalSentence, serverWords, shopLock } from './shopSwitch';

/** Only the keys these functions read; the rest of a row is the server's and does not matter here. */
const item = (over: Partial<PublishItem>): PublishItem =>
  ({
    state: 'ready',
    included: true,
    blockedReason: null,
    flags: [],
    result: null,
    resultReason: null,
    ...over,
  }) as PublishItem;
const run = (over: Partial<PublishRun>): PublishRun =>
  ({ status: 'succeeded', error: null, ...over }) as PublishRun;

describe('readinessOf', () => {
  it('lets only a ticked row the server calls ready through', () => {
    expect(readinessOf(item({}))).toBe('ready');
    expect(readinessOf(item({ included: false }))).not.toBe('ready');
  });

  it('points a missing price at the shop price rules, and a zero cost at the run', () => {
    expect(
      readinessOf(item({ state: 'blocked', blockedReason: 'price_missing', flags: ['no_rule'] })),
    ).toEqual({
      why: 'no shop price rule covers it',
      fix: 'Make a shop price rule, then try again.',
      next: 'rules',
    });
    expect(
      readinessOf(item({ state: 'blocked', blockedReason: 'price_missing', flags: ['no_cost'] })),
    ).toMatchObject({
      why: 'its cost is zero, so no rule can price it',
      next: 'run',
    });
  });

  it('words a price under the floor and the facts the console cannot fix', () => {
    expect(readinessOf(item({ state: 'blocked', blockedReason: 'below_floor' }))).toMatchObject({
      why: 'its shop price is under the floor',
      next: 'run',
    });
    expect(readinessOf(item({ state: 'blocked', blockedReason: 'supplier_unavailable' }))).toMatchObject({
      why: 'no supplier can fill it now',
      next: null,
    });
  });

  it('names the flags of a row the server wants a person to look at, and sends them to the run', () => {
    const refusal = readinessOf(item({ state: 'review', flags: ['duplicate_name', 'no_brand'] }));
    expect(refusal).toEqual({
      why: 'the server flags it: another service has the same supplier name',
      fix: 'Open the run to review it.',
      next: 'run',
    });
    expect(refusalSentence(refusal as Exclude<typeof refusal, 'ready'>)).toBe(
      'It cannot go on the shop: the server flags it: another service has the same supplier name. Open the run to review it.',
    );
  });

  it('says so when the run holds no row', () => {
    expect(readinessOf(undefined)).toMatchObject({ why: 'the server found nothing to publish' });
  });
});

describe('outcomeOf', () => {
  it('reads a published row as done', () => {
    expect(outcomeOf(run({}), item({ result: 'published' }))).toBe('published');
  });

  it('gives the result reason of a row that did not go on, or the text the server sent', () => {
    expect(outcomeOf(run({}), item({ result: 'refused', resultReason: 'cost_moved' }))).toMatchObject({
      why: 'the cost changed a lot meanwhile',
      next: 'run',
    });
    expect(outcomeOf(run({}), item({ result: 'refused', resultReason: 'brand_new_reason' }))).toMatchObject({
      why: 'brand_new_reason',
    });
  });

  it('tells a run that still works or stopped, with the server’s error', () => {
    expect(outcomeOf(run({ status: 'running' }), item({}))).toMatchObject({
      why: 'it is still being published',
    });
    expect(outcomeOf(run({ status: 'failed', error: 'The job died.' }), item({}))).toMatchObject({
      why: 'The job died.',
      fix: 'Open the run to continue it.',
    });
  });
});

describe('shopLock', () => {
  const grants = (granted: string[]) =>
    ({
      needs: (p: string) => grants(granted).needsAll(p),
      needsAll: (...ps: string[]) => {
        const missing = ps.filter((p) => !granted.includes(p));
        return missing.length === 0
          ? { disabled: false }
          : { disabled: true, title: `You need the ${missing.join(' and ')} permission` };
      },
    }) as unknown as ServiceGrants;
  const service = (over: Partial<Service>) =>
    ({ listingId: null, isListed: false, shopBlocked: null, ...over }) as Service;
  const all = grants(['storefront:create', 'storefront:update', 'storefront:publish']);

  it('locks a blocked service that is not on the shop with the reason', () => {
    expect(shopLock(service({ shopBlocked: 'not_orderable' }), all)).toEqual({
      disabled: true,
      title: 'Cannot be sold on the shop',
    });
    // One that is on the shop can still be taken off.
    expect(shopLock(service({ listingId: 3, isListed: true, shopBlocked: 'service_disabled' }), all)).toEqual(
      {
        disabled: false,
      },
    );
  });

  it('asks for the permissions of the move the switch would make', () => {
    const updateOnly = grants(['storefront:update']);
    expect(shopLock(service({ listingId: 3, isListed: true }), updateOnly)).toEqual({ disabled: false });
    expect(shopLock(service({ listingId: 3, isListed: false }), updateOnly).title).toBe(
      'You need the storefront:publish permission',
    );
    expect(shopLock(service({}), updateOnly).title).toBe(
      'You need the storefront:create and storefront:publish permission',
    );
  });
});

describe('serverWords', () => {
  it('prefers the first field message and falls back to the detail', () => {
    const refusal = new ApiError({
      status: 422,
      code: 'VALIDATION_FAILED',
      title: 'Check the form',
      detail: 'Some fields need attention.',
      fieldErrors: { scope: ['Nothing to publish.'] },
    });
    expect(serverWords(refusal)).toBe('Nothing to publish.');
    expect(serverWords(new Error('Network down'))).toBe('Network down');
  });
});
