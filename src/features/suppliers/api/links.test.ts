// Tests for the read of one service's supplier chain: the route it asks, the chain it gets from the feature's mock (the same one the
// supplier detail shows), an unlinked service, a bad id and a refusal of the server.
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { mocks } from '../mocks';
import { getServiceSupplierLinks, getSupplier, replaceSupplierLinks } from '.';

setupMockApi();
beforeEach(async () => {
  mockServer.use(...mocks.handlers);
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Rapid IMEI (supplier 3) serves services that Nordic GSM takes over: the chain of its first link has two steps.
const RAPID = 3;

describe('getServiceSupplierLinks', () => {
  it('asks for the chain of the service by its address and gets it in priority order', async () => {
    const link = (await getSupplier(RAPID)).links[0];
    const requests = recordRequests();
    const chain = await getServiceSupplierLinks(link.serviceId);
    expect(requests.last()).toMatchObject({ method: 'GET', body: undefined });
    expect(requests.last().url.pathname).toBe(`/admin/services/${link.serviceId}/supplier-links`);
    expect(chain).toEqual(link.chain);
    expect(chain.map((step) => step.priority)).toEqual([1, 2]);
  });

  it('answers what a save made, in the same shape as the save', async () => {
    const link = (await getSupplier(RAPID)).links[0];
    const [primary, fallback] = link.chain;
    const saved = await replaceSupplierLinks(link.serviceId, {
      links: [
        { supplierServiceId: fallback.supplierServiceId, priority: 1 },
        { supplierServiceId: primary.supplierServiceId, priority: 2 },
      ],
    });
    expect(await getServiceSupplierLinks(link.serviceId)).toEqual(saved);
  });

  it('answers an empty list for a service with no link', async () => {
    const link = (await getSupplier(RAPID)).links[0];
    await replaceSupplierLinks(link.serviceId, { links: [] });
    expect(await getServiceSupplierLinks(link.serviceId)).toEqual([]);
    // A service the services mock made is not in this feature's tables: it has no link yet, so its chain is empty.
    expect(await getServiceSupplierLinks(9_999)).toEqual([]);
  });

  it('passes on the refusal of the server for an unknown service', async () => {
    mockServer.use(
      http.get('*/admin/services/:id/supplier-links', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'No such service.'),
      ),
    );
    await expect(getServiceSupplierLinks(12_345)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });
});
