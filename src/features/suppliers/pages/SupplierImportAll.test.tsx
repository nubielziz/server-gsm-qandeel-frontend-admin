// Tests for "Select all not imported" in the "Import services…" picker and for sending a long pick 500 at a time, run through the
// whole app against the feature's mock API. The supplier's list is made long in the test (1,100 services not imported yet are
// added to Nordic GSM's 17), so there are many pages and more than 500 picks.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { mocks } from '../mocks';
import { addNotImported } from '../test/bigCatalogue';
import { detailOf, openSuppliers, toasts } from '../test/suppliersPage';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
beforeEach(() => mockServer.use(...mocks.handlers));

type User = ReturnType<typeof userEvent.setup>;
type Scope = ReturnType<typeof within>;

/** Nordic GSM keeps 3 services not imported yet; the test adds 1,100 more. */
const NOT_IMPORTED = 1_103;
const ALL_BOX = `Select all not imported (1,103)`;
const SEARCH = "Search the supplier's services";

async function openImport(user: User) {
  await addNotImported(1, 1_100);
  await openSuppliers();
  const detail = await detailOf('Nordic GSM');
  await user.click(await detail.findByRole('button', { name: 'Import services…' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Import services from Nordic GSM' }));
  await dialog.findByRole('table', { name: 'Supplier services' });
  return { detail, dialog };
}

const rowOf = (dialog: Scope, name: string) => within(dialog.getByText(name).closest('tr') as HTMLElement);
const box = async (dialog: Scope, name = ALL_BOX) =>
  (await dialog.findByRole('checkbox', { name })) as HTMLInputElement;
const picked = (dialog: Scope, count: string) => dialog.findByText(`${count} picked`);

/** A promise the test opens by hand, to hold a request until the test has looked at the dialog. */
function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

/** Writes down every call of the supplier's service list (the query it was sent) and lets it through. */
function recordLists(): URLSearchParams[] {
  const asked: URLSearchParams[] = [];
  mockServer.use(
    http.get('*/admin/suppliers/:id/services', ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return undefined;
    }),
  );
  return asked;
}

const idsOf = async (request: Request) =>
  ((await request.clone().json()) as { supplierServiceIds: number[] }).supplierServiceIds;
const isIdRead = (params: URLSearchParams) =>
  Number(params.get('_end')) - Number(params.get('_start')) === 500;

describe('the box', () => {
  it('picks every service not imported yet, also on the other pages, reading their ids 500 at a time', async () => {
    const user = userEvent.setup();
    const lists = recordLists();
    const { dialog } = await openImport(user);
    const all = await box(dialog);
    expect(all.checked).toBe(false);
    expect(dialog.getByText('0 picked')).toBeInTheDocument();

    await user.click(all);
    expect(await picked(dialog, '1,103')).toBeInTheDocument();
    const reads = lists.filter(isIdRead);
    expect(reads.map((read) => [read.get('_start'), read.get('_end')])).toEqual([
      ['0', '500'],
      ['500', '1000'],
      ['1000', '1500'],
    ]);
    for (const read of reads) {
      expect(read.get('imported')).toBe('false');
      expect(read.get('_sort')).toBe('name');
      expect(read.get('_order')).toBe('asc');
    }
    await waitFor(() => expect(all.checked).toBe(true));
    expect(
      dialog.getByText('More than 500 picked: they are previewed and imported 500 at a time.'),
    ).toBeInTheDocument();

    // The second page was never on screen, and its services are picked; the imported ones on the first page are not.
    const table = within(dialog.getByRole('table', { name: 'Supplier services' }));
    await user.click(dialog.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(table.getByText('Bulk 0030')).toBeInTheDocument());
    expect(table.getAllByRole('checkbox').every((tick) => (tick as HTMLInputElement).checked)).toBe(true);
    await user.click(dialog.getByRole('button', { name: 'Previous page' }));
    await waitFor(() => expect(table.getByText('AT&T USA Premier Unlock')).toBeInTheDocument());
    expect(rowOf(dialog, 'AT&T USA Premier Unlock').getByRole('checkbox')).not.toBeChecked();
    expect(rowOf(dialog, 'Bulk 0001').getByRole('checkbox')).toBeChecked();
  });

  it('leaves the header box of the table to the page, and shows a dash while only some are picked', async () => {
    const user = userEvent.setup();
    const { dialog } = await openImport(user);
    const all = await box(dialog);
    await user.click(dialog.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(await picked(dialog, '25')).toBeInTheDocument();
    // 25 rows on the page, 3 of them imported: 22 of the 1,103 are picked.
    await waitFor(() => expect(all.indeterminate).toBe(true));
    expect(all.checked).toBe(false);
    expect(dialog.queryByText(/^More than 500 picked/)).not.toBeInTheDocument();
  });

  it('is checked when all are picked, a dash when some are, and unticking takes out exactly those', async () => {
    const user = userEvent.setup();
    const { dialog } = await openImport(user);
    const all = await box(dialog);
    // A pick the box does not stand for: an imported service.
    await user.click(rowOf(dialog, 'AT&T USA Premier Unlock').getByRole('checkbox'));
    expect(await picked(dialog, '1')).toBeInTheDocument();
    await waitFor(() => expect(all.indeterminate).toBe(false));
    expect(all.checked).toBe(false);

    await user.click(all);
    expect(await picked(dialog, '1,104')).toBeInTheDocument();
    await waitFor(() => expect(all.checked).toBe(true));

    await user.click(rowOf(dialog, 'Bulk 0001').getByRole('checkbox'));
    expect(await picked(dialog, '1,103')).toBeInTheDocument();
    expect(all.indeterminate).toBe(true);
    expect(all.checked).toBe(false);

    await user.click(all); // a dash: ticks the rest
    expect(await picked(dialog, '1,104')).toBeInTheDocument();
    await waitFor(() => expect(all.checked).toBe(true));

    await user.click(all); // checked: takes out the 1,103, and the imported service stays picked
    expect(await picked(dialog, '1')).toBeInTheDocument();
    await waitFor(() => expect(all.checked).toBe(false));
    expect(all.indeterminate).toBe(false);
    expect(rowOf(dialog, 'AT&T USA Premier Unlock').getByRole('checkbox')).toBeChecked();
  });

  it('counts only what the search and the group show, and keeps the picks made under another one', async () => {
    const user = userEvent.setup();
    const lists = recordLists();
    const { dialog } = await openImport(user);
    const all = await box(dialog);
    await user.click(all);
    expect(await picked(dialog, '1,103')).toBeInTheDocument();

    // "Bulk 01" finds Bulk 0100 to Bulk 0199: all 100 are picked already.
    await user.type(dialog.getByRole('searchbox', { name: SEARCH }), 'Bulk 01');
    const some = await box(dialog, 'Select all not imported (100)');
    await waitFor(() => expect(some.checked).toBe(true));
    expect(lists.at(-1)?.get('q')).toBeDefined();
    await user.click(some);
    expect(await picked(dialog, '1,003')).toBeInTheDocument();
    await waitFor(() => expect(some.checked).toBe(false));
    expect(some.indeterminate).toBe(false);

    // The picks outside this search are still there when the search goes: a dash for the whole list.
    await user.clear(dialog.getByRole('searchbox', { name: SEARCH }));
    const back = await box(dialog);
    await waitFor(() => expect(back.indeterminate).toBe(true));
    expect(dialog.getByText('1,003 picked')).toBeInTheDocument();
  });

  it('counts the services of one group, sending its type and name', async () => {
    const user = userEvent.setup();
    const lists = recordLists();
    const { dialog } = await openImport(user);
    await user.selectOptions(await dialog.findByRole('combobox', { name: 'Group' }), 'Bulk (IMEI)');
    const all = await box(dialog, 'Select all not imported (1,100)');
    await user.click(all);
    expect(await picked(dialog, '1,100')).toBeInTheDocument();
    const reads = lists.filter(isIdRead);
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      expect(read.get('remoteGroup')).toBe('Bulk');
      expect(read.get('type')).toBe('imei');
      expect(read.get('imported')).toBe('false');
    }
  });

  it('is off, with the reason, when nothing matches', async () => {
    const user = userEvent.setup();
    const { dialog } = await openImport(user);
    await box(dialog);
    await user.type(dialog.getByRole('searchbox', { name: SEARCH }), 'zzzz');
    const none = await box(dialog, 'Select all not imported (0)');
    expect(none).toBeDisabled();
    expect(none.closest('label')).toHaveAttribute(
      'title',
      'No service is waiting to be imported for this search and group.',
    );
  });
});

describe('while it reads', () => {
  /** Holds the second page of the id read (the first 500 rows are answered) until the test opens the gate. */
  function holdSecondPage() {
    const hold = gate();
    const reached = gate();
    const held: Request[] = [];
    mockServer.use(
      http.get('*/admin/suppliers/:id/services', async ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get('_start') === '500' && params.get('imported') === 'false') {
          held.push(request);
          reached.open();
          await hold.opened;
        }
        return undefined;
      }),
    );
    return { hold, reached, held };
  }

  it('shows "Selecting…" and keeps Preview off until the ids are in', async () => {
    const user = userEvent.setup();
    const { hold, reached } = holdSecondPage();
    const { dialog } = await openImport(user);
    await user.click(rowOf(dialog, 'Bulk 0001').getByRole('checkbox'));
    expect(dialog.getByRole('button', { name: 'Preview (1)' })).toBeEnabled();
    await user.click(await box(dialog));
    await reached.opened;
    const busy = await dialog.findByRole('checkbox', { name: 'Selecting…' });
    // Busy, not disabled: a disabled box would drop the keyboard focus inside the dialog. Clicks are ignored until it ends.
    expect(busy).toBeEnabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveAttribute('aria-disabled', 'true');
    await user.click(busy);
    expect(dialog.getByRole('checkbox', { name: 'Selecting…' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Preview (1)' })).toBeDisabled();

    hold.open();
    expect(await picked(dialog, '1,103')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Preview (1,103)' })).toBeEnabled();
  });

  it('selects nothing when the search changes before the read is done', async () => {
    const user = userEvent.setup();
    const { hold, reached, held } = holdSecondPage();
    const { dialog } = await openImport(user);
    await user.click(await box(dialog));
    await reached.opened;
    await dialog.findByRole('checkbox', { name: 'Selecting…' });

    await user.type(dialog.getByRole('searchbox', { name: SEARCH }), 'Bulk 02');
    // The new search has its own count; the read of the old one was cancelled.
    await box(dialog, 'Select all not imported (100)');
    await waitFor(() => expect(held[0].signal.aborted).toBe(true));
    hold.open();
    await new Promise((resolve) => setTimeout(resolve, 300)); // time enough for a read that was not cancelled to finish
    expect(dialog.getByText('0 picked')).toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: 'Select all not imported (100)' })).toBeEnabled();
    expect(dialog.queryByRole('alert')).toBeEmptyDOMElement();
  });

  it('selects nothing when the search changes during a read that has older ids cached for its filter', async () => {
    const user = userEvent.setup();
    try {
      const { dialog } = await openImport(user);
      const all = await box(dialog);
      // Tick and untick: the ids of the whole list are read and kept for the filter, and nothing stays picked.
      await user.click(all);
      expect(await picked(dialog, '1,103')).toBeInTheDocument();
      await user.click(all);
      expect(await picked(dialog, '0')).toBeInTheDocument();
      // The kept ids go stale, so the next click reads them again; that read is held on its second page.
      vi.setSystemTime(Date.now() + 61_000);
      const { hold, reached, held } = holdSecondPage();
      await user.click(all);
      await reached.opened;
      await dialog.findByRole('checkbox', { name: 'Selecting…' });

      // React Query cancels the read when the search takes the box off the key, but then answers with the old ids: not picked.
      await user.type(dialog.getByRole('searchbox', { name: SEARCH }), 'Bulk 02');
      await box(dialog, 'Select all not imported (100)');
      await waitFor(() => expect(held[0].signal.aborted).toBe(true));
      hold.open();
      await new Promise((resolve) => setTimeout(resolve, 300)); // time enough for a read that was not cancelled to finish
      expect(dialog.getByText('0 picked')).toBeInTheDocument();
      expect(dialog.queryByRole('alert')).toBeEmptyDOMElement();
    } finally {
      vi.useRealTimers();
    }
  });

  it('is cancelled when the dialog is closed', async () => {
    const user = userEvent.setup();
    const { hold, reached, held } = holdSecondPage();
    const { dialog } = await openImport(user);
    await user.click(await box(dialog));
    await reached.opened;
    await user.click(dialog.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Import services from/ })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(held[0].signal.aborted).toBe(true));
    hold.open();
  });

  it('shows the error of a failed read in the dialog and picks nothing', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/suppliers/:id/services', ({ request }) =>
        new URL(request.url).searchParams.get('_start') === '500'
          ? problem(
              409,
              'SYNC_NEEDED',
              'Sync first',
              'The service list is older than a day. Sync Nordic GSM first.',
            )
          : undefined,
      ),
    );
    const { dialog } = await openImport(user);
    await user.click(await box(dialog));
    expect(
      await dialog.findByText('The service list is older than a day. Sync Nordic GSM first.'),
    ).toBeInTheDocument();
    expect(dialog.getByText('0 picked')).toBeInTheDocument();
    expect(await box(dialog)).toBeEnabled();
    expect(dialog.getByRole('button', { name: 'Preview' })).toBeDisabled();
  });
});

describe('a pick of more than 500', () => {
  /** Picks every service not imported yet and presses Preview, answering the preview calls with `onCall` (it may hold or fail). */
  async function previewAll(
    user: User,
    onCall: (ids: number[], call: number) => Promise<Response | undefined>,
  ) {
    const calls: number[][] = [];
    mockServer.use(
      http.post('*/admin/suppliers/:id/import/preview', async ({ request }) => {
        const ids = await idsOf(request);
        calls.push(ids);
        return onCall(ids, calls.length);
      }),
    );
    const opened = await openImport(user);
    await user.click(await box(opened.dialog));
    expect(await picked(opened.dialog, '1,103')).toBeInTheDocument();
    await user.click(opened.dialog.getByRole('button', { name: 'Preview (1,103)' }));
    return { ...opened, calls };
  }

  it('is previewed 500 at a time, one call after the other, and shown as one list capped at 200 rows', async () => {
    const user = userEvent.setup();
    const hold = gate();
    const reached = gate();
    const { dialog, calls } = await previewAll(user, async (_ids, call) => {
      if (call === 2) {
        reached.open();
        await hold.opened;
      }
      return undefined;
    });
    await reached.opened;
    // The second batch is in flight: the words say how far the list is, and the dialog cannot be left.
    const going = await dialog.findByRole('button', { name: 'Previewing 1,000 of 1,103…' });
    expect(going).toBeDisabled();
    expect(calls.map((ids) => ids.length)).toEqual([500, 500]);
    for (const name of ['Cancel', 'Close']) {
      for (const button of dialog.getAllByRole('button', { name })) expect(button).toBeDisabled();
    }

    hold.open();
    const preview = within(await dialog.findByRole('table', { name: 'Import preview' }));
    expect(calls.map((ids) => ids.length)).toEqual([500, 500, 103]);
    expect(new Set(calls.flat()).size).toBe(NOT_IMPORTED);
    // The summary counts all of them; the table draws 200 and says how many it leaves out.
    expect(dialog.getByText('1,103 new.')).toBeInTheDocument();
    expect(preview.getAllByRole('row')).toHaveLength(201);
    expect(dialog.getByText('and 903 more')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Import 1,103 services' })).toBeEnabled();
  });

  it('says how far a failed batch got and goes on with the rest when Preview is pressed again', async () => {
    const user = userEvent.setup();
    let failed = false;
    const { dialog, calls } = await previewAll(user, async (_ids, call) => {
      if (call === 2 && !failed) {
        failed = true;
        return problem(503, 'SUPPLIER_DOWN', 'Supplier down', 'Nordic GSM is not answering.');
      }
      return undefined;
    });
    expect(
      await dialog.findByText(
        '500 of 1,103 services were previewed before it stopped. Nordic GSM is not answering.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('table', { name: 'Import preview' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Import services from Nordic GSM' })).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Continue previewing (603 left)' }));
    await dialog.findByRole('table', { name: 'Import preview' });
    // The first batch was sent once; the failed one twice; the last once.
    expect(calls.map((ids) => ids.length)).toEqual([500, 500, 500, 103]);
    expect(calls[2]).toEqual(calls[1]);
    expect(calls[1]).not.toEqual(calls[0]);
    expect(dialog.getByText('1,103 new.')).toBeInTheDocument();
  });

  it('is imported 500 at a time; a failed second batch stops it, and Continue sends only what is left', async () => {
    const user = userEvent.setup();
    const { dialog } = await previewAll(user, async () => undefined);
    await dialog.findByRole('table', { name: 'Import preview' });
    const sent: number[][] = [];
    let calls = 0;
    mockServer.use(
      http.post('*/admin/suppliers/:id/import', async ({ request }) => {
        calls += 1;
        if (calls === 2)
          return problem(503, 'SUPPLIER_DOWN', 'Supplier down', 'Nordic GSM is not answering.');
        sent.push(await idsOf(request));
        return undefined;
      }),
    );

    await user.click(dialog.getByRole('button', { name: 'Import 1,103 services' }));
    expect(
      await dialog.findByText(
        '500 of 1,103 services were imported before it stopped. Nordic GSM is not answering.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Import services from Nordic GSM' })).toBeInTheDocument();
    expect(toasts().queryByText(/services imported/)).not.toBeInTheDocument();
    expect(sent.map((ids) => ids.length)).toEqual([500]);

    await user.click(dialog.getByRole('button', { name: 'Continue importing (603 left)' }));
    // One toast for everything the calls did, and the dialog closes.
    expect(await toasts().findByText('1,103 services imported')).toBeInTheDocument();
    expect(toasts().getByText('1,103 new')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Import services from/ })).not.toBeInTheDocument(),
    );
    expect(calls).toBe(4);
    expect(sent.map((ids) => ids.length)).toEqual([500, 500, 103]);
    expect(new Set(sent.flat()).size).toBe(NOT_IMPORTED); // no service was sent twice
  });
});
