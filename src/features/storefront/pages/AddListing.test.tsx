// Tests for the Add listing dialog: the Service search (a combobox over the server's list of active IMEI, server and remote services: typing,
// the keyboard, a long catalog, no match, a failed search), the suggested title, the create request and the server's refusals.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { storefrontStore } from '../mocks/store';
import { recordRequests } from '../test/requests';
import { dialogOf, openStorefront } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 20_000 });
afterEach(() => vi.restoreAllMocks());

const WARRANTY = 'Apple Warranty & Activation Date (IMEI-APL-WRN)';

type User = ReturnType<typeof userEvent.setup>;

/** True for the create route (the test's sign-in is a POST too). */
const isListings = (url: URL) => url.pathname.endsWith('/admin/service-listings');

/** Opens the dialog; the Service box has the focus and its list is still closed. */
async function openAdd(user: User) {
  await openStorefront();
  await user.click(await screen.findByRole('button', { name: 'Add listing…' }));
  const dialog = dialogOf('Add listing');
  const service = await dialog.findByRole('combobox', { name: 'Service' });
  return { dialog, service };
}

/** The options the open list shows, by their names ("Name (CODE)"). */
const optionNames = (dialog: ReturnType<typeof dialogOf>) =>
  within(dialog.getByRole('listbox', { name: 'Services' }))
    .queryAllByRole('option')
    .map((option) => option.getAttribute('aria-label'));

/** A server with a long catalog: 230 active IMEI services, searched by name or code and paged as the real route is. */
function longCatalog() {
  const all = Array.from({ length: 230 }, (_, index) => {
    const n = String(index + 1).padStart(3, '0');
    return { id: 1000 + index, name: `Bulk Unlock ${n}`, code: `BULK-${n}`, type: 'imei', status: 'active' };
  });
  mockServer.use(
    http.get('*/admin/services', ({ request }) => {
      const params = new URL(request.url).searchParams;
      const q = (params.get('q') ?? '').toLowerCase();
      const found = all.filter((row) => `${row.name} ${row.code}`.toLowerCase().includes(q));
      const rows = found.slice(Number(params.get('_start') ?? 0), Number(params.get('_end') ?? found.length));
      return HttpResponse.json(rows, { headers: { 'x-total-count': String(found.length) } });
    }),
  );
}

describe('the Service search', () => {
  it('opens closed and asks nothing; a click offers the first active IMEI services by name', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog, service } = await openAdd(user);
    expect(service).toHaveFocus();
    expect(service).toHaveAttribute('aria-expanded', 'false');
    expect(dialog.queryByRole('listbox')).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.endsWith('/admin/services'))).toBe(false);

    await user.click(service);
    expect(service).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(optionNames(dialog).length).toBeGreaterThan(5));
    expect(optionNames(dialog)).toContain(WARRANTY);
    const sent = requests.sent().find((one) => one.url.pathname.endsWith('/admin/services'))!;
    // The three types that can be on the shop are one repeated `type` key (an IN filter); a `file` service is not offered.
    expect(sent.url.searchParams.getAll('type')).toEqual(['imei', 'server', 'remote']);
    expect(Object.fromEntries(sent.url.searchParams)).toMatchObject({
      _start: '0',
      _end: '20',
      _sort: 'name',
      _order: 'asc',
      status: 'active',
    });
  });

  it('searches on the server as the staff member types, by name or by code, and says when nothing matches', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog, service } = await openAdd(user);
    await user.type(service, 'warranty');
    await waitFor(() => expect(optionNames(dialog)).toEqual([WARRANTY]));
    // The click that starts the typing opens the list (the first services, no text); then one request for the whole
    // word: the keystrokes before the pause sent nothing.
    const searches = requests.sent().filter((one) => one.url.pathname.endsWith('/admin/services'));
    expect(searches.map((one) => one.url.searchParams.get('q'))).toEqual([null, 'warranty']);

    await user.clear(service);
    await user.type(service, 'imei-apl-wrn');
    await waitFor(() => expect(optionNames(dialog)).toEqual([WARRANTY]));

    await user.clear(service);
    await user.type(service, 'no-such-service');
    expect(await dialog.findByText('No service matches “no-such-service”.')).toBeInTheDocument();
    expect(optionNames(dialog)).toEqual([]);
  });

  it('works from the keyboard: the arrows move, Enter picks without sending the form, Escape closes only the list', async () => {
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(optionNames(dialog).length).toBeGreaterThan(5));
    const options = within(dialog.getByRole('listbox', { name: 'Services' })).getAllByRole('option');
    await waitFor(() => expect(service).toHaveAttribute('aria-activedescendant', options[0].id));
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    expect(service).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    // Escape is kept from the dialog (a native dialog closes on an Escape nobody stopped) and closes the list.
    expect(fireEvent.keyDown(service, { key: 'Escape' })).toBe(false);
    expect(service).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('dialog', { name: 'Add listing' })).toBeInTheDocument();

    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(service).toHaveAttribute('aria-activedescendant', options[0].id));
    await user.keyboard('{ArrowDown}{Enter}');
    expect(service).toHaveValue(options[1].getAttribute('aria-label'));
    expect(service).toHaveAttribute('aria-expanded', 'false');
    // Enter picked; it did not send the form.
    expect(screen.getByRole('dialog', { name: 'Add listing' })).toBeInTheDocument();
    expect(screen.queryByText('Listing added')).not.toBeInTheDocument();
    // With the list closed, Escape is the dialog's again.
    expect(fireEvent.keyDown(service, { key: 'Escape' })).toBe(true);
  });

  it('reaches any service of a long catalog and says how many more match', async () => {
    longCatalog();
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.click(service);
    expect(await dialog.findByText('20 of 230 shown. Type to search more.')).toBeInTheDocument();
    expect(optionNames(dialog)).toHaveLength(20);
    expect(optionNames(dialog)).not.toContain('Bulk Unlock 230 (BULK-230)');
    // The select this box replaced stopped at 200 names: number 230 could not be listed at all.
    await user.type(service, 'bulk-230');
    await waitFor(() => expect(optionNames(dialog)).toEqual(['Bulk Unlock 230 (BULK-230)']));
    expect(dialog.queryByText(/shown\. Type to search more\.$/)).not.toBeInTheDocument();
    await user.click(dialog.getByRole('option', { name: 'Bulk Unlock 230 (BULK-230)' }));
    expect(service).toHaveValue('Bulk Unlock 230 (BULK-230)');
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue('Bulk Unlock 230');
  });

  it('says that IMEI, server and remote services are sold to the public', async () => {
    const user = userEvent.setup();
    const { dialog } = await openAdd(user);
    expect(
      dialog.getByText('Only active IMEI, server and remote services are sold to the public.'),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/Only active IMEI services/)).not.toBeInTheDocument();
  });

  it('offers server and remote services, and never a file service', async () => {
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.type(service, 'credits');
    await waitFor(() => expect(optionNames(dialog)).toContain('Z3X Credits x10 (SRV-Z3X-10)'));
    await user.clear(service);
    await user.type(service, 'remote');
    await waitFor(() => expect(optionNames(dialog)).toContain('Samsung FRP Remote (USB) (RMT-SAM-FRP)'));
    // The demo's file services are active, but a file service cannot be ordered online: the search leaves them out.
    await user.clear(service);
    await user.type(service, 'file');
    expect(await dialog.findByText('No service matches “file”.')).toBeInTheDocument();
    expect(optionNames(dialog)).toEqual([]);
  });

  it('adds a listing for a server service', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog, service } = await openAdd(user);
    await user.type(service, 'z3x');
    await user.click(await dialog.findByRole('option', { name: 'Z3X Credits x10 (SRV-Z3X-10)' }));
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue('Z3X Credits x10');
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await screen.findByText('Listing added')).toBeInTheDocument();
    const created = requests.sent().find((one) => one.method === 'POST' && isListings(one.url))!;
    expect(created.body).toEqual({ serviceId: 15, publicTitle: 'Z3X Credits x10' });
  });

  it('shows a failed search with Retry and lists the services when the server answers again', async () => {
    mockServer.use(
      http.get('*/admin/services', () => problem(500, 'INTERNAL', 'Server error', 'The services failed.')),
    );
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.click(service);
    expect(await dialog.findByText('The services failed.')).toBeInTheDocument();
    expect(optionNames(dialog)).toEqual([]);
    mockServer.resetHandlers();
    await user.click(dialog.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(optionNames(dialog)).toContain(WARRANTY));
    expect(dialog.queryByText('The services failed.')).not.toBeInTheDocument();
    // Retry left the focus in the box, so the list stayed open.
    expect(service).toHaveFocus();
  });
});

describe('adding the listing', () => {
  it('suggests the title and adds a listing for a service that has none', async () => {
    // Every active IMEI service of the demo has its listing; take one away so the service can be added again.
    const stores = await storefrontStore();
    stores.listings.remove(stores.listings.list().find((row) => row.serviceId === 2)!.id);
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog, service } = await openAdd(user);
    await user.type(service, 'warranty');
    await user.click(await dialog.findByRole('option', { name: WARRANTY }));
    expect(service).toHaveValue(WARRANTY);
    expect(service).toHaveAttribute('aria-expanded', 'false');
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue(
      'Apple Warranty & Activation Date',
    );
    expect(dialog.queryByRole('combobox', { name: 'Language' })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await screen.findByText('Listing added')).toBeInTheDocument();
    const created = requests.sent().find((one) => one.method === 'POST' && isListings(one.url))!;
    expect(created.body).toEqual({ serviceId: 2, publicTitle: 'Apple Warranty & Activation Date' });
    expect(await screen.findByText('14 listings')).toBeInTheDocument();
    const strip = within(screen.getByRole('region', { name: 'Storefront catalogue' }));
    await waitFor(() => expect(strip.getByText('Not on the site').parentElement).toHaveTextContent('1'));
  });

  it('keeps a title the staff member typed when a service is chosen after it', async () => {
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.type(dialog.getByRole('textbox', { name: 'Public title' }), 'My own title');
    await user.type(service, 'warranty');
    await user.click(await dialog.findByRole('option', { name: WARRANTY }));
    expect(dialog.getByRole('textbox', { name: 'Public title' })).toHaveValue('My own title');
  });

  it('shows the server’s refusal of a second listing of the same service under the service', async () => {
    const user = userEvent.setup();
    const { dialog, service } = await openAdd(user);
    await user.type(service, 'warranty');
    await user.click(await dialog.findByRole('option', { name: WARRANTY }));
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await dialog.findByText('This service already has a listing.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Add listing' })).toBeInTheDocument();
    expect(service).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for a service before it sends anything; a typed text is not a choice, and typing after a pick drops the pick', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const { dialog, service } = await openAdd(user);
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await dialog.findByText('Choose a service.')).toBeInTheDocument();
    expect(service).toHaveFocus();

    await user.type(service, 'warranty');
    await dialog.findByRole('option', { name: WARRANTY });
    await user.type(dialog.getByRole('textbox', { name: 'Public title' }), 'A title');
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await dialog.findByText('Choose a service.')).toBeInTheDocument();

    // A pick clears the message; typing over the picked name drops the pick again.
    await user.click(service);
    await user.click(await dialog.findByRole('option', { name: WARRANTY }));
    await waitFor(() => expect(dialog.queryByText('Choose a service.')).not.toBeInTheDocument());
    await user.type(service, 'x');
    await user.click(dialog.getByRole('button', { name: 'Add listing' }));
    expect(await dialog.findByText('Choose a service.')).toBeInTheDocument();
    expect(requests.sent().some((one) => one.method === 'POST' && isListings(one.url))).toBe(false);
  });
});
