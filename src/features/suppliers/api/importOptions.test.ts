// Tests for the two optional keys of the import and its preview (decision 063), against the feature's mock: which keys the client sends, the
// answer a preview gives with and without them (a new item names the group it goes into: the picked one, one of ours that holds the supplier's
// group, else `{ id: null, name }` of the cleaned name), a service made switched off, and the 422 on `categoryId` that imports nothing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCategory, listCategories } from '@/features/services';
import { mockServer } from '@/mocks/node';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { mocks } from '../mocks';
import { recordRequests } from '../test/requests';
import { getSupplier, importServices, listSupplierServices, previewImport } from '.';

setupMockApi();
beforeEach(async () => {
  mockServer.use(...mocks.handlers);
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

// Nordic GSM (supplier 1) offers three IMEI services that no service of ours uses yet.
const NORDIC = 1;

/** The ids of the supplier services whose names hold `q`. */
async function idsOf(q: string): Promise<number[]> {
  return (await listSupplierServices(NORDIC, { q })).data.map((row) => row.id);
}

async function categoryOfType(type: 'imei' | 'server') {
  const found = (await listCategories({ end: 200 })).data.find((category) => category.type === type);
  if (!found) throw new Error(`The seed has no ${type} category.`);
  return found;
}

describe('the preview', () => {
  it('answers as before when neither key is sent: no status and no group on the items', async () => {
    const [id] = await idsOf('Sprint USA');
    const { items } = await previewImport(NORDIC, { supplierServiceIds: [id] });
    expect(items).toHaveLength(1);
    expect(items[0].state).toBe('new');
    expect('status' in items[0]).toBe(false);
    expect('category' in items[0]).toBe(false);
  });

  it('says what a new item becomes when a key is sent: its status, and the group when one was picked', async () => {
    const [id] = await idsOf('Sprint USA');
    const group = await categoryOfType('imei');
    const { items } = await previewImport(NORDIC, {
      supplierServiceIds: [id],
      status: 'disabled',
      categoryId: group.id,
    });
    expect(items[0]).toMatchObject({ status: 'disabled', category: { id: group.id, name: group.name } });
  });

  it('says null for an item the import would not create, and names the group a new one would be made under when none was picked', async () => {
    const [fresh] = await idsOf('Sprint USA');
    const linked = (await getSupplier(NORDIC)).links[0].supplierServiceId;
    const { items } = await previewImport(NORDIC, { supplierServiceIds: [fresh, linked], status: 'active' });
    expect(items.map((item) => [item.state, item.status, item.category])).toEqual([
      ['new', 'active', { id: null, name: 'USA' }],
      [expect.stringMatching(/matching|changed/), null, null],
    ]);
  });

  it('names the group of ours that already holds the supplier’s group, ignoring case, and the cleaned name when there is none', async () => {
    const group = await createCategory({ name: 'canada', type: 'imei', allowedGroupIds: [], isActive: true });
    const [held] = await idsOf('Rogers Canada');
    const [made] = await idsOf('Telstra Australia');
    const { items } = await previewImport(NORDIC, { supplierServiceIds: [held, made], status: 'active' });
    expect(items.map((item) => item.category)).toEqual([
      { id: group.id, name: 'canada' },
      { id: null, name: 'Australia' },
    ]);
  });

  it('does not count a group of another kind that has the same name: a category holds one kind', async () => {
    await createCategory({ name: 'Canada', type: 'server', allowedGroupIds: [], isActive: true });
    const [id] = await idsOf('Rogers Canada');
    const { items } = await previewImport(NORDIC, { supplierServiceIds: [id], status: 'active' });
    expect(items[0].category).toEqual({ id: null, name: 'Canada' });
  });
});

describe('the import', () => {
  it('sends only the keys it is given', async () => {
    const requests = recordRequests();
    const [id] = await idsOf('Telstra Australia');
    await importServices(NORDIC, { supplierServiceIds: [id], status: 'disabled' });
    const sent = requests.sent().filter((request) => request.url.pathname.endsWith('/import'));
    expect(sent.map((request) => request.body)).toEqual([{ supplierServiceIds: [id], status: 'disabled' }]);
  });

  it('makes a new service switched off when asked, and on sale otherwise', async () => {
    const [off] = await idsOf('Telstra Australia');
    const [on] = await idsOf('Sprint USA');
    await importServices(NORDIC, { supplierServiceIds: [off], status: 'disabled' });
    await importServices(NORDIC, { supplierServiceIds: [on] });
    const links = (await getSupplier(NORDIC)).links;
    expect(links.find((link) => link.supplierServiceId === off)?.serviceStatus).toBe('disabled');
    expect(links.find((link) => link.supplierServiceId === on)?.serviceStatus).toBe('active');
  });

  it('refuses a group that does not exist with a 422 on categoryId, and imports nothing', async () => {
    const [id] = await idsOf('Sprint USA');
    await expect(
      importServices(NORDIC, { supplierServiceIds: [id], categoryId: 987_654 }),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { categoryId: [expect.any(String)] },
    });
    expect((await listSupplierServices(NORDIC, { q: 'Sprint USA' })).data[0].imported).toBe(false);
  });

  it('refuses a group of another kind, naming the services that do not fit, and imports nothing', async () => {
    const ids = await idsOf('Unlock');
    const server = await categoryOfType('server');
    const failure = await importServices(NORDIC, { supplierServiceIds: ids, categoryId: server.id }).catch(
      (error: unknown) => error,
    );
    expect(failure).toMatchObject({ status: 422 });
    const message = (failure as { fieldErrors: Record<string, string[]> }).fieldErrors.categoryId[0];
    expect(message).toContain(server.name);
    expect(message).toContain('Sprint USA Premium Unlock');
    const after = await listSupplierServices(NORDIC, { q: 'Unlock' });
    expect(after.data.some((row) => row.name === 'Sprint USA Premium Unlock' && row.imported)).toBe(false);
  });

  it('refuses a status other than active or disabled with a 422 on status', async () => {
    const [id] = await idsOf('Sprint USA');
    await expect(
      importServices(NORDIC, { supplierServiceIds: [id], status: 'paused' as 'active' }),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { status: [expect.any(String)] } });
  });
});
