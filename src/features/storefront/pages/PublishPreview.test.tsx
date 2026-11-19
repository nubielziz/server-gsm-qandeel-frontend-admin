// Tests for the preview of a draft: the figures and the no-rule note, the table with its cells, tags and badges for each state and
// flag, the search, chips, flag filter and paging that ask the server, the Include switch, Check again and Discard this preview.
// The row dialog, the bulk actions and the confirm dialog have their own files. The draft is run 5 of the mock (60 rows).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { roleStore } from '@/mocks/roles';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { getPublishRun, listPublishItems } from '../api';
import type { PublishItem } from '../types';
import { lastOf, openRun, PUBLISH_PERMISSIONS } from '../test/publishPage';
import {
  codeOf,
  DRAFT,
  itemReads,
  lastItemsQuery,
  openPreview,
  PREVIEW,
  previewRow,
} from '../test/publishPreview';
import { recordRequests } from '../test/requests';
import { tableNamed } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const POLL = { timeout: 8_000 };
/** Makes the server say that `noRule` rows wait for a pricing rule (the rest of the draft is the mock's own). */
async function withNoRule(noRule: number) {
  await signInAs();
  const run = await getPublishRun(DRAFT);
  mockServer.use(
    http.get('*/admin/publish-runs/5', () =>
      HttpResponse.json({ ...run, counts: { ...run.counts, noRule } }),
    ),
  );
}
/** Makes the server's first page of rows say something else about some rows (the mock's 60 rows hold no app brand). */
async function withRows(change: (item: PublishItem) => PublishItem) {
  await signInAs();
  const { data, total } = await listPublishItems(DRAFT, { start: 0, end: 50 });
  mockServer.use(
    http.get('*/admin/publish-runs/5/items', () =>
      HttpResponse.json(data.map(change), {
        headers: { 'x-total-count': String(total), 'access-control-expose-headers': 'x-total-count' },
      }),
    ),
  );
}
const runReads = (requests: ReturnType<typeof recordRequests>) =>
  requests
    .sent()
    .filter((sent) => sent.method === 'GET' && /\/admin\/publish-runs\/5$/.test(sent.url.pathname)).length;
const figure = (label: string) =>
  within(screen.getByLabelText('Preview figures')).getByText(label).parentElement;

describe('the figures', () => {
  it('shows the five figures of the draft, as the server counted them', async () => {
    await openPreview();
    expect(figure('Services')).toHaveTextContent('60');
    expect(figure('Ready')).toHaveTextContent('30');
    expect(figure('Needs a look')).toHaveTextContent('11');
    expect(figure('Cannot publish')).toHaveTextContent('19');
    expect(figure('Will be published')).toHaveTextContent('30');
    // The grid sits flat inside the panel (no margin, no border of its own).
    expect(screen.getByLabelText('Preview figures')).toHaveClass('!mb-0', '!rounded-none', '!border-0');
  });

  it('warns when rows wait for a pricing rule, with the count and the way to the Retail pricing tab', async () => {
    await openPreview();
    const note = screen.getByText(/have no price because no pricing rule covers them/);
    expect(note).toHaveTextContent(
      '3 services have no price because no pricing rule covers them. Make a rule on the Retail pricing tab, then press Check again.',
    );
    expect(within(note).getByRole('link', { name: 'Make a rule on the Retail pricing tab' })).toHaveAttribute(
      'href',
      '/storefront?tab=pricing',
    );
  });

  it('says "1 service has no price" for one row', async () => {
    await withNoRule(1);
    await openPreview();
    expect(await screen.findByText(/has no price because no pricing rule covers it/)).toHaveTextContent(
      '1 service has no price because no pricing rule covers it.',
    );
  });

  it('shows no note when no row waits for a rule', async () => {
    await withNoRule(0);
    await openPreview();
    expect(figure('Services')).toHaveTextContent('60');
    expect(screen.queryByText(/no pricing rule covers/)).not.toBeInTheDocument();
  });
});

describe('the table', () => {
  it('has the columns of the plan, a Select box for each row and the page of 50', async () => {
    await openPreview();
    const table = await tableNamed(PREVIEW);
    const headers = table.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      '',
      'Service',
      'Brand / Carrier / Country',
      'Cost',
      'Shop price',
      'Margin',
      'Status',
      'Include',
      'Actions',
    ]);
    expect(table.getAllByRole('row')).toHaveLength(51);
    expect(screen.getByText('1–50 of 60')).toBeInTheDocument();
  });

  it('shows a ready row as the server sent it: title, supplier’s name, code, slug, facts, cost, price, floor, tag and margin', async () => {
    await openPreview();
    const row = await previewRow(codeOf(1));
    expect(row.getByText('AT&T USA Premier Unlock')).toBeInTheDocument();
    expect(row.getByText('AT&amp;T USA Premier Unlock [Clean] 1-3 Days')).toHaveAttribute('dir', 'auto');
    expect(row.getByText('IMP-101 /atandt-usa-premier-unlock')).toBeInTheDocument();
    expect(row.getByText('Apple · AT&T · US')).toBeInTheDocument();
    expect(row.getByText('$13.50')).toBeInTheDocument();
    expect(row.getByText('$16.99')).toBeInTheDocument();
    expect(row.getByText('Floor $15.74')).toBeInTheDocument();
    expect(row.getByText('Rule')).toBeInTheDocument();
    expect(row.getByText('20.5%')).toBeInTheDocument();
    expect(row.getByText('Ready')).toBeInTheDocument();
    expect(row.getByRole('switch', { name: 'Include AT&T USA Premier Unlock' })).toBeChecked();
    expect(row.getByRole('button', { name: 'Edit AT&T USA Premier Unlock' })).toBeEnabled();
  });

  it('tags the shop price as the rule’s, typed by staff or kept, and says which price a row replaces', async () => {
    await openPreview();
    const replacing = await previewRow(codeOf(3));
    expect(replacing.getByText('Rule')).toBeInTheDocument();
    expect(replacing.getByText('replaces $8.49')).toBeInTheDocument();
    const typed = await previewRow(codeOf(4));
    expect(typed.getByText('Typed')).toBeInTheDocument();
    expect(typed.getByText('$9.99')).toBeInTheDocument();
    expect(typed.getByText('27.9%')).toBeInTheDocument();
    const kept = await previewRow(codeOf(20));
    expect(kept.getByText('Kept')).toBeInTheDocument();
    expect(kept.getByText('$6.99')).toBeInTheDocument();
  });

  it('draws a margin under 15% in amber and the others plain', async () => {
    await openPreview();
    expect((await previewRow(codeOf(7))).getByText('14.2%')).toHaveClass('text-warn-fg');
    expect((await previewRow(codeOf(1))).getByText('20.5%')).not.toHaveClass('text-warn-fg');
  });

  it('shows "–" for the price and the margin of a row no rule prices, with the floor still there', async () => {
    await openPreview();
    const row = await previewRow(codeOf(40));
    expect(row.getByText('Floor $6.53')).toBeInTheDocument();
    expect(row.getAllByText('–').length).toBeGreaterThanOrEqual(2);
    expect(row.queryByText('Rule')).not.toBeInTheDocument();
  });

  it('puts a small neutral tag on a brand that is a tool or an app, and none on a device maker', async () => {
    await openPreview();
    const tool = (await screen.findAllByText('Z3X Credits x10'))[0];
    expect(within(tool.closest('tr')!).getByText('Tool')).toBeInTheDocument();
    expect(
      within((await previewRow(codeOf(1))).getByText('Apple · AT&T · US').closest('td')!).queryByText('Tool'),
    ).toBeNull();
  });

  it('tags an app brand `App`, and a brand that staff changed carries no tag at all', async () => {
    await withRows((item) => {
      if (item.title === 'Z3X Credits x10')
        return { ...item, detected: { ...item.detected, brandKind: 'app' } };
      if (item.title === 'UnlockTool 1-Day License') return { ...item, brand: 'My own brand', edited: true };
      return item;
    });
    await openPreview();
    const app = within((await screen.findAllByText('Z3X Credits x10'))[0].closest('tr')!);
    expect(app.getByText('App')).toBeInTheDocument();
    expect(app.queryByText('Tool')).not.toBeInTheDocument();
    // The kind belongs to the brand the server detected (UnlockTool, a tool): typed over, the tag goes.
    const changed = within((await screen.findAllByText('UnlockTool 1-Day License'))[0].closest('tr')!);
    expect(changed.getByText('My own brand')).toBeInTheDocument();
    expect(changed.queryByText('Tool')).not.toBeInTheDocument();
    expect(changed.queryByText('App')).not.toBeInTheDocument();
  });

  it('says "No title" for a row with no title and keeps the supplier’s name, in any script, under it', async () => {
    await openPreview();
    const row = await previewRow(codeOf(38));
    expect(row.getByText('No title')).toBeInTheDocument();
    const name = row.getByText(/^IMP-138/).parentElement!.querySelector('[dir="auto"]');
    expect(name).not.toBeNull();
    expect(name!.textContent).toHaveLength(13);
  });
});

describe('the status of each state', () => {
  it('Ready: a good badge, no reason', async () => {
    await openPreview();
    const row = await previewRow(codeOf(2));
    expect(row.getByText('Ready')).toBeInTheDocument();
    expect(row.queryByText(/^The /)).not.toBeInTheDocument();
  });

  it('Needs a look: a warn badge and the reason in the words of the flag', async () => {
    await openPreview();
    const row = await previewRow(codeOf(21));
    expect(row.getByText('Needs a look')).toBeInTheDocument();
    expect(row.getByText('The title is over 100 characters.')).toBeInTheDocument();
    expect(row.getByRole('switch', { name: /^Include Unlock iPhone 11/ })).not.toBeChecked();
    expect(row.getByRole('switch', { name: /^Include Unlock iPhone 11/ })).toBeEnabled();
  });

  it('Cannot publish: a crit badge, the reason, and a switch that is off and locked with the way out in its title', async () => {
    await openPreview();
    const row = await previewRow(codeOf(32));
    expect(row.getByText('Cannot publish')).toBeInTheDocument();
    expect(row.getByText('The service is switched off.')).toBeInTheDocument();
    const include = row.getByRole('switch', { name: 'Include Huawei ID Removal' });
    expect(include).toBeDisabled();
    expect(include).not.toBeChecked();
    expect(include).toHaveAttribute(
      'title',
      'Cannot publish: the service is switched off. Enable the service, then check again.',
    );
  });
});

describe('the status of each flag and blocking reason the mock shows on page one', () => {
  const HARD: [number, string][] = [
    [21, 'The title is over 100 characters.'],
    [23, 'Another row has the same supplier name.'],
    [27, 'Another listing has this title.'],
    [29, 'The quantity is inside the name.'],
    [31, 'It names several countries.'],
  ];
  it.each(HARD)('row %i (a hard flag) reads "%s" under Needs a look', async (id, words) => {
    await openPreview();
    const row = await previewRow(codeOf(id));
    expect(row.getByText('Needs a look')).toBeInTheDocument();
    expect(row.getByText(words)).toBeInTheDocument();
  });

  const SOFT: [number, string, string][] = [
    [17, 'Long title', 'The title is 81 to 100 characters'],
    [11, 'Brand not in title', 'The title does not say the brand'],
    [5, 'Brackets repaired', 'Brackets in the name were repaired'],
    [8, 'Marketing word kept', 'A marketing word was kept'],
    [24, 'Address numbered', 'The address got a number to stay unique'],
    [7, 'At the floor', 'The price was lifted to the floor'],
    [18, 'No brand', 'No brand was found'],
    [14, 'Country from group', 'The country comes from the supplier group'],
    [12, 'No country', 'A carrier with no country'],
    [20, 'Price kept', 'The service keeps its current price'],
  ];
  it.each(SOFT)(
    'row %i (a soft flag) keeps its state and shows the mark "%s" with a tooltip',
    async (id, mark, tip) => {
      await openPreview();
      const row = await previewRow(codeOf(id));
      expect(row.getByText(mark).parentElement).toHaveAttribute('title', tip);
      expect(row.queryByText('Cannot publish')).not.toBeInTheDocument();
    },
  );

  const BLOCKED: [number, string][] = [
    [32, 'The service is switched off.'],
    [34, 'Its category is switched off.'],
    [35, 'Its category is closed to the public.'],
    [36, 'No supplier can fill it now.'],
    [38, 'It has no title.'],
    [39, 'The title is over 200 characters.'],
    [40, 'It has no price. No pricing rule covers it.'],
    [43, 'It has no price. The cost is zero.'],
    [45, 'The typed price is under the floor.'],
    [46, 'The address is taken.'],
  ];
  it.each(BLOCKED)('row %i (blocked) reads "%s"', async (id, words) => {
    await openPreview();
    const row = await previewRow(codeOf(id));
    expect(row.getByText('Cannot publish')).toBeInTheDocument();
    expect(row.getByText(words)).toBeInTheDocument();
    expect(row.getByRole('switch')).toBeDisabled();
  });
});

describe('the toolbar asks the server', () => {
  it('searches after a pause with `q`, back on page 1, and says how many rows match', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPreview();
    await user.type(screen.getByRole('searchbox'), 'vodafone');
    await waitFor(() => expect(lastItemsQuery(requests).q).toBe('vodafone'), POLL);
    expect(app.location()).toContain('q=vodafone');
    expect(lastItemsQuery(requests)).toMatchObject({ _start: '0', _end: '50' });
    expect(await screen.findByText('3 rows')).toBeInTheDocument();
    expect(await screen.findByText('Vodafone UK iPhone Unlock')).toBeInTheDocument();
  });

  it('each status chip sends its filter and the others none; Left out sends `included=false`', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPreview();
    const chip = (name: RegExp | string) => screen.getByRole('button', { name });
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Ready (30)')).toBeInTheDocument();
    expect(chip('Needs a look (11)')).toBeInTheDocument();
    expect(chip('Cannot publish (19)')).toBeInTheDocument();
    expect(chip('Left out (30)')).toBeInTheDocument();

    await user.click(chip('Needs a look (11)'));
    await waitFor(() => expect(lastItemsQuery(requests).state).toBe('review'));
    expect(app.location()).toContain('state=review');
    expect(await screen.findByText('11 rows')).toBeInTheDocument();
    expect(chip('Needs a look (11)')).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip('Left out (30)'));
    await waitFor(() => expect(lastItemsQuery(requests).included).toBe('false'));
    expect(lastItemsQuery(requests)).not.toHaveProperty('state');
    expect(app.location()).not.toContain('state=');
    expect(await screen.findByText('30 rows')).toBeInTheDocument();

    await user.click(chip('Cannot publish (19)'));
    await waitFor(() => expect(lastItemsQuery(requests).state).toBe('blocked'));
    expect(lastItemsQuery(requests)).not.toHaveProperty('included');
    expect(await screen.findByText('19 rows')).toBeInTheDocument();

    await user.click(chip(/^All/));
    await waitFor(() => expect(lastItemsQuery(requests)).not.toHaveProperty('state'));
    expect(await screen.findByText('60 rows')).toBeInTheDocument();
  });

  it('the Flag select sends `flag`, the Brand kind select sends `brandKind`, and Clear filters puts them all back', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Flag' }), 'duplicate_name');
    await waitFor(() => expect(lastItemsQuery(requests).flag).toBe('duplicate_name'));
    expect(await screen.findByText('4 rows')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Flag' }), '');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Brand kind' }), 'tool');
    await waitFor(() => expect(lastItemsQuery(requests).brandKind).toBe('tool'));
    expect(await screen.findByText('5 rows')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(lastItemsQuery(requests)).not.toHaveProperty('brandKind'));
    expect(await screen.findByText('60 rows')).toBeInTheDocument();
  });

  it('sorts by title and by cost on the server, and the page is back on 1', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await user.click(screen.getByRole('button', { name: /^Cost/ }));
    await waitFor(() => expect(lastItemsQuery(requests)).toMatchObject({ _sort: 'cost', _order: 'asc' }));
    await user.click(screen.getByRole('button', { name: /^Service/ }));
    await waitFor(() => expect(lastItemsQuery(requests)).toMatchObject({ _sort: 'title' }));
  });

  it('pages by 50 on the server: page 2 holds the last ten rows, the file services among them', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(lastItemsQuery(requests)).toMatchObject({ _start: '50', _end: '100' }));
    expect(app.location()).toContain('page=2');
    expect((await screen.findAllByText('Samsung Combination File')).length).toBeGreaterThan(0);
    const row = (await screen.findAllByText('Qualcomm Dump File'))[0].closest('tr')!;
    expect(within(row).getByText('It cannot be ordered online.')).toBeInTheDocument();
    expect(screen.getByText('51–60 of 60')).toBeInTheDocument();
  });

  it('says so when no row matches, with a way to clear the search', async () => {
    const user = userEvent.setup();
    await openPreview();
    await user.type(screen.getByRole('searchbox'), 'zzzz-no-such-row');
    expect(await screen.findByText('No row matches the search or the filters.')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('AT&T USA Premier Unlock')).toBeInTheDocument();
  });
});

describe('the Include switch', () => {
  it('sends only `included`, then the figure "Will be published" moves with the run', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    const row = await previewRow(codeOf(21));
    await user.click(row.getByRole('switch', { name: /^Include Unlock iPhone 11/ }));
    await waitFor(() =>
      expect(lastOf(requests, 'PATCH', /\/admin\/publish-runs\/5\/items\/21$/).body).toEqual({
        included: true,
      }),
    );
    await waitFor(() => expect(figure('Will be published')).toHaveTextContent('31'));
    expect((await previewRow(codeOf(21))).getByRole('switch', { name: /^Include Unlock/ })).toBeChecked();
  });

  it('shows the server’s refusal above the table when a row cannot be ticked', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.patch('*/admin/publish-runs/:id/items/:itemId', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'included', message: 'Cannot publish: the service is switched off.' },
        ]),
      ),
    );
    await openPreview();
    await user.click((await previewRow(codeOf(1))).getByRole('switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot publish: the service is switched off.',
    );
  });

  it('reads the run again when the server says it is no longer a draft', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.patch('*/admin/publish-runs/:id/items/:itemId', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run is no longer a draft.'),
      ),
    );
    await openPreview();
    const before = requests
      .sent()
      .filter((sent) => /\/admin\/publish-runs\/5$/.test(sent.url.pathname)).length;
    await user.click((await previewRow(codeOf(1))).getByRole('switch'));
    expect(await screen.findByRole('alert')).toHaveTextContent('This run is no longer a draft.');
    await waitFor(() =>
      expect(
        requests.sent().filter((sent) => /\/admin\/publish-runs\/5$/.test(sent.url.pathname)).length,
      ).toBeGreaterThan(before),
    );
  });
});

describe('Check again', () => {
  it('shows when the prices were worked out, and a button that explains itself', async () => {
    await openPreview();
    expect(screen.getByText(/^Prices as of /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check again' })).toHaveAttribute(
      'title',
      "Works everything out again with today's rules, costs and services. Your edits are kept.",
    );
  });

  it('makes a new run from this one (scope `run`) and moves the page to it; the old draft says it was checked again', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=publish&run=8'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs$/).body).toEqual({
      scope: { kind: 'run', runId: 5 },
    });
    expect(await screen.findByText('Preparing the preview of 60 services…')).toBeInTheDocument();
    // The new draft arrives by itself, with the edits of the old one and the figures worked out again.
    expect(await screen.findByRole('table', { name: PREVIEW }, POLL)).toBeInTheDocument();
    expect(figure('Services')).toHaveTextContent('60');
    // The old draft is cancelled and points at the new one.
    await openRun(DRAFT);
    expect(await screen.findByText('This preview was checked again.')).toBeInTheDocument();
  });

  it('reads the run again when the server says it is still working, so the page shows what the run is now', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(409, 'CONFLICT', 'Still working', 'That run is still working.'),
      ),
    );
    await openPreview();
    const before = runReads(requests);
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('That run is still working.')).toBeInTheDocument();
    await waitFor(() => expect(runReads(requests)).toBeGreaterThan(before));
  });

  it('shows the server’s refusal under the button and stays on the draft', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs', () =>
        problem(409, 'CONFLICT', 'Still working', 'That run is still working.'),
      ),
    );
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByText('That run is still working.')).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=publish&run=5');
  });
});

describe('Discard this preview', () => {
  it('asks first, then cancels the draft and goes back to the start of the tab', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    const app = await openPreview();
    await user.click(screen.getByRole('button', { name: 'Discard this preview' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Discard this preview?' }));
    expect(dialog.getByText('Your edits are thrown away. Nothing has been published.')).toBeInTheDocument();
    expect(itemReads(requests).length).toBeGreaterThan(0);
    await user.click(dialog.getByRole('button', { name: 'Discard preview' }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=publish'));
    expect(lastOf(requests, 'POST', /\/admin\/publish-runs\/5\/cancel$/).body).toEqual({});
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Publish services to the shop' }),
    ).toBeInTheDocument();
  });

  it('keeps the draft when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await user.click(screen.getByRole('button', { name: 'Discard this preview' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      requests.sent().some((sent) => sent.method === 'POST' && /publish-runs/.test(sent.url.pathname)),
    ).toBe(false);
  });

  it('shows the server’s refusal in the dialog and reads the run again, so the page shows what it is now', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/cancel', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run is already finished.'),
      ),
    );
    const app = await openPreview();
    const before = runReads(requests);
    await user.click(screen.getByRole('button', { name: 'Discard this preview' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard preview' }));
    expect(
      await within(screen.getByRole('dialog')).findByText('This run is already finished.'),
    ).toBeInTheDocument();
    expect(app.location()).toBe('/storefront?tab=publish&run=5');
    await waitFor(() => expect(runReads(requests)).toBeGreaterThan(before));
  });

  it('needs no storefront:publish: only stopping a run that is queued or running does', async () => {
    const user = userEvent.setup();
    const app = await openPreview();
    roleStore().patch(1, { permissions: PUBLISH_PERMISSIONS.filter((one) => one !== 'storefront:publish') });
    await user.click(screen.getByRole('button', { name: 'Discard this preview' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard preview' }));
    await waitFor(() => expect(app.location()).toBe('/storefront?tab=publish'));
  });
});
