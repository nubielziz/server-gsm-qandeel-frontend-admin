// Tests for the content page API functions (list, read, create, change, publish), run against the dev mock API: each one reaches its
// route with the body of its assumed contract and reads the answer the way the Content tab does. The draft generator and the landing
// kinds were retired (decision 025): the mock knows static pages and blog posts only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createContentPage,
  getContentPage,
  listContentPages,
  publishContentPage,
  updateContentPage,
} from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Records of the mock seed: the six static pages and blog posts, ids 1 to 6.
const ABOUT = 1; // About us: static, published
const BLOG = 4; // How to know if your iPhone is locked: blog, published
const DRAFT = 6; // Unlocking vs jailbreaking: blog, draft

describe('listContentPages', () => {
  it('repeats the kind key to ask for several kinds and reads the total from the header', async () => {
    const requests = recordRequests();
    const page = await listContentPages({
      start: 0,
      end: 25,
      sort: ['updatedAt'],
      order: ['desc'],
      filters: { kind: ['static', 'blog'] },
    });
    const { method, url } = requests.last();
    expect(method).toBe('GET');
    expect(url.pathname).toBe('/admin/content-pages');
    expect(url.searchParams.getAll('kind')).toEqual(['static', 'blog']);
    expect(url.searchParams.get('_sort')).toBe('updatedAt');
    expect(page.total).toBe(6);
    expect(page.data.map((p) => p.kind).every((kind) => kind === 'static' || kind === 'blog')).toBe(true);
  });

  it('filters by status and searches the title', async () => {
    const drafts = await listContentPages({ filters: { status: 'draft' } });
    expect(drafts.data.map((p) => p.id)).toEqual([DRAFT]);
    const search = await listContentPages({ q: 'locked' });
    expect(search.data.map((p) => p.id)).toEqual([BLOG]);
  });

  it('reads one page with its body and no landing figures', async () => {
    expect(await getContentPage(ABOUT)).toMatchObject({
      kind: 'static',
      status: 'published',
      visits30d: null,
      orders30d: null,
    });
  });
});

describe('createContentPage and updateContentPage', () => {
  it('creates a draft with a slug made from the title and sends no empty optional field', async () => {
    const requests = recordRequests();
    const created = await createContentPage({
      kind: 'blog',
      title: 'Unlock phones in Spain',
      bodyMd: '# Spain',
    });
    expect(requests.last().body).toEqual({
      kind: 'blog',
      title: 'Unlock phones in Spain',
      bodyMd: '# Spain',
    });
    expect(created).toMatchObject({ status: 'draft', slug: 'unlock-phones-in-spain', publishedAt: null });
  });

  it('refuses a slug that another page uses and names the field', async () => {
    const error = await createContentPage({
      kind: 'static',
      title: 'Other',
      slug: 'about',
      bodyMd: '',
    }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).fieldErrors.slug?.[0]).toContain('already used');
  });

  it('refuses a landing kind that was retired, and names the field', async () => {
    const error = await createContentPage({
      kind: 'carrier' as 'static',
      title: 'Unlock on AT&T',
      bodyMd: '',
    }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(422);
    expect((error as ApiError).fieldErrors.kind?.[0]).toBe('Choose a type.');
  });

  it('changes only the fields it is given', async () => {
    const requests = recordRequests();
    const updated = await updateContentPage(DRAFT, {
      title: 'Unlocking vs jailbreaking: a guide',
      bodyMd: '# Guide',
    });
    expect(requests.last()).toMatchObject({
      method: 'PATCH',
      body: { title: 'Unlocking vs jailbreaking: a guide', bodyMd: '# Guide' },
    });
    expect(updated).toMatchObject({
      title: 'Unlocking vs jailbreaking: a guide',
      status: 'draft',
      slug: 'unlock-vs-jailbreak',
    });
  });
});

describe('publishContentPage', () => {
  it('publishes a draft and hides it again with { published }', async () => {
    const requests = recordRequests();
    const published = await publishContentPage(DRAFT, { published: true });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { published: true } });
    expect(requests.last().url.pathname).toBe(`/admin/content-pages/${DRAFT}/publish`);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
    expect((await publishContentPage(DRAFT, { published: false })).status).toBe('draft');
  });
});
