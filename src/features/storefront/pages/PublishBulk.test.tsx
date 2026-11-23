// Tests for the bulk actions of the preview: the bar that shows when rows are ticked, the header tick box and "Select all N rows that
// match" (a call by the table's filter, on the server, not by the ids in view), Include and Leave out, the one-field dialogs that set
// the brand, the carrier or the country, what a call answers in words, and the refusals. The draft is run 5 of the mock (60 rows).
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi, signInAs } from '@/test/renderApp';
import { listPublishItems } from '../api';
import { publishRoute } from '../test/publishPage';
import { codeOf, itemWrites, openPreview, PREVIEW, previewRow } from '../test/publishPreview';
import { recordRequests } from '../test/requests';
import { openProductsView } from '../test/storefrontPage';

setupMockApi();
vi.setConfig({ testTimeout: 40_000 });
afterEach(() => vi.restoreAllMocks());

const bar = () => within(screen.getByRole('region', { name: 'Selected rows' }));
const tick = async (user: ReturnType<typeof userEvent.setup>, id: number) =>
  user.click(screen.getByRole('checkbox', { name: `Select row ${id}` }));
const figure = (label: string) =>
  within(screen.getByLabelText('Preview figures')).getByText(label).parentElement;

describe('the bar', () => {
  it('is not there until a row is ticked, then counts the ticked rows and offers the actions', async () => {
    const user = userEvent.setup();
    await openPreview();
    expect(screen.queryByRole('region', { name: 'Selected rows' })).not.toBeInTheDocument();
    await tick(user, 21);
    expect(bar().getByText('1 selected')).toBeInTheDocument();
    await tick(user, 22);
    expect(bar().getByText('2 selected')).toBeInTheDocument();
    for (const name of ['Include', 'Leave out', 'Set brand…', 'Set carrier…', 'Set country…', 'Clear']) {
      expect(bar().getByRole('button', { name })).toBeEnabled();
    }
  });

  it('Clear unticks every row and takes the bar away', async () => {
    const user = userEvent.setup();
    await openPreview();
    await tick(user, 21);
    await user.click(bar().getByRole('button', { name: 'Clear' }));
    expect(screen.queryByRole('region', { name: 'Selected rows' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row 21' })).not.toBeChecked();
  });

  it('keeps the ticked rows when the page changes', async () => {
    const user = userEvent.setup();
    await openPreview();
    await tick(user, 21);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(await screen.findAllByText('Samsung Combination File')).not.toHaveLength(0);
    expect(bar().getByText('1 selected')).toBeInTheDocument();
  });
});

describe('by the ticked rows', () => {
  it('Include sends the ids and what to set, says how many changed and moves the figure', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await tick(user, 21);
    await tick(user, 22);
    await user.click(bar().getByRole('button', { name: 'Include' }));
    expect(await screen.findByText('2 rows changed.')).toBeInTheDocument();
    const [call] = itemWrites(requests, 'POST');
    expect(call.url.pathname).toMatch(/\/admin\/publish-runs\/5\/items\/bulk$/);
    expect(call.body).toEqual({ select: { itemIds: [21, 22] }, set: { included: true } });
    await waitFor(() => expect(figure('Will be published')).toHaveTextContent('32'));
    // The rows are unticked after the call, and the page was read again.
    expect(screen.queryByRole('region', { name: 'Selected rows' })).not.toBeInTheDocument();
    expect((await previewRow(codeOf(21))).getByRole('switch')).toBeChecked();
  });

  it('Leave out sends `included: false`', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Leave out' }));
    expect(await screen.findByText('1 row changed.')).toBeInTheDocument();
    expect(itemWrites(requests, 'POST')[0].body).toEqual({
      select: { itemIds: [1] },
      set: { included: false },
    });
    await waitFor(() => expect(figure('Will be published')).toHaveTextContent('29'));
  });

  it('says how many rows could not be included when some of them cannot be published', async () => {
    const user = userEvent.setup();
    await openPreview();
    await tick(user, 21);
    await tick(user, 32);
    await user.click(bar().getByRole('button', { name: 'Include' }));
    expect(
      await screen.findByText('1 row changed. 1 row could not be included: it cannot be published.'),
    ).toBeInTheDocument();
  });

  it('shows the server’s refusal in words, and reads the run again when it is no longer a draft', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/items/bulk', () =>
        problem(409, 'CONFLICT', 'Not in the right state', 'This run is no longer a draft.'),
      ),
    );
    await openPreview();
    const runReads = () =>
      requests
        .sent()
        .filter((sent) => sent.method === 'GET' && /\/admin\/publish-runs\/5$/.test(sent.url.pathname))
        .length;
    const before = runReads();
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Leave out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This run is no longer a draft.');
    await waitFor(() => expect(runReads()).toBeGreaterThan(before));
    // The ticks stay, so staff can try again.
    expect(bar().getByText('1 selected')).toBeInTheDocument();
  });
});

describe('the facts', () => {
  it('Set brand opens a one-field dialog that says how many rows it reaches, and sends the brand with the ids', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await tick(user, 1);
    await tick(user, 2);
    await user.click(bar().getByRole('button', { name: 'Set brand…' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Set the brand' }));
    expect(dialog.getByText('2 rows')).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Brand'), 'Nokia');
    await user.click(dialog.getByRole('button', { name: 'Set' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'POST')[0].body).toEqual({
      select: { itemIds: [1, 2] },
      set: { brand: 'Nokia' },
    });
    expect(await screen.findByText('2 rows changed.')).toBeInTheDocument();
    expect(await (await previewRow(codeOf(1))).findByText('Nokia · AT&T · US')).toBeInTheDocument();
  });

  it('Set carrier and Set country send their own key; an empty value clears the fact', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Set carrier…' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Set the carrier' })).getByRole('button', { name: 'Set' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(itemWrites(requests, 'POST')[0].body).toEqual({ select: { itemIds: [1] }, set: { carrier: '' } });
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Set country…' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Set the country' }));
    expect(dialog.getByLabelText('Country')).toHaveAttribute('maxlength', '2');
    await user.type(dialog.getByLabelText('Country'), 'ca');
    await user.click(dialog.getByRole('button', { name: 'Set' }));
    await waitFor(() => expect(itemWrites(requests, 'POST')).toHaveLength(2));
    expect(itemWrites(requests, 'POST')[1].body).toEqual({
      select: { itemIds: [1] },
      set: { country: 'ca' },
    });
  });

  it('shows a refusal of the value under the field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.post('*/admin/publish-runs/:id/items/bulk', () =>
        problem(422, 'VALIDATION_FAILED', 'Check the form', 'Some fields need attention.', [
          { field: 'set.country', message: 'Use two letters, or leave it empty.' },
        ]),
      ),
    );
    await openPreview();
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Set country…' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Set the country' }));
    await user.type(dialog.getByLabelText('Country'), '1');
    await user.click(dialog.getByRole('button', { name: 'Set' }));
    expect(await dialog.findByText('Use two letters, or leave it empty.')).toBeInTheDocument();
    expect(dialog.getByLabelText('Country')).toHaveAttribute('aria-invalid', 'true');
    expect(bar().getByText('1 selected')).toBeInTheDocument();
  });

  it('Cancel closes the dialog and sends nothing', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await tick(user, 1);
    await user.click(bar().getByRole('button', { name: 'Set brand…' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(itemWrites(requests, 'POST')).toHaveLength(0);
  });
});

describe('all the rows that match', () => {
  it('the header tick box ticks the page and offers every row that matches, and only then', async () => {
    const user = userEvent.setup();
    await openPreview();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(bar().getByText('50 selected')).toBeInTheDocument();
    await user.click(bar().getByRole('button', { name: 'Select all 60 rows that match' }));
    expect(bar().getByText('All 60 rows that match are selected')).toBeInTheDocument();
    expect(bar().queryByRole('button', { name: /^Select all/ })).not.toBeInTheDocument();
  });

  it('does not offer it when the page already holds every row that matches', async () => {
    const user = userEvent.setup();
    await openProductsView(`${publishRoute(5)}&state=review`);
    await screen.findByRole('table', { name: PREVIEW });
    await screen.findByText('11 rows');
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    expect(bar().getByText('11 selected')).toBeInTheDocument();
    expect(bar().queryByRole('button', { name: /^Select all/ })).not.toBeInTheDocument();
  });

  it('sends the filter and no ids: the server finds every row of the run that matches', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(bar().getByRole('button', { name: 'Select all 60 rows that match' }));
    await user.click(bar().getByRole('button', { name: 'Leave out' }));
    expect(await screen.findByText('30 rows changed.')).toBeInTheDocument();
    expect(itemWrites(requests, 'POST')[0].body).toEqual({
      select: { filter: {} },
      set: { included: false },
    });
    await waitFor(() => expect(figure('Will be published')).toHaveTextContent('0'));
    expect(screen.queryByRole('region', { name: 'Selected rows' })).not.toBeInTheDocument();
  });

  it('puts the search, the chip and the flag of the table in the filter', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await signInAs();
    const page = await listPublishItems(5, { start: 0, end: 50 });
    // The server says 120 rows match, so the page holds fewer than all of them.
    mockServer.use(
      http.get('*/admin/publish-runs/5/items', () =>
        HttpResponse.json(page.data, { headers: { 'x-total-count': '120' } }),
      ),
    );
    await openProductsView(`${publishRoute(5)}&state=review&flag=duplicate_name&q=%20unlock%20`);
    await screen.findByRole('table', { name: PREVIEW });
    await user.click(await screen.findByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(bar().getByRole('button', { name: 'Select all 120 rows that match' }));
    expect(bar().getByText('All 120 rows that match are selected')).toBeInTheDocument();
    await user.click(bar().getByRole('button', { name: 'Include' }));
    await waitFor(() => expect(itemWrites(requests, 'POST')).toHaveLength(1));
    expect(itemWrites(requests, 'POST')[0].body).toEqual({
      select: { filter: { state: 'review', flag: 'duplicate_name', q: 'unlock' } },
      set: { included: true },
    });
  });

  it('uses the filter for a brand too, with the count of the rows it reaches in the dialog', async () => {
    const user = userEvent.setup();
    const requests = recordRequests();
    await openPreview();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(bar().getByRole('button', { name: 'Select all 60 rows that match' }));
    await user.click(bar().getByRole('button', { name: 'Set brand…' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Set the brand' }));
    expect(dialog.getByText('60 rows')).toBeInTheDocument();
    await user.type(dialog.getByLabelText('Brand'), 'Generic');
    await user.click(dialog.getByRole('button', { name: 'Set' }));
    await waitFor(() => expect(itemWrites(requests, 'POST')).toHaveLength(1));
    expect(itemWrites(requests, 'POST')[0].body).toEqual({
      select: { filter: {} },
      set: { brand: 'Generic' },
    });
  });

  it('stops being "all that match" when the filter changes, and keeps the rows that were ticked by hand', async () => {
    const user = userEvent.setup();
    await openPreview();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(bar().getByRole('button', { name: 'Select all 60 rows that match' }));
    await user.click(screen.getByRole('button', { name: 'Ready (30)' }));
    await screen.findByText('30 rows');
    expect(bar().queryByText(/All 60 rows that match are selected/)).not.toBeInTheDocument();
    expect(bar().getByText('50 selected')).toBeInTheDocument();
  });

  it('starts again from nothing when a tick box is clicked while "all that match" is on', async () => {
    const user = userEvent.setup();
    await openPreview();
    await user.click(screen.getByRole('checkbox', { name: 'Select all rows on this page' }));
    await user.click(bar().getByRole('button', { name: 'Select all 60 rows that match' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.queryByRole('region', { name: 'Selected rows' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).not.toBeChecked();
  });
});
