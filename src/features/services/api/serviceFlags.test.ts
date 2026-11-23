// Tests for the three settings a service holds about its orders (`allowCancel`, `allowVerify`, `verifyWindowH`), run against the dev mock API: every
// row and the detail carry them (off at first), a new service starts with them off unless the body sets them, a change keeps the rest of the
// service, and the mock refuses a window the server would refuse.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { recordRequests } from '../test/requests';
import { createService, getService, listServices, updateService } from '.';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});
afterEach(() => vi.restoreAllMocks());

const ATT = 5; // AT&T USA Premier Unlock
const APPLE = 1; // a category of IMEI services

const OFF = { allowCancel: false, allowVerify: false, verifyWindowH: 0 };
const body = {
  name: 'Flag Check',
  code: 'IMEI-FLAG-1',
  categoryId: APPLE,
  type: 'imei' as const,
  slaMinutes: 15,
  basePrice: '2.5000',
};

describe('what the server sends', () => {
  it('puts the three settings on every row of the list, off at first', async () => {
    const { data } = await listServices({ start: 0, end: 50 });
    expect(data.length).toBeGreaterThan(20);
    for (const row of data) expect(row).toMatchObject(OFF);
  });

  it('puts them on the detail of a service too', async () => {
    expect(await getService(ATT)).toMatchObject(OFF);
  });
});

describe('createService', () => {
  it('starts a service with the three off when the body leaves them out', async () => {
    const created = await createService(body);
    expect(created).toMatchObject(OFF);
  });

  it('posts the three when the body sets them, and the service keeps them', async () => {
    const requests = recordRequests();
    const settings = { allowCancel: true, allowVerify: true, verifyWindowH: 48 };
    const created = await createService({ ...body, ...settings });
    expect(requests.last()).toMatchObject({ method: 'POST', body: { ...body, ...settings } });
    expect(created).toMatchObject(settings);
    expect(await getService(created.id)).toMatchObject(settings);
  });
});

describe('updateService', () => {
  it('changes only the settings that are sent and keeps the rest of the service', async () => {
    const before = await getService(ATT);
    const requests = recordRequests();
    const changed = await updateService(ATT, { allowCancel: true, verifyWindowH: 24 });
    expect(requests.last()).toMatchObject({
      method: 'PATCH',
      body: { allowCancel: true, verifyWindowH: 24 },
    });
    expect(changed).toMatchObject({ allowCancel: true, allowVerify: false, verifyWindowH: 24 });
    const after = await getService(ATT);
    expect(after).toMatchObject({ name: before.name, basePrice: before.basePrice, status: before.status });
    expect(after).toMatchObject({ allowCancel: true, allowVerify: false, verifyWindowH: 24 });
  });

  it('turns verification on and back off', async () => {
    await updateService(ATT, { allowVerify: true, verifyWindowH: 720 });
    expect(await getService(ATT)).toMatchObject({ allowVerify: true, verifyWindowH: 720 });
    await updateService(ATT, { allowVerify: false, verifyWindowH: 0 });
    expect(await getService(ATT)).toMatchObject(OFF);
  });

  it.each([721, -1, 1.5])('refuses a window of %s hours, naming the field', async (hours) => {
    const error = await updateService(ATT, { verifyWindowH: hours }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422 });
    expect((error as ApiError).fieldErrors.verifyWindowH[0]).toBe('Enter hours, 0 to 720.');
    expect((await getService(ATT)).verifyWindowH).toBe(0);
  });
});
