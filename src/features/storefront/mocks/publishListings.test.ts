// Tests for the storefront mock's publish apply: a service a run published gets its shop page and price, as the server writes them
// with the row's result, so the services list shows it as on the shop afterwards. The run switch moves those pages too. They go through the
// API functions against the whole mock server, as the screens do.
import { beforeEach, describe, expect, it } from 'vitest';
import { getService } from '@/features/services';
import { setupMockApi, signInAs } from '@/test/mockApi';
import { applyPublishRun, createPublishRun, getPublishRun, listListings, setPublishRunListed } from '../api';

setupMockApi();
beforeEach(async () => {
  await signInAs();
});

// The seed: services 15 to 23 have no shop page and a ready row in the preview (16 is UnlockTool, 17 Chimera Tool, 18 NCK Dongle); service
// 5 has a page.
const UNLOCKTOOL = 16;
const CHIMERA = 17;
const NCK = 18;
const ATT = 5;

/** Starts a run for these services, reads it until it is a draft, applies it and reads it until it ends. */
async function publish(serviceIds: number[], listed?: boolean) {
  const options = listed === undefined ? {} : { listed };
  const created = await createPublishRun({ scope: { kind: 'services', serviceIds }, ...options });
  let run = created;
  // The mock moves a run by reads: two reads make a preview a draft, two more finish an apply.
  for (let reads = 0; reads < 4 && run.status !== 'draft'; reads += 1) run = await getPublishRun(created.id);
  expect(run.status).toBe('draft');
  await applyPublishRun(created.id, options);
  for (let reads = 0; reads < 4 && run.status !== 'succeeded'; reads += 1)
    run = await getPublishRun(created.id);
  expect(run.status).toBe('succeeded');
  return run;
}

const pagesOf = async () => (await listListings({ end: 100 })).data;

describe('the publish apply', () => {
  it('gives a published service its shop page, switched on, with the price and who wrote it', async () => {
    const before = await pagesOf();
    expect(before.some((page) => page.serviceId === UNLOCKTOOL)).toBe(false);
    const run = await publish([UNLOCKTOOL]);
    expect(run.counts.published).toBe(1);
    const after = await pagesOf();
    expect(after).toHaveLength(before.length + 1);
    const page = after.find((row) => row.serviceId === UNLOCKTOOL);
    expect(page).toMatchObject({
      publicTitle: 'UnlockTool 1-Day License',
      slug: 'unlocktool-1-day-license',
      isListed: true,
      retailPrice: '7.2900',
      retailPriceSource: 'rule',
    });
    expect(page?.listedAt).not.toBeNull();
    expect(page?.retailPriceRule?.label).toEqual(expect.any(String));
  });

  it('shows the service as on the shop in the services list afterwards, with the id of its page', async () => {
    expect(await getService(UNLOCKTOOL)).toMatchObject({ listingId: null, isListed: false });
    await publish([UNLOCKTOOL]);
    const row = await getService(UNLOCKTOOL);
    expect(row).toMatchObject({ isListed: true, retailPrice: '7.2900', retailPriceSource: 'rule' });
    const page = (await pagesOf()).find((one) => one.serviceId === UNLOCKTOOL);
    expect(row.listingId).toBe(page?.id);
  });

  it('creates the pages switched off when the run says so', async () => {
    await publish([CHIMERA], false);
    const page = (await pagesOf()).find((row) => row.serviceId === CHIMERA);
    expect(page).toMatchObject({ isListed: false, listedAt: null });
    expect(await getService(CHIMERA)).toMatchObject({ isListed: false });
    expect((await getService(CHIMERA)).listingId).toBe(page?.id);
  });

  it('makes no second page for a service that has one', async () => {
    const before = await pagesOf();
    // Service 5 has a page: its row is blocked, and only the other service is published.
    await publish([UNLOCKTOOL, ATT]);
    const after = await pagesOf();
    expect(after).toHaveLength(before.length + 1);
    expect(after.filter((row) => row.serviceId === ATT)).toHaveLength(1);
  });

  it('gives every published service a page of its own', async () => {
    const run = await publish([UNLOCKTOOL, NCK]);
    expect(run.counts.published).toBe(2);
    const ids = (await pagesOf()).map((row) => row.serviceId);
    expect(ids).toEqual(expect.arrayContaining([UNLOCKTOOL, NCK]));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('the run switch', () => {
  it('takes the pages the run made off the shop, and puts them back', async () => {
    const run = await publish([UNLOCKTOOL]);
    const isOn = async () => (await pagesOf()).find((row) => row.serviceId === UNLOCKTOOL)?.isListed;
    expect(await isOn()).toBe(true);
    for (const listed of [false, true]) {
      await setPublishRunListed(run.id, { listed });
      // The switch moves by reads too: one makes it run, the next finishes it.
      await getPublishRun(run.id);
      await getPublishRun(run.id);
      expect(await isOn()).toBe(listed);
    }
  });
});
