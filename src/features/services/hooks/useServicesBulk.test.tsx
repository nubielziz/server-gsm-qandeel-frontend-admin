// Tests for the bulk actions on ticked services (useServicesBulk), mounted on its own through a test host, against the dev mock API: Move to
// group, Enable, Disable, Delete and Take off the shop are one call per service, one after the other, with one toast and a summary of what
// the server refused; Put on the shop sends the services that have no shop page to one publish run and hands its id back.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '@/lib/api';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { createService, getService, listServices } from '../api';
import { BulkProbe } from '../test/BulkProbe';
import { recordRequests } from '../test/requests';
import { bulkTargets } from './useServicesBulk';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

/** Signs in, runs `prepare` (it may make records), mounts the actions over the services a search finds (only `ids` of them when given). */
async function openBulk(q: string, ids?: readonly Id[], prepare?: () => Promise<unknown>) {
  await signInAs();
  await prepare?.();
  renderShell('/probe', <Route path="/probe" element={<BulkProbe q={q} ids={ids} />} />);
  await waitFor(() => expect(screen.getByText(/^[1-9]\d* services?$/)).toBeInTheDocument());
}

const patches = (requests: ReturnType<typeof recordRequests>) =>
  requests.sent().filter((sent) => sent.method === 'PATCH');

describe('Move to group', () => {
  it('moves every service to the group picked, one call each, in the list’s order', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('credits', [15, 18]);
    await user.click(screen.getByRole('button', { name: 'Move to group' }));
    expect(await screen.findByText('2 services moved to Licenses')).toBeInTheDocument();
    // One after the other, A to Z by name.
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/services/18', { categoryId: 7 }],
      ['/admin/services/15', { categoryId: 7 }],
    ]);
    expect((await getService(18)).categoryId).toBe(7);
  });
});

describe('Disable', () => {
  it('disables the active services and lists the ones the server refused', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/services/18', () =>
        problem(409, 'SERVICE_IN_USE', 'Service in use', 'It has open orders being sent.'),
      ),
    );
    await openBulk('credits', [15, 18]);
    await user.click(screen.getByRole('button', { name: 'Disable' }));
    const summary = within(await screen.findByRole('dialog', { name: '1 of 2 services disabled' }));
    expect(summary.getByText('NCK Dongle Credits x50')).toBeInTheDocument();
    expect(summary.getByText(/It has open orders being sent\./)).toBeInTheDocument();
    expect(screen.getByText('1 service disabled')).toBeInTheDocument();
    expect((await getService(15)).status).toBe('disabled');
    expect((await getService(18)).status).toBe('active');
  });

  it('says nothing needs changing when every service is disabled already', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('Xiaomi Mi Account Clean');
    await user.click(screen.getByRole('button', { name: 'Disable' }));
    expect(await screen.findByText('Nothing to change')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
  });
});

describe('Enable', () => {
  it('enables a disabled service', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('Xiaomi Mi Account Clean');
    const [xiaomi] = (await listServices({ q: 'Xiaomi Mi Account Clean' })).data;
    expect(xiaomi.status).toBe('disabled');
    await user.click(screen.getByRole('button', { name: 'Enable' }));
    expect(await screen.findByText('1 service enabled')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      [`/admin/services/${xiaomi.id}`, { status: 'active' }],
    ]);
    expect((await getService(xiaomi.id)).status).toBe('active');
  });

  it('changes nothing when every service is active already', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('credits', [15]);
    await user.click(screen.getByRole('button', { name: 'Enable' }));
    expect(await screen.findByText('Nothing to change')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
  });
});

describe('Delete', () => {
  it('deletes the services nobody ordered', async () => {
    const user = userEvent.setup();
    let made: Id = 0;
    await openBulk('Temporary Bulk Check', undefined, async () => {
      made = (
        await createService({
          name: 'Temporary Bulk Check',
          code: 'TMP-BULK-1',
          categoryId: 1,
          type: 'imei',
          slaMinutes: 5,
          basePrice: '1.0000',
        })
      ).id;
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('1 service deleted')).toBeInTheDocument();
    await expect(getService(made)).rejects.toMatchObject({ status: 404 });
  });

  it('lists a service the server refuses to delete (it has orders) and keeps it', async () => {
    const user = userEvent.setup();
    await openBulk('Z3X Credits x10');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const summary = within(await screen.findByRole('dialog', { name: '0 of 1 service deleted' }));
    expect(summary.getByText('Z3X Credits x10')).toBeInTheDocument();
    expect(
      summary.getByText(/has 38 orders, so it cannot be deleted\. Disable it instead\./),
    ).toBeInTheDocument();
    expect(await screen.findByText('No service was deleted')).toBeInTheDocument();
    expect((await getService(15)).name).toBe('Z3X Credits x10');
  });
});

describe('Take off the shop', () => {
  it('switches off the shop pages of the services that are on the shop', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('uk', [8, 9]);
    await user.click(screen.getByRole('button', { name: 'Take off the shop' }));
    expect(await screen.findByText('2 services taken off the shop')).toBeInTheDocument();
    expect(patches(requests).map((sent) => [sent.url.pathname, sent.body])).toEqual([
      ['/admin/service-listings/9', { isListed: false }],
      ['/admin/service-listings/8', { isListed: false }],
    ]);
  });

  it('changes nothing when none of the services is on the shop', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('credits', [15]);
    await user.click(screen.getByRole('button', { name: 'Take off the shop' }));
    expect(await screen.findByText('Nothing to change')).toBeInTheDocument();
    expect(patches(requests)).toHaveLength(0);
  });
});

describe('Put on the shop', () => {
  it('sends the services with no shop page to one publish run and hands its id back', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openBulk('credits', [15]);
    await user.click(screen.getByRole('button', { name: 'Put on the shop' }));
    expect(await screen.findByText(/^Run \d+ is to be opened$/)).toBeInTheDocument();
    const created = requests
      .sent()
      .filter((sent) => sent.method === 'POST' && sent.url.pathname === '/admin/publish-runs');
    expect(created).toHaveLength(1);
    expect(created[0].body).toEqual({ scope: { kind: 'services', serviceIds: [15] } });
    // A person confirms the run in the Shop Publish view: nothing is applied here.
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/apply'))).toBe(false);
  });
});

describe('bulkTargets', () => {
  const row = (over: Record<string, unknown>) => over as unknown as Parameters<typeof bulkTargets>[0][number];

  it('sorts the ticked services by what each action would change', () => {
    const services = [
      row({ id: 1, status: 'active', listingId: null }),
      row({ id: 2, status: 'disabled', listingId: 20, isListed: true }),
      row({ id: 3, status: 'active', listingId: 30, isListed: false }),
    ];
    const targets = bulkTargets(services);
    expect(targets.enable.map((s) => s.id)).toEqual([2]);
    expect(targets.disable.map((s) => s.id)).toEqual([1, 3]);
    expect(targets.takeOff.map((s) => s.id)).toEqual([2]);
    expect(targets.putBack.map((s) => s.id)).toEqual([3]);
    expect(targets.publish.map((s) => s.id)).toEqual([1]);
  });

  it('leaves a row without the shop keys out of every shop action', () => {
    const targets = bulkTargets([row({ id: 4, status: 'active' })]);
    expect(targets.takeOff).toHaveLength(0);
    expect(targets.putBack).toHaveLength(0);
    expect(targets.publish).toHaveLength(0);
    expect(targets.disable).toHaveLength(1);
  });
});
