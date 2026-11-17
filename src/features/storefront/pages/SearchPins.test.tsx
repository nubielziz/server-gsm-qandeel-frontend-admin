// Tests for the Pinned results section of the Search tab: the seeded rule, the "Test a search" box, add with the service picker,
// the refusals of the server (a service that is not listed on its row, a twin rule), edit with only the changed fields,
// the On switch, delete behind a confirmation, and the permissions.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { recordRequests } from '../test/requests';
import { READER, WRITER, openSearch } from '../test/searchTab';
import { dialogOf, rowOf } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
// The request recorder spies on `fetch`; put it back so one test never sees another's calls.
afterEach(() => vi.restoreAllMocks());

const TABLE = 'Pinned results';
type User = ReturnType<typeof userEvent.setup>;

/** The last request of a method the recorder saw. */
const lastOf = (requests: ReturnType<typeof recordRequests>, method: string) =>
  requests
    .sent()
    .filter((r) => r.method === method)
    .at(-1);

/** Opens the Add dialog and picks a service for the pinned list through the picker. */
async function pinService(user: User, dialog: ReturnType<typeof dialogOf>, title: string, search = title) {
  const box = dialog.getByRole('searchbox', { name: 'Find a service to pin' });
  await user.clear(box);
  await user.type(box, search);
  await user.click(await dialog.findByRole('button', { name: `Pin ${title}` }));
}

describe('the rules', () => {
  it('lists the starting rule: its words, the pinned service and that it is live', async () => {
    await openSearch('pins');
    const row = await rowOf(TABLE, 'unlock');
    expect(row.getByText('Any search containing it')).toBeInTheDocument();
    expect(row.getByText('AT&T USA Premier Unlock')).toBeInTheDocument();
    expect(row.getByText('Live')).toBeInTheDocument();
    expect(row.getByText('Always')).toBeInTheDocument();
    expect(await screen.findByText('1 rule')).toBeInTheDocument();
  });

  it('shows the empty state for a search that matches no rule', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.type(await screen.findByRole('searchbox', { name: 'Search a query or a note' }), 'zzz');
    expect(await screen.findByText('No pinned results match')).toBeInTheDocument();
  });
});

describe('Test a search', () => {
  it('lists the top services with the pinned one first and marked', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.type(await screen.findByRole('searchbox', { name: 'Words a visitor would type' }), 'unlock');
    await user.click(screen.getByRole('button', { name: 'Show results' }));
    const list = within(await screen.findByRole('list', { name: 'Results for unlock' }));
    const items = list.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('AT&T USA Premier Unlock');
    expect(within(items[0]).getByText('Pinned')).toBeInTheDocument();
    expect(within(items[1]).queryByText('Pinned')).toBeNull();
  });

  it('says when nothing matches, and when the engine does not answer', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    const box = await screen.findByRole('searchbox', { name: 'Words a visitor would type' });
    await user.type(box, 'zzz nothing');
    await user.click(screen.getByRole('button', { name: 'Show results' }));
    expect(await screen.findByText('No service matches these words.')).toBeInTheDocument();

    mockServer.use(
      http.get('*/admin/search/preview', () =>
        problem(503, 'UNAVAILABLE', 'Unavailable', 'The search engine is not answering.'),
      ),
    );
    await user.clear(box);
    await user.type(box, 'unlock');
    await user.click(screen.getByRole('button', { name: 'Show results' }));
    expect(await screen.findByText(/nothing to preview/)).toBeInTheDocument();
  });
});

describe('Add pinned results', () => {
  it('asks for words and for something to pin or hide', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(await dialog.findByText('Enter the search words.')).toBeInTheDocument();
    expect(dialog.getByText('Pin or hide at least one service.')).toBeInTheDocument();
  });

  it('pins a service at a position, hides another, and saves with the ids', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await user.type(dialog.getByRole('textbox', { name: 'When a visitor searches for' }), 'ICloud');
    await user.click(dialog.getByRole('radio', { name: /Only this exact search/ }));
    await pinService(user, dialog, 'iCloud Clean / Lost Check', 'iCloud');
    await user.selectOptions(
      dialog.getByRole('combobox', { name: 'Position of iCloud Clean / Lost Check' }),
      'Position 3',
    );
    await user.type(dialog.getByRole('searchbox', { name: 'Find a service to hide' }), 'Orange');
    await user.click(await dialog.findByRole('button', { name: 'Hide Orange France Unlock' }));
    expect(dialog.getByText('Pinned first (1 of 10)')).toBeInTheDocument();
    expect(dialog.getByText('Hidden from these results (1 of 50)')).toBeInTheDocument();

    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Pinned results saved')).toBeInTheDocument();
    expect(lastOf(requests, 'POST')?.body).toEqual({
      query: 'icloud',
      match: 'exact',
      pinned: [{ serviceId: 1, position: 3 }],
      hidden: [10],
      isEnabled: true,
    });
    const row = await rowOf(TABLE, 'icloud');
    expect(row.getByText('iCloud Clean / Lost Check')).toBeInTheDocument();
    expect(row.getByText('1 service')).toBeInTheDocument();
  });

  it('does not offer a service twice, and says when no listed service matches', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    const requests = recordRequests();
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await pinService(user, dialog, 'EE UK Unlock');
    await user.type(dialog.getByRole('searchbox', { name: 'Find a service to hide' }), 'EE UK');
    expect(await dialog.findByText(/No listed service matches/)).toBeInTheDocument();
    // The picker asks for listed services and sends no language.
    const picks = requests.sent().filter((r) => r.url.pathname === '/admin/service-listings');
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((r) => r.url.searchParams.get('isListed') === 'true')).toBe(true);
    expect(picks.some((r) => r.url.searchParams.has('locale'))).toBe(false);
    expect(dialog.queryByRole('button', { name: 'Hide EE UK Unlock' })).toBeNull();
    await user.click(dialog.getByRole('button', { name: 'Remove EE UK Unlock from pinned' }));
    expect(dialog.queryByRole('button', { name: 'Remove EE UK Unlock from pinned' })).toBeNull();
  });

  it('refuses two services at one position and an end before the start', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await user.type(dialog.getByRole('textbox', { name: 'When a visitor searches for' }), 'unlock uk');
    await pinService(user, dialog, 'EE UK Unlock');
    await pinService(user, dialog, 'Vodafone UK iPhone Unlock', 'Vodafone');
    await user.selectOptions(
      dialog.getByRole('combobox', { name: 'Position of Vodafone UK iPhone Unlock' }),
      'Position 1',
    );
    fireEvent.change(dialog.getByLabelText('Starts (optional)'), { target: { value: '2026-12-20T10:00' } });
    fireEvent.change(dialog.getByLabelText('Ends (optional)'), { target: { value: '2026-12-10T10:00' } });
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(await dialog.findByText('Each pinned service needs its own position.')).toBeInTheDocument();
    expect(dialog.getByText('The end must come after the start.')).toBeInTheDocument();
  });

  it('shows a refused service on its own row', async () => {
    mockServer.use(
      http.post('*/admin/search/pins', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'pinned.0.serviceId', message: 'This service is not listed on the site.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await user.type(dialog.getByRole('textbox', { name: 'When a visitor searches for' }), 'ee');
    await pinService(user, dialog, 'EE UK Unlock');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    const pinned = within(await dialog.findByRole('region', { name: 'Pinned services' }));
    expect(await pinned.findByText('This service is not listed on the site.')).toBeInTheDocument();
  });

  it('shows a refusal on the row it names even when the positions are not in the order of the list', async () => {
    // The server names a refusal by its place in the body (`pinned.1`), so the body must keep the order of the list.
    mockServer.use(
      http.post('*/admin/search/pins', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'pinned.1.serviceId', message: 'This service is not listed on the site.' },
        ]),
      ),
    );
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    await user.type(dialog.getByRole('textbox', { name: 'When a visitor searches for' }), 'uk');
    await pinService(user, dialog, 'EE UK Unlock');
    await pinService(user, dialog, 'Vodafone UK iPhone Unlock', 'Vodafone');
    await user.selectOptions(
      dialog.getByRole('combobox', { name: 'Position of EE UK Unlock' }),
      'Position 3',
    );
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    const pinned = within(await dialog.findByRole('region', { name: 'Pinned services' }));
    const message = await pinned.findByText('This service is not listed on the site.');
    const [ee, vodafone] = pinned.getAllByRole('listitem');
    expect(ee).toHaveTextContent('EE UK Unlock');
    expect(vodafone).toHaveTextContent('Vodafone UK iPhone Unlock');
    expect(within(vodafone).getByText('This service is not listed on the site.')).toBe(message);
    expect(within(ee).queryByText('This service is not listed on the site.')).toBeNull();
    // The body keeps the order of the list, EE (position 3) first, so `pinned.1` is Vodafone.
    const body = lastOf(requests, 'POST')?.body as { pinned: { position: number }[] };
    expect(body.pinned.map((item) => item.position)).toEqual([3, 2]);
  });

  it('shows a twin rule’s 409 under the words', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(await screen.findByRole('button', { name: 'Add pinned results…' }));
    const dialog = dialogOf('Add pinned results');
    const words = dialog.getByRole('textbox', { name: 'When a visitor searches for' });
    await user.type(words, 'Unlock');
    await pinService(user, dialog, 'EE UK Unlock');
    await user.click(dialog.getByRole('button', { name: 'Save rule' }));
    expect(
      await dialog.findByText('There is already a rule for "unlock" with this match.'),
    ).toBeInTheDocument();
    expect(words).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Edit pinned results', () => {
  it('starts from the saved rule and sends only what changed', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(
      (await rowOf(TABLE, 'unlock')).getByRole('button', { name: 'Edit pinned results for unlock' }),
    );
    const dialog = dialogOf('Edit pinned results');
    expect(dialog.getByRole('textbox', { name: 'When a visitor searches for' })).toHaveValue('unlock');
    expect(dialog.getByText('AT&T USA Premier Unlock')).toBeInTheDocument();
    const note = dialog.getByRole('textbox', { name: 'Why (optional)' });
    await user.clear(note);
    await user.type(note, 'Holiday push');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Pinned results saved')).toBeInTheDocument();
    expect(lastOf(requests, 'PATCH')?.body).toEqual({ note: 'Holiday push' });
  });

  it('says nothing changed when nothing did', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(
      (await rowOf(TABLE, 'unlock')).getByRole('button', { name: 'Edit pinned results for unlock' }),
    );
    await user.click(dialogOf('Edit pinned results').getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
  });

  it('does not send back dates it did not change, even when the saved time has seconds', async () => {
    const rule = {
      id: 7,
      query: 'frp',
      match: 'exact',
      pinned: [{ serviceId: 3, position: 1, title: 'Samsung Info (KG / FRP / Region)' }],
      hidden: [],
      startsAt: '2030-12-01T09:00:30.000Z',
      endsAt: '2030-12-31T09:00:30.000Z',
      isEnabled: true,
      note: '',
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-02T09:00:00.000Z',
    };
    mockServer.use(
      http.get('*/admin/search/pins', () => HttpResponse.json([rule], { headers: { 'x-total-count': '1' } })),
      http.patch('*/admin/search/pins/:id', () => HttpResponse.json({ ...rule, note: 'Seasonal' })),
    );
    const user = userEvent.setup();
    await openSearch('pins');
    expect((await rowOf(TABLE, 'frp')).getByText('Scheduled')).toBeInTheDocument();
    await user.click(
      (await rowOf(TABLE, 'frp')).getByRole('button', { name: 'Edit pinned results for frp' }),
    );
    const dialog = dialogOf('Edit pinned results');
    await user.type(dialog.getByRole('textbox', { name: 'Why (optional)' }), 'Seasonal');
    const requests = recordRequests();
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Pinned results saved')).toBeInTheDocument();
    expect(lastOf(requests, 'PATCH')?.body).toEqual({ note: 'Seasonal' });
  });

  it('keeps a rule that ends in the past visible as Ended', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(
      (await rowOf(TABLE, 'unlock')).getByRole('button', { name: 'Edit pinned results for unlock' }),
    );
    const dialog = dialogOf('Edit pinned results');
    fireEvent.change(dialog.getByLabelText('Ends (optional)'), { target: { value: '2020-01-01T10:00' } });
    await user.click(dialog.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Pinned results saved')).toBeInTheDocument();
    await waitFor(async () => expect((await rowOf(TABLE, 'unlock')).getByText('Ended')).toBeInTheDocument());
  });
});

describe('the On switch and Delete', () => {
  it('switches a rule off', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    const requests = recordRequests();
    await user.click(
      (await rowOf(TABLE, 'unlock')).getByRole('switch', { name: 'Switch off pinned results for unlock' }),
    );
    expect(await screen.findByText('Pinned results switched off')).toBeInTheDocument();
    expect(lastOf(requests, 'PATCH')?.body).toEqual({ isEnabled: false });
    await waitFor(async () => expect((await rowOf(TABLE, 'unlock')).getByText('Off')).toBeInTheDocument());
  });

  it('asks first, then deletes, and leaves the empty state', async () => {
    const user = userEvent.setup();
    await openSearch('pins');
    await user.click(
      (await rowOf(TABLE, 'unlock')).getByRole('button', { name: 'Delete pinned results for unlock' }),
    );
    const dialog = dialogOf('Delete these pinned results?');
    expect(dialog.getByText(/goes back to its normal order within a minute/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Delete rule' }));
    expect(await screen.findByText('Pinned results deleted')).toBeInTheDocument();
    expect(await screen.findByText('No pinned results yet')).toBeInTheDocument();
  });
});

describe('permissions', () => {
  it('lets a reader test a search but not change a rule, and names the missing permission', async () => {
    const user = userEvent.setup();
    await openSearch('pins', { permissions: READER });
    const row = await rowOf(TABLE, 'unlock');
    for (const control of [
      row.getByRole('switch'),
      row.getByRole('button', { name: 'Edit pinned results for unlock' }),
      row.getByRole('button', { name: 'Delete pinned results for unlock' }),
      screen.getByRole('button', { name: 'Add pinned results…' }),
    ]) {
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute('title', 'You need the storefront:update permission');
    }
    await user.type(screen.getByRole('searchbox', { name: 'Words a visitor would type' }), 'unlock');
    await user.click(screen.getByRole('button', { name: 'Show results' }));
    expect(await screen.findByRole('list', { name: 'Results for unlock' })).toBeInTheDocument();
  });

  it('lets storefront:update change them', async () => {
    await openSearch('pins', { permissions: WRITER });
    const row = await rowOf(TABLE, 'unlock');
    expect(row.getByRole('switch')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Add pinned results…' })).toBeEnabled();
  });
});
