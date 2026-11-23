// Tests for the Retail Purchase part's "On the shop" and "Shop page" sections: what it says for a service with no shop page (the reason, a failed
// publish and the way to its run), a role that may not read the shop, and for a service with a shop page the listing read by id, its form
// in label-left rows saved in place, the server's refusals, the permission of the controls and the unsaved-changes report. A host stands in
// for the edit view. They run against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fmtDate, num } from '@/lib/format';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { setupMockApi } from '@/test/renderApp';
import { getListing } from '../api';
import { storefrontPublishPath } from '../lib/paths';
import { ATT, ATT_SERVICE, ELSEWHERE } from '../test/RetailHost';
import { listingRequests, openRetail, rowOf, sentTo } from '../test/retailPurchase';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const TMOBILE = 'T-Mobile USA Unlock'; // shop page 6
const FAILED_AT = '2026-11-20T10:30:00.000Z';
const SAVE = { name: 'Save shop page' };

const titleField = () => screen.findByRole('textbox', { name: 'Public title' });

describe('a service with no shop page', () => {
  it('says so, keeps the switch, gives the reason it cannot go on the shop and has no form', async () => {
    const requests = await openRetail({ listingId: null, isListed: false, shopBlocked: 'b2b_only' });
    const part = within(await screen.findByRole('region', { name: `Retail purchase of ${ATT}` }));
    expect(part.getByRole('img', { name: 'Not on the shop yet' })).toBeInTheDocument();
    expect(part.getByText('Not on the shop yet')).toBeInTheDocument();
    expect(part.getByRole('button', { name: 'Shop switch' })).toBeInTheDocument();
    expect(
      part.getByText('It cannot go on the shop now: its category is closed to the public.'),
    ).toBeInTheDocument();
    expect(part.getByText('None yet')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Public title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Failed publish' })).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.includes('/admin/service-listings'))).toBe(false);
  });

  it('draws its sections under their headings, in order', async () => {
    await openRetail({ listingId: null, isListed: false });
    const part = within(await screen.findByRole('region', { name: `Retail purchase of ${ATT}` }));
    expect(part.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
      'On the shop',
      'Shop price',
      'Shop page',
    ]);
  });

  it('says nothing about a reason when there is none', async () => {
    await openRetail({ listingId: null, isListed: false, shopBlocked: null });
    expect(await screen.findByText('Not on the shop yet')).toBeInTheDocument();
    expect(screen.queryByText(/It cannot go on the shop now/)).not.toBeInTheDocument();
  });

  it('shows a failed publish in the words of the publish screens, with its date and a link to the run', async () => {
    await openRetail({
      listingId: null,
      isListed: false,
      publishFailure: {
        runId: 3,
        reason: 'cost_moved',
        detail: 'The cost moved from $9.80 to $15.10, more than the rule allows.',
        at: FAILED_AT,
      },
    });
    const failure = within(await screen.findByRole('group', { name: 'Failed publish' }));
    expect(failure.getByText('Refused')).toBeInTheDocument();
    expect(failure.getByText(fmtDate(FAILED_AT))).toBeInTheDocument();
    expect(
      failure.getByText(
        'The cost changed a lot since the preview. The cost moved from $9.80 to $15.10, more than the rule allows.',
      ),
    ).toBeInTheDocument();
    expect(failure.getByRole('link', { name: 'See publish run 3' })).toHaveAttribute(
      'href',
      storefrontPublishPath(3),
    );
    expect(screen.getByText('Last publish')).toBeInTheDocument();
  });

  it('shows a reason the console does not know as the server sent it', async () => {
    await openRetail({
      listingId: null,
      publishFailure: { runId: 9, reason: 'something_new', detail: null, at: FAILED_AT },
    });
    const failure = within(await screen.findByRole('group', { name: 'Failed publish' }));
    expect(failure.getByText('Something_new.')).toBeInTheDocument();
  });
});

describe('a role that may not read the shop', () => {
  it('gets one line and no switch, and nothing of the shop is read', async () => {
    const requests = await openRetail({ listingId: undefined }, ['catalog:read']);
    expect(
      await screen.findByText('The shop page is hidden: you need the storefront:read permission to see it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shop switch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: `Retail purchase of ${ATT}` })).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.includes('/admin/service-listings'))).toBe(false);
    expect(requests.sent().some((sent) => sent.url.pathname.includes('/admin/retail-price-changes'))).toBe(
      false,
    );
  });
});

describe('a service with a shop page', () => {
  it('reads the shop page once by its id and shows its form in rows, its figures and the switch', async () => {
    const requests = await openRetail();
    expect(await titleField()).toHaveValue(ATT);
    expect(listingRequests(requests, 'GET', ATT_SERVICE)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Shop switch' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'On the shop' })).toBeInTheDocument();
    const listing = await getListing(ATT_SERVICE);
    expect(rowOf('Orders, 30 days')).toHaveTextContent(num(listing.orders30d));
    expect(screen.getByText('Revenue, 30 days')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('atandt-usa-premier-unlock');
    expect(screen.getByRole('combobox', { name: 'Brand' })).toHaveValue('Apple');
    expect(screen.getByRole('button', { name: 'Save shop page' })).toBeDisabled();
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('draws the fields as label-left rows, with the facts and the search texts under small headings', async () => {
    await openRetail();
    expect((await titleField()).closest('.form-row')).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'Summary' }).closest('.form-row')).not.toBeNull();
    expect(screen.getByRole('combobox', { name: 'Brand' }).closest('.form-row')).not.toBeNull();
    expect(screen.getByRole('checkbox', { name: 'Featured on the storefront' })).toBeChecked();
    expect(screen.getByRole('group', { name: 'About the service' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Search engines' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search title' })).toBeInTheDocument();
    // The picture is a row of its own and its buttons act at once.
    expect(rowOf('Picture')).toContainElement(screen.getByRole('button', { name: /picture…$/ }));
  });

  it('says a switched-off shop page is not on the shop, and when it first went on', async () => {
    await openRetail({ isListed: false });
    expect(await titleField()).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Not on the shop' })).toBeInTheDocument();
    expect(screen.queryByText('Not on the shop yet')).not.toBeInTheDocument();
    const listing = await getListing(ATT_SERVICE);
    expect(listing.listedAt).not.toBeNull();
    expect(screen.getByText(`First on the shop ${fmtDate(listing.listedAt)}`)).toBeInTheDocument();
  });

  it('reports unsaved changes, saves only what changed and stays open', async () => {
    const user = userEvent.setup();
    const requests = await openRetail();
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'Unlock an AT&T iPhone.');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'Unlock an AT&T iPhone.' },
    ]);
    // The shop page is read again after a save, and the section stays on the same form.
    expect(listingRequests(requests, 'GET', ATT_SERVICE)).toHaveLength(2);
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(summary).toHaveValue('Unlock an AT&T iPhone.');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
  });

  it('compares the next save with what the first one stored', async () => {
    const user = userEvent.setup();
    const requests = await openRetail();
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'First words.');
    await user.click(screen.getByRole('button', SAVE));
    await screen.findByText('Saved');
    // Back to what the shop page was before the first save: it is a change now, and it is sent.
    await user.clear(summary);
    await user.click(screen.getByRole('button', SAVE));
    await waitFor(() => expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(2));
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'First words.' },
      { summary: '' },
    ]);
  });

  it('keeps what it saved when the shop page cannot be read again after the save', async () => {
    const user = userEvent.setup();
    const requests = await openRetail();
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'Saved words.');
    // The read after the save fails: the form keeps the text the server stored, it does not go back to the copy it read first.
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'The listing is not available.'),
      ),
    );
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(summary).toHaveValue('Saved words.');
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'Saved words.' },
    ]);
  });

  it('does not send back a field that another save changed while the form held edits', async () => {
    const user = userEvent.setup();
    const requests = await openRetail({ elsewhere: true });
    const title = await titleField();
    await user.clear(title);
    await user.type(title, 'A new public title');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    // Another save stores the summary and the part is handed the new copy; its form keeps what was typed.
    await user.click(screen.getByRole('button', { name: 'Save elsewhere' }));
    expect(await screen.findByText(`Read copy: ${ELSEWHERE}`)).toBeInTheDocument();
    expect(title).toHaveValue('A new public title');
    await user.click(screen.getByRole('button', SAVE));
    await waitFor(() => expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(2));
    // Only the typed title is sent: the summary the other save stored is not written back as the old text.
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: ELSEWHERE },
      { publicTitle: 'A new public title' },
    ]);
  });

  it('shows the server’s refusal under the field and keeps the changes', async () => {
    const user = userEvent.setup();
    await openRetail();
    const slug = await screen.findByRole('textbox', { name: 'Slug' });
    await user.clear(slug);
    await user.type(slug, 'ee-uk-unlock');
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('The slug ee-uk-unlock is already used.')).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('asks for a title before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = await openRetail();
    await user.clear(await titleField());
    await user.click(screen.getByRole('button', SAVE));
    expect(await screen.findByText('Enter the title customers see.')).toBeInTheDocument();
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(0);
  });

  it('keeps the controls off without storefront:update and says which permission is missing', async () => {
    await openRetail({}, ['storefront:read']);
    expect(await titleField()).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Brand' })).toBeDisabled();
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(screen.getAllByTitle('You need the storefront:update permission').length).toBeGreaterThan(0);
  });

  it('reads the shop page of a new id and drops what was typed for the old one', async () => {
    const user = userEvent.setup();
    const requests = await openRetail({ other: 6 });
    await user.type(await screen.findByRole('textbox', { name: 'Summary' }), 'Unsaved words');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show the other shop page' }));
    expect(await screen.findByDisplayValue(TMOBILE)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(ATT)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Unsaved words')).not.toBeInTheDocument();
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(listingRequests(requests, 'GET', 6)).toHaveLength(1);
  });

  it('says the server’s words with Retry when the shop page cannot be read, and shows the form after it', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'The listing is not available.'),
      ),
    );
    await openRetail();
    expect(await screen.findByText('Could not load the shop page')).toBeInTheDocument();
    expect(screen.getByText('The listing is not available.')).toBeInTheDocument();
    // The switch and the state stay: they do not need the shop page. The price and page sections wait for the read.
    expect(screen.getByRole('button', { name: 'Shop switch' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Shop page' })).not.toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await titleField()).toHaveValue(ATT);
    expect(screen.getByRole('heading', { name: 'Shop page' })).toBeInTheDocument();
  });

  it('shows what the server says about a locked shop page, in the first section', async () => {
    await openRetail({ listingId: 11, isListed: false });
    expect(await titleField()).toBeInTheDocument();
    const status = within(rowOf('Status'));
    expect(status.getByText(/^High risk: removal services attract stolen devices/)).toBeInTheDocument();
  });

  it('reads nothing of the proposals of a role without pricing:read', async () => {
    const requests = await openRetail({}, ['storefront:read', 'storefront:update']);
    expect(await titleField()).toBeInTheDocument();
    expect(sentTo(requests, 'GET', '/admin/retail-price-changes')).toHaveLength(0);
  });
});
