// Tests for the shop switch of the Retail Purchase part, run through the whole app against the dev mock API: after a press the part reads
// the service again and shows its own result (the switch, the Status row, and for a service that had no shop page, the shop page form).
// The switch's own rules (its locks, its run) are tested in hooks/usePutOnShop.test.tsx; this file is about what the open record shows.
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { setupMockApi } from '@/test/renderApp';
import { groupHandlers } from '../../../mocks/testGroups';
import { recordRequests } from '../../../test/requests';
import { openProducts } from '../../../test/productsPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...groupHandlers));
afterEach(() => vi.restoreAllMocks());

const EE_UK = 9; // an IMEI service on the shop: EE UK Unlock, shop page 9
const Z3X = 15; // a Server service with no shop page that nothing blocks: Z3X Credits x10

/** Waits for the part's switch and presses it. */
async function pressShopSwitch() {
  const user = userEvent.setup();
  const toggle = await screen.findByRole('switch', { name: 'On the shop' }, { timeout: 10_000 });
  await user.click(toggle);
  return toggle;
}

/** The reads and writes of one path, in the order they were sent. */
const callsTo = (requests: ReturnType<typeof recordRequests>, path: string) =>
  requests
    .sent()
    .map((sent, order) => ({ ...sent, order }))
    .filter((sent) => sent.url.pathname === path);

describe('the shop switch of the Retail Purchase part', () => {
  it('shows its own result for a service on the shop: the switch reads No and the Status row says it is off', async () => {
    const requests = recordRequests();
    await openProducts(`/products?view=edit&type=imei&id=${EE_UK}&part=shop`);
    expect(await screen.findByRole('img', { name: 'On the shop' }, { timeout: 10_000 })).toBeInTheDocument();
    const toggle = await screen.findByRole('switch', { name: 'On the shop' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    const readsBefore = callsTo(requests, `/admin/services/${EE_UK}`).filter((sent) => sent.method === 'GET');

    await pressShopSwitch();

    expect(await screen.findByText('EE UK Unlock is off the shop')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Not on the shop' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'On the shop' })).toHaveAttribute('aria-checked', 'false'),
    );
    // The page was written, and the record of the service was read again after that write.
    const patch = callsTo(requests, `/admin/service-listings/${EE_UK}`).find(
      (sent) => sent.method === 'PATCH',
    );
    expect(patch?.body).toEqual({ isListed: false });
    const readsAfter = callsTo(requests, `/admin/services/${EE_UK}`).filter((sent) => sent.method === 'GET');
    expect(readsAfter.length).toBe(readsBefore.length + 1);
    expect(readsAfter[readsAfter.length - 1].order).toBeGreaterThan(patch?.order ?? Infinity);
  });

  it('takes the page off the shop and back on, each time showing its own result', async () => {
    await openProducts(`/products?view=edit&type=imei&id=${EE_UK}&part=shop`);
    await screen.findByRole('img', { name: 'On the shop' }, { timeout: 10_000 });
    await pressShopSwitch();
    expect(await screen.findByRole('img', { name: 'Not on the shop' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'On the shop' })).toBeEnabled());
    await pressShopSwitch();
    expect(await screen.findByRole('img', { name: 'On the shop' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'On the shop' })).toHaveAttribute('aria-checked', 'true'),
    );
  });

  it('shows the shop page form and "On the shop" after a service with no shop page is published by the switch', async () => {
    const requests = recordRequests();
    await openProducts(`/products?view=edit&type=server&id=${Z3X}&part=shop`);
    expect(
      await screen.findByRole('img', { name: 'Not on the shop yet' }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Public title' })).not.toBeInTheDocument();

    await pressShopSwitch();

    expect(
      await screen.findByText('Z3X Credits x10 is on the shop', {}, { timeout: 20_000 }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'On the shop' })).toBeInTheDocument();
    expect(await screen.findByRole('textbox', { name: 'Public title' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Not on the shop yet' })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'On the shop' })).toHaveAttribute('aria-checked', 'true'),
    );
    expect(callsTo(requests, '/admin/publish-runs').some((sent) => sent.method === 'POST')).toBe(true);
  });
});
