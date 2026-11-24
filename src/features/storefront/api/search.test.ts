// Tests for the search index's API functions, run against the dev mock API: each route's verb and address, the answer the backend
// plan states, and the refusal of a second rebuild (409).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { getSearchIndex, rebuildSearchIndex } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error as ApiError);

describe('the index', () => {
  it('reads the index, starts one rebuild and refuses a second', async () => {
    const before = await getSearchIndex();
    expect(before).toMatchObject({
      engine: { status: 'ok', version: '30.2' },
      documents: 14,
      expectedDocuments: 14,
      rebuild: { running: false },
      lastError: null,
    });
    const requests = recordRequests();
    await rebuildSearchIndex();
    expect(requests.last()).toMatchObject({ method: 'POST' });
    expect(requests.last().url.pathname).toBe('/admin/search/index/rebuild');
    expect((await getSearchIndex()).rebuild.running).toBe(true);
    const again = (await failure(rebuildSearchIndex())) as ApiError;
    expect([again.status, again.code]).toEqual([409, 'JOB_ALREADY_RUNNING']);
  });
});
