// Tests for the content page API functions (list, read, create, change, publish, generate), run against the dev mock API: each one
// reaches its route with the body of its assumed contract and reads the answer the way the Landing pages and Content tabs do.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import {
  createContentPage,
  generateContentPages,
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

// Records of the mock seed: landing pages are ids 1 to 14, then the six static pages and blog posts.
const ATT = 1; // Unlock iPhone on AT&T: published, carrier
const DRAFT_LANDING = 11; // Samsung KG lock fix: draft, brand
const HIDDEN = 12; // Unlock Redmi Note 12: noindex, model
const ABOUT = 15; // About us: static, published

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
    const hidden = await listContentPages({ filters: { status: 'noindex' } });
    expect(hidden.data.map((p) => p.id)).toEqual([HIDDEN]);
    const search = await listContentPages({ q: 'AT&T' });
    expect(search.data.map((p) => p.id)).toEqual([ATT]);
  });

  it('gives the visits and orders of a landing page and none for a static page', async () => {
    expect(await getContentPage(ATT)).toMatchObject({
      kind: 'carrier',
      status: 'published',
      visits30d: 5480,
      orders30d: 21,
    });
    expect(await getContentPage(ABOUT)).toMatchObject({ kind: 'static', visits30d: null });
  });
});

describe('createContentPage and updateContentPage', () => {
  it('creates a draft with a slug made from the title and sends no empty optional field', async () => {
    const requests = recordRequests();
    const created = await createContentPage({
      kind: 'country',
      title: 'Unlock phones in Spain',
      locale: 'en',
      bodyMd: '# Spain',
    });
    expect(requests.last().body).toEqual({
      kind: 'country',
      title: 'Unlock phones in Spain',
      locale: 'en',
      bodyMd: '# Spain',
    });
    expect(created).toMatchObject({ status: 'draft', slug: 'unlock-phones-in-spain', publishedAt: null });
  });

  it('refuses a slug that another page uses and names the field', async () => {
    const error = await createContentPage({
      kind: 'static',
      title: 'Other',
      slug: 'about',
      locale: 'en',
      bodyMd: '',
    }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).fieldErrors.slug?.[0]).toContain('already used');
  });

  it('changes only the fields it is given', async () => {
    const requests = recordRequests();
    const updated = await updateContentPage(DRAFT_LANDING, {
      title: 'Samsung KG lock fix guide',
      bodyMd: '# Guide',
    });
    expect(requests.last()).toMatchObject({
      method: 'PATCH',
      body: { title: 'Samsung KG lock fix guide', bodyMd: '# Guide' },
    });
    expect(updated).toMatchObject({
      title: 'Samsung KG lock fix guide',
      status: 'draft',
      slug: 'samsung-kg-lock-fix',
    });
  });
});

describe('publishContentPage', () => {
  it('publishes a draft and hides it again with { published }', async () => {
    const requests = recordRequests();
    const published = await publishContentPage(DRAFT_LANDING, { published: true });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { published: true } });
    expect(requests.last().url.pathname).toBe(`/admin/content-pages/${DRAFT_LANDING}/publish`);
    expect(published.status).toBe('published');
    expect(published.publishedAt).not.toBeNull();
    expect((await publishContentPage(DRAFT_LANDING, { published: false })).status).toBe('draft');
  });
});

describe('generateContentPages', () => {
  it('makes a draft for each brand, model and network and sends the lists as typed', async () => {
    const requests = recordRequests();
    const result = await generateContentPages({
      brands: ['Apple'],
      models: ['iPhone 13'],
      networks: ['AT&T', 'Vodafone'],
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { brands: ['Apple'], models: ['iPhone 13'], networks: ['AT&T', 'Vodafone'] },
    });
    expect(requests.last().url.pathname).toBe('/admin/content-pages/generate');
    expect(result.created.map((p) => p.title)).toEqual([
      'Unlock iPhone 13 on AT&T',
      'Unlock iPhone 13 on Vodafone',
    ]);
    expect(result.created.every((p) => p.status === 'draft')).toBe(true);
    expect(result.skipped).toBe(0);
  });

  it('skips a combination that already has a page', async () => {
    await generateContentPages({ brands: ['Apple'], models: ['iPhone 13'], networks: ['AT&T'] });
    const again = await generateContentPages({
      brands: ['Apple'],
      models: ['iPhone 13'],
      networks: ['AT&T'],
    });
    expect(again).toMatchObject({ created: [], skipped: 1 });
  });
});
