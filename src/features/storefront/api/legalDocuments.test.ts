// Tests for the legal document API functions, run against the dev mock API: write a version, read it back, publish it. A published
// text never changes, so there is no edit route to test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createLegalDocument, getLegalDocument, listLegalDocuments, publishLegalDocument } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Records of the mock seed: six documents from the demo, then a draft Refund policy v1.5.
const TERMS_EN = 1; // Terms of service v3.2 (EN), in force
const TERMS_OLD = 6; // Terms of service v3.1 (EN), an earlier version
const REFUND_DRAFT = 7;

describe('listLegalDocuments', () => {
  it('filters by document and by the version in force', async () => {
    const requests = recordRequests();
    const current = await listLegalDocuments({ filters: { type: 'terms', isCurrent: true } });
    expect(requests.last().url.searchParams.get('type')).toBe('terms');
    expect(requests.last().url.searchParams.get('isCurrent')).toBe('true');
    expect(current.data.map((d) => d.locale).sort()).toEqual(['ar', 'en']);
  });

  it('tells a version in force, an earlier one and a draft apart', async () => {
    expect(await getLegalDocument(TERMS_EN)).toMatchObject({
      isCurrent: true,
      type: 'terms',
      version: '3.2',
    });
    expect(await getLegalDocument(TERMS_OLD)).toMatchObject({ isCurrent: false });
    expect((await getLegalDocument(TERMS_OLD)).effectiveFrom).not.toBeNull();
    expect(await getLegalDocument(REFUND_DRAFT)).toMatchObject({
      isCurrent: false,
      effectiveFrom: null,
      version: '1.5',
    });
  });
});

describe('createLegalDocument', () => {
  it('writes a version that is not in force yet', async () => {
    const requests = recordRequests();
    const created = await createLegalDocument({
      type: 'terms',
      locale: 'en',
      version: '3.3',
      bodyMd: '# Terms',
      requiresReacceptance: true,
    });
    expect(requests.last()).toMatchObject({
      method: 'POST',
      body: { type: 'terms', version: '3.3', requiresReacceptance: true },
    });
    expect(created).toMatchObject({ isCurrent: false, effectiveFrom: null });
  });

  it('refuses a version number that exists and names the field', async () => {
    const error = await createLegalDocument({
      type: 'terms',
      locale: 'en',
      version: '3.2',
      bodyMd: '# Terms',
      requiresReacceptance: false,
    }).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).fieldErrors.version?.[0]).toContain('already exists');
  });
});

describe('publishLegalDocument', () => {
  it('puts the version in force and retires the one it replaces', async () => {
    const requests = recordRequests();
    const published = await publishLegalDocument(REFUND_DRAFT);
    expect(requests.last()).toMatchObject({ method: 'POST' });
    expect(requests.last().url.pathname).toBe(`/admin/legal-documents/${REFUND_DRAFT}/publish`);
    expect(published).toMatchObject({ isCurrent: true, version: '1.5' });
    expect(published.effectiveFrom).not.toBeNull();
    expect((await getLegalDocument(4)).isCurrent).toBe(false);
  });

  it('refuses a version that is already in force', async () => {
    const error = await publishLegalDocument(TERMS_EN).catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(409);
    expect((error as ApiError).detail).toContain('already in force');
  });
});
