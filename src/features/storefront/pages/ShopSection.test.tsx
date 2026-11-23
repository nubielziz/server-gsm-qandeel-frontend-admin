// Tests for the shop page section of the Catalog panel: what it says for a service with no shop page (the reason, a failed publish and the
// way to its run), and for one with a shop page: the listing read by id, its form saved in place, the server's refusals, the
// permission of the controls and the unsaved-changes report. A host stands in for the panel. They run against the dev mock API.
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fmtDate, num } from '@/lib/format';
import { mockServer } from '@/mocks/node';
import { problem } from '@/mocks/problem';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { getListing } from '../api';
import { ShopPageSection, type ShopPageSectionProps } from '../components/shop/ShopPageSection';
import { useListing } from '../hooks/useListing';
import { useUpdateListingContent } from '../hooks/useListingMutations';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

const ATT = 'AT&T USA Premier Unlock';
const ATT_SERVICE = 5; // its service and its listing have the same id in the mock seed
const TMOBILE = 'T-Mobile USA Unlock'; // listing 6
const FAILED_AT = '2026-11-20T10:30:00.000Z';
const ELSEWHERE = 'Saved in the Edit dialog.';

type HostProps = Partial<Omit<ShopPageSectionProps, 'onDirtyChange' | 'active'>> & {
  /** Adds a button that moves the section to this listing, as the panel does when another row opens. */
  other?: number;
  /** Adds a second editor of the ATT listing (the row menu's Edit dialog) and the copy of the listing it reads. */
  elsewhere?: boolean;
};

/** Another place that saves the ATT listing: it stores one field and makes the section's read copy old, as the Edit dialog does. */
function SaveElsewhere() {
  const update = useUpdateListingContent();
  const copy = useListing(ATT_SERVICE).data;
  return (
    <>
      <p>{`Read copy: ${copy?.summary ?? ''}`}</p>
      <button
        type="button"
        onClick={() =>
          void getListing(ATT_SERVICE).then((listing) =>
            update.mutateAsync({ listing, body: { summary: ELSEWHERE } }),
          )
        }
      >
        Save elsewhere
      </button>
    </>
  );
}

/** The panel's stand-in: the section, the table's switch as a button, a line that says what the section reported, and a way to change listing. */
function Host({ other, elsewhere, ...props }: HostProps) {
  const [dirty, setDirty] = useState(false);
  const [listingId, setListingId] = useState(props.listingId);
  return (
    <>
      <p>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</p>
      {elsewhere && <SaveElsewhere />}
      {other !== undefined && (
        <button type="button" onClick={() => setListingId(other)}>
          Show the other listing
        </button>
      )}
      <ShopPageSection
        serviceId={ATT_SERVICE}
        isListed
        switchSlot={<button type="button">Shop switch</button>}
        {...props}
        listingId={listingId}
        active={false}
        onDirtyChange={setDirty}
      />
    </>
  );
}

/** Opens the section, signed in as the owner or as a staff member with fewer permissions. */
async function openSection(props: HostProps = {}, permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const requests = recordRequests();
  renderShell('/probe', <Route path="/probe" element={<Host {...props} />} />);
  return requests;
}

/** The requests of one method to the listing routes. */
const listingRequests = (requests: ReturnType<typeof recordRequests>, method: string, id: number) =>
  requests
    .sent()
    .filter((sent) => sent.method === method && sent.url.pathname.endsWith(`/admin/service-listings/${id}`));

const titleField = () => screen.findByRole('textbox', { name: 'Public title' });

describe('a service with no shop page', () => {
  it('says so, keeps the switch at the top and gives the reason it cannot go on the shop', async () => {
    const requests = await openSection({ listingId: null, isListed: false, shopBlocked: 'b2b_only' });
    expect(await screen.findByText('Not on the shop yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shop switch' })).toBeInTheDocument();
    expect(
      screen.getByText('It cannot go on the shop now: its category is closed to the public.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Public title' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Failed publish' })).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.includes('/admin/service-listings'))).toBe(false);
  });

  it('says nothing about a reason when there is none', async () => {
    await openSection({ listingId: null, isListed: false, shopBlocked: null });
    expect(await screen.findByText('Not on the shop yet')).toBeInTheDocument();
    expect(screen.queryByText(/It cannot go on the shop now/)).not.toBeInTheDocument();
  });

  it('shows a failed publish in the words of the publish screens, with its date and a link to the run', async () => {
    await openSection({
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
      '/catalog?view=publish&run=3',
    );
  });

  it('shows a reason the console does not know as the server sent it', async () => {
    await openSection({
      listingId: null,
      publishFailure: { runId: 9, reason: 'something_new', detail: null, at: FAILED_AT },
    });
    const failure = within(await screen.findByRole('group', { name: 'Failed publish' }));
    expect(failure.getByText('Something_new.')).toBeInTheDocument();
  });
});

describe('a role that may not read the shop', () => {
  it('gets one line and no switch, and the listing is not read', async () => {
    const requests = await openSection({ listingId: undefined }, ['catalog:read']);
    expect(
      await screen.findByText('The shop page is hidden: you need the storefront:read permission to see it.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shop switch' })).not.toBeInTheDocument();
    expect(requests.sent().some((sent) => sent.url.pathname.includes('/admin/service-listings'))).toBe(false);
  });
});

describe('a service with a shop page', () => {
  it('reads the listing once by its id and shows its form, its figures and the switch', async () => {
    const requests = await openSection({ listingId: ATT_SERVICE });
    expect(await titleField()).toHaveValue(ATT);
    expect(listingRequests(requests, 'GET', ATT_SERVICE)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Shop switch' })).toBeInTheDocument();
    expect(screen.getByText('On the shop')).toBeInTheDocument();
    const listing = await getListing(ATT_SERVICE);
    expect(screen.getByText('Orders, 30 days').nextElementSibling).toHaveTextContent(num(listing.orders30d));
    expect(screen.getByText('Revenue, 30 days')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('atandt-usa-premier-unlock');
    expect(screen.getByRole('combobox', { name: 'Brand' })).toHaveValue('Apple');
    expect(screen.getByRole('button', { name: 'Save shop page' })).toBeDisabled();
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('says a switched-off shop page is not on the shop', async () => {
    await openSection({ listingId: ATT_SERVICE, isListed: false });
    expect(await titleField()).toBeInTheDocument();
    expect(screen.getByText('Not on the shop')).toBeInTheDocument();
    expect(screen.queryByText('Not on the shop yet')).not.toBeInTheDocument();
  });

  it('reports unsaved changes, saves only what changed and stays open', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE });
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'Unlock an AT&T iPhone.');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'Unlock an AT&T iPhone.' },
    ]);
    // The listing is read again after a save, and the section stays on the same form.
    expect(listingRequests(requests, 'GET', ATT_SERVICE)).toHaveLength(2);
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(summary).toHaveValue('Unlock an AT&T iPhone.');
    expect(screen.getByRole('button', { name: 'Save shop page' })).toBeDisabled();
  });

  it('compares the next save with what the first one stored', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE });
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'First words.');
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    await screen.findByText('Saved');
    // Back to what the listing was before the first save: it is a change now, and it is sent.
    await user.clear(summary);
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    await waitFor(() => expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(2));
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'First words.' },
      { summary: '' },
    ]);
  });

  it('keeps what it saved when the listing cannot be read again after the save', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE });
    const summary = await screen.findByRole('textbox', { name: 'Summary' });
    await user.type(summary, 'Saved words.');
    // The read after the save fails: the form keeps the text the server stored, it does not go back to the copy it read first.
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'The listing is not available.'),
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(summary).toHaveValue('Saved words.');
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: 'Saved words.' },
    ]);
  });

  it('does not send back a field that another save changed while the form held edits', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE, elsewhere: true });
    const title = await titleField();
    await user.clear(title);
    await user.type(title, 'A new public title');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    // Another save stores the summary and the section is handed the new copy; its form keeps what was typed.
    await user.click(screen.getByRole('button', { name: 'Save elsewhere' }));
    expect(await screen.findByText(`Read copy: ${ELSEWHERE}`)).toBeInTheDocument();
    expect(title).toHaveValue('A new public title');
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    await waitFor(() => expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(2));
    // Only the typed title is sent: the summary the other save stored is not written back as the old text.
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE).map((sent) => sent.body)).toEqual([
      { summary: ELSEWHERE },
      { publicTitle: 'A new public title' },
    ]);
  });

  it('shows the server’s refusal under the field and keeps the changes', async () => {
    const user = userEvent.setup();
    await openSection({ listingId: ATT_SERVICE });
    const slug = await screen.findByRole('textbox', { name: 'Slug' });
    await user.clear(slug);
    await user.type(slug, 'ee-uk-unlock');
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    expect(await screen.findByText('The slug ee-uk-unlock is already used.')).toBeInTheDocument();
    expect(slug).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('asks for a title before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE });
    await user.clear(await titleField());
    await user.click(screen.getByRole('button', { name: 'Save shop page' }));
    expect(await screen.findByText('Enter the title customers see.')).toBeInTheDocument();
    expect(listingRequests(requests, 'PATCH', ATT_SERVICE)).toHaveLength(0);
  });

  it('keeps the controls off without storefront:update and says which permission is missing', async () => {
    await openSection({ listingId: ATT_SERVICE }, ['storefront:read']);
    expect(await titleField()).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Brand' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save shop page' })).toBeDisabled();
    expect(screen.getAllByTitle('You need the storefront:update permission').length).toBeGreaterThan(0);
  });

  it('reads the listing of a new id and drops what was typed for the old one', async () => {
    const user = userEvent.setup();
    const requests = await openSection({ listingId: ATT_SERVICE, other: 6 });
    await user.type(await screen.findByRole('textbox', { name: 'Summary' }), 'Unsaved words');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Show the other listing' }));
    expect(await screen.findByDisplayValue(TMOBILE)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(ATT)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Unsaved words')).not.toBeInTheDocument();
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
    expect(listingRequests(requests, 'GET', 6)).toHaveLength(1);
  });

  it('says the server’s words with Retry when the listing cannot be read, and shows the form after it', async () => {
    const user = userEvent.setup();
    mockServer.use(
      http.get('*/admin/service-listings/:id', () =>
        problem(404, 'NOT_FOUND', 'Not found', 'The listing is not available.'),
      ),
    );
    await openSection({ listingId: ATT_SERVICE });
    expect(await screen.findByText('Could not load the shop page')).toBeInTheDocument();
    expect(screen.getByText('The listing is not available.')).toBeInTheDocument();
    mockServer.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await titleField()).toHaveValue(ATT);
  });

  it('shows what the server says about a locked listing', async () => {
    await openSection({ listingId: 11, isListed: false });
    expect(await titleField()).toBeInTheDocument();
    expect(screen.getByText(/^High risk: removal services attract stolen devices/)).toBeInTheDocument();
  });
});
