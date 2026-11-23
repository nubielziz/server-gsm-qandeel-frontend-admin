// Tests for the shop price block of the Catalog panel: the price form of a listing (follow the rule or type a price, the server's
// floor and refusals, saved in place), the read-only price of a service with no shop page, the waiting price proposal with Apply and
// Keep, what a write makes stale and the permissions of each control. A host stands in for the panel. They run against the dev mock API.
import { useOne } from '@refinedev/core';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Route } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMe, renderShell, setupMockApi, signInAs } from '@/test/renderApp';
import { ShopPriceBlock, type ShopPriceBlockProps } from '../components/shop/ShopPriceBlock';
import { recordRequests } from '../test/requests';

setupMockApi();
vi.setConfig({ testTimeout: 30_000 });
afterEach(() => vi.restoreAllMocks());

// The seed: service 5 (AT&T) has a typed price of $25.99; service 6 follows a rule and has a proposal that waits ($19.99 to $24.99);
// service 8 has a proposal with no new price (its cost is gone). A service and its listing have the same id.
const ATT = 5;
const RULE_PRICED = 6;
const NO_COST = 8;
const PRICE = /^Price shown to customers/;
const PROPOSAL = { name: 'Waiting price change' };

type HostProps = Partial<Omit<ShopPriceBlockProps, 'onDirtyChange'>> & {
  /** Also reads the service's own record, as the panel's host keeps it, so a test sees whether a write reads it again. */
  withRecord?: boolean;
};
type Requests = ReturnType<typeof recordRequests>;
type User = ReturnType<typeof userEvent.setup>;

/** The service's own record, read by Refine as the panel's host reads it. */
function ServiceRecord({ id }: { id: number }) {
  const { result } = useOne<{ name: string }>({ resource: 'services', id, errorNotification: false });
  return <p>{result ? `Record of ${result.name}` : 'Reading the record'}</p>;
}

/** The panel's stand-in: the block, and a line that says what it reported. */
function Host({ withRecord, ...props }: HostProps) {
  const [dirty, setDirty] = useState(false);
  return (
    <>
      <p>{dirty ? 'Unsaved changes' : 'No unsaved changes'}</p>
      {withRecord && <ServiceRecord id={props.serviceId ?? ATT} />}
      <ShopPriceBlock serviceId={ATT} listingId={ATT} {...props} onDirtyChange={setDirty} />
    </>
  );
}

/** Opens the block, signed in as the owner or as a staff member with fewer permissions. */
async function openBlock(props: HostProps = {}, permissions?: string[]) {
  await signInAs();
  if (permissions) mockMe({ id: 1, name: 'Rami K.', permissions });
  const requests = recordRequests();
  renderShell('/probe', <Route path="/probe" element={<Host {...props} />} />);
  return requests;
}

/** The requests of one method whose path ends with `path`. */
const sentTo = (requests: Requests, method: string, path: string) =>
  requests.sent().filter((sent) => sent.method === method && sent.url.pathname.endsWith(path));

/** The proposals the block asked for one service. */
const proposalReads = (requests: Requests, serviceId: number) =>
  requests
    .sent()
    .filter(
      (sent) =>
        sent.method === 'GET' &&
        sent.url.pathname.endsWith('/admin/retail-price-changes') &&
        sent.url.searchParams.get('serviceId') === String(serviceId),
    );

const priceField = () => screen.findByRole('textbox', { name: PRICE });

async function typePrice(user: User, text: string) {
  const field = await priceField();
  await user.clear(field);
  await user.type(field, text);
  return field;
}

describe('a service with no shop page, or a role that cannot read the shop', () => {
  it('says None for a service with no shop page and no shop price, and has no form', async () => {
    const requests = await openBlock({ serviceId: 16, listingId: null });
    expect(await screen.findByText('None')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(sentTo(requests, 'GET', '/admin/service-listings/16')).toHaveLength(0);
    // With pricing:read the block still looks for a proposal of the service, and finds none.
    await waitFor(() => expect(proposalReads(requests, 16)).toHaveLength(1));
    expect(screen.queryByRole('group', PROPOSAL)).not.toBeInTheDocument();
  });

  it('shows the price the row carries, read-only, with how it was set and that it is kept for the shop', async () => {
    await openBlock({ serviceId: 16, listingId: null, retailPrice: '25.9900', retailPriceSource: 'manual' });
    expect(await screen.findByText('$25.99')).toBeInTheDocument();
    expect(screen.getByText('Typed')).toBeInTheDocument();
    expect(screen.getByText('It is kept when the service goes on the shop.')).toBeInTheDocument();
    expect(screen.queryByText('None')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('tags a price that a shop price rule wrote as Rule', async () => {
    await openBlock({ serviceId: 16, listingId: null, retailPrice: '19.9900', retailPriceSource: 'rule' });
    expect(await screen.findByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    expect(screen.queryByText('Typed')).not.toBeInTheDocument();
  });

  it('shows the waiting proposal of a service that has no shop page', async () => {
    await openBlock({ serviceId: RULE_PRICED, listingId: null });
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    expect(proposal.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('shows the price to a role that may not read the shop, hides nothing, and reads nothing of the shop', async () => {
    const requests = await openBlock(
      { listingId: undefined, retailPrice: '25.9900', retailPriceSource: 'rule' },
      ['catalog:read'],
    );
    expect(await screen.findByText('$25.99')).toBeInTheDocument();
    expect(screen.getByText('Rule')).toBeInTheDocument();
    // The price is not hidden from any reader of the catalog, and a role that cannot see the page cannot say it has none.
    expect(screen.queryByText(/hidden/)).not.toBeInTheDocument();
    expect(screen.queryByText(/kept when the service goes on the shop/)).not.toBeInTheDocument();
    expect(sentTo(requests, 'GET', '/admin/service-listings/5')).toHaveLength(0);
    expect(proposalReads(requests, ATT)).toHaveLength(0);
  });
});

describe('the price form', () => {
  it('shows a typed price with the server’s floor, the figures and no cursor in the field', async () => {
    await openBlock();
    const field = await priceField();
    expect(field).toHaveValue('25.99');
    expect(field).not.toHaveFocus();
    expect(screen.getByRole('radio', { name: /^Type a price/ })).toBeChecked();
    expect(screen.getByText(/^Floor \$19\.01: the lowest price the server accepts/)).toBeInTheDocument();
    expect(screen.getByText('B2B base price')).toBeInTheDocument();
    expect(screen.getByText('Supplier cost')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save shop price' })).toBeDisabled();
    expect(screen.getByText('No unsaved changes')).toBeInTheDocument();
  });

  it('reports unsaved changes, sends only the typed price and shows the stored price afterwards', async () => {
    const user = userEvent.setup();
    const requests = await openBlock();
    const field = await typePrice(user, '30');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    expect(await screen.findByText('Shop price saved')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/5').map((sent) => sent.body)).toEqual([
      { retailPrice: '30.0000' },
    ]);
    await waitFor(() => expect(field).toHaveValue('30.00'));
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
  });

  it('shows the server’s refusal under the price and sends nothing more', async () => {
    const user = userEvent.setup();
    await openBlock();
    const field = await typePrice(user, '1');
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText(/^Below the floor\./)).toBeInTheDocument();
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Shop price saved')).not.toBeInTheDocument();
  });

  it('says nothing was saved when the typed price is the stored one, and shows the stored text again', async () => {
    const user = userEvent.setup();
    const requests = await openBlock();
    const field = await typePrice(user, '25.990');
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/5')).toHaveLength(0);
    // No "Saved", and the form is clean again: the panel would not ask about it when it closes.
    expect(screen.queryByText('Shop price saved')).not.toBeInTheDocument();
    await waitFor(() => expect(field).toHaveValue('25.99'));
    expect(await screen.findByText('No unsaved changes')).toBeInTheDocument();
  });

  it('asks for a price above zero before it sends anything', async () => {
    const user = userEvent.setup();
    const requests = await openBlock();
    const field = await priceField();
    await user.clear(field);
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Enter a price greater than zero.')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/5')).toHaveLength(0);
  });

  it('follows the rule by sending the rule and no price', async () => {
    const user = userEvent.setup();
    const requests = await openBlock();
    await user.click(await screen.findByRole('radio', { name: /^Follow the pricing rule/ }));
    expect(screen.queryByRole('textbox', { name: PRICE })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Price follows the rule')).toBeInTheDocument();
    expect(sentTo(requests, 'PATCH', '/admin/service-listings/5').map((sent) => sent.body)).toEqual([
      { retailPricing: 'rule' },
    ]);
  });

  it('keeps the controls off without storefront:update and pricing:update, naming what is missing', async () => {
    await openBlock({}, ['storefront:read']);
    expect(await priceField()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save shop price' })).toBeDisabled();
    expect(
      screen.getAllByTitle('You need the storefront:update and pricing:update permission').length,
    ).toBeGreaterThan(0);
  });

  it('shows the server’s lock reason and keeps the controls off for a locked listing', async () => {
    await openBlock({ serviceId: 11, listingId: 11 });
    expect(await screen.findByRole('radio', { name: /^Type a price/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save shop price' })).toBeDisabled();
    expect(screen.getAllByText(/^High risk: removal services attract stolen devices/).length).toBeGreaterThan(
      0,
    );
  });
});

describe('what a write makes stale', () => {
  /** How many times the service's own record was read. */
  const recordReads = (requests: Requests, serviceId: number) =>
    sentTo(requests, 'GET', `/admin/services/${serviceId}`).length;

  it('reads the service record again after a typed shop price, so the panel does not show the old group prices', async () => {
    const user = userEvent.setup();
    const requests = await openBlock({ withRecord: true });
    await screen.findByText(/^Record of /);
    expect(recordReads(requests, ATT)).toBe(1);
    await typePrice(user, '30');
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Price saved')).toBeInTheDocument();
    await waitFor(() => expect(recordReads(requests, ATT)).toBeGreaterThan(1));
  });

  it('reads the service record again after the price is set to follow the rule', async () => {
    const user = userEvent.setup();
    const requests = await openBlock({ withRecord: true });
    await screen.findByText(/^Record of /);
    await user.click(await screen.findByRole('radio', { name: /^Follow the pricing rule/ }));
    await user.click(screen.getByRole('button', { name: 'Save shop price' }));
    expect(await screen.findByText('Price follows the rule')).toBeInTheDocument();
    await waitFor(() => expect(recordReads(requests, ATT)).toBeGreaterThan(1));
  });

  it('reads the service record again after a proposal is decided, and never sends the service with the decision', async () => {
    const user = userEvent.setup();
    const requests = await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED, withRecord: true });
    await screen.findByText(/^Record of /);
    expect(recordReads(requests, RULE_PRICED)).toBe(1);
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    await user.click(proposal.getByRole('button', { name: 'Keep the current price' }));
    await waitFor(() => expect(recordReads(requests, RULE_PRICED)).toBeGreaterThan(1));
    expect(sentTo(requests, 'POST', '/admin/retail-price-changes/resolve').map((sent) => sent.body)).toEqual([
      { action: 'keep', ids: [7] },
    ]);
  });
});

describe('the waiting proposal', () => {
  it('shows the server’s figures and words for a proposal that waits', async () => {
    await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED });
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    expect(proposal.getByText('Waiting for approval')).toBeInTheDocument();
    expect(proposal.getByText('$19.99')).toBeInTheDocument();
    expect(proposal.getByText('$24.99')).toBeInTheDocument();
    expect(proposal.getByText('$9.80 to $15.10')).toBeInTheDocument();
    expect(proposal.getByText('Carrier unlock +20% +$0.50, up to 5 cents')).toBeInTheDocument();
    expect(proposal.getByText('The cost moved more than the rule allows by itself.')).toBeInTheDocument();
    expect(proposal.getByRole('button', { name: 'Apply the new price' })).toBeEnabled();
    expect(proposal.getByRole('button', { name: 'Keep the current price' })).toBeEnabled();
  });

  it('asks the server only for the waiting proposals of this service', async () => {
    const requests = await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED });
    await screen.findByRole('group', PROPOSAL);
    const [read] = proposalReads(requests, RULE_PRICED);
    expect(read?.url.searchParams.get('waiting')).toBe('true');
  });

  it('applies the new price with what staff saw, and the proposal and the price move on', async () => {
    const user = userEvent.setup();
    const requests = await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED });
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    await user.click(proposal.getByRole('button', { name: 'Apply the new price' }));
    expect(await screen.findByText('Price changes resolved')).toBeInTheDocument();
    expect(sentTo(requests, 'POST', '/admin/retail-price-changes/resolve').map((sent) => sent.body)).toEqual([
      { action: 'apply', ids: [7], seen: [{ id: 7, newPrice: '24.9900' }] },
    ]);
    await waitFor(() => expect(screen.queryByRole('group', PROPOSAL)).not.toBeInTheDocument());
    // The listing is read again, so the form shows what the server now holds.
    await waitFor(() =>
      expect(sentTo(requests, 'GET', '/admin/service-listings/6').length).toBeGreaterThan(1),
    );
  });

  it('keeps the current price as a typed price, and the form follows', async () => {
    const user = userEvent.setup();
    const requests = await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED });
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    expect(await screen.findByRole('radio', { name: /^Follow the pricing rule/ })).toBeChecked();
    expect(screen.queryByRole('textbox', { name: PRICE })).not.toBeInTheDocument();
    await user.click(proposal.getByRole('button', { name: 'Keep the current price' }));
    await waitFor(() => expect(screen.queryByRole('group', PROPOSAL)).not.toBeInTheDocument());
    expect(sentTo(requests, 'POST', '/admin/retail-price-changes/resolve').map((sent) => sent.body)).toEqual([
      { action: 'keep', ids: [7] },
    ]);
    expect(await priceField()).toHaveValue('19.99');
    expect(screen.getByRole('radio', { name: /^Type a price/ })).toBeChecked();
  });

  it('cannot apply a proposal that has no new price, and can keep the price', async () => {
    await openBlock({ serviceId: NO_COST, listingId: NO_COST });
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    expect(proposal.getByText('None')).toBeInTheDocument();
    expect(proposal.getByText('The service has no cost now.')).toBeInTheDocument();
    expect(proposal.getByRole('button', { name: 'Apply the new price' })).toBeDisabled();
    expect(proposal.getByRole('button', { name: 'Keep the current price' })).toBeEnabled();
    expect(screen.getByTitle('There is no new price to apply')).toBeInTheDocument();
  });

  it('keeps Apply and Keep off without pricing:update, naming the permission', async () => {
    await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED }, [
      'storefront:read',
      'storefront:update',
      'pricing:read',
    ]);
    const proposal = within(await screen.findByRole('group', PROPOSAL));
    expect(proposal.getByRole('button', { name: 'Apply the new price' })).toBeDisabled();
    expect(proposal.getByRole('button', { name: 'Keep the current price' })).toBeDisabled();
    expect(screen.getAllByTitle('You need the pricing:update permission').length).toBeGreaterThan(1);
  });

  it('is not shown, and not asked for, without pricing:read', async () => {
    const requests = await openBlock({ serviceId: RULE_PRICED, listingId: RULE_PRICED }, [
      'storefront:read',
      'storefront:update',
      'pricing:update',
    ]);
    expect(await screen.findByRole('radio', { name: /^Follow the pricing rule/ })).toBeChecked();
    expect(screen.queryByRole('group', PROPOSAL)).not.toBeInTheDocument();
    expect(proposalReads(requests, RULE_PRICED)).toHaveLength(0);
  });
});
