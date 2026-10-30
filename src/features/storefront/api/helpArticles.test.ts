// Tests for the help article API functions, run against the dev mock API: each one reaches its route with the body of its assumed
// contract. The publish switch is a PATCH of `isPublished` because there is no publish route for articles.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createHelpArticle, getHelpArticle, listHelpArticles, updateHelpArticle } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const DRAFT = 12; // How long do you keep my IMEI?: the one draft of the seed

describe('listHelpArticles', () => {
  it('filters by publish state, searches and sorts', async () => {
    const requests = recordRequests();
    const drafts = await listHelpArticles({ filters: { isPublished: false } });
    expect(requests.last().url.searchParams.get('isPublished')).toBe('false');
    expect(drafts.data.map((a) => a.id)).toEqual([DRAFT]);
    const search = await listHelpArticles({ q: 'refund', sort: ['question'], order: ['asc'] });
    expect(search.data.map((a) => a.question)).toEqual(['How do refunds work?']);
  });

  it('gives the votes and the Markdown answer', async () => {
    expect(await getHelpArticle(1)).toMatchObject({
      category: 'Orders',
      question: 'How long does a carrier unlock take?',
      helpfulYes: 142,
      helpfulNo: 9,
      isPublished: true,
    });
  });
});

describe('createHelpArticle and updateHelpArticle', () => {
  it('writes an article as a draft unless it is published at once', async () => {
    const requests = recordRequests();
    const created = await createHelpArticle({
      category: 'Orders',
      question: 'Can I change the IMEI?',
      answerMd: 'No, place a new order.',
      locale: 'en',
    });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { category: 'Orders', locale: 'en' } });
    expect(created).toMatchObject({ isPublished: false, helpfulYes: 0, helpfulNo: 0 });
  });

  it('shows the server’s message under the field it names', async () => {
    const error = await createHelpArticle({
      category: 'Orders',
      question: '',
      answerMd: 'x',
      locale: 'en',
    }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors.question?.[0]).toBe('Enter the question.');
  });

  it('publishes with a PATCH of isPublished alone', async () => {
    const requests = recordRequests();
    const updated = await updateHelpArticle(DRAFT, { isPublished: true });
    expect(requests.last()).toMatchObject({ method: 'PATCH', body: { isPublished: true } });
    expect(updated.isPublished).toBe(true);
  });
});
